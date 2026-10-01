# Evidence checklist

Capture these before submission. Store images in a folder you do not commit if they are large; refer to them from the report appendices.

## Replica set

- [ ] `rs.status()` while all three members are up: one PRIMARY (prefer `localhost:27117`) and two SECONDARY.
- [ ] `rs.status()` after the primary process is stopped: a new PRIMARY, and the stopped member down or unreachable.
- [ ] `rs.status()` after the stopped `mongod` is started again: three members, the returning node usually SECONDARY.
- [ ] Document count on the primary and on a secondary match, for example:
  - `mongosh --port 27117 --eval 'db.getSiblingDB("iothings").sensor_readings.countDocuments()'`
  - `mongosh --port 27118 --eval 'db.getSiblingDB("iothings").sensor_readings.countDocuments()'`
- [ ] `/cluster` screenshot with the failover banner and the in-memory event log.

## Indexes

- [ ] `node src/benchmark.js` output for hint `{ $natural: 1 }` showing a large `docsExamined`.
- [ ] Same query with hint `device_time` showing a small `keysExamined` / `docsExamined` (about the limit of 50, plus any extra index walk).
- [ ] Optional: `getIndexes()` listing `device_time`, `alert_time`, `type_time`, and `timestamp_ttl`.

## API

- [ ] Postman or browser for each GET route: health, devices, telemetry latest, telemetry page, series, alerts, averages, alerts-hourly, stats.
- [ ] A 400 response for `GET /api/telemetry?from=not-a-date`.
- [ ] Smoke-test terminal output (`node src/smoke.js`) with every line PASS.

## UI

- [ ] Dashboard at desktop width (~1440 px): KPI row, two tank gauges, climate, power, alerts, cluster chip.
- [ ] Same dashboard at 375 px width: bottom navigation, stacked cards.
- [ ] Devices page with the detail drawer and raw JSON.
- [ ] Telemetry page: chart, table, and a CSV file from Export.
- [ ] Alerts page: reason filter and hourly bar chart.
- [ ] Analytics page: averages table and the “Why MongoDB” panel.
- [ ] Dark mode toggle on any page.
- [ ] Empty or error state if you have one (stop the API and show “Backend unreachable”).

## Logs

- [ ] Simulator log lines with topic and device id.
- [ ] Ingestion log line for an inserted reading and, if you force one, a rejected payload.

## Wording

Do not write “zero downtime” on slides or in the report. Use: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).
