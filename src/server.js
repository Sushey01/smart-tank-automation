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
const {
  COLLECTION,
  COLLECTIONS,
  DB_NAME,
  MONGO_URI,
  MQTT_URL,
  PORT,
  API_KEY,
  ENABLE_TELEMETRY_ADMIN,
} = require('./lib/config');
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
const { ensureAllIndexes } = require('./lib/indexes');
const { deriveInsight } = require('./lib/insights');
const { notifyAlertTransition, sendTelegram } = require('./lib/telegram');
const { setupSwagger } = require('./lib/swagger');
const WATER_CONFIG = require('./lib/water-config');
const {
  getTodayConsumption,
  getDailyConsumption,
  getMonthlyConsumption,
  predictDepletion,
  evaluateAbnormalOvernightUsage,
  getAnalyticsSummary,
} = require('./lib/analytics');

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
let rejectedCollection;

const ingestionStats = {
  stored: 0,
  duplicates: 0,
  rejected: 0,
  started_at: new Date().toISOString(),
};

const effectiveApiKey = API_KEY || 'dev-api-key';

function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key || key !== effectiveApiKey) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid X-API-Key header' });
  }
  next();
}

function requireTelemetryAdmin(req, res, next) {
  if (!ENABLE_TELEMETRY_ADMIN) {
    return res.status(403).json({
      error: 'Direct telemetry mutations are disabled in production. Telemetry must be ingested via MQTT.',
    });
  }
  next();
}

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

function parseObjectId(value) {
  const id = String(value || '');
  if (!/^[a-fA-F0-9]{24}$/.test(id)) throw httpError(400, 'id is invalid');
  return new ObjectId(id);
}

function findHomeFilter(id) {
  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { home_id: id }] };
  }
  return { home_id: id };
}

function findDeviceFilter(id) {
  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { device_id: id }] };
  }
  return { device_id: id };
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

// Health and Cluster Status
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
    ingestion: ingestionStats,
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

// Ingestion Statistics
app.get('/api/stats', (req, res) => route(res, async () => {
  const startedTime = new Date(ingestionStats.started_at).getTime();
  res.json({
    stored: ingestionStats.stored,
    duplicates: ingestionStats.duplicates,
    rejected: ingestionStats.rejected,
    started_at: ingestionStats.started_at,
    uptime_seconds: Math.max(0, Math.floor((Date.now() - startedTime) / 1000)),
  });
}));

// Homes Registry CRUD
app.get('/api/homes', (req, res) => route(res, async () => {
  const homes = await homesCollection.find().toArray();
  res.json({ count: homes.length, homes });
}));

app.get('/api/homes/:id', (req, res) => route(res, async () => {
  const home = await homesCollection.findOne(findHomeFilter(req.params.id));
  if (!home) throw httpError(404, 'Home not found');
  res.json({ home });
}));

app.post('/api/homes', requireApiKey, (req, res) => route(res, async () => {
  const body = req.body || {};
  if (!body.home_id) throw httpError(400, 'home_id is required');
  try {
    const doc = { ...body, created_at: body.created_at ? new Date(body.created_at) : new Date() };
    const result = await homesCollection.insertOne(doc);
    res.status(201).json({ home: { ...doc, _id: result.insertedId } });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, `Home with home_id '${body.home_id}' already exists`);
    throw err;
  }
}));

app.patch('/api/homes/:id', requireApiKey, (req, res) => route(res, async () => {
  const filter = findHomeFilter(req.params.id);
  const { _id, ...updates } = req.body || {};
  const updated = await homesCollection.findOneAndUpdate(
    filter,
    { $set: { ...updates, updated_at: new Date() } },
    { returnDocument: 'after' },
  );
  const doc = updated && updated.value !== undefined ? updated.value : updated;
  if (!doc) throw httpError(404, 'Home not found');
  res.json({ home: doc });
}));

app.delete('/api/homes/:id', requireApiKey, (req, res) => route(res, async () => {
  const filter = findHomeFilter(req.params.id);
  const result = await homesCollection.deleteOne(filter);
  if (result.deletedCount === 0) throw httpError(404, 'Home not found');
  res.json({ deleted: true, id: req.params.id });
}));

// Devices Registry CRUD
app.get('/api/devices', (req, res) => route(res, async () => {
  const devices = await devicesCollection.find().toArray();
  res.json({ count: devices.length, devices });
}));

