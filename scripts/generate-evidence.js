/**
 * Evidence Generation Helper Script.
 * Extracts live replica set status, per-member counts, collection indexes,
 * and sample documents directly from the database into evidence/ folder.
 * Every evidence file begins with an ISO timestamp.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient, ReadPreference } = require('mongodb');
const { MONGO_URI, DB_NAME, COLLECTION } = require('../src/lib/config');

async function main() {
  console.log('============================================================');
  console.log(' Generating Live Database Evidence for Coursework Report');
  console.log('============================================================\n');

  const evidenceDir = path.join(__dirname, '..', 'evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileTimestamp = Date.now();

  const client = new MongoClient(MONGO_URI, {
    retryReads: true,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  // 1. Extract rs.status() summary
  let rsSummary = { timestamp, error: null, set: 'unknown', members: [] };
  try {
    const adminDb = client.db('admin');
    const rawStatus = await adminDb.command({ replSetGetStatus: 1 });
    rsSummary.set = rawStatus.set;
    rsSummary.members = (rawStatus.members || []).map((m) => ({
      name: m.name,
      state: m.stateStr,
      health: m.health,
      uptime_seconds: m.uptime,
      electionTime: m.electionTime ? m.electionTime.toString() : null,
      optimeDate: m.optimeDate ? m.optimeDate.toISOString() : null,
    }));
  } catch (err) {
    rsSummary.error = err.message;
  }
  const rsFile = path.join(evidenceDir, `rs-status-${fileTimestamp}.json`);
  fs.writeFileSync(rsFile, JSON.stringify(rsSummary, null, 2));
  console.log(`[evidence] Saved replica set status to ${rsFile}`);

  // 2. Extract per-member document counts for sensor_activations
  const memberCounts = { timestamp, main_collection: COLLECTION, counts: {} };
  for (const port of [27017, 27018, 27019]) {
    const directUri = `mongodb://127.0.0.1:${port}/${DB_NAME}?directConnection=true`;
    const directClient = new MongoClient(directUri, {
      serverSelectionTimeoutMS: 2000,
      readPreference: new ReadPreference('secondaryPreferred'),
    });
    try {
      await directClient.connect();
      const count = await directClient.db(DB_NAME).collection(COLLECTION).countDocuments();
      memberCounts.counts[`127.0.0.1:${port}`] = { status: 'ONLINE', count };
      await directClient.close();
    } catch (err) {
      memberCounts.counts[`127.0.0.1:${port}`] = { status: 'OFFLINE / UNREACHABLE', error: err.message };
    }
  }
  const countsFile = path.join(evidenceDir, `member-counts-${fileTimestamp}.json`);
  fs.writeFileSync(countsFile, JSON.stringify(memberCounts, null, 2));
  console.log(`[evidence] Saved per-member document counts to ${countsFile}`);

  // 3. Extract Index List with TTL details
  const rawIndexes = await collection.indexes();
  const indexSummary = {
    timestamp,
    database: DB_NAME,
    collection: COLLECTION,
    indexes: rawIndexes.map((idx) => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique || false,
      expireAfterSeconds: idx.expireAfterSeconds || null,
    })),
  };
  const indexesFile = path.join(evidenceDir, `indexes-${fileTimestamp}.json`);
  fs.writeFileSync(indexesFile, JSON.stringify(indexSummary, null, 2));
  console.log(`[evidence] Saved index definitions to ${indexesFile}`);

  // 4. Extract 3 Sample Documents
  const samples = await collection.find({}).sort({ timestamp: -1 }).limit(3).toArray();
  const sampleSummary = {
    timestamp,
    database: DB_NAME,
    collection: COLLECTION,
    sample_count: samples.length,
    documents: samples,
  };
  const samplesFile = path.join(evidenceDir, `sample-documents-${fileTimestamp}.json`);
  fs.writeFileSync(samplesFile, JSON.stringify(sampleSummary, null, 2));
  console.log(`[evidence] Saved 3 sample documents to ${samplesFile}`);

  console.log('\n[evidence] All live database evidence extracted successfully.');
  await client.close();
}

main().catch((err) => {
  console.error('[evidence] extraction error:', err);
  process.exit(1);
});
