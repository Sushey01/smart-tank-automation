# Risks and limitations

## Single host

All three `mongod` processes, Mosquitto, and Node share one machine. An election here shows process failure, not the loss of a whole server or a network partition between data centres.

## Anonymous local broker

`mosquitto.conf` allows anonymous clients on port 1883. Anyone who can reach that port can publish. The lab accepts that. A deployed broker needs authentication and TLS.

## Replica set is not sharding

Each member stores a full copy. Adding a member adds availability and read capacity, not a larger write throughput. Do not describe `rs0` as a sharded cluster.

## Election pause

While the set has no primary, majority writes wait. The driver retries. The honest description is a brief write pause during election (~10 s), with no loss of writes that were already acknowledged.

## Replication lag

Averages and bucketed history use `secondaryPreferred`. A secondary can be a moment behind the primary. Latest and health reads stay on the primary.

## At-least-once MQTT

QoS 1 can deliver the same payload twice. Ingestion inserts both copies. There is no idempotency key.

## TTL is a lab control, not a full GDPR programme

The 30-day TTL on `timestamp` is the storage-limitation control for synthetic readings. It does not replace a privacy notice, access control, or a decision about the Telegram chat history, which lives on Telegram’s servers.

## Port collision

Port 27017 is often another project’s `mongod`. `scripts/replica-init.js` refuses to call `rs.initiate` in that case. Do not kill that process to free the port unless it is yours.

## UI polling

The dashboard polls every 5 seconds and the cluster page every 2 seconds. A change stream would be faster and was not required. Polling pauses while the tab is hidden.

## Siren and Telegram

The siren cannot start until the operator clicks **Arm siren**. A phone notification depends on `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. If either is missing, readings are still stored.
