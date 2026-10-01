# Risks and limitations

## Single host

All three `mongod` processes, Mosquitto, the API, and the browser run on one computer. Stopping one `mongod` demonstrates an election. Powering the computer off stops the whole set. This is not a multi-site deployment.

## Anonymous local broker

`mosquitto.conf` sets `allow_anonymous true` and listens on port 1883 without TLS. That is acceptable only on localhost for a lab. A real deployment needs accounts or certificates and a broker that is not open on a shared network.

## Replica set is not sharding

A replica set copies the same data to every member. Reads can be spread to secondaries. Writes still go to the primary. Adding a third node does not increase storage capacity or write throughput the way a shard would. Say this in the report and the README.

## Election pause

When the primary stops, the set cannot acknowledge majority writes until a new primary is elected. Expect a brief write pause during election (~10 s). The driver retries retryable writes. This is automatic failover with no acknowledged-write loss. It is not zero downtime, and this repository does not claim that.

## Replication lag

Analytics use `secondaryPreferred`. A secondary can be a moment behind the primary, so an average can omit the newest insert. Latest-reading and health routes stay on the primary.

## At-least-once MQTT

QoS 1 can deliver a payload twice. Ingestion inserts each delivery. Duplicate documents are possible. A production design would use a deterministic `_id` (device id + timestamp) and accept duplicate-key errors.

## TTL is a lab control, not a full GDPR programme

Readings are synthetic. The 30-day TTL on `timestamp` illustrates storage limitation. It does not implement subject access, lawful basis, or a retention schedule for real occupants.

## Secondary counts during failover

While a member is down, its count cannot be read. After it rejoins and catches up, counts should match. Compare counts only once `rs.status()` shows the member as SECONDARY (or PRIMARY), not while it is STARTUP2.

## Port collision

Port 27017 may already be a different MongoDB instance. This project does not use it. Optional Docker uses 27217–27219 so it does not bind 27017 or the coursework ports 27117–27119. Do not run Docker and the host replica set against the same ports at the same time.

## UI polling

The dashboard refreshes every 5 seconds. It is not a MongoDB change stream. A reading can appear up to one poll late.
