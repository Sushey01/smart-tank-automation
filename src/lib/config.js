const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGO_URI = process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/smart_water?replicaSet=rs0';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';
const PORT = Number(process.env.PORT) || 3000;

function databaseName(uri) {
  const match = String(uri).match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/);
  return match ? match[1] : 'smart_water';
}

const API_KEY = process.env.API_KEY || '';
const ENABLE_TELEMETRY_ADMIN = process.env.ENABLE_TELEMETRY_ADMIN === 'true';

module.exports = {
  MONGO_URI,
  MQTT_URL,
  PORT,
  API_KEY,
  ENABLE_TELEMETRY_ADMIN,
  DB_NAME: databaseName(MONGO_URI),
  COLLECTION: 'sensor_activations',
  COLLECTIONS: {
    READINGS: 'sensor_activations',
    HOMES: 'homes',
    DEVICES: 'devices',
    ALERTS: 'alerts',
    REJECTED_MESSAGES: 'rejected_messages',
    FAILOVER_PROBE: 'failover_probe',
  },
};
