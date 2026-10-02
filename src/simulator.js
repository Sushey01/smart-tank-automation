/**
 * Realistic Smart Tank Telemetry Simulator.
 * Publishes HOME_HUB_01 telemetry at QoS 1 to Mosquitto.
 *
 * Physics Model:
 * - Level falls with household consumption when booster pump is ACTIVE.
 * - Level rises when inlet valve is OPEN.
 * - Hysteresis loop controls inlet valve and booster pump transitions.
 * - Random publish interval strictly between 2000 ms and 8999 ms (< 10 s).
 *
 * Environment Controls:
 * - LEAK_TEST=1: Injects an anomalous pipe leak episode (sudden level drop while pump is inactive).
 * - FIRMWARE=v2.5.0: Injects water_quality { tds_ppm, ph } for schema evolution.
 */

const mqtt = require('mqtt');
const { MQTT_URL } = require('./lib/config');
const {
  CONTROL_CONFIG,
  TELEMETRY_TOPIC,
  buildPayload,
  getActuatorState,
  setActuatorState,
} = require('./lib/devices');

let currentLevel = 60.0; // Starting baseline level (60%)
let tickCount = 0;
let leakInjected = false;

function nextDelayMs() {
  // Strictly between 2000 and 8999 ms (< 10 seconds)
  return 2000 + Math.floor(Math.random() * 7000);
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function round(val, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(val * factor) / factor;
}

const client = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 2000,
  clientId: `smart-tank-simulator-${process.pid}`,
});

client.once('connect', () => {
  console.log(`[simulator] connected to ${MQTT_URL}`);
  console.log(`[simulator] baseline level: ${currentLevel}%, firmware: ${process.env.FIRMWARE || 'v2.4.1'}`);
  if (process.env.LEAK_TEST === '1') {
    console.log('[simulator] LEAK_TEST=1 enabled: leak episode will be injected on tick 4');
  }

  const tick = () => {
    tickCount += 1;
    const actuators = getActuatorState();

    // Check if LEAK_TEST is active
    if (process.env.LEAK_TEST === '1' && tickCount >= 4 && !leakInjected) {
      console.log('[simulator] ---> INJECTING LEAK EPISODE: booster pump stopped, sudden 3.2% water drop');
      setActuatorState('HOME_HUB_01', { booster_pump: 'EMERGENCY_STOP' });
      currentLevel = Math.max(5.0, currentLevel - 3.2);
      leakInjected = true;
    } else {
      // Natural physical evolution
      let delta = 0;
      if (actuators.inlet_valve === 'OPEN') {
        delta += randRange(0.8, 1.4); // Water filling
      }
      if (actuators.booster_pump === 'ACTIVE') {
        delta -= randRange(0.4, 0.9); // Domestic consumption
      }

      // Small sensor noise (+/- 0.05%)
      delta += randRange(-0.05, 0.05);

      currentLevel = Math.max(5.0, Math.min(95.0, currentLevel + delta));
    }

    currentLevel = round(currentLevel, 1);

    const payload = buildPayload({
      levelPct: currentLevel,
      firmware: process.env.FIRMWARE || 'v2.4.1',
    });

    client.publish(TELEMETRY_TOPIC, JSON.stringify(payload), { qos: 1 }, (pubErr) => {
      if (pubErr) {
        console.error(`[simulator] publish failed on ${TELEMETRY_TOPIC}:`, pubErr.message);
      } else {
        const tank = payload.telemetry.water_tank;
        const acts = payload.telemetry.actuator_states;
        const wq = payload.telemetry.water_quality ? ` (TDS: ${payload.telemetry.water_quality.tds_ppm} ppm, pH: ${payload.telemetry.water_quality.ph})` : '';
        console.log(
          `[simulator] published HOME_HUB_01: ${tank.ultrasonic_depth_pct}% (${tank.volume_litres} L) | valve=${acts.inlet_valve} pump=${acts.booster_pump}${wq}`,
        );
      }
    });

    setTimeout(tick, nextDelayMs());
  };

  tick();
});

client.on('error', (err) => {
  console.error('[simulator] mqtt error:', err.message);
});

client.on('reconnect', () => {
  console.log('[simulator] reconnecting to MQTT broker...');
});
