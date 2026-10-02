/**
 * Writes synthetic_sensor_dataset.json and loads those documents into
 * smart_water.sensor_activations. Live MQTT readings are left in place.
 * 1200 tank documents, timestamps stepping forward from 2026-09-01
 * by a random 3–8 second gap.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { COLLECTION, DB_NAME, MONGO_URI } = require('./lib/config');
const { HOME_HUB, buildPayload, toStoredReading } = require('./lib/devices');
const { ensureIndexes, ensureAllIndexes } = require('./lib/indexes');

const START = new Date('2026-09-01T00:00:00.000Z');
const COUNT = 1200;

const SAMPLE_HOMES = [
  {
    home_id: 'H001',
    owner: 'Alex Mercer',
    address: '142 Elm Road',
    city: 'Birmingham',
    postcode: 'B4 7ET',
    country: 'UK',
    water_tariff: 'Smart Standard Meter (0.0018 GBP/L)',
    created_at: new Date('2026-01-15T09:00:00Z'),
  },
  {
    home_id: 'H002',
    owner: 'Elena Rostova',
    address: '77 Highfield Crescent',
    city: 'Coventry',
    postcode: 'CV1 5FB',
    country: 'UK',
    water_tariff: 'EcoSaver Tiered (0.0015 GBP/L)',
    created_at: new Date('2026-02-20T11:30:00Z'),
  },
];

const SAMPLE_DEVICES = [
  {
    device_id: 'HOME_HUB_01',
    home_id: 'H001',
    device_type: 'water_tank',
    location: 'rooftop_loft',
    tank_capacity_l: 2000,
    sensor_height_cm: 200,
    firmware: 'v2.4.1',
    status: 'active',
    telemetry_topic: 'iothings/home/telemetry',
    command_topic: 'iothings/home/commands',
    installed_at: new Date('2026-01-18T10:00:00Z'),
  },
  {
    device_id: 'HOME_HUB_02',
    home_id: 'H002',
    device_type: 'water_tank',
    location: 'basement_utility',
    tank_capacity_l: 1500,
    sensor_height_cm: 180,
    firmware: 'v2.4.1',
    status: 'active',
    telemetry_topic: 'iothings/home/telemetry',
    command_topic: 'iothings/home/commands',
    installed_at: new Date('2026-02-22T14:15:00Z'),
  },
  {
    device_id: 'D-TEMP-01',
    home_id: 'H001',
    device_type: 'temperature_sensor',
    room: 'living_room',
    firmware: 'v1.3.2',
    status: 'active',
    installed_at: new Date('2026-01-18T10:30:00Z'),
  },
  {
    device_id: 'D-POW-01',
    home_id: 'H001',
    device_type: 'smart_meter',
    room: 'utility',
    firmware: 'v2.1.0',
    status: 'active',
    installed_at: new Date('2026-01-18T11:00:00Z'),
  },
];

function gapMs() {
  return 3000 + Math.floor(Math.random() * 5001);
}

function toJson(doc) {
  return {
    ...doc,
    timestamp: doc.timestamp.toISOString(),
    ingested_at: doc.ingested_at.toISOString(),
  };
}

function buildDocs() {
  let cursor = START.getTime();
  const docs = [];
  for (let index = 0; index < COUNT; index += 1) {
    if (index > 0) cursor += gapMs();
    const at = new Date(cursor);
    const doc = toStoredReading(buildPayload({ timestamp: at }), new Date(cursor + 150));
    doc.source = 'seed';
    docs.push(doc);
  }
  return docs;
}

async function main() {
  const docs = buildDocs();
  const out = path.join(__dirname, '..', 'synthetic_sensor_dataset.json');
  fs.writeFileSync(out, `${JSON.stringify(docs.map(toJson), null, 2)}\n`);
  console.log(`[seed] wrote ${docs.length} documents to ${out}`);

  const mongo = new MongoClient(MONGO_URI, {
    retryWrites: true,
    retryReads: true,
    writeConcern: { w: 'majority' },
    serverSelectionTimeoutMS: 8000,
  });
  await mongo.connect();
  const db = mongo.db(DB_NAME);

  // 1. Seed homes
  const homesCollection = db.collection('homes');
  await homesCollection.deleteMany({});
  await homesCollection.insertMany(SAMPLE_HOMES);
  console.log(`[seed] seeded ${SAMPLE_HOMES.length} homes`);

  // 2. Seed devices
  const devicesCollection = db.collection('devices');
  await devicesCollection.deleteMany({});
  await devicesCollection.insertMany(SAMPLE_DEVICES);
  console.log(`[seed] seeded ${SAMPLE_DEVICES.length} devices`);

  // 3. Seed sensor activations (telemetry)
  const collection = db.collection(COLLECTION);
  const removed = await collection.deleteMany(
    { device_id: HOME_HUB.device_id, source: 'seed' },
    { writeConcern: { w: 'majority' } },
  );
  console.log(`[seed] removed ${removed.deletedCount} previous seed documents`);
  for (let offset = 0; offset < docs.length; offset += 500) {
    const batch = docs.slice(offset, offset + 500);
    await collection.insertMany(batch, { writeConcern: { w: 'majority' }, ordered: true });
    console.log(`[seed] inserted ${Math.min(offset + 500, docs.length)} / ${docs.length}`);
  }

  // 4. Seed alerts audit collection
  const alertsCollection = db.collection('alerts');
  await alertsCollection.deleteMany({ source: 'seed' });
  const alertDocs = docs
    .filter((d) => d.alert)
    .slice(0, 60)
    .map((d) => ({
      device_id: d.device_id,
      home_id: 'H001',
      severity: d.alert_reasons.some((r) => r.includes('OVERFLOW') || r.includes('LEAK')) ? 'critical' : 'warning',
      reasons: d.alert_reasons,
      message: `Operational alert: ${d.alert_reasons.join(', ')}`,
      timestamp: d.timestamp,
      acknowledged: false,
      source: 'seed',
    }));
  if (alertDocs.length > 0) {
    await alertsCollection.insertMany(alertDocs);
    console.log(`[seed] seeded ${alertDocs.length} alert records into alerts collection`);
  }

  await ensureAllIndexes(db);
  console.log(`[seed] all indexes verified on ${DB_NAME} (sensor_activations, homes, devices, alerts)`);
  await mongo.close();
}

main().catch((err) => {
  console.error('[seed] failed', err.message);
  process.exit(1);
});
