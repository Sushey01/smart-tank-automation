/**
 * MQTT ingestion and REST API for one water tank.
 * Inserts use majority write concern. Analytics reads prefer a secondary.
 * Failover: automatic failover with no acknowledged-write loss;
 * brief write pause during election (~10 s).
 */

const os = require('os');
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { MongoClient, ObjectId, ReadPreference } = require('mongodb');
const { COLLECTION, DB_NAME, MONGO_URI, MQTT_URL, PORT } = require('./lib/config');
const {
  ALERT,
  HOME_HUB,
  TELEMETRY_TOPIC,
  readingFromLevel,
  replaceLevel,
  toStoredReading,
  validatePayload,
  evaluateAlerts,
  getControlState,
  setControlState,
} = require('./lib/devices');
const { ensureIndexes, ensureAllIndexes } = require('./lib/indexes');
const { deriveInsight } = require('./lib/insights');
const { notifyAlertTransition } = require('./lib/telegram');
const { setupSwagger } = require('./lib/swagger');

const client = new MongoClient(MONGO_URI, {
  retryWrites: true,
  retryReads: true,
  writeConcern: { w: 'majority' },
  serverSelectionTimeoutMS: 8000,
});

const secondary = { readPreference: new ReadPreference('secondaryPreferred') };
const LEVEL_FIELD = '$telemetry.water_tank.ultrasonic_depth_pct';

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json({ limit: '32kb' }));
setupSwagger(app);

let collection;
let homesCollection;
let devicesCollection;
let alertsCollection;

function lanBaseUrls(port) {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const ipv4 = entry.family === 'IPv4' || entry.family === 4;
      if (ipv4 && !entry.internal) urls.push(`http://${entry.address}:${port}`);
    }
  }
  return urls;
}

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

app.get('/api/replica-status', (req, res) => route(res, async () => {
  try {
    const status = await client.db('admin').command({ replSetGetStatus: 1 });
    const members = (status.members || []).map((m) => ({
      name: m.name,
      statestr: m.stateStr,
      health: m.health,
      uptime: m.uptime,
    }));
    res.json({
      configured: true,
      set: status.set,
      myState: status.myState,
      members,
    });
  } catch (err) {
    res.json({
      configured: false,
      message: 'Replica set is not configured or mongod is standalone',
      error: err.message,
    });
  }
}));

app.get('/api/homes', (req, res) => route(res, async () => {
  const homes = await homesCollection.find().toArray();
  res.json({ count: homes.length, homes });
}));

app.get('/api/devices', (req, res) => route(res, async () => {
  const devices = await devicesCollection.find().toArray();
  res.json({ count: devices.length, devices });
}));

app.get('/api/telemetry/control', (req, res) => route(res, async () => {
  res.json(getControlState());
}));

app.post('/api/telemetry/control', (req, res) => route(res, async () => {
  const updated = setControlState(req.body || {});
  res.json({ success: true, control: updated });
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

function parseId(value) {
  const id = String(value || '');
  if (!/^[a-fA-F0-9]{24}$/.test(id)) throw httpError(400, 'id is invalid');
  return new ObjectId(id);
}

async function insertReading(doc) {
  const previous = await collection
    .find({ device_id: HOME_HUB.device_id })
    .sort({ timestamp: -1 })
    .limit(1)
    .next();
  if (previous && (!doc.alert_reasons || doc.alert_reasons.length === 0)) {
    const leakCheck = evaluateAlerts(doc, previous);
    if (leakCheck.alert) {
      doc.alert = true;
      doc.alert_reasons = leakCheck.alert_reasons;
    }
  }
  await collection.insertOne(doc, { writeConcern: { w: 'majority' } });
  if (doc.alert && alertsCollection) {
    alertsCollection.insertOne({
      device_id: doc.device_id,
      severity: doc.alert_reasons.some((r) => r.includes('OVERFLOW') || r.includes('LEAK')) ? 'critical' : 'warning',
      reasons: doc.alert_reasons,
      message: `Operational alert: ${doc.alert_reasons.join(', ')}`,
      timestamp: doc.timestamp,
      acknowledged: false,
    }).catch(() => {});
  }
  try {
    await notifyAlertTransition(previous, doc);
  } catch (err) {
    console.error('[telegram] send failed', err.message);
  }
  return doc;
}

app.post('/api/telemetry', (req, res) => route(res, async () => {
  const body = req.body || {};
  const doc = readingFromLevel(body.ultrasonic_depth_pct, body.timestamp || new Date());
  doc.source = 'api';
  await insertReading(doc);
  res.status(201).json({ reading: serializeReading(doc) });
}));

app.patch('/api/telemetry/:id([a-fA-F0-9]{24})', (req, res) => route(res, async () => {
  const _id = parseId(req.params.id);
  const existing = await collection.findOne({ _id, device_id: HOME_HUB.device_id });
  if (!existing) throw httpError(404, 'reading not found');
  const updated = replaceLevel(existing, (req.body || {}).ultrasonic_depth_pct);
  await collection.replaceOne({ _id }, updated, { writeConcern: { w: 'majority' } });
  try {
    await notifyAlertTransition(existing, updated);
  } catch (err) {
    console.error('[telegram] send failed', err.message);
  }
  res.json({ reading: serializeReading(updated) });
}));

app.delete('/api/telemetry/:id([a-fA-F0-9]{24})', (req, res) => route(res, async () => {
  const _id = parseId(req.params.id);
  const result = await collection.deleteOne(
    { _id, device_id: HOME_HUB.device_id },
    { writeConcern: { w: 'majority' } },
  );
  if (result.deletedCount === 0) throw httpError(404, 'reading not found');
  res.json({ deleted: true, id: String(_id) });
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
      doc.source = 'mqtt';
      await insertReading(doc);
      const flag = doc.alert ? ` alert=${doc.alert_reasons.join(',')}` : '';
      console.log(`[ingest] stored ${doc.device_id} ${doc.timestamp.toISOString()}${flag}`);
    } catch (err) {
      console.error('[ingest] insert failed', err.message);
    }
  });
}

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection(COLLECTION);
  homesCollection = db.collection('homes');
  devicesCollection = db.collection('devices');
  alertsCollection = db.collection('alerts');
  await ensureAllIndexes(db);
  console.log(`[api] indexes ensured on ${DB_NAME} collections (readings, devices, homes, alerts)`);
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    const lan = lanBaseUrls(PORT);
    if (lan.length === 0) {
      console.log('[api] no LAN address found for the phone app');
    } else {
      console.log(`[api] phone base URL: ${lan.join(' ')}`);
    }
  });
  startMqtt();
}

main().catch((err) => {
  console.error('[api] failed to start', err.message);
  process.exit(1);
});
