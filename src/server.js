/**
 * MQTT ingestion and REST API.
 * Inserts use majority write concern. Analytics reads prefer a secondary.
 * Failover: automatic failover with no acknowledged-write loss;
 * brief write pause during election (~10 s).
 */

const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { MongoClient, ReadPreference } = require('mongodb');
const {
  ALERT,
  COMMANDS,
  METRICS,
  devices,
  findDevice,
  toStoredReading,
  validatePayload,
  topicFor,
} = require('./lib/devices');
const { ensureIndexes } = require('./lib/indexes');

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://localhost:27117,localhost:27118,localhost:27119/iothings?replicaSet=rs0';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

const client = new MongoClient(MONGO_URI, {
  retryWrites: true,
  retryReads: true,
  writeConcern: { w: 'majority' },
  serverSelectionTimeoutMS: 8000,
});

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

let collection;
let mqttClient;
let mqttReady = false;

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

function serializeReading(doc) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
    timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
    ingested_at: doc.ingested_at instanceof Date ? doc.ingested_at.toISOString() : doc.ingested_at,
  };
}

function deviceStatus(lastSeen) {
  if (!lastSeen) return 'offline';
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age < 30_000) return 'online';
  if (age < 5 * 60_000) return 'stale';
  return 'offline';
}

function telemetryFilter(query) {
  const filter = {};
  if (query.device_id) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(query.device_id))) {
      throw httpError(400, 'device_id is invalid');
    }
    filter.device_id = String(query.device_id);
  }
  if (query.device_type) {
    if (!/^[a-z0-9_]{1,64}$/.test(String(query.device_type))) {
      throw httpError(400, 'device_type is invalid');
    }
    filter.device_type = String(query.device_type);
  }
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');
  if (from && to && from > to) throw httpError(400, 'from must be before to');
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = from;
    if (to) filter.timestamp.$lte = to;
  }
  return filter;
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

app.get('/api/devices', (req, res) => route(res, async () => {
  const grouped = await collection.aggregate([
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$device_id',
        device_type: { $first: '$device_type' },
        location: { $first: '$location' },
        last_seen: { $first: '$timestamp' },
        latest: { $first: '$$ROOT' },
      },
    },
  ]).toArray();
  const byId = new Map(grouped.map((row) => [row._id, row]));
  const known = new Set(devices.map((device) => device.device_id));
  const extras = grouped.filter((row) => !known.has(row._id)).map((row) => ({
    device_id: row._id,
    device_type: row.device_type,
    location: row.location,
  }));
  const list = [...devices, ...extras].map((device) => {
    const row = byId.get(device.device_id);
    const lastSeen = row ? row.last_seen : null;
    return {
      id: device.device_id,
      type: row ? row.device_type : device.device_type,
      location: row ? row.location : device.location,
      last_seen: lastSeen ? new Date(lastSeen).toISOString() : null,
      status: deviceStatus(lastSeen),
      latest: row ? serializeReading(row.latest) : null,
    };
  });
  res.json({ devices: list });
}));

app.get('/api/telemetry/latest', (req, res) => route(res, async () => {
  const filter = {};
  if (req.query.device_id) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(req.query.device_id))) {
      throw httpError(400, 'device_id is invalid');
    }
    filter.device_id = String(req.query.device_id);
  }
  const reading = await collection.find(filter).sort({ timestamp: -1 }).limit(1).next();
  res.json({ reading: serializeReading(reading) });
}));

app.get('/api/telemetry', (req, res) => route(res, async () => {
  const { page, limit, skip } = pagination(req.query);
  const filter = telemetryFilter(req.query);
  const [total, items] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
  ]);
  res.json({ page, limit, total, items: items.map(serializeReading) });
}));

app.get('/api/telemetry/series', (req, res) => route(res, async () => {
  const deviceId = String(req.query.device_id || '');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(deviceId)) {
    throw httpError(400, 'device_id is required');
  }
  const metric = String(req.query.metric || '');
  const field = METRICS[metric];
  if (!field) throw httpError(400, 'metric is not allowed');
  const bucket = String(req.query.bucket || 'minute');
  if (bucket !== 'minute' && bucket !== 'hour') {
    throw httpError(400, 'bucket must be minute or hour');
  }
  const from = parseDate(req.query.from, 'from') || new Date(Date.now() - 6 * 60 * 60 * 1000);
  const to = parseDate(req.query.to, 'to') || new Date();
  if (from > to) throw httpError(400, 'from must be before to');

  const points = await collection.aggregate([
    { $match: { device_id: deviceId, timestamp: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$timestamp', unit: bucket } },
        avg: { $avg: `$${field}` },
        min: { $min: `$${field}` },
        max: { $max: `$${field}` },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 500 },
  ], { readPreference: new ReadPreference('secondaryPreferred') }).toArray();

  res.json({
    device_id: deviceId,
    metric,
    bucket,
    points: points.map((point) => ({
      bucket: point._id instanceof Date ? point._id.toISOString() : point._id,
      avg: point.avg,
      min: point.min,
      max: point.max,
      count: point.count,
    })),
  });
}));

