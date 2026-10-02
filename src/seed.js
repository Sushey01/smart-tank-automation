/**
 * Writes synthetic_sensor_dataset.json and loads documents into smart_water.sensor_activations.
 * Supports configurable scale: node src/seed.js [COUNT] (e.g., npm run seed -- 100000).
 * Generates unique timestamps per device so the unique compound index { device_id: 1, timestamp: 1 } succeeds.
 * Seeds companion collections: homes, devices, alerts.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { COLLECTION, DB_NAME, MONGO_URI } = require('./lib/config');
const { HOME_HUB, buildPayload, toStoredReading } = require('./lib/devices');
const { ensureAllIndexes } = require('./lib/indexes');

const START = new Date('2026-09-01T00:00:00.000Z');

const countArg = process.argv.slice(2).find((arg) => /^\d+$/.test(arg));
const TARGET_COUNT = countArg ? parseInt(countArg, 10) : 1200;

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

async function main() {
  console.log('============================================================');
  console.log(` Seeding database ${DB_NAME} (Target documents: ${TARGET_COUNT})`);
  console.log('============================================================\n');

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

  // 3. Clear previous seed documents in sensor_activations
  const collection = db.collection(COLLECTION);
  const removed = await collection.deleteMany(
    { device_id: HOME_HUB.device_id, source: 'seed' },
    { writeConcern: { w: 'majority' } },
  );
  console.log(`[seed] removed ${removed.deletedCount} previous seed documents`);

  // Ensure all indexes exist before bulk inserting
  await ensureAllIndexes(db);
  console.log('[seed] verified indexes on all collections (including unique {device_id:1, timestamp:1})');

  // 4. Batched generation and insertion
  const BATCH_SIZE = 2000;
  let cursor = START.getTime();
  const sampleExport = [];
  const alertDocs = [];

  let insertedTotal = 0;

  for (let offset = 0; offset < TARGET_COUNT; offset += BATCH_SIZE) {
    const currentBatchSize = Math.min(BATCH_SIZE, TARGET_COUNT - offset);
    const batch = [];

    for (let i = 0; i < currentBatchSize; i += 1) {
      cursor += gapMs(); // Strictly increasing timestamp ensures uniqueness per device
      const at = new Date(cursor);
      const doc = toStoredReading(
        buildPayload({ timestamp: at, levelPct: 30 + (Math.sin(cursor / 500000) * 40 + 20) }),
        new Date(cursor + 100),
      );
      doc.source = 'seed';
      batch.push(doc);

      // Collect sample for synthetic_sensor_dataset.json (up to 1200 docs)
      if (sampleExport.length < 1200) {
        sampleExport.push(toJson(doc));
      }

      // Collect alert transitions
      if (doc.alert && alertDocs.length < 60) {
        alertDocs.push({
          device_id: doc.device_id,
          home_id: 'H001',
          severity: doc.alert_reasons.some((r) => r.includes('OVERFLOW') || r.includes('LEAK')) ? 'critical' : 'warning',
          reasons: doc.alert_reasons,
          message: `Operational alert: ${doc.alert_reasons.join(', ')}`,
          timestamp: doc.timestamp,
          acknowledged: false,
          source: 'seed',
        });
      }
    }

    await collection.insertMany(batch, { writeConcern: { w: 'majority' }, ordered: false });
    insertedTotal += batch.length;
    console.log(`[seed] inserted ${insertedTotal} / ${TARGET_COUNT} documents into ${COLLECTION}`);
  }

  // 5. Seed alerts collection
  const alertsCollection = db.collection('alerts');
  await alertsCollection.deleteMany({ source: 'seed' });
  if (alertDocs.length > 0) {
    await alertsCollection.insertMany(alertDocs);
    console.log(`[seed] seeded ${alertDocs.length} alert records into alerts collection`);
  }

  // 6. Write synthetic_sensor_dataset.json file
  const outPath = path.join(__dirname, '..', 'synthetic_sensor_dataset.json');
  fs.writeFileSync(outPath, `${JSON.stringify(sampleExport, null, 2)}\n`);
  console.log(`[seed] exported ${sampleExport.length} sample documents to ${outPath}`);

  console.log('\n[seed] Seed completed successfully. Data is synthetic (UK GDPR compliant).');
  await mongo.close();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
