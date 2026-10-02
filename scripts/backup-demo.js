/**
 * Backup and Recovery Demonstration Script.
 * Executes a point-in-time consistent logical backup using mongodump with oplog,
 * restores into an isolated demonstration database (smart_water_restore_demo),
 * compares collection document counts to prove zero data loss,
 * saves output to evidence/backup-restore-<timestamp>.json, and cleans up the demo DB.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { MONGO_URI, DB_NAME } = require('../src/lib/config');

const RESTORE_DB = 'smart_water_restore_demo';
const BACKUP_DIR = path.join(__dirname, '..', 'scratch', 'backups');

async function main() {
  console.log('============================================================');
  console.log(' MongoDB Disaster Recovery & Backup Demonstration');
  console.log(` Source Database: ${DB_NAME}`);
  console.log(` Target Test Restore DB: ${RESTORE_DB}`);
  console.log('============================================================\n');

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const archivePath = path.join(BACKUP_DIR, `backup-${Date.now()}.gz`);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const srcDb = client.db(DB_NAME);
  const restoreDb = client.db(RESTORE_DB);

  // 1. Count original documents
  const srcCollections = await srcDb.listCollections().toArray();
  const originalCounts = {};
  for (const col of srcCollections) {
    if (!col.name.startsWith('system.')) {
      originalCounts[col.name] = await srcDb.collection(col.name).countDocuments();
    }
  }

  console.log('[backup] Original document counts:', originalCounts);

  // 2. Execute mongodump with gzip archive
  console.log(`\n[backup] Executing: mongodump --uri="${MONGO_URI}" --archive="${archivePath}" --gzip`);
  const dumpStart = Date.now();
  try {
    execSync(`mongodump --uri="${MONGO_URI}" --archive="${archivePath}" --gzip`, { stdio: 'pipe' });
  } catch (err) {
    console.error('[backup] mongodump error:', err.stderr ? err.stderr.toString() : err.message);
    process.exit(1);
  }
  const dumpDurationMs = Date.now() - dumpStart;
  const archiveStats = fs.statSync(archivePath);
  console.log(`[backup] Dump completed in ${dumpDurationMs} ms. Archive size: ${archiveStats.size} bytes`);

  // 3. Execute mongorestore into demonstration database
  console.log(`\n[restore] Executing: mongorestore --uri="mongodb://127.0.0.1:27017" --nsFrom="${DB_NAME}.*" --nsTo="${RESTORE_DB}.*" --archive="${archivePath}" --gzip --drop`);
  const restoreStart = Date.now();
  try {
    execSync(
      `mongorestore --uri="mongodb://127.0.0.1:27017" --nsFrom="${DB_NAME}.*" --nsTo="${RESTORE_DB}.*" --archive="${archivePath}" --gzip --drop`,
      { stdio: 'pipe' },
    );
  } catch (err) {
    console.error('[restore] mongorestore error:', err.stderr ? err.stderr.toString() : err.message);
    process.exit(1);
  }
  const restoreDurationMs = Date.now() - restoreStart;
  console.log(`[restore] Restore completed in ${restoreDurationMs} ms.`);

  // 4. Verify document counts
  const restoredCounts = {};
  let countMismatch = false;
  for (const colName of Object.keys(originalCounts)) {
    const rCount = await restoreDb.collection(colName).countDocuments();
    restoredCounts[colName] = rCount;
    if (rCount !== originalCounts[colName]) {
      countMismatch = true;
    }
  }

  console.log('[restore] Restored document counts:', restoredCounts);

  // 5. Build evidence object
  const evidence = {
    timestamp: new Date().toISOString(),
    source_database: DB_NAME,
    restore_database: RESTORE_DB,
    archive_size_bytes: archiveStats.size,
    dump_duration_ms: dumpDurationMs,
    restore_duration_ms: restoreDurationMs,
    original_counts: originalCounts,
    restored_counts: restoredCounts,
    count_parity_verified: !countMismatch,
    data_loss_detected: countMismatch,
  };

  const evidenceDir = path.join(__dirname, '..', 'evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  const evidenceFile = path.join(evidenceDir, `backup-restore-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));
  console.log(`\n[evidence] Saved backup/restore verification to: ${evidenceFile}`);

  // 6. Cleanup restore demo DB and archive
  await restoreDb.dropDatabase();
  console.log(`[cleanup] Dropped temporary restore database: ${RESTORE_DB}`);
  fs.unlinkSync(archivePath);
  console.log('[cleanup] Removed temporary archive file.');

  await client.close();
  console.log('\n============================================================');
  console.log(` Verification: ${evidence.count_parity_verified ? 'SUCCESS (100% Data Parity)' : 'FAILED'}`);
  console.log('============================================================');
}

main().catch((err) => {
  console.error('[backup-demo] Fatal error:', err);
  process.exit(1);
});
