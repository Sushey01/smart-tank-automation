/**
 * Publishes one independent QoS 1 stream per device.
 * Schedulers start from a single connect event so a reconnect
 * does not create a second timer per device.
 */

const mqtt = require('mqtt');
const { devices, buildPayload, topicFor } = require('./lib/devices');

const mqttUrl = process.env.MQTT_URL || 'mqtt://localhost:1883';
const energy = new Map(devices.map((device) => [device.device_id, 100]));

function nextDelayMs() {
  return 2000 + Math.floor(Math.random() * 7000);
}

const client = mqtt.connect(mqttUrl, {
  reconnectPeriod: 2000,
  clientId: `iothings-simulator-${process.pid}`,
});

client.once('connect', () => {
  console.log(`[simulator] connected ${mqttUrl}`);
  for (const device of devices) {
    const tick = () => {
      const readingEnergy = (energy.get(device.device_id) || 100) + Math.random() * 0.05;
      energy.set(device.device_id, readingEnergy);
      const payload = buildPayload(device, { energyKwh: readingEnergy });
      const topic = topicFor(device, 'telemetry');
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (pubErr) => {
        if (pubErr) console.error(`[simulator] publish failed ${topic}`, pubErr.message);
        else console.log(`[simulator] ${topic} qos=1`);
      });
      setTimeout(tick, nextDelayMs());
    };
    tick();
  }
});

client.on('error', (err) => {
  console.error('[simulator] mqtt error', err.message);
});

client.on('reconnect', () => {
  console.log('[simulator] reconnecting (schedulers stay as they are)');
});
