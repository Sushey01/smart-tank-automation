/**
 * Quorum Demonstration Script.
 * Attempts a majority write when replica set quorum is lost.
 * In a 3-node replica set, a minimum of 2 nodes (majority) must be alive.
 * If 2 nodes are down, the lone survivor steps down to SECONDARY and majority writes fail.
 */

const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME, COLLECTION } = require('../src/lib/config');

async function main() {
  console.log('============================================================');
  console.log(' MongoDB Replica Set Quorum Loss Demonstration');
  console.log(' Attempting write with w:"majority", wtimeoutMS: 3000, timeout: 5000ms');
  console.log('============================================================\n');

  const client = new MongoClient(MONGO_URI, {
    retryWrites: false, // Turn off automatic retry so we can directly observe the quorum error
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    console.log('[quorum] Connected. Attempting majority write...');
    const result = await collection.insertOne(
      {
        test: 'quorum_probe',
        timestamp: new Date(),
      },
      {
        writeConcern: {
          w: 'majority',
          wtimeoutMS: 3000,
        },
      },
    );

    console.log('[quorum] Write SUCCEEDED (Majority Quorum was present!):', result.insertedId);
    console.log('[quorum] To observe quorum failure, stop two of the three mongod nodes and rerun this script.');
  } catch (err) {
    console.log('\n[quorum] EXPECTED QUORUM FAILURE OBSERVED:');
    console.log(` Error Name:    ${err.name}`);
    console.log(` Error Message: ${err.message}`);
    console.log(` Error Code:    ${err.code || 'N/A'}`);
    console.log('\n[quorum] Theoretical Explanation:');
    console.log(' In a 3-node cluster, Quorum = floor(3/2) + 1 = 2 voting nodes.');
    console.log(' When 2 nodes are offline, the single remaining node cannot form a majority.');
    console.log(' It automatically steps down to SECONDARY. Majority writes are refused.');
    console.log(' However, read queries with readPreference: "secondary" can still read existing data.');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