app.get('/api/devices/:id', (req, res) => route(res, async () => {
  const device = await devicesCollection.findOne(findDeviceFilter(req.params.id));
  if (!device) throw httpError(404, 'Device not found');
  res.json({ device });
}));

app.post('/api/devices', requireApiKey, (req, res) => route(res, async () => {
  const body = req.body || {};
  if (!body.device_id) throw httpError(400, 'device_id is required');
  try {
    const doc = { ...body, installed_at: body.installed_at ? new Date(body.installed_at) : new Date() };
    const result = await devicesCollection.insertOne(doc);
    res.status(201).json({ device: { ...doc, _id: result.insertedId } });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, `Device with device_id '${body.device_id}' already exists`);
    throw err;
  }
}));

app.patch('/api/devices/:id', requireApiKey, (req, res) => route(res, async () => {
  const filter = findDeviceFilter(req.params.id);
  const { _id, ...updates } = req.body || {};
  const updated = await devicesCollection.findOneAndUpdate(
    filter,
    { $set: { ...updates, updated_at: new Date() } },
    { returnDocument: 'after' },
  );
  const doc = updated && updated.value !== undefined ? updated.value : updated;
  if (!doc) throw httpError(404, 'Device not found');
  res.json({ device: doc });
}));

app.delete('/api/devices/:id', requireApiKey, (req, res) => route(res, async () => {
  const filter = findDeviceFilter(req.params.id);
  const result = await devicesCollection.deleteOne(filter);
  if (result.deletedCount === 0) throw httpError(404, 'Device not found');
  res.json({ deleted: true, id: req.params.id });
}));

// Closed-loop Actuator Control State
app.get('/api/telemetry/control', (req, res) => route(res, async () => {
  res.json(getControlState());
}));

app.post('/api/telemetry/control', requireApiKey, (req, res) => route(res, async () => {
  const updated = setControlState(req.body || {});
  res.json({ success: true, control: updated });
}));

// Telemetry Queries
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

// Water Management Analytics Endpoints
app.get('/api/analytics/consumption/today', (req, res) => route(res, async () => {
  const deviceId = req.query.device_id || HOME_HUB.device_id;
  const result = await getTodayConsumption(client.db(DB_NAME), deviceId);
  res.json({ device_id: deviceId, ...result });
}));

app.get('/api/analytics/consumption/daily', (req, res) => route(res, async () => {
  const deviceId = req.query.device_id || HOME_HUB.device_id;
  const days = req.query.days ? parseInt(req.query.days, 10) : 14;
  const result = await getDailyConsumption(client.db(DB_NAME), deviceId, days);
  res.json({ device_id: deviceId, days, series: result });
}));

app.get('/api/analytics/consumption/monthly', (req, res) => route(res, async () => {
  const deviceId = req.query.device_id || HOME_HUB.device_id;
  const result = await getMonthlyConsumption(client.db(DB_NAME), deviceId);
  res.json({ device_id: deviceId, ...result });
}));

app.get('/api/analytics/prediction', (req, res) => route(res, async () => {
  const deviceId = req.query.device_id || HOME_HUB.device_id;
  const result = await predictDepletion(client.db(DB_NAME), deviceId);
  res.json({ device_id: deviceId, ...result });
}));

app.get('/api/analytics/summary', (req, res) => route(res, async () => {
  const deviceId = req.query.device_id || HOME_HUB.device_id;
  const summary = await getAnalyticsSummary(client.db(DB_NAME), deviceId);
  res.json(summary);
}));

// Smart Alerts Endpoints
app.get('/api/alerts', (req, res) => route(res, async () => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.device_id) filter.device_id = req.query.device_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.alert_type) filter.alert_type = req.query.alert_type;

  const [total, items] = await Promise.all([
    alertsCollection.countDocuments(filter),
    alertsCollection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((alert) => ({
      ...alert,
      _id: String(alert._id),
      timestamp: alert.timestamp instanceof Date ? alert.timestamp.toISOString() : alert.timestamp,
    })),
  });
}));

app.patch('/api/alerts/:id/ack', (req, res) => route(res, async () => {
  const _id = parseObjectId(req.params.id);
  const result = await alertsCollection.findOneAndUpdate(
    { _id },
    { $set: { status: 'acknowledged', acknowledged_at: new Date() } },
    { returnDocument: 'after' },
  );
  const doc = result && result.value !== undefined ? result.value : result;
  if (!doc) throw httpError(404, 'Alert not found');
  res.json({
    success: true,
    alert: {
      ...doc,
      _id: String(doc._id),
      timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
    },
  });
}));

