/**
 * Writes synthetic_sensor_dataset.json. Does not connect to MongoDB.
 * 1200 tank documents, timestamps stepping forward from 2026-09-01
 * by a random 3–8 second gap.
 */

const fs = require('fs');
const path = require('path');
const { buildPayload, toStoredReading } = require('./lib/devices');

const START = new Date('2026-09-01T00:00:00.000Z');
const COUNT = 1200;

function gapMs() {
  return 3000 + Math.floor(Math.random() * 5001);
}

function toJson(doc) {
  return {
    ...doc,
    timestamp: doc.timestamp.toISOString(),
    ingested_at: doc.ingested_at.toISOString(),
  };
}

function main() {
  let cursor = START.getTime();
  const docs = [];
  for (let index = 0; index < COUNT; index += 1) {
    if (index > 0) cursor += gapMs();
    const at = new Date(cursor);
    docs.push(toJson(toStoredReading(buildPayload({ timestamp: at }), new Date(cursor + 150))));
  }
  const out = path.join(__dirname, '..', 'synthetic_sensor_dataset.json');
  fs.writeFileSync(out, `${JSON.stringify(docs, null, 2)}\n`);
  console.log(`[seed] wrote ${docs.length} documents to ${out}`);
  console.log('[seed] file only. MongoDB was not contacted. Data is synthetic.');
}

main();
