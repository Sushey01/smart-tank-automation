# Report outline

Target structure for the written report. Word counts are the brief’s size for each section. These notes are the points to expand, not the finished prose.

## 1. Cover sheet

- Module code CMP6207, module title Modern Data Stores.
- Project title: Smart Tank Automation: A Fault-Tolerant NoSQL Telemetry Platform for IoThings.
- Student name and ID, date, word count excluding appendices and references.

## 2. Index

- Numbered sections matching the headings below, plus appendices A–D.

## 3. Introduction (~300 words)

- Problem: a building stores roof and basement water tanks, a plant-room climate sensor, and a power meter. Readings arrive every few seconds and do not share one column layout.
- Aim: ingest MQTT telemetry into MongoDB, query it over HTTP, and keep serving after one replica stops.
- Method: synthetic devices, Mosquitto, a three-node replica set on localhost, Express, a React dashboard.
- Contribution boundary: availability via replication, not sharding. Failover has a brief write pause during election (~10 s). Acknowledged majority writes are kept.
- Data protection: synthetic UK-style scenario; TTL of 30 days as a storage-limitation control.

## 4. NoSQL types (~1000 words)

- Key-value: opaque value, key lookup, weak fit for ad-hoc range queries on time. Example use: session cache.
- Document: JSON-like documents, embedded objects, flexible fields. This project’s model. Strength: tank, climate, and power documents share a collection. Cost: the application must validate shapes the database will not enforce.
- Column-family: rows with sparse column groups, high write throughput for wide time-series (Cassandra, HBase). Contrast with MongoDB’s document and secondary indexes.
- Graph: nodes and edges for relationships (device dependency, site topology). Not used here because the access path is “latest readings for a device”, not multi-hop traversal.
- How the type was chosen: telemetry is a self-contained reading with nested sensor groups and an alert array. Document storage matches that aggregate. Mention CAP informally: a replica set with majority write concern favours consistency of acknowledged writes over serving writes during a partition.

## 5. Relational versus NoSQL (~1000 words)

- Relational fit: a `reading` table plus subtype tables (`water_tank_reading`, `climate_reading`, `power_reading`) or a wide table full of nulls. Joins reconstruct one “current state” row. Schema changes need migrations.
- Document fit: one aggregate per MQTT message. New firmware can add a key without an `ALTER TABLE`. Trade-off: duplicated device attributes on every reading (acceptable because readings are immutable events).
- Query contrast: “last 50 readings for TANK_01” is an index range on `{device_id, timestamp}`. “average water level per device” is an aggregation, not a join.
- Integrity contrast: foreign keys and check constraints are not the safety net. Validation sits in `devices.js` and the API. Indexes and TTL are still declared in the database.
- Transaction contrast: each insert is one document, so a multi-document transaction is unnecessary. Majority write concern is the durability choice.
- When SQL would still win: strict financial balances, heavy many-to-many reporting, or a team that already standardises on PostgreSQL. Say that plainly.

## 6. Design and implementation (~1000 words)

- Topic scheme and QoS 1 (at-least-once; ingestion is insert-only, so a redelivery can duplicate a reading — state this limitation).
- Document model and the three examples from `plan/02-architecture.md`.
- Alert derivation on the server, not on the device, so rules stay in one place.
- Replica set ports 27117–27119, priorities 2 / 1 / 1, `rs.initiate`.
- Write concern majority, `retryWrites`, `retryReads`.
- Analytics `secondaryPreferred`: secondaries can lag by a short replication delay. Health and “latest” stay on the primary.
- Indexes and the benchmark: `hint {$natural:1}` examines many documents; `hint 'device_time'` examines keys for the same `limit 50`.
- TTL `expireAfterSeconds: 2592000` on `timestamp`.
- UI role: evidence for markers, especially `/cluster` when the primary changes.
- Phrase to keep: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).

## 7. API (~400 words)

- Base URL `http://localhost:3000`. CORS origin `http://localhost:5173`.
- List each route, query parameters, and one sentence on the MongoDB operation (`find`, `aggregate`, `replSetGetStatus`).
- Pagination: `page`, `limit` capped at 100, `total` in the body.
- Validation: 400 for bad dates, unknown `metric`, unknown `bucket`, unknown alert `reason`.
- Series metrics are a whitelist so a query parameter cannot choose an arbitrary field path.
- Stretch command route: allowed verbs `pump_on`, `pump_off`, `valve_open`, `valve_close`, water-tank devices only.

## 8. Conclusion and future work (~300 words)

- What was shown: flexible documents, indexed time-range reads, majority writes, election after the preferred primary stops, a dashboard a marker can operate.
- What was not shown: sharding, multi-region latency, authenticated MQTT, exactly-once ingest.
- Future work: idempotent reading ids to absorb QoS 1 duplicates; keyfile authentication on the replica set; a change stream instead of 5 s polling; shard by `device_id` only if a single replica set cannot hold the working set.

## Appendices

- Appendix A: first 200 documents (`synthetic_sensor_dataset_sample.json`), generated by the seed script.
- Appendix B: `rs.status()` before and after failover, and a secondary `countDocuments` next to the primary.
- Appendix C: `explain()` output with and without `device_time`.
- Appendix D: API examples (smoke-test output or Postman) and UI screenshots.

## Harvard references (starter set)

- Brewer, E. (2012) ‘CAP twelve years later: how the “rules” have changed’, *Computer*, 45(2), pp. 23–29.
- Information Commissioner’s Office (no date) *Principle (e): Storage limitation*. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/ (Accessed: 1 October 2026).
- MongoDB Inc. (2026) *Replication*. Available at: https://www.mongodb.com/docs/manual/replication/ (Accessed: 1 October 2026).
- MongoDB Inc. (2026) *TTL indexes*. Available at: https://www.mongodb.com/docs/manual/core/index-ttl/ (Accessed: 1 October 2026).
- Sadalage, P.J. and Fowler, M. (2012) *NoSQL distilled: a brief guide to the emerging world of polyglot persistence*. Upper Saddle River, NJ: Addison-Wesley.

Add the coursework brief and any lecture notes actually used. Do not cite sources you did not read.