app.post('/api/alerts/test-telegram', (req, res) => route(res, async () => {
  const customMessage = (req.body && req.body.message) || '🔔 Manual Test: Smart Water Platform Telegram alerts are online!';
  await sendTelegram(`🚨 *MANUAL TEST NOTIFICATION*\n${customMessage}\n• Timestamp: \`${new Date().toISOString()}\``);
  res.json({ success: true, message: 'Telegram test alert dispatched successfully.' });
}));

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
  if (alertsCollection) {
    if (doc.alert) {
      alertsCollection.insertOne({
        device_id: doc.device_id,
        alert_type: doc.alert_reasons[0] || 'ALERT',
        severity: doc.alert_reasons.some((r) => r.includes('OVERFLOW') || r.includes('LEAK')) ? 'critical' : 'warning',
        reasons: doc.alert_reasons,
        message: `Operational alert: ${doc.alert_reasons.join(', ')}`,
        timestamp: doc.timestamp,
        status: 'unread',
        acknowledged: false,
      }).catch(() => {});
    }
    // Also evaluate overnight abnormal water usage
    evaluateAbnormalOvernightUsage(client.db(DB_NAME), doc.device_id).catch(() => {});
  }
  try {
    await notifyAlertTransition(previous, doc);
  } catch (err) {
    console.error('[telegram] send failed', err.message);
  }
  return doc;
}

// Telemetry Mutations (Guarded by API Key and Admin Flag)
app.post('/api/telemetry', requireApiKey, requireTelemetryAdmin, (req, res) => route(res, async () => {
  const body = req.body || {};
  const doc = readingFromLevel(body.ultrasonic_depth_pct, body.timestamp || new Date());
  doc.source = 'api';
  try {
    await insertReading(doc);
    res.status(201).json({ reading: serializeReading(doc) });
  } catch (err) {
    if (err.code === 11000) {
      throw httpError(409, 'Duplicate reading: reading for this device and timestamp already exists');
    }
    throw err;
  }
}));

app.patch('/api/telemetry/:id([a-fA-F0-9]{24})', requireApiKey, requireTelemetryAdmin, (req, res) => route(res, async () => {
  const _id = parseObjectId(req.params.id);
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

app.delete('/api/telemetry/:id([a-fA-F0-9]{24})', requireApiKey, requireTelemetryAdmin, (req, res) => route(res, async () => {
  const _id = parseObjectId(req.params.id);
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
    clientId: 'smart-tank-ingestion-service',
    clean: false,
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
      ingestionStats.rejected += 1;
      console.error(`[ingest] rejected non-JSON on ${topic}`);
      if (rejectedCollection) {
        await rejectedCollection.insertOne({
          topic,
          payload: body.toString(),
          reason: 'invalid_json',
          received_at: new Date(),
        }).catch(() => {});
      }
      return;
    }

    const problem = validatePayload(payload);
    if (problem) {
      ingestionStats.rejected += 1;
      console.error(`[ingest] rejected ${topic}: ${problem}`);
      if (rejectedCollection) {
        await rejectedCollection.insertOne({
          topic,
          payload,
          reason: problem,
          received_at: new Date(),
        }).catch(() => {});
      }
      return;
    }

    try {
      const doc = toStoredReading(payload);
      doc.source = 'mqtt';
      await insertReading(doc);
      ingestionStats.stored += 1;
      const flag = doc.alert ? ` alert=${doc.alert_reasons.join(',')}` : '';
      console.log(`[ingest] stored ${doc.device_id} ${doc.timestamp.toISOString()}${flag}`);
    } catch (err) {
      if (err.code === 11000) {
        ingestionStats.duplicates += 1;
        console.log(`[ingest] duplicate skipped: ${payload.device_id} ${payload.timestamp}`);
      } else {
        console.error('[ingest] insert failed', err.message);
      }
    }
  });
}

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection(COLLECTION);
  homesCollection = db.collection(COLLECTIONS.HOMES || 'homes');
  devicesCollection = db.collection(COLLECTIONS.DEVICES || 'devices');
  alertsCollection = db.collection(COLLECTIONS.ALERTS || 'alerts');
  rejectedCollection = db.collection(COLLECTIONS.REJECTED_MESSAGES || 'rejected_messages');

  await ensureAllIndexes(db);
  console.log(`[api] indexes ensured on ${DB_NAME} collections (readings, devices, homes, alerts, rejected_messages)`);

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
