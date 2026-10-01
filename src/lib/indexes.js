const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

async function ensureIndexes(collection) {
  await collection.createIndex(
    { device_id: 1, timestamp: -1 },
    { name: 'device_time' },
  );
  await collection.createIndex(
    { alert: 1, timestamp: -1 },
    { name: 'alert_time' },
  );
  await collection.createIndex(
    { device_type: 1, timestamp: -1 },
    { name: 'type_time' },
  );
  await collection.createIndex(
    { timestamp: 1 },
    { name: 'timestamp_ttl', expireAfterSeconds: THIRTY_DAYS_SECONDS },
  );
}

module.exports = { ensureIndexes, THIRTY_DAYS_SECONDS };