app.get('/api/alerts', (req, res) => route(res, async () => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { alert: true };
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

app.get('/api/analytics/averages', (req, res) => route(res, async () => {
  const rows = await collection.aggregate([
    {
      $group: {
        _id: '$device_id',
        device_type: { $first: '$device_type' },
        readings: { $sum: 1 },
        avg_water_level: { $avg: '$water_tank.ultrasonic_depth_pct' },
        avg_temp: { $avg: '$climate.temperature_c' },
        avg_power: { $avg: '$power_meter.power_w' },
        alert_count: { $sum: { $cond: ['$alert', 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ], { readPreference: new ReadPreference('secondaryPreferred') }).toArray();
  res.json({
    devices: rows.map((row) => ({
      device_id: row._id,
      device_type: row.device_type,
      readings: row.readings,
      avg_water_level: row.avg_water_level,
      avg_temp: row.avg_temp,
      avg_power: row.avg_power,
      alert_count: row.alert_count,
    })),
  });
}));

app.get('/api/analytics/alerts-hourly', (req, res) => route(res, async () => {
  const rows = await collection.aggregate([
    { $match: { alert: true } },
    { $unwind: '$alert_reasons' },
    {
      $group: {
        _id: {
          hour: { $dateTrunc: { date: '$timestamp', unit: 'hour' } },
          reason: '$alert_reasons',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.hour': -1, count: -1 } },
    { $limit: 48 },
  ], { readPreference: new ReadPreference('secondaryPreferred') }).toArray();
  res.json({
    buckets: rows.map((row) => ({
      hour: row._id.hour instanceof Date ? row._id.hour.toISOString() : row._id.hour,
      reason: row._id.reason,
      count: row.count,
    })),
  });
}));

app.get('/api/stats', (req, res) => route(res, async () => {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const onlineSince = new Date(Date.now() - 30_000);
  const [totalDocuments, documentsLastHour, activeAlerts, onlineRows] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ timestamp: { $gte: hourAgo } }),
    collection.countDocuments({ alert: true, timestamp: { $gte: hourAgo } }),
    collection.aggregate([
      { $match: { timestamp: { $gte: onlineSince } } },
      { $group: { _id: '$device_id' } },
      { $count: 'devices' },
    ]).toArray(),
  ]);
  res.json({
    total_documents: totalDocuments,
    documents_last_hour: documentsLastHour,
    active_alerts: activeAlerts,
    devices_online: onlineRows[0] ? onlineRows[0].devices : 0,
  });
}));

app.post('/api/devices/:id/commands', (req, res) => route(res, async () => {
  const device = findDevice(req.params.id);
  if (!device) throw httpError(404, 'Unknown device');
  if (device.device_type !== 'water_tank') {
    throw httpError(400, 'Commands are only supported for water_tank devices');
  }
  const command = req.body && req.body.command;
  if (!Object.prototype.hasOwnProperty.call(COMMANDS, command)) {
    throw httpError(400, 'command must be pump_on, pump_off, valve_open, or valve_close');
  }
  if (!mqttClient || !mqttReady) throw httpError(503, 'MQTT broker is not connected');
  const topic = topicFor(device, 'commands');
  await new Promise((resolve, reject) => {
    mqttClient.publish(
      topic,
      JSON.stringify({ command, requestedAt: new Date().toISOString() }),
      { qos: 1 },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
  res.json({
    ok: true,
    device_id: device.device_id,
    command,
    topic,
    publishedAt: new Date().toISOString(),
  });
}));

function startMqtt() {
  mqttClient = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `iothings-ingest-${process.pid}`,
  });
  mqttClient.on('connect', () => {
    mqttReady = true;
    mqttClient.subscribe('iothings/+/+/telemetry', { qos: 1 }, (err) => {
      if (err) console.error('[ingest] subscribe failed', err.message);
      else console.log(`[ingest] subscribed iothings/+/+/telemetry via ${MQTT_URL}`);
    });
  });
  mqttClient.on('close', () => {
    mqttReady = false;
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
      await collection.insertOne(doc, { writeConcern: { w: 'majority' } });
      const flag = doc.alert ? ` alert=${doc.alert_reasons.join(',')}` : '';
      console.log(`[ingest] stored ${doc.device_id} ${doc.timestamp.toISOString()}${flag}`);
    } catch (err) {
      console.error('[ingest] insert failed', err.message);
    }
  });
}

async function main() {
  await client.connect();
  collection = client.db('iothings').collection('sensor_readings');
  await ensureIndexes(collection);
  console.log('[api] indexes ensured on iothings.sensor_readings');
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });
  startMqtt();
}

main().catch((err) => {
  console.error('[api] failed to start', err.message);
  process.exit(1);
});
