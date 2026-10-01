# Smart Tank Automation — overview

**Module:** CMP6207 Modern Data Stores  
**Title:** Smart Tank Automation: A Fault-Tolerant NoSQL Telemetry Platform for IoThings

## Summary

Four synthetic IoT devices publish telemetry to a local Mosquitto broker. A Node.js service validates each message, derives alerts, and inserts a document into a three-node MongoDB replica set (`rs0`). An Express API serves health, telemetry, alerts, and analytics. A React dashboard shows tank levels, climate, power, alerts, and replica-set failover.

The pipeline is:

simulated devices → MQTT (`mqtt://localhost:1883`) → Node ingestion → MongoDB `rs0` (ports 27117, 27118, 27119) → Express → React (Vite, port 5173).

## Goals

- Show a document database holding several payload shapes in one collection without a fixed relational schema.
- Show high availability: a replica set elects a new primary if the current primary stops.
- Show automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).
- Show secondary reads for analytics (`secondaryPreferred`) and majority write concern on inserts.
- Give markers a UI they can screenshot: gauges, tables, charts, and a cluster page that notices a primary change.

## Scope

In scope:

- Four devices and three document shapes (`water_tank`, `climate`, `power_meter`).
- Local Mosquitto, host `mongod` processes, ingestion, REST, seed, benchmark, smoke test.
- React dashboard with loading, empty, and error states.
- Optional Docker Compose path that does not bind port 27017.

Out of scope:

- Sharding and horizontal scaling.
- Actuator command endpoints. Valve and pump states are telemetry fields only.
- Production MQTT authentication, TLS, or a public broker.
- Real sensors, real personal data, or multi-host deployment.
- A claim of uninterrupted writes during an election.

## Assumptions

- Coursework runs on one Linux or Windows machine. Replica-set members are `localhost` ports, so a hosts-file entry is not required.
- An existing `mongod` on port 27017 is left alone. This project uses 27117, 27118, and 27119.
- Data is synthetic. A 30-day TTL index is the storage-limitation control used to discuss UK GDPR.
- The marker can run three terminals for `mongod`, plus terminals for the API, the simulator, and the frontend.
- Default record volume for the seed script is 10,000 documents. Confirm that figure against the brief (see `plan/01-requirements.md`).
