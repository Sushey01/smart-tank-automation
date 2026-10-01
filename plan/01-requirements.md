# Requirements

## Functional

1. Simulate four devices with three payload shapes:
   - `TANK_01` (roof) and `TANK_02` (basement): water level, floats, inlet valve, booster pump.
   - `CLIMATE_01` (plant room): temperature, humidity, CO2.
   - `POWER_01` (electrical cupboard): voltage, power, current, cumulative energy.
2. Each device publishes on its own timer to `iothings/<device_type>/<device_id>/telemetry` at QoS 1, with a random gap of 2000–8999 ms.
3. Ingestion subscribes to `iothings/+/+/telemetry`, rejects invalid messages, converts `timestamp` to a BSON `Date`, computes `alert_reasons` and `alert`, and inserts into `iothings.sensor_readings`.
4. Alert codes: `TANK_OVERFLOW` (depth ≥ 85 or high float), `TANK_DRY_RUN` (depth ≤ 25 or low float), `HIGH_TEMPERATURE` (temperature above 35 °C), `POWER_SPIKE` (power above 3500 W).
5. REST API (CORS limited to `http://localhost:5173`):
   - `GET /api/health`
   - `GET /api/devices`
   - `GET /api/telemetry/latest`
   - `GET /api/telemetry`
   - `GET /api/telemetry/series`
   - `GET /api/alerts`
   - `GET /api/analytics/averages`
   - `GET /api/analytics/alerts-hourly`
   - `GET /api/stats`
   - Stretch: `POST /api/devices/:id/commands` for pump and valve commands.
6. Seed script loads a chosen total (default 10,000), split evenly, with monotonic 2–9 s gaps ending near the current time, in batches of 5,000. It writes `synthetic_sensor_dataset_sample.json` (first 200 documents).
7. Benchmark script prints `explain('executionStats')` for a recent-readings query with a collection scan hint and with the `device_time` index.
8. React UI: dashboard, devices, telemetry, alerts, cluster (failover evidence), analytics.
9. Smoke script calls every GET route and expects HTTP 400 for a bad date and an unknown metric.

## Non-functional

- Inserts use write concern `w: "majority"` so an acknowledged write has reached a majority of the replica set.
- Driver options `retryWrites` and `retryReads` are on.
- Analytics aggregations use `readPreference: secondaryPreferred`. Other reads use the primary.
- Indexes: `device_time` on `{device_id: 1, timestamp: -1}`, `{alert: 1, timestamp: -1}`, `{device_type: 1, timestamp: -1}`, and a 30-day TTL on `timestamp`.
- Paginated routes cap `limit` at 100. Invalid dates, metrics, buckets, and alert reasons return 400.
- Every route is wrapped so failures become JSON errors, not an unhandled crash.
- The UI polls every 5 s and pauses while the browser tab is hidden. The cluster page polls every 2 s.
- Status is never conveyed by colour alone: badges include an icon and a text label.
- Replica set goal is availability. It is not sharding and it does not add write throughput in proportion to node count.

## TODO: verify against the coursework brief

The working build uses the numbers below. Before submission, check the official CMP6207 brief and change the seed default or the report if the brief asks for something else.

| Item | Value used in this repo | Brief says (fill in) |
| --- | --- | --- |
| Device count | 4 devices, 3 types | |
| Seeded record count | 10,000 (`node src/seed.js [total]`) | |
| Live publish interval | 2–9 seconds, under 10 s | |
| Minimum API endpoints | 9 GET routes listed above, plus command POST | |
| Replica set size | 3 members | |
| Evidence screenshots | See `plan/06-evidence-checklist.md` | |
