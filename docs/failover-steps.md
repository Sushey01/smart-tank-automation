# Failover Experiments & Measurement Procedures

**Module:** CMP6207 Modern Data Stores  
**Assessment:** Distributed Data Management & High Availability  

This guide details two failover experiments to capture empirical evidence for the coursework report. It uses the 3-node MongoDB Replica Set (`rs0`) on ports 27017, 27018, and 27019.

> **Theoretical Principle:** Automatic failover with no acknowledged-write loss; brief write pause during election. Do not describe this as zero downtime.

---

## 1. Prerequisites & Baseline Verification

1. Ensure all 3 nodes are active and healthy:
   ```bash
   mongosh --port 27017 --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr + " health=" + m.health))'
   ```
2. Node 1 (port 27017) has priority 2 and should be `PRIMARY`.
3. Open the Web Dashboard at **`http://localhost:5173/cluster`** (polls every 2 seconds).

---

## 2. Experiment A: Graceful Stop (Ctrl+C / shutdown)

In a graceful shutdown, `mongod` completes ongoing operations, flushes the journal, closes network sockets (TCP FIN), and steps down.

1. In a separate terminal, launch the automated failover measurement probe:
   ```bash
   node scripts/measure-failover.js
   ```
2. In another terminal, gracefully stop the primary node:
   ```bash
   mongosh --port 27017 --eval "db.adminCommand({ shutdown: 1 })"
   ```
3. **Observed Results:**
   - Surviving secondaries detect socket termination immediately.
   - An election is called rapidly (~3 to 6 seconds).
   - Node 2 or Node 3 is elected as the new `PRIMARY`.
   - On the web dashboard at `http://localhost:5173/cluster`, the amber banner displays:  
     `Failover detected: new primary at HH:MM:SS`.
   - The probe script reports the write pause and verifies 0 missing acknowledged writes.
4. Stop the probe script (`Ctrl+C`) to save `evidence/failover-<timestamp>.json`.
5. Restart Node 1:
   ```bash
   mongod --replSet rs0 --port 27017 --dbpath ./mongo-cluster/node1 --bind_ip localhost --fork --logpath ./mongo-cluster/node1/mongod.log
   ```

---

## 3. Experiment B: Hard Kill (`kill -9` / Abrupt Host Crash)

In an ungraceful hard termination (simulating sudden hardware failure or kernel panic), no TCP teardown occurs.

1. Launch the probe script:
   ```bash
   node scripts/measure-failover.js
   ```
2. Identify the PID of the current primary node and kill it abruptly:
   ```bash
   # Find primary PID (e.g., port 27017 or current primary)
   pkill -9 -f "port 27017"
   ```
3. **Observed Results & Theoretical Difference:**
   - Because no TCP FIN is sent, surviving secondaries do not know the node is gone until their heartbeat probes time out (`heartbeatTimeoutSecs: 10`).
   - The election trigger takes longer (~10 to 12 seconds).
   - Once the heartbeat timeout expires, Nodes 2 and 3 establish quorum (2/3 votes) and elect the new primary.
   - Crucially, **zero acknowledged writes are lost** in both experiments because all writes were acknowledged under `w: "majority"`.
4. Stop the probe script and verify `evidence/failover-<timestamp>.json`.
5. Restart the terminated node.
