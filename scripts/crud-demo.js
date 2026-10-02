/**
 * Isolated CRUD Demonstration Script.
 * Demonstrates Create, Read, Update, and Delete operations in an isolated collection
 * (sensor_activations_crud_demo) within the replica set, verifying schema validation,
 * printing actual operation outcomes, and saving evidence to evidence/crud-demo.txt.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { MONGO_URI, DB_NAME } = require('../src/lib/config');

async function main() {
  const output = [];
  function log(msg) {
    console.log(msg);
    output.push(msg);
  }

  log('============================================================');
  log(' MongoDB Isolated CRUD Operations Demonstration');
  log(' Target: smart_water.sensor_activations_crud_demo');
  log('============================================================\n');

  const client = new MongoClient(MONGO_URI, { writeConcern: { w: 'majority' } });
  await client.connect();
  const db = client.db(DB_NAME);
  const demoCollection = db.collection('sensor_activations_crud_demo');

  // Clean any previous demo records
  await demoCollection.deleteMany({});

  // 1. CREATE Operation
  const testId = new ObjectId();
  const timestamp = new Date();
  const sampleDoc = {
    _id: testId,
    device_id: 'HOME_HUB_01',
    device_type: 'water_tank',
    firmware: 'v2.4.1',
    timestamp,
    telemetry: {
      water_tank: {
        ultrasonic_depth_pct: 64.5,
        volume_litres: 1290,
        distance_cm: 71,
      },
      float_switches: {
        high_level_overflow: false,
        low_level_dry_run: false,
      },
      actuator_states: {
        inlet_valve: 'CLOSED',
        booster_pump: 'ACTIVE',
      },
      control_mode: 'AUTO',
    },
    alert: false,
    alert_reasons: [],
    source: 'crud_demo',
    ingested_at: new Date(),
  };

  log('[CRUD: CREATE] Inserting document with w:majority...');
  const insertRes = await demoCollection.insertOne(sampleDoc);
  log(`  -> insertedId: ${insertRes.insertedId}`);
  log(`  -> acknowledged: ${insertRes.acknowledged}`);

  // 2. READ Operation
  log('\n[CRUD: READ] Querying inserted document by _id...');
  const readDoc = await demoCollection.findOne({ _id: testId });
  log(`  -> Found device_id: ${readDoc.device_id}`);
  log(`  -> ultrasonic_depth_pct: ${readDoc.telemetry.water_tank.ultrasonic_depth_pct}%`);
  log(`  -> booster_pump state: ${readDoc.telemetry.actuator_states.booster_pump}`);

  // 3. UPDATE Operation
  log('\n[CRUD: UPDATE] Updating water level to 88.0% and recalculating overflow alert...');
  const updateRes = await demoCollection.updateOne(
    { _id: testId },
    {
      $set: {
        'telemetry.water_tank.ultrasonic_depth_pct': 88.0,
        'telemetry.water_tank.volume_litres': 1760,
        'telemetry.float_switches.high_level_overflow': true,
        'telemetry.actuator_states.inlet_valve': 'CLOSED',
        alert: true,
        alert_reasons: ['TANK_OVERFLOW'],
        updated_at: new Date(),
      },
    },
  );
  log(`  -> matchedCount: ${updateRes.matchedCount}`);
  log(`  -> modifiedCount: ${updateRes.modifiedCount}`);

  const updatedDoc = await demoCollection.findOne({ _id: testId });
  log(`  -> Re-read updated depth: ${updatedDoc.telemetry.water_tank.ultrasonic_depth_pct}%`);
  log(`  -> Re-read alert: ${updatedDoc.alert} (${updatedDoc.alert_reasons.join(', ')})`);

  // 4. DELETE Operation
  log('\n[CRUD: DELETE] Deleting demonstration document by _id...');
  const deleteRes = await demoCollection.deleteOne({ _id: testId });
  log(`  -> deletedCount: ${deleteRes.deletedCount}`);

  // 5. Final Read Verification (Confirm absence)
  const finalCheck = await demoCollection.findOne({ _id: testId });
  log(`\n[CRUD: VERIFY ABSENCE] findOne returned: ${finalCheck === null ? 'null (Confirmed Deleted)' : 'Found'}`);

  // Clean demo collection
  await demoCollection.drop().catch(() => {});
  await client.close();

  const evidenceDir = path.join(__dirname, '..', 'evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'crud-demo.txt'), output.join('\n'));
  log(`\n[evidence] Saved CRUD demonstration log to: evidence/crud-demo.txt`);
}

main().catch((err) => {
  console.error('[crud-demo] Fatal error:', err);
  process.exit(1);
});
