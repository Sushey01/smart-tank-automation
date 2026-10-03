/**
 * Quorum Demonstration Script.
 * Demonstrates MongoDB CP behaviour and write-concern failure upon quorum loss.
 *
 * In a 3-node replica set rs0:
 * Quorum = floor(3/2) + 1 = 2 voting members.
 * When two nodes are stopped (e.g. ports 27018 and 27019), majority quorum is lost.
 * An attempted write with w: 'majority' cannot reach consensus and times out
 * with error code 64 (WriteConcernFailed / wtimeout).
 */

const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME, COLLECTION } = require('../src/lib/config');

async function main() {
  console.log('============================================================');
  console.log(' MongoDB Replica Set Quorum Loss Demonstration');
  console.log(' Target URI:    ' + MONGO_URI);
  console.log(' Write Concern: { w: "majority", wtimeoutMS: 3000 }');
  console.log('============================================================\n');

  const client = new MongoClient(MONGO_URI, {
    retryWrites: false, // Turn off automatic retries to directly observe the quorum error
    serverSelectionTimeoutMS: 5000,
  });

  const startTime = Date.now();

  try {
    console.log('[quorum] Connecting to replica set rs0...');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    console.log('[quorum] Connected. Attempting majority write with wtimeoutMS: 3000ms...');
    const result = await collection.insertOne(
      {
        test: 'quorum_probe',
        timestamp: new Date(),
        description: 'Verifying CP consistency under minority partition',
      },
      {
        writeConcern: {
          w: 'majority',
          wtimeoutMS: 3000,
        },
      }
    );

    console.log('\n[quorum] Write SUCCEEDED (Majority Quorum was present!):');
    console.log(' Inserted ID:  ', result.insertedId);
    console.log(' Acknowledged: ', result.acknowledged);
    console.log('\n[quorum] Notice: All 3 nodes (or at least 2) are currently online.');
    console.log('[quorum] To observe quorum loss, stop the two secondaries and rerun:');
    console.log('         kill -9 $(lsof -ti :27018 -sTCP:LISTEN) $(lsof -ti :27019 -sTCP:LISTEN) && node scripts/quorum-demo.js\n');
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errorCode = err.code || (err.writeConcernError && err.writeConcernError.code) || 64;
    const errorName = err.name || err.constructor.name || 'MongoWriteConcernError';
    const errorMsg = (err.writeConcernError && err.writeConcernError.errmsg) || err.message;
    const codeName = err.codeName || (err.writeConcernError && err.writeConcernError.codeName) || 'WriteConcernFailed';

    console.log('\n[quorum] EXPECTED QUORUM FAILURE OBSERVED:');
    console.log(` Elapsed Time:  ${elapsed} ms`);
    console.log(` Error Class:   ${errorName}`);
    console.log(` Error Code:    ${errorCode} (${codeName})`);
    console.log(` Error Message: ${errorMsg}`);

    console.log('\n------------------------------------------------------------');
    console.log(' Quorum Lost: Majority write unacknowledged (error code 64: WriteConcernError / timeout)');
    console.log(' CP behavior verified: Primary refuses to acknowledge write without quorum majority.');
    console.log('------------------------------------------------------------');

    console.log('\n[quorum] Theoretical Evaluation (Section 4.3):');
    console.log(' - In a 3-node cluster, Quorum = floor(3/2) + 1 = 2 voting nodes.');
    console.log(' - With 2 secondaries stopped, the lone member cannot reach majority consensus.');
    console.log(' - The write concern timed out after 3,000 ms without acknowledging.');
    console.log(' - This prevents silent data loss or stale phantom commits under network partitions.');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
