#!/usr/bin/env node
/**
 * Repeatable Demonstration Script: Scenario B - Overnight Abnormal Water Loss / Leak.
 * Simulates a continuous slow drop in tank level during designated low-usage hours (02:00 - 03:00 UTC)
 * while the booster pump is inactive.
 * Publishes readings via Mosquitto MQTT with fallback to direct MongoDB majority write.
 */

const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');
const { MONGO_URI, MQTT_URL, DB_NAME, COLLECTION } = require('../src/lib/config');
const { HOME_HUB, buildPayload, toStoredReading } = require('../src/lib/devices');
const { evaluateAbnormalOvernightUsage } = require('../src/lib/analytics');
const WATER_CONFIG = require('../src/lib/water-config');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLeakDemo() {
  console.log('============================================================');
  console.log(' IoThings Scenario B: Abnormal Overnight Water Loss Demo');
  console.log(' Module: CMP6207 Modern Data Stores | Controlled Simulation');
  console.log('============================================================\n');

  console.log('[demo] Connecting to MongoDB Replica Set...');
  const mongo = new MongoClient(MONGO_URI, { writeConcern: { w: 'majority' } });
  await mongo.connect();
  const db = mongo.db(DB_NAME);
  const collection = db.collection(COLLECTION);
  const alertsCollection = db.collection('alerts');

  // Clear any existing abnormal overnight usage alerts to make the demo 100% repeatable
  await alertsCollection.deleteMany({
    device_id: HOME_HUB.device_id,
    alert_type: WATER_CONFIG.ALERT_TYPES.ABNORMAL_WATER_USAGE,
  });
  console.log('[demo] Cleaned previous leak demo alerts for clean repeatable demonstration.');

  // Determine latest document in DB to ensure demo readings are placed as the latest telemetry
  const latestDoc = await collection.find({ device_id: HOME_HUB.device_id }).sort({ timestamp: -1 }).limit(1).next();
  const latestDate = latestDoc ? new Date(latestDoc.timestamp) : new Date();
  const baseTime = new Date(latestDate.getTime() + 1000);
  baseTime.setUTCHours(2, 15, 0, 0);
  if (baseTime <= latestDate) {
    baseTime.setUTCDate(baseTime.getUTCDate() + 1);
  }

  // Starting water level: 71.5%
  let level = 71.5;
  const steps = 10;
  const dropPerStep = 0.35; // Dropping 0.35% every step (Total drop: 3.5% = 70 Litres)

  console.log(`[demo] Generating ${steps} simulated overnight telemetry readings...`);
  console.log(`[demo] Overnight Window: 02:15 to 02:45 UTC (Pump: INACTIVE, Valve: CLOSED)\n`);

  // Try MQTT connection
  let mqttClient = null;
  try {
    mqttClient = mqtt.connect(MQTT_URL, { connectTimeout: 3000 });
    await new Promise((resolve, reject) => {
      mqttClient.once('connect', resolve);
      mqttClient.once('error', reject);
      setTimeout(resolve, 2000);
    });
  } catch (err) {
    console.log('[demo] MQTT broker offline, utilizing direct MongoDB insert.');
  }

  const insertedDocs = [];

  for (let i = 0; i < steps; i += 1) {
    const stepTime = new Date(baseTime.getTime() + i * 3 * 60 * 1000); // 3-minute intervals
    level = Math.round((level - dropPerStep) * 10) / 10;
    const volume = Math.round((WATER_CONFIG.TANK_CAPACITY_L * level) / 100);

    const payload = {
      device_id: HOME_HUB.device_id,
      device_type: HOME_HUB.device_type,
      timestamp: stepTime.toISOString(),
      metadata: {
        firmware: 'v2.4.1',
        signal_rssi: -62,
        battery_pct: 98,
        source: 'demo_leak_script',
      },
      telemetry: {
        water_tank: {
          ultrasonic_depth_pct: level,
          volume_litres: volume,
          distance_cm: Math.round(WATER_CONFIG.TANK_HEIGHT_CM * (1 - level / 100)),
        },
        float_switches: {
          high_level_overflow: false,
          low_level_dry_run: false,
        },
        actuator_states: {
          inlet_valve: 'CLOSED',
          booster_pump: 'INACTIVE', // Quiet overnight household
        },
      },
    };

    if (mqttClient && mqttClient.connected) {
      mqttClient.publish('iothings/home/telemetry', JSON.stringify(payload), { qos: 1 });
    }

    // Insert directly into MongoDB to ensure deterministic data store availability
    const doc = toStoredReading(payload, new Date(stepTime.getTime() + 100));
    doc.source = 'demo_leak';
    await collection.replaceOne(
      { device_id: HOME_HUB.device_id, timestamp: doc.timestamp },
      doc,
      { upsert: true },
    );
    insertedDocs.push(doc);

    console.log(`  Step ${i + 1}/${steps}: Timestamp ${stepTime.toISOString().slice(11, 19)} UTC -> Level: ${level.toFixed(1)}% (${volume} L) [Drop: -${(i * dropPerStep).toFixed(1)}%]`);
    await sleep(150);
  }

  if (mqttClient) {
    mqttClient.end();
  }

  console.log('\n[demo] Evaluating overnight water anomaly heuristics in MongoDB...');
  const evaluation = await evaluateAbnormalOvernightUsage(db, HOME_HUB.device_id);

  if (evaluation.detected) {
    console.log('\n============================================================');
    console.log('       >>> ⚠ ABNORMAL OVERNIGHT WATER USAGE DETECTED <<<');
    console.log('============================================================');
    console.log(` Alert Type:           ${evaluation.alert.alert_type}`);
    console.log(` Severity:             ${evaluation.alert.severity.toUpperCase()}`);
    console.log(` Message:              ${evaluation.alert.message}`);
    console.log(` Measured Drop:        ${evaluation.alert.measured_drop_pct}%`);
    console.log(` Estimated Water Loss: ${evaluation.alert.estimated_excess_loss_litres} Litres`);
    console.log(` Detection Period:     ${evaluation.alert.detection_period}`);
    console.log(` Recommendation:       ${evaluation.alert.recommendation}`);
    console.log('============================================================\n');
    console.log('[PASS] Demo completed successfully! Alert is now active in MongoDB.');
    console.log('[NOTE] Check the React Web Dashboard (http://localhost:5173):');
    console.log('       1. Notice the warning banner displayed.');
    console.log('       2. The Audio Buzzer chimes.');
    console.log('       3. Click "Silence / Acknowledge" to resolve.\n');
  } else {
    console.log('[demo] Evaluation result:', evaluation);
  }

  await mongo.close();
}

runLeakDemo().catch((err) => {
  console.error('[demo] Error executing leak demonstration:', err);
  process.exit(1);
});
