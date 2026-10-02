/**
 * Hits every endpoint, including create, update, and delete.
 * The API must already be listening.
 * Usage: node src/smoke.js
 */

const base = process.env.API_URL || 'http://localhost:3000';

const checks = [
  { name: 'health', path: '/api/health', expect: 200 },
  { name: 'telemetry latest', path: '/api/telemetry/latest', expect: 200 },
  { name: 'telemetry latest bad device', path: '/api/telemetry/latest?device_id=TANK_01', expect: 400 },
  { name: 'alerts', path: '/api/telemetry/alerts?page=1&limit=5', expect: 200 },
  { name: 'alerts reason', path: '/api/telemetry/alerts?reason=TANK_OVERFLOW&limit=5', expect: 200 },
  { name: 'alerts bad reason', path: '/api/telemetry/alerts?reason=POWER_SPIKE', expect: 400 },
  { name: 'averages', path: '/api/telemetry/analytics/averages', expect: 200 },
  { name: 'history', path: '/api/telemetry/history?page=1&limit=5', expect: 200 },
  { name: 'history bucket', path: '/api/telemetry/history?bucket=minute', expect: 200 },
  { name: 'history bad date', path: '/api/telemetry/history?from=not-a-date', expect: 400 },
  { name: 'history bad bucket', path: '/api/telemetry/history?bucket=week', expect: 400 },
  { name: 'summary', path: '/api/telemetry/summary', expect: 200 },
];

async function main() {
  let failed = 0;
  for (const check of checks) {
    try {
      const response = await fetch(`${base}${check.path}`);
      const ok = response.status === check.expect;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${check.name} -> ${response.status} (expected ${check.expect})`);
      if (!ok) failed += 1;
    } catch (err) {
      failed += 1;
      console.log(`FAIL ${check.name} -> ${err.message}`);
    }
  }
  failed += await crudChecks();
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Is the API running on ${base}?`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length + 5} checks passed.`);
}

async function crudChecks() {
  let failed = 0;
  function report(name, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} -> ${detail}`);
    if (!ok) failed += 1;
  }
  try {
    const bad = await fetch(`${base}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ultrasonic_depth_pct: 140 }),
    });
    report('create bad level', bad.status === 400, bad.status);

    const createdRes = await fetch(`${base}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ultrasonic_depth_pct: 42 }),
    });
    const created = await createdRes.json();
    const id = created.reading && created.reading._id;
    report('create', createdRes.status === 201 && Boolean(id), createdRes.status);

    const patchedRes = await fetch(`${base}/api/telemetry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ultrasonic_depth_pct: 55 }),
    });
    const patched = await patchedRes.json();
    const level = patched.reading && patched.reading.telemetry.water_tank.ultrasonic_depth_pct;
    report('update', patchedRes.status === 200 && level === 55, `${patchedRes.status} level=${level}`);

    const deletedRes = await fetch(`${base}/api/telemetry/${id}`, { method: 'DELETE' });
    report('delete', deletedRes.status === 200, deletedRes.status);

    const missingRes = await fetch(`${base}/api/telemetry/${id}`, { method: 'DELETE' });
    report('delete missing', missingRes.status === 404, missingRes.status);
  } catch (err) {
    failed += 1;
    console.log(`FAIL crud -> ${err.message}`);
  }
  return failed;
}

main();
