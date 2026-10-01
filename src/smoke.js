/**
 * Hits every GET endpoint. The API must already be listening.
 * Usage: node src/smoke.js
 */

const base = process.env.API_URL || 'http://localhost:3000';

const checks = [
  { name: 'health', path: '/api/health', expect: 200 },
  { name: 'devices', path: '/api/devices', expect: 200 },
  { name: 'telemetry latest', path: '/api/telemetry/latest?device_id=TANK_01', expect: 200 },
  { name: 'telemetry page', path: '/api/telemetry?device_id=TANK_01&page=1&limit=5', expect: 200 },
  { name: 'telemetry bad date', path: '/api/telemetry?from=not-a-date', expect: 400 },
  {
    name: 'series',
    path: '/api/telemetry/series?device_id=TANK_01&metric=ultrasonic_depth_pct&bucket=minute',
    expect: 200,
  },
  { name: 'series bad metric', path: '/api/telemetry/series?device_id=TANK_01&metric=__proto__', expect: 400 },
  { name: 'alerts', path: '/api/alerts?page=1&limit=5', expect: 200 },
  { name: 'alerts reason', path: '/api/alerts?reason=TANK_OVERFLOW&limit=5', expect: 200 },
  { name: 'averages', path: '/api/analytics/averages', expect: 200 },
  { name: 'alerts hourly', path: '/api/analytics/alerts-hourly', expect: 200 },
  { name: 'stats', path: '/api/stats', expect: 200 },
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
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed. Is the API running on ${base}?`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks passed.`);
}

main();
