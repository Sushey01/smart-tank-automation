/**
 * Query Execution Benchmark.
 * Compares unindexed collection scan (COLLSCAN) with compound B-Tree index (device_time).
 * Formats a comparative executionStats table and saves findings to evidence/benchmark-<count>.txt.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { COLLECTION, DB_NAME, MONGO_URI } = require('./lib/config');

function pickStats(explain) {
  const stats = explain.executionStats || {};
  const stage = stats.executionStages || {};
  return {
    docsExamined: stats.totalDocsExamined ?? stage.docsExamined ?? 0,
    keysExamined: stats.totalKeysExamined ?? stage.keysExamined ?? 0,
    nReturned: stats.nReturned ?? stage.nReturned ?? 0,
    executionTimeMillis: stats.executionTimeMillis ?? 0,
    stage: stage.stage || 'UNKNOWN',
  };
}

async function main() {
  console.log('============================================================');
  console.log(' MongoDB Query Performance Benchmark (CMP6207 Assessment Evidence)');
  console.log(' Evaluating Compound Index (device_time) vs. Full Collection Scan (COLLSCAN)');
  console.log('============================================================\n');

  const mongo = new MongoClient(MONGO_URI, { retryReads: true });
  await mongo.connect();
  const collection = mongo.db(DB_NAME).collection(COLLECTION);

  const docCount = await collection.countDocuments();
  console.log(`[benchmark] Current collection size (${COLLECTION}): ${docCount} documents\n`);

  const query = { device_id: 'HOME_HUB_01' };
  const sort = { timestamp: -1 };
  const limit = 50;

  // 1. Unindexed Collection Scan
  const collscanExplain = await collection
    .find(query)
    .sort(sort)
    .limit(limit)
    .hint({ $natural: 1 })
    .explain('executionStats');
  const collStats = pickStats(collscanExplain);

  // 2. Compound Index Scan
  const indexExplain = await collection
    .find(query)
    .sort(sort)
    .limit(limit)
    .hint('device_time')
    .explain('executionStats');
  const idxStats = pickStats(indexExplain);

  const speedup =
    idxStats.executionTimeMillis === 0
      ? (collStats.executionTimeMillis > 0 ? `${collStats.executionTimeMillis}x+` : 'Instant (<1ms)')
      : `${(collStats.executionTimeMillis / idxStats.executionTimeMillis).toFixed(1)}x`;

  const outputLines = [
    '========================================================================================',
    '                           QUERY EXECUTION BENCHMARK RESULTS                            ',
    '========================================================================================',
    `Database:               ${DB_NAME}`,
    `Collection:             ${COLLECTION}`,
    `Total Stored Documents: ${docCount}`,
    `Query Pattern:          find({ device_id: "HOME_HUB_01" }).sort({ timestamp: -1 }).limit(50)`,
    `Timestamp:              ${new Date().toISOString()}`,
    '----------------------------------------------------------------------------------------',
    'Metric                          COLLSCAN (Unindexed)      IXSCAN (device_time)    Difference',
    '----------------------------------------------------------------------------------------',
    `Query Execution Stage           ${collStats.stage.padEnd(25)} ${idxStats.stage.padEnd(23)} Index B-Tree Scan`,
    `Documents Returned              ${String(collStats.nReturned).padEnd(25)} ${String(idxStats.nReturned).padEnd(23)} Exact Match (50)`,
    `Documents Examined (Read)       ${String(collStats.docsExamined).padEnd(25)} ${String(idxStats.docsExamined).padEnd(23)} ${collStats.docsExamined - idxStats.docsExamined} fewer reads`,
    `Keys Examined                   ${String(collStats.keysExamined).padEnd(25)} ${String(idxStats.keysExamined).padEnd(23)} O(log N) traversal`,
    `Execution Time (ms)             ${String(collStats.executionTimeMillis + ' ms').padEnd(25)} ${String(idxStats.executionTimeMillis + ' ms').padEnd(23)} Speedup: ${speedup}`,
    '========================================================================================',
    '',
    'Theoretical Analysis:',
    '- In the COLLSCAN stage, the query engine performs a linear O(N) traversal across all',
    `  ${docCount} documents in memory/disk to identify candidate matches and apply in-memory sorting.`,
    '- With the compound B-Tree index { device_id: 1, timestamp: -1 }, candidate keys are co-located',
    '  in sorted temporal order. The database engine performs an efficient O(log N) index seek and',
    `  reads only the exact ${idxStats.docsExamined} documents needed, eliminating sorting overhead.`,
  ];

  const reportText = outputLines.join('\n');
  console.log(reportText);

  const evidenceDir = path.join(__dirname, '..', 'evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const evidenceFile = path.join(evidenceDir, `benchmark-${docCount}.txt`);
  fs.writeFileSync(evidenceFile, reportText);
  console.log(`\n[benchmark] Benchmark report saved to ${evidenceFile}`);

  await mongo.close();
}

main().catch((err) => {
  console.error('[benchmark] failed:', err);
  process.exit(1);
});
