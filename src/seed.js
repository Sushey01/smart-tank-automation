/**
 * Direct bulk load of synthetic readings.
 * Usage: node src/seed.js [total]
 * Timestamps step forward by 2–9 s per device and finish near now.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { devices, buildPayload, toStoredReading } = require('./lib/devices');
const { ensureIndexes } = require('./lib/indexes');

const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://localhost:27117,localhost:27118,localhost:27119/iothings?replicaSet=rs0';

function gapMs() {
  return 2000 + Math.floor(Math.random() * 7000);
}

function buildSeries(device, count) {
  const gaps = Array.from({ length: count }, gapMs);
  const span = gaps.reduce((sum, gap) => sum + gap, 0);
  let cursor = Date.now() - span;
  const docs = [];
  let energy = 40;
  for (let index = 0; index < count; index += 1) {
    cursor += gaps[index];
    energy += 0.01 + Math.random() * 0.04;
    const payload = buildPayload(device, {
      timestamp: new Date(cursor),
      energyKwh: energy,
    });
    docs.push(toStoredReading(payload, new Date(cursor + 150)));
  }
  return docs;
}

function toJsonSample(doc) {
  return {
    ...doc,
    timestamp: doc.timestamp.toISOString(),
    ingested_at: doc.ingested_at.toISOString(),
  };
}

async function main() {
  const totalArg = process.argv[2];
  const total = totalArg === undefined ? 10000 : Number(totalArg);
  if (!Number.isInteger(total) || total < devices.length) {
    console.error('Usage: node src/seed.js [total]  (total must be an integer >= device count)');
    process.exit(1);
  }

  const base = Math.floor(total / devices.length);
  let remainder = total % devices.length;
  const counts = devices.map(() => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });

  const docs = devices.flatMap((device, index) => buildSeries(device, counts[index]));
  const mongo = new MongoClient(MONGO_URI, {
    retryWrites: true,
    retryReads: true,
    writeConcern: { w: 'majority' },
  });

  await mongo.connect();
  const collection = mongo.db('iothings').collection('sensor_readings');
  const removed = await collection.deleteMany({});
  console.log(`[seed] cleared ${removed.deletedCount} existing documents`);

  for (let offset = 0; offset < docs.length; offset += 5000) {
    const batch = docs.slice(offset, offset + 5000);
    await collection.insertMany(batch, { writeConcern: { w: 'majority' }, ordered: true });
    console.log(`[seed] inserted ${Math.min(offset + 5000, docs.length)} / ${docs.length}`);
  }

  await ensureIndexes(collection);
  const samplePath = path.join(__dirname, '..', 'synthetic_sensor_dataset_sample.json');
  fs.writeFileSync(samplePath, `${JSON.stringify(docs.slice(0, 200).map(toJsonSample), null, 2)}\n`);
  console.log(`[seed] wrote 200-document sample to ${samplePath}`);
  console.log('[seed] done. Data is synthetic. TTL on timestamp is 30 days.');
  await mongo.close();
}

main().catch((err) => {
  console.error('[seed] failed', err.message);
  process.exit(1);
});
