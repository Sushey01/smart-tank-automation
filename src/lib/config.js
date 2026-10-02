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

module.exports = {
  MONGO_URI,
  MQTT_URL,
  PORT,
  DB_NAME: databaseName(MONGO_URI),
  COLLECTION: 'sensor_activations',
  COLLECTIONS: {
    READINGS: 'sensor_activations',
    HOMES: 'homes',
    DEVICES: 'devices',
    ALERTS: 'alerts',
  },
};
