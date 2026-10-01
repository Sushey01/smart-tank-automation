# Failover steps (host replica set)

This is the path to screenshot for the report. It uses the three `mongod` processes on ports 27017, 27018, and 27019. Run `scripts/replica-init.js` only when 27017 is free or is already this coursework `rs0`. The script refuses to initialise a different database.

Expect automatic failover with no acknowledged-write loss, and a brief write pause during election (~10 s). Do not describe this as zero downtime.

## Before you start

1. All three `mongod` processes are running (see the README).
2. `mongosh --port 27017 --file scripts/replica-init.js` has been run once.
3. `rs.status()` shows one PRIMARY and two SECONDARY members.
4. The API is running (`npm run server`) and the dashboard is open at `http://localhost:5173/cluster`.

The member on port 27017 has priority 2, so it is usually the primary.

## Capture the healthy set

```bash
mongosh --port 27017 --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr + " health=" + m.health))'
mongosh --port 27017 --eval 'db.getSiblingDB("smart_water").sensor_activations.countDocuments()'
mongosh --port 27018 --eval 'db.getSiblingDB("smart_water").sensor_activations.countDocuments()'
```

The two counts should match once both members are PRIMARY or SECONDARY.

## Stop the primary

In the terminal that is running the primary (usually port 27017), press Ctrl+C.

Leave `/cluster` open. It polls every 2 seconds. After the election you should see:

- a dismissible banner: `Failover detected: new primary … at HH:MM:SS`
- one remaining member as Primary
- the stopped member as a down state
- a line in the failover log

Writes that need majority acknowledgement pause until the new primary exists. The Node driver has `retryWrites` enabled, so a retryable insert can complete after the election.

## Restart the stopped member

Start the same `mongod` command again (same port and `--dbpath`). It rejoins the set, usually as a secondary. Refresh the counts after its state is SECONDARY.

```bash
mongosh --port 27018 --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr))'
```

## Optional Docker demo

Only if you are not already using ports 27017–27019 or a host Mosquitto on 1883:

```bash
docker compose up -d
bash scripts/init-replica.sh
bash scripts/failover-demo.sh
```

Point `MONGO_URI` at `mongodb://localhost:27217,localhost:27218,localhost:27219/smart_water?replicaSet=rs0` for that optional cluster. Do not run it beside the host replica set.
