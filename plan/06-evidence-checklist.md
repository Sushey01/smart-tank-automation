# Evidence checklist

Capture these before submission. Paths assume the host replica set on ports 27017–27019.

## Replica set

- [ ] `rs.status()` with one PRIMARY (`localhost:27017`) and two SECONDARY members
- [ ] The same command after Ctrl+C on the primary, showing a new PRIMARY
- [ ] `countDocuments()` on `smart_water.sensor_activations` from the old primary’s port and from a survivor, after the survivor is SECONDARY again
- [ ] `/cluster` banner text `Failover detected: new primary …`

## Indexes

- [ ] `npm run benchmark` output: `docsExamined`, `keysExamined`, `executionTimeMillis` for `{$natural:1}` and for `device_time`
- [ ] `getIndexes()` showing `device_time`, `alert_time`, `type_time`, and `timestamp_ttl` (2592000 seconds)

## API

- [ ] `node src/smoke.js` with every line PASS, including the 400 cases
- [ ] One `/api/telemetry/summary` body showing `trend`, `rate_litres_per_hour`, and `estimate`
- [ ] One Telegram message for a new overflow, and no further messages until the alert clears

## UI

- [ ] Dashboard with the gauge, 25% and 85% marks, trend word, and last-seen
- [ ] Siren armed, then **Silence** while an overflow is on screen
- [ ] `/history` chart and a CSV download
- [ ] `/alerts` empty state, then a filtered overflow row
- [ ] Mobile width (about 375 px) with the bottom nav still usable
- [ ] Dark theme toggle

## Logs

- [ ] Simulator line `iothings/home/telemetry qos=1`
- [ ] Ingest line that includes `alert=TANK_OVERFLOW` or `alert=TANK_DRY_RUN`
- [ ] Seed log: 1200 documents, MongoDB was not contacted

## Wording

- [ ] Report and slides use “automatic failover with no acknowledged-write loss; brief write pause during election (~10 s)”
- [ ] Neither document says “zero downtime”
- [ ] The bot token does not appear in the report, slides, or git history
