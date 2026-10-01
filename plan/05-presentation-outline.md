# Presentation outline

Ten to fifteen minutes. Do not say “zero downtime”. The failover sentence is: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).

## Slide 1 — Title

Smart Tank Automation. One home tank, MongoDB replica set, MQTT.

## Slide 2 — Problem

A tank that overflows or runs dry needs a stored history and a warning, and the store should still hold acknowledged writes if one database process stops.

## Slide 3 — Why a document store

One MQTT message is one document. Level, floats, and actuator strings sit under `telemetry`. A relational design would split or null-pad that same message.

## Slide 4 — Architecture

Simulator → Mosquitto `iothings/home/telemetry` → Express → `smart_water.sensor_activations` on `rs0` → React. Telegram is a side effect of an alert transition, not a second database.

## Slide 5 — Replica set

Three members, ports 27017 (priority 2), 27018, and 27019. Availability, not sharding. Every member holds a full copy. Writes enter through the primary.

## Slide 6 — Document model and alerts

Show one document. Overflow at or above 85%. Dry-run at or below 25%. Valve `CLOSED` only when high. Pump `EMERGENCY_STOP` only when low. Firmware `v2.4.1`.

## Slide 7 — API

Latest, alerts, averages, history, summary, health. Summary is trend, litres per hour, and a rough time-to-empty or time-to-full. Averages use `secondaryPreferred`.

## Slide 8 — Live demo: dashboard

Open `/`. Point at percent, litres, the rising/falling/steady word, and the 25% and 85% marks. Click **Arm siren** before the overflow, then show **Silence**.

## Slide 9 — Live demo: history and alerts

`/history` chart and CSV. `/alerts` filtered to overflow. Mention the single Telegram message, not a message per reading.

## Slide 10 — Index evidence

`npm run benchmark` for `HOME_HUB_01`. Collection scan versus `device_time`.

## Slide 11 — Failover evidence

Leave `/cluster` open. Stop the primary. Read the banner `Failover detected: new primary …`. Mention the brief write pause. Restart the member so it rejoins as a secondary.

## Slide 12 — Limitations

One machine. Anonymous MQTT. QoS 1 can duplicate an insert. The siren needs a user click. The replica set is not a shard cluster.

## Slide 13 — Questions

Seed file is 1200 synthetic documents and does not load MongoDB by itself. TTL is 30 days.

## Demo checklist the night before

- Three `mongod` processes, `rs.status()` shows one PRIMARY.
- Mosquitto on 1883, `npm run server`, `npm run simulator`, `cd web && npm run dev`.
- `.env` has the Telegram values if you want the phone to buzz. Do not put the token on a slide.
- Browser tab has had **Arm siren** clicked if you will cross 85%.
