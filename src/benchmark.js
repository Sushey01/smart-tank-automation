/**
 * Compare a collection scan with the device_time index.
 * node src/benchmark.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://localhost:27117,localhost:27118,localhost:27119/iothings?replicaSet=rs0';

function pickStats(explain) {
  const stats = explain.executionStats || {};
  const stage = stats.executionStages || {};
  return {
    docsExamined: stats.totalDocsExamined ?? stage.docsExamined,
    keysExamined: stats.totalKeysExamined ?? stage.keysExamined,
    executionTimeMillis: stats.executionTimeMillis,
  };
}

async function explainWith(collection, hint, label) {
  const explain = await collection
    .find({ device_id: 'TANK_01' })
    .sort({ timestamp: -1 })
    .limit(50)
    .hint(hint)
    .explain('executionStats');
  const stats = pickStats(explain);
  console.log(`\n${label}`);
  console.log(`  docsExamined:        ${stats.docsExamined}`);
  console.log(`  keysExamined:        ${stats.keysExamined}`);
  console.log(`  executionTimeMillis: ${stats.executionTimeMillis}`);
}

async function main() {
  const mongo = new MongoClient(MONGO_URI, { retryReads: true });
  await mongo.connect();
  const collection = mongo.db('iothings').collection('sensor_readings');
  console.log('Query: find({ device_id: "TANK_01" }).sort({ timestamp: -1 }).limit(50)');
  await explainWith(collection, { $natural: 1 }, 'hint {$natural:1} (collection order, no device_time index)');
  await explainWith(collection, 'device_time', 'hint device_time ({device_id:1, timestamp:-1})');
  await mongo.close();
}

main().catch((err) => {
  console.error('[benchmark] failed', err.message);
  process.exit(1);
});
