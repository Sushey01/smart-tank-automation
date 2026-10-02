# Requirements

## Functional

1. Simulate one device, `HOME_HUB_01` (`water_tank`, location `home`):
   - level 20–90 percent
   - volume from a 2000 L tank
   - distance from a 200 cm tank
   - high float at or above 85, low float at or below 25
   - inlet valve `CLOSED` when high, otherwise `OPEN`
   - booster pump `EMERGENCY_STOP` when low, otherwise `ACTIVE`
   - firmware always `v2.4.1`
2. Publish on `iothings/home/telemetry` at QoS 1, with a random gap of 2000–8999 ms. The scheduler starts from `client.once('connect')`.
3. Ingestion subscribes to that topic, stores a message only when `device_id` is `HOME_HUB_01` and `telemetry.water_tank` is present, converts `timestamp` to a BSON `Date`, computes `alert_reasons` and `alert`, and inserts into `smart_water.sensor_activations`.
4. Alert codes: `TANK_OVERFLOW` and `TANK_DRY_RUN` only.
5. On a new overflow or dry-run, POST one Telegram `sendMessage`. Send once more when the alert clears. Do not send again while the same alert remains active. A Telegram failure must not drop the insert.
6. REST API (CORS limited to `http://localhost:5173`):
   - `GET /api/health`
   - `GET /api/telemetry/latest`
   - `GET /api/telemetry/alerts`
   - `GET /api/telemetry/analytics/averages`
   - `GET /api/telemetry/history`
   - `GET /api/telemetry/summary`
7. Seed script writes `synthetic_sensor_dataset.json` with 1200 documents from `2026-09-01T00:00:00.000Z`, gaps of 3–8 seconds, and inserts them into `sensor_activations` with `source: "seed"`. Live MQTT documents are not deleted.
8. CRUD on stored readings: MQTT or `POST /api/telemetry` creates, the GET routes read, `PATCH /api/telemetry/:id` updates the level, and `DELETE /api/telemetry/:id` removes one document.
9. Benchmark script prints `explain('executionStats')` for a recent-readings query with a collection scan hint and with the `device_time` index.
10. React UI: dashboard, history with CSV, alerts, cluster (failover evidence). Header control arms a browser siren for overflow and dry-run.
11. Smoke script calls every route, including create, update, and delete, and expects HTTP 400 for a bad date, a bad bucket, an unknown device, an unknown alert reason, and a level outside 0–100.

## Non-functional

- Inserts use write concern `w: "majority"`.
- Driver options `retryWrites` and `retryReads` are on.
- Analytics aggregations use `readPreference: secondaryPreferred`. Other reads use the primary.
- Indexes: `device_time` on `{device_id: 1, timestamp: -1}`, `{alert: 1, timestamp: -1}`, `{device_type: 1, timestamp: -1}`, and a 30-day TTL on `timestamp`.
- Paginated routes cap `limit` at 100. Invalid dates, buckets, and alert reasons return 400.
- Every route is wrapped so failures become JSON errors, not an unhandled crash.
- The UI polls every 5 s and pauses while the browser tab is hidden. The cluster page polls every 2 s.
- Status is never conveyed by colour alone: badges include an icon and a text label.
- Online means last seen under 30 seconds; otherwise offline.
- Replica set goal is availability. It is not sharding and it does not add write throughput in proportion to node count.
- The bot token is read from the environment and is never logged or written into the repository.

## TODO: verify against the coursework brief

The working build uses the numbers below. Before submission, check the official CMP6207 brief and change the seed count or the report if the brief asks for something else.

| Item | Value used in this repo | Brief says (fill in) |
| --- | --- | --- |
| Device count | 1 device, `HOME_HUB_01` | |
| Seeded record count | 1,200 in `synthetic_sensor_dataset.json` (file only) | |
| Live publish interval | 2–9 seconds, under 10 s | |
| Minimum API endpoints | 6 GET routes listed above | |
| Replica set size | 3 members on 27017–27019 | |
| Evidence screenshots | See `plan/06-evidence-checklist.md` | |
