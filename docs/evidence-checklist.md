# Coursework Evidence Checklist & Reproduction Guide

Module: CMP6207 Modern Data Stores  
Project: Smart Tank Automation (IoThings)  
Database: `smart_water` | Replica Set: `rs0`

This checklist tracks all empirical evidence files generated from real executions on the MongoDB replica set cluster and Mosquitto MQTT broker. Every claim, number, and metric in the report corresponds to one of these verified evidence artifacts.

---

## 1. Evidence Artifacts Checklist

| Evidence File | Generator Command | Description | Used in Report Section | Status |
|---|---|---|---|---|
| `evidence/test-output.txt` | `npm test \| tee evidence/test-output.txt` | Full automated test suite output (14 unit/integration tests passing) | Section 5, Section 6 | Verified |
| `evidence/rs-status-<timestamp>.json` | `npm run evidence` | Complete `rs.status()` cluster state with member health and optimes | Section 3, Section 6 | Verified |
| `evidence/member-counts-<timestamp>.json` | `npm run evidence` | Independent per-member document counts across ports 27017, 27018, 27019 | Section 3, Section 6 | Verified |
| `evidence/indexes-<timestamp>.json` | `npm run evidence` | Live index list on `sensor_activations` including compound, TTL, and unique keys | Section 4 | Verified |
| `evidence/sample-documents-<timestamp>.json` | `npm run evidence` | 3 real document samples extracted from `smart_water.sensor_activations` | Section 4 | Verified |
| `evidence/benchmark-<count>.txt` | `npm run benchmark` | ExecutionStats table comparing COLLSCAN vs IXSCAN (`device_time`) | Section 7 | Verified |
| `evidence/failover-<timestamp>.json` | `npm run measure:failover` | Continuous failover probe log recording election gap and zero loss | Section 6 | Runnable |
| `evidence/schema-demo.txt` | `npm run demo:schema` | Polymorphic document evolution showing v2.4.1 and v2.5.0 coexisting | Section 4 | Verified |

---

## 2. Reproduction Commands (Run in Order)

Execute the following commands in the project root to reproduce all coursework evidence from scratch:

```bash
# 1. Run full test suite and record test execution output
npm test | tee evidence/test-output.txt

# 2. Extract cluster state, member synchronization, indexes, and document samples
npm run evidence

# 3. Demonstrate polymorphic schema evolution (v2.4.1 and v2.5.0)
npm run demo:schema

# 4. Run query execution benchmark (COLLSCAN vs. IXSCAN)
npm run benchmark

# 5. Measure replica set failover with continuous probe (requires killing primary node)
# In terminal 1:
npm run measure:failover
# In terminal 2 (while probe is running):
# kill -9 <primary-pid>
# Observe election in probe, then Ctrl+C to save evidence/failover-<timestamp>.json

# 6. Verify report word count compliance (Sections 3 to 8: 3,600 - 4,400 words)
npm run report:wordcount
```

---

## 3. Report Placeholder Mapping (`[INSERT: ...]`)

The coursework report (`report/CMP6207-report.md`) references evidence files via structured placeholders:

| Report Placeholder | Corresponding File / Source | Contents to Insert |
|---|---|---|
| `[INSERT: Table of Replica Set Member States from evidence/rs-status-*.json]` | `evidence/rs-status-<timestamp>.json` | Node names (27017, 27018, 27019), health (1), stateStr (PRIMARY/SECONDARY), optimeDate |
| `[INSERT: Member Count Verification Table from evidence/member-counts-*.json]` | `evidence/member-counts-<timestamp>.json` | Proof of zero replication lag: identical document count across all 3 nodes |
| `[INSERT: Index Definitions Table from evidence/indexes-*.json]` | `evidence/indexes-<timestamp>.json` | Names, key patterns, unique flags, and TTL expiration settings |
| `[INSERT: Sample JSON Documents from evidence/sample-documents-*.json]` | `evidence/sample-documents-<timestamp>.json` | Real JSON telemetry document including subdocument structure and source flags |
| `[INSERT: Benchmark ExecutionStats Table from evidence/benchmark-*.txt]` | `evidence/benchmark-<count>.txt` | Comparative metrics: stage, keysExamined, docsExamined, executionTimeMillis, speedup |
| `[INSERT: Automated Test Suite Output from evidence/test-output.txt]` | `evidence/test-output.txt` | 14 passing tests verification banner |
| `[INSERT: Failover Probe Results from evidence/failover-*.json]` | `evidence/failover-<timestamp>.json` | Write gap duration (~10-12s election pause) and confirmed zero acknowledged-write loss |

---

## 4. Figures & Visual Artifacts

| Figure Number | Description | Source / Tool |
|---|---|---|
| Figure 1 | End-to-End System Architecture (IoT Sensors -> MQTT -> Express -> Replica Set `rs0` -> Web UI) | Mermaid diagram in report |
| Figure 2 | Document Schema Diagram (Polymorphic JSON Structure & Embedding vs Referencing) | Mermaid ER diagram in report |
| Figure 3 | Closed-Loop Hysteresis State Machine (Anti-chattering band 40% - 85%) | Mermaid State diagram in report |
| Figure 4 | MongoDB 3-Node Replica Set Election & Failover Sequence | Mermaid Sequence diagram in report |
| Figure 5 | Secondary Read Aggregation Pipeline Stages | Mermaid Flowchart in report |
