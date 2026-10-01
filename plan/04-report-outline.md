# Report outline

Target structure for the written report. Word counts are the brief’s size for each section. These notes are the points to expand, not the finished prose.

## 1. Cover sheet

- Module code CMP6207, module title Modern Data Stores.
- Project title: Smart Tank Automation: A Fault-Tolerant NoSQL Telemetry Platform for IoThings.
- Student name and ID, date, word count excluding appendices and references.

## 2. Index

- Numbered sections matching the headings below, plus appendices A–D.

## 3. Introduction (~300 words)

- Problem: a home water tank is read every few seconds. The useful questions are “how full is it”, “is it overflowing or about to run dry”, and “does the store keep the last acknowledged reading if one database node stops”.
- Aim: ingest MQTT telemetry into MongoDB, query it over HTTP, and keep serving after one replica stops.
- Method: one synthetic hub, Mosquitto, a three-node replica set on localhost ports 27017–27019, Express, a React dashboard, a browser siren, and Telegram on alert transitions.
- Contribution boundary: availability via replication, not sharding. Failover has a brief write pause during election (~10 s). Acknowledged majority writes are kept.
- Data protection: synthetic readings; TTL of 30 days as a storage-limitation control. The Telegram token is an operator secret, not stored in git.

## 4. NoSQL types (~1000 words)

- Key-value: opaque value, key lookup, weak fit for ad-hoc range queries on time. Example use: session cache.
- Document: JSON-like documents, embedded objects, flexible fields. This project’s model. Strength: the tank, floats, and actuator strings travel as one nested `telemetry` object. Cost: the application must validate shapes the database will not enforce.
- Column-family: rows with sparse column groups, high write throughput for wide time-series (Cassandra, HBase). Contrast with MongoDB’s document and secondary indexes.
- Graph: nodes and edges for relationships. Not used here because the access path is “latest reading for HOME_HUB_01”, not multi-hop traversal.
- How the type was chosen: telemetry is a self-contained reading with nested sensor groups and an alert array. Document storage matches that aggregate. A replica set with majority write concern favours consistency of acknowledged writes over serving writes during a partition.

## 5. Relational versus NoSQL (~1000 words)

- Relational fit: a `reading` table plus columns for level, litres, distance, two booleans, and two actuator strings. That works for one device. The document still wins as the unit that matches one MQTT message, including metadata and alerts, without a join.
- Document fit: one aggregate per MQTT message. New firmware can add a key without an `ALTER TABLE`. Trade-off: device attributes repeat on every reading (acceptable because readings are immutable events).
- Query contrast: “last 50 readings for HOME_HUB_01” is an index range on `{device_id, timestamp}`. “average water level” is an aggregation, not a join.
- Integrity contrast: foreign keys and check constraints are not the safety net. Validation sits in `devices.js` and the API. Indexes and TTL are still declared in the database.
- Transaction contrast: each insert is one document, so a multi-document transaction is unnecessary. Majority write concern is the durability choice.
- When SQL would still win: strict financial balances, heavy many-to-many reporting, or a team that already standardises on PostgreSQL.

## 6. Design and implementation (~1000 words)

- Topic `iothings/home/telemetry` and QoS 1 (at-least-once; ingestion is insert-only, so a redelivery can duplicate a reading).
- Nested document model: `telemetry.water_tank`, floats, actuator strings.
- Alert derivation on the server. Telegram fires only when the alert set changes.
- Replica set ports 27017–27019, priorities 2 / 1 / 1. The init script refuses a foreign database already on 27017.
- Write concern majority, `retryWrites`, `retryReads`.
- Analytics `secondaryPreferred` for averages and bucketed history. Health and “latest” stay on the primary.
- Indexes and the benchmark: `hint {$natural:1}` versus `hint 'device_time'` for `HOME_HUB_01`, sort timestamp descending, limit 50.
- TTL `expireAfterSeconds: 2592000` on `timestamp`.
- UI role: evidence for markers, especially `/cluster` when the primary changes, and the siren when the level crosses 85%.
- Phrase to keep: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).

## 7. API (~400 words)

- Base URL `http://localhost:3000`. CORS origin `http://localhost:5173`.
- Routes: `/api/health`, `/api/telemetry/latest`, `/api/telemetry/alerts`, `/api/telemetry/analytics/averages`, `/api/telemetry/history`, `/api/telemetry/summary`.
- Pagination: `page`, `limit` capped at 100, `total` in the body.
- Validation: 400 for bad dates, unknown `bucket`, unknown alert `reason`, and a device id other than `HOME_HUB_01`.
- History `bucket=minute|hour` returns averaged level points. Without `bucket` it returns documents.
- Summary adds trend, litres per hour, a time estimate, and last-hour min/max. Those are computed from stored readings, not from a second sensor.
- Actuator fields are strings. There is no command API.

## 8. Conclusion and future work (~300 words)

- What was shown: a nested tank document, indexed time-range reads, majority writes, election after the preferred primary stops, a dashboard, a siren, and a deduplicated Telegram alert.
- What was not shown: sharding, multi-region latency, authenticated MQTT, exactly-once ingest.
- Future work: idempotent reading ids to absorb QoS 1 duplicates; keyfile authentication on the replica set; a change stream instead of 5 s polling.

## Appendices

- Appendix A: `synthetic_sensor_dataset.json` (1200 documents from the seed script; it does not load MongoDB).
- Appendix B: `rs.status()` before and after failover, and a secondary `countDocuments` next to the primary.
- Appendix C: `explain()` output with and without `device_time`.
- Appendix D: smoke-test output and UI screenshots, including the overflow siren and one Telegram message.

## Harvard references (starter set)

- Brewer, E. (2012) ‘CAP twelve years later: how the “rules” have changed’, *Computer*, 45(2), pp. 23–29.
- Information Commissioner’s Office (no date) *Principle (e): Storage limitation*. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/ (Accessed: 1 October 2026).
- MongoDB Inc. (2026) *Replication*. Available at: https://www.mongodb.com/docs/manual/replication/ (Accessed: 1 October 2026).
- MongoDB Inc. (2026) *TTL indexes*. Available at: https://www.mongodb.com/docs/manual/core/index-ttl/ (Accessed: 1 October 2026).
- Sadalage, P.J. and Fowler, M. (2012) *NoSQL distilled: a brief guide to the emerging world of polyglot persistence*. Upper Saddle River, NJ: Addison-Wesley.
- Telegram (2026) *Telegram Bot API: sendMessage*. Available at: https://core.telegram.org/bots/api (Accessed: 1 October 2026).

Add the coursework brief and any lecture notes actually used. Do not cite sources you did not read.
