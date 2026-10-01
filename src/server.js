/**
 * MQTT ingestion and REST API for one water tank.
 * Inserts use majority write concern. Analytics reads prefer a secondary.
 * Failover: automatic failover with no acknowledged-write loss;
 * brief write pause during election (~10 s).
 */

const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { MongoClient, ReadPreference } = require('mongodb');
const { COLLECTION, DB_NAME, MONGO_URI, MQTT_URL, PORT } = require('./lib/config');
const { ALERT, HOME_HUB, TELEMETRY_TOPIC, toStoredReading, validatePayload } = require('./lib/devices');
const { ensureIndexes } = require('./lib/indexes');
const { deriveInsight } = require('./lib/insights');
const { notifyAlertTransition } = require('./lib/telegram');

const client = new MongoClient(MONGO_URI, {
  retryWrites: true,
  retryReads: true,
  writeConcern: { w: 'majority' },
  serverSelectionTimeoutMS: 8000,
});

const secondary = { readPreference: new ReadPreference('secondaryPreferred') };
const LEVEL_FIELD = '$telemetry.water_tank.ultrasonic_depth_pct';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

let collection;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parsePositiveInt(value, fallback, field) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) {
    throw httpError(400, `${field} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw httpError(400, `${field} must be a positive integer`);
  }
  return parsed;
}

function pagination(query) {
  const page = parsePositiveInt(query.page, 1, 'page');
  const requested = parsePositiveInt(query.limit, 20, 'limit');
  const limit = Math.min(requested, 100);
  return { page, limit, skip: (page - 1) * limit };
}

function parseDate(value, field) {
  if (value === undefined || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, `${field} is not a valid date`);
  }
  return date;
}

function timeRange(query, fallbackFrom) {
  const from = parseDate(query.from, 'from') || fallbackFrom;
  const to = parseDate(query.to, 'to');
  if (from && to && from > to) throw httpError(400, 'from must be before to');
  const timestamp = {};
  if (from) timestamp.$gte = from;
  if (to) timestamp.$lte = to;
  return Object.keys(timestamp).length ? timestamp : null;
}

function serializeReading(doc) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
    timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
    ingested_at: doc.ingested_at instanceof Date ? doc.ingested_at.toISOString() : doc.ingested_at,
  };
}

async function route(res, fn) {
  try {
    await fn();
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[api]', err);
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : err.message,
    });
  }
}

app.get('/api/health', (req, res) => route(res, async () => {
  const status = await client.db('admin').command({ replSetGetStatus: 1 });
  const members = (status.members || []).map((member) => ({
    name: member.name,
    state: member.stateStr,
    health: member.health,
    isPrimary: member.stateStr === 'PRIMARY',
  }));
  const primary = members.find((member) => member.isPrimary);
  res.json({
    set: status.set,
    primary: primary ? primary.name : null,
    members,
    checkedAt: new Date().toISOString(),
  });
}));

app.get('/api/telemetry/latest', (req, res) => route(res, async () => {
  const filter = { device_id: HOME_HUB.device_id };
  if (req.query.device_id !== undefined && String(req.query.device_id) !== HOME_HUB.device_id) {
    throw httpError(400, 'device_id is invalid');
  }
  const reading = await collection.find(filter).sort({ timestamp: -1 }).limit(1).next();
  res.json({ reading: serializeReading(reading) });
}));

app.get('/api/telemetry/alerts', (req, res) => route(res, async () => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {
    device_id: HOME_HUB.device_id,
    $or: [
      { 'telemetry.float_switches.high_level_overflow': true },
      { 'telemetry.float_switches.low_level_dry_run': true },
    ],
  };
  if (req.query.reason) {
    const reason = String(req.query.reason);
    const allowed = new Set(Object.values(ALERT));
    if (!allowed.has(reason)) throw httpError(400, 'reason is not a known alert');
    filter.alert_reasons = reason;
  }
  const [total, items] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
  ]);
  res.json({ page, limit, total, items: items.map(serializeReading) });
}));

app.get('/api/telemetry/analytics/averages', (req, res) => route(res, async () => {
  const rows = await collection.aggregate([
    {
      $group: {
        _id: '$device_id',
        device_type: { $first: '$device_type' },
        readings: { $sum: 1 },
        avg_water_level: { $avg: LEVEL_FIELD },
        avg_volume_litres: { $avg: '$telemetry.water_tank.volume_litres' },
        alert_count: { $sum: { $cond: ['$alert', 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ], secondary).toArray();
  res.json({
    devices: rows.map((row) => ({
      device_id: row._id,
      device_type: row.device_type,
      readings: row.readings,
      avg_water_level: row.avg_water_level,
      avg_volume_litres: row.avg_volume_litres,
      alert_count: row.alert_count,
    })),
  });
}));

app.get('/api/telemetry/history', (req, res) => route(res, async () => {
  const bucket = req.query.bucket === undefined ? null : String(req.query.bucket);
  if (bucket !== null && bucket !== 'minute' && bucket !== 'hour') {
    throw httpError(400, 'bucket must be minute or hour');
  }
  const timestamp = timeRange(req.query, bucket ? new Date(Date.now() - 6 * 60 * 60 * 1000) : null);
  const match = { device_id: HOME_HUB.device_id };
  if (timestamp) match.timestamp = timestamp;

  if (bucket) {
    const points = await collection.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateTrunc: { date: '$timestamp', unit: bucket } },
          avg: { $avg: LEVEL_FIELD },
          min: { $min: LEVEL_FIELD },
          max: { $max: LEVEL_FIELD },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 500 },
    ], secondary).toArray();
    res.json({
      device_id: HOME_HUB.device_id,
      bucket,
      points: points.map((point) => ({
        bucket: point._id instanceof Date ? point._id.toISOString() : point._id,
        avg: point.avg,
        min: point.min,
        max: point.max,
        count: point.count,
      })),
    });
    return;
  }

  const { page, limit, skip } = pagination(req.query);
  const [total, items] = await Promise.all([
    collection.countDocuments(match),
    collection.find(match).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
  ]);
  res.json({ page, limit, total, items: items.map(serializeReading) });
}));

app.get('/api/telemetry/summary', (req, res) => route(res, async () => {
  const now = Date.now();
  const latest = await collection.find({ device_id: HOME_HUB.device_id }).sort({ timestamp: -1 }).limit(1).next();
  const previous = latest
    ? await collection.find({
      device_id: HOME_HUB.device_id,
      timestamp: { $lt: latest.timestamp },
    }).sort({ timestamp: -1 }).limit(1).next()
    : null;
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const windowStart = new Date(now - 15 * 60 * 1000);
  const [hourRows, windowDocs] = await Promise.all([
    collection.aggregate([
      { $match: { device_id: HOME_HUB.device_id, timestamp: { $gte: hourAgo } } },
      {
        $group: {
          _id: null,
          min: { $min: LEVEL_FIELD },
          max: { $max: LEVEL_FIELD },
        },
      },
    ]).toArray(),
    collection.find({
      device_id: HOME_HUB.device_id,
      timestamp: { $gte: windowStart },
    }).sort({ timestamp: 1 }).limit(500).toArray(),
  ]);
  const hour = hourRows[0] || {};
  res.json({
    reading: serializeReading(latest),
    ...deriveInsight({
      latest,
      previous,
      windowDocs,
      hourMin: hour.min,
      hourMax: hour.max,
      now,
    }),
  });
}));

function startMqtt() {
  const mqttClient = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `smart-tank-ingest-${process.pid}`,
  });
  mqttClient.on('connect', () => {
    mqttClient.subscribe(TELEMETRY_TOPIC, { qos: 1 }, (err) => {
      if (err) console.error('[ingest] subscribe failed', err.message);
      else console.log(`[ingest] subscribed ${TELEMETRY_TOPIC} via ${MQTT_URL}`);
    });
  });
  mqttClient.on('error', (err) => {
    console.error('[ingest] mqtt error', err.message);
  });
  mqttClient.on('message', async (topic, body) => {
    let payload;
    try {
      payload = JSON.parse(body.toString());
    } catch {
      console.error(`[ingest] rejected non-JSON on ${topic}`);
      return;
    }
    const problem = validatePayload(payload);
    if (problem) {
      console.error(`[ingest] rejected ${topic}: ${problem}`);
      return;
    }
    try {
      const doc = toStoredReading(payload);
      const previous = await collection
        .find({ device_id: HOME_HUB.device_id })
        .sort({ timestamp: -1 })
        .limit(1)
        .next();
      await collection.insertOne(doc, { writeConcern: { w: 'majority' } });
      const flag = doc.alert ? ` alert=${doc.alert_reasons.join(',')}` : '';
      console.log(`[ingest] stored ${doc.device_id} ${doc.timestamp.toISOString()}${flag}`);
      try {
        await notifyAlertTransition(previous, doc);
      } catch (err) {
        console.error('[telegram] send failed', err.message);
      }
    } catch (err) {
      console.error('[ingest] insert failed', err.message);
    }
  });
}

async function main() {
  await client.connect();
  collection = client.db(DB_NAME).collection(COLLECTION);
  await ensureIndexes(collection);
  console.log(`[api] indexes ensured on ${DB_NAME}.${COLLECTION}`);
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });
  startMqtt();
}

main().catch((err) => {
  console.error('[api] failed to start', err.message);
  process.exit(1);
});
