# Replica Set Quorum Demonstration & Theory

**Module:** CMP6207 Modern Data Stores  
**Assessment:** Distributed Data Management & High Availability  

---

## 1. Mathematical Quorum in MongoDB

In MongoDB replica sets, primary election and majority write durability are governed by the Raft-like consensus consensus protocol. For a replica set with $N$ voting members, a strict majority ($Q$) is required to elect a primary or acknowledge a majority write:

$$Q = \left\lfloor \frac{N}{2} \right\rfloor + 1$$

For our 3-node replica set (`rs0`):
$$Q = \left\lfloor \frac{3}{2} \right\rfloor + 1 = 1 + 1 = 2 \text{ nodes}$$

---

## 2. Quorum Loss Experiment

### Scenario:
* **Initial State:** 3 nodes active (Node 1 PRIMARY on port 27017, Nodes 2 and 3 SECONDARY on 27018, 27019).
* **Fault Injection:** Terminate both Node 1 (port 27017) and Node 2 (port 27018).
* **Surviving Node:** Only Node 3 (port 27019) remains alive.

### Expected Behavior:
1. **Loss of Majority:** Node 3 detects that it can only reach 1 out of 3 voting members (33.3% of the cluster), which is less than the required quorum of 2.
2. **Step-Down:** If Node 3 was primary, it immediately steps down to `SECONDARY`. It refuses to elect itself as PRIMARY.
3. **Write Stoppage:** Any write specifying `w: "majority"` or targeting a primary fails or times out (`serverSelectionTimeoutMS` or `wtimeoutMS`), preserving consistency and preventing split-brain writes.
4. **Read Availability:** Read queries specifying `readPreference: "secondary"` or `readPreference: "secondaryPreferred"` can **still succeed**, allowing critical operational inspection even when writes are disabled.

---

## 3. Step-by-Step Execution

1. In Terminal 1, stop Node 1:
   ```bash
   mongosh --port 27017 --eval "db.adminCommand({ shutdown: 1 })"
   ```

2. In Terminal 2, stop Node 2:
   ```bash
   mongosh --port 27018 --eval "db.adminCommand({ shutdown: 1 })"
   ```

3. Run the quorum demonstration probe:
   ```bash
   node scripts/quorum-demo.js
   ```

4. **Observed Output:**
   ```text
   [quorum] EXPECTED QUORUM FAILURE OBSERVED:
   Error Message: No primary found in replica set / write concern error
   ```

5. Restart Node 2 or Node 1:
   ```bash
   mongod --replSet rs0 --port 27018 --dbpath ./mongo-cluster/node2 --bind_ip localhost --fork --logpath ./mongo-cluster/node2/mongod.log
   ```
   *Quorum is restored (2 out of 3 nodes alive), an election is held within ~10 seconds, and majority writes immediately resume without data loss.*
