# Presentation outline

INPER presentation, 40% of the module. Aim for 12–14 slides plus a live demo. Rehearse the failover before the session so the election pause is expected.

## Slide 1 — Title

- Project title, module CMP6207, your name.
- One line: synthetic tank, climate, and power telemetry on a MongoDB replica set.

## Slide 2 — Problem

- Three payload shapes, readings every few seconds.
- Need queries by device and time, alerts, and a service that continues after one database process stops.

## Slide 3 — Why a document store

- One collection, embedded sensor objects, no null-heavy table.
- Show a cropped tank document and a cropped climate document side by side.

## Slide 4 — Architecture

- Diagram from `plan/02-architecture.md`: simulator, Mosquitto, Node, `rs0`, React.
- Say the replica set is for availability, not for horizontal scaling.

## Slide 5 — Replica set

- Three `mongod` processes, ports 27117 (priority 2), 27118, 27119.
- Majority write concern. Analytics use `secondaryPreferred`.
- Sentence to say aloud: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).

## Slide 6 — Document model and alerts

- Shared fields plus type-specific objects.
- Alert rules: overflow, dry-run, temperature above 35 °C, power above 3500 W.
- TTL of 30 days and why the data is synthetic (storage limitation).

## Slide 7 — API

- Short table of the GET routes.
- Mention metric whitelist on `/api/telemetry/series` and limit cap of 100.

## Slide 8 — Live demo: dashboard

- Open `http://localhost:5173`.
- Point at tank gauges (percent, litres, valve, pump, floats), climate and power cards, alert feed, “last updated” pulse.
- If the simulator is running, wait for one value to change.

## Slide 9 — Live demo: telemetry and alerts

- Filter to `TANK_01`, switch minute/hour bucket, export CSV.
- Open alerts and the hourly chart.

## Slide 10 — Index evidence

- Show benchmark output: `docsExamined` and `keysExamined` for `$natural` versus `device_time`.
- One sentence: the index avoids scanning the whole history for the latest 50 readings.

## Slide 11 — Failover evidence

- Leave `/cluster` visible (it polls every 2 s).
- Stop the primary `mongod` (usually port 27117).
- Wait through the election. Read the banner: “Failover detected: new primary …”.
- Show node cards: one PRIMARY, one member down, one SECONDARY.
- Restart the stopped process and show it return as a secondary.
- Do not say the write path had zero downtime.

## Slide 12 — Limitations

- Single host: this does not survive a machine failure.
- Anonymous local MQTT.
- QoS 1 can duplicate inserts.
- Secondaries can be slightly behind.
- A replica set does not shard the data.

## Slide 13 — Questions

- Backup slides: sample JSON, `rs.status()`, explain output.

## Demo checklist the night before

- Hosts file is not required.
- Ports 27117–27119 are listening and `rs.status()` shows 1 PRIMARY and 2 SECONDARY.
- Seed has been run. Simulator and API are up. Frontend proxy reaches port 3000.
- You know which terminal owns the primary so you stop the right process.
