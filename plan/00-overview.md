# Smart Tank Automation — overview

**Module:** CMP6207 Modern Data Stores  
**Title:** Smart Tank Automation: A Fault-Tolerant NoSQL Telemetry Platform for IoThings

## Summary

One synthetic home hub, `HOME_HUB_01`, publishes water-tank telemetry to a local Mosquitto broker. A Node.js service validates each message, derives overflow and dry-run alerts, and inserts a document into a three-node MongoDB replica set (`rs0`). An Express API serves health, history, alerts, and a tank summary. A React dashboard shows the gauge, trend, history, and replica-set failover. Overflow and dry-run can sound a browser siren and send one Telegram message.

The pipeline is:

simulated hub → MQTT (`mqtt://127.0.0.1:1883`, topic `iothings/home/telemetry`) → Node ingestion → MongoDB `rs0` (ports 27017, 27018, 27019, database `smart_water`) → Express → React (Vite, port 5173).

## Goals

- Show a document database holding a nested tank payload without a fixed relational schema.
- Show high availability: a replica set elects a new primary if the current primary stops.
- Show automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).
- Show secondary reads for analytics (`secondaryPreferred`) and majority write concern on inserts.
- Give markers a UI they can screenshot: one gauge, a history chart, alerts, and a cluster page that notices a primary change.

## Scope

In scope:

- One device, `HOME_HUB_01`, and one nested `telemetry` object.
- Local Mosquitto, host `mongod` processes, ingestion, REST, a file-only seed, benchmark, smoke test.
- React dashboard with loading, empty, and error states, plus an armed browser siren.
- Telegram `sendMessage` when an overflow or dry-run starts, and once when it clears. The bot token stays in `.env`.
- Optional Docker Compose path that does not bind port 27017.

Out of scope:

- Sharding and horizontal scaling.
- Climate, power, or any second sensor.
- Actuator command endpoints. Valve and pump states are telemetry fields only.
- Production MQTT authentication or TLS.
- Real sensors, real personal data, or multi-host deployment.
- A claim of uninterrupted writes during an election.

## Assumptions

- Node.js 18 or newer is installed, so `fetch` and `dotenv` are available.
- The operator starts `mongod` only when ports 27017–27019 are free.
- `.env` is present locally and is not committed.
