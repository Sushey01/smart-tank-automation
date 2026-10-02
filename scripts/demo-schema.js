/**
 * Schema Evolution Demonstration Script.
 * Inserts sample documents with firmware v2.4.1 (baseline) and v2.5.0 (with water_quality TDS/pH),
 * then queries and displays both heterogeneous document shapes side-by-side.
 * Demonstrates MongoDB's polymorphic document model without ALTER TABLE downtime.
 */

const { MongoClient } = require('mongodb');
const { DB_NAME, MONGO_URI, COLLECTION } = require('../src/lib/config');
const { buildPayload, toStoredReading } = require('../src/lib/devices');

async function main() {
  console.log('============================================================');
  console.log(' IoThings Schema Evolution Demo (CMP6207 Assessment Evidence)');
  console.log(' Demonstrating polymorphic semi-structured documents in MongoDB');
  console.log('============================================================\n');

  const client = new MongoClient(MONGO_URI, {
    retryWrites: true,
    retryReads: true,
    writeConcern: { w: 'majority' },
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION);

    const now = Date.now();

    // 1. Generate v2.4.1 document (Standard baseline)
    const docV24 = toStoredReading(
      buildPayload({
        levelPct: 58.0,
        firmware: 'v2.4.1',
        timestamp: new Date(now - 10000),
      }),
      new Date(),
    );
    docV24.source = 'schema_demo_v2.4.1';

    // 2. Generate v2.5.0 document (Extended with water_quality IoT telemetry)
    const docV25 = toStoredReading(
      buildPayload({
        levelPct: 59.5,
        firmware: 'v2.5.0',
        timestamp: new Date(now),
      }),
      new Date(),
    );
    docV25.source = 'schema_demo_v2.5.0';

    await collection.insertOne(docV24, { writeConcern: { w: 'majority' } });
    await collection.insertOne(docV25, { writeConcern: { w: 'majority' } });

    console.log('[schema-demo] Successfully inserted both v2.4.1 and v2.5.0 documents into smart_water.sensor_activations\n');

    // 3. Query back both documents
    const queryResults = await collection
      .find({ source: { $in: ['schema_demo_v2.4.1', 'schema_demo_v2.5.0'] } })
      .sort({ timestamp: -1 })
      .limit(2)
      .toArray();

    console.log('--- Document 1: Firmware v2.5.0 (Evolved Shape with water_quality) ---');
    console.dir(
      {
        _id: queryResults[0]._id,
        firmware: queryResults[0].metadata.firmware,
        timestamp: queryResults[0].timestamp,
        telemetry: queryResults[0].telemetry,
      },
      { depth: null, colors: true },
    );

    console.log('\n--- Document 2: Firmware v2.4.1 (Baseline Shape without water_quality) ---');
    console.dir(
      {
        _id: queryResults[1]._id,
        firmware: queryResults[1].metadata.firmware,
        timestamp: queryResults[1].timestamp,
        telemetry: queryResults[1].telemetry,
      },
      { depth: null, colors: true },
    );

    console.log('\n============================================================');
    console.log(' Key Takeaway: MongoDB seamlessly stores and queries both schema');
    console.log(' versions within the same collection with zero migration downtime,');
    console.log(' zero null-value columns, and atomic write guarantees.');
    console.log('============================================================\n');

    // Clean up demo documents
    await collection.deleteMany({ source: { $in: ['schema_demo_v2.4.1', 'schema_demo_v2.5.0'] } });
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[schema-demo] failed:', err.message);
  process.exit(1);
});
