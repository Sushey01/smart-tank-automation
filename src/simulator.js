/**
 * Publishes HOME_HUB_01 at QoS 1.
 * The scheduler starts from a single connect event so a reconnect
 * does not create a second timer.
 */

const mqtt = require('mqtt');
const { MQTT_URL } = require('./lib/config');
const { TELEMETRY_TOPIC, buildPayload } = require('./lib/devices');

function nextDelayMs() {
  return 2000 + Math.floor(Math.random() * 7000);
}

const client = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 2000,
  clientId: `smart-tank-simulator-${process.pid}`,
});

client.once('connect', () => {
  console.log(`[simulator] connected ${MQTT_URL}`);
  const tick = () => {
    const payload = buildPayload();
    client.publish(TELEMETRY_TOPIC, JSON.stringify(payload), { qos: 1 }, (pubErr) => {
      if (pubErr) console.error(`[simulator] publish failed ${TELEMETRY_TOPIC}`, pubErr.message);
      else console.log(`[simulator] ${TELEMETRY_TOPIC} qos=1`);
    });
    setTimeout(tick, nextDelayMs());
  };
  tick();
});

client.on('error', (err) => {
  console.error('[simulator] mqtt error', err.message);
});

client.on('reconnect', () => {
  console.log('[simulator] reconnecting (scheduler stays as it is)');
});
