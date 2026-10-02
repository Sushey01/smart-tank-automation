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

async function ensureAllIndexes(db) {
  const readings = db.collection('sensor_activations');
  await ensureIndexes(readings);

  const devices = db.collection('devices');
  await devices.createIndex({ device_id: 1 }, { unique: true, name: 'device_id_unique' }).catch(() => {});
  await devices.createIndex({ home_id: 1 }, { name: 'device_home' }).catch(() => {});

  const homes = db.collection('homes');
  await homes.createIndex({ home_id: 1 }, { unique: true, name: 'home_id_unique' }).catch(() => {});

  const alerts = db.collection('alerts');
  await alerts.createIndex({ device_id: 1, timestamp: -1 }, { name: 'alert_device_time' }).catch(() => {});
  await alerts.createIndex({ severity: 1, timestamp: -1 }, { name: 'alert_severity_time' }).catch(() => {});
}

module.exports = { ensureIndexes, ensureAllIndexes, THIRTY_DAYS_SECONDS };
