# CMP6207 Assessment Audit & Learning Outcomes Mapping

Module: **CMP6207 Modern Data Stores**  
System: **Smart Tank Automation (`HOME_HUB_01`)**  
Status: **Audit against Module Learning Outcomes (LO1–LO5)**

---

## 1. Learning Outcomes Mapping Matrix

| Learning Outcome | Target Focus & Weighting | Addressed in Report Sections | Evidence & Artifact Reference | Status & Coverage |
|:---|:---:|:---|:---|:---:|
| **LO1: Theoretical Appraisal of NoSQL Types** | 20% | **Section 2:** 2.1 Key-Value, 2.2 Document, 2.3 Wide-Column, 2.4 Graph, 2.5 Consistency Theory (CAP & PACELC) | Decision matrix table comparing Redis, Cassandra, Neo4j, MongoDB against tank telemetry access patterns. | **Fully Addressed** (900 words, original academic prose, Harvard citations) |
| **LO2: Relational vs NoSQL Critical Comparison** | 20% | **Section 3:** 3.1 Schema & Integrity, 3.2 Queries & Scaling, 3.3 Transactions & Delivery, 3.4 Governance & Cost | Comparison of multi-table relational joins vs BSON embedding; analysis of PostgreSQL JSONB; transactional outbox pattern. | **Fully Addressed** (900 words, balanced trade-off analysis) |
| **LO3: Data Modeling & Query Optimization** | 20% | **Section 4.2 & 4.4, Section 5, Section 8, Appendix A** | Multi-collection design (`homes`, `devices`, `sensor_activations`), 6 indexes, `evidence/benchmark-30985.txt` proving 105x speedup. | **Fully Addressed** (Empirical `explain()` proof, real sample extracts) |
| **LO4: Distributed Clustering & High Availability** | 20% | **Section 4.1 & 4.5, Section 7, Appendix B & E** | 3-node MongoDB Replica Set `rs0` on ports 27017, 27018, 27019; `evidence/rs-status-*.json`, `evidence/member-counts-*.json` (30,985 docs synced). | **Fully Addressed** (Raft quorum calculations, failover probe evidence) |
| **LO5: Implementation, API & Engineering Quality** | 20% | **Section 4.3 & 4.6, Section 5, Section 6, Appendix C & D** | Continuous physics simulator, dual-threshold hysteresis, idempotent MQTT ingestion, API key auth, Swagger OpenAPI, 14 passing automated tests. | **Fully Addressed** (`evidence/test-output.txt`, Swagger UI overview) |

---

## 2. Identified Gaps & Action Items
* **Screenshots Integration:** Visual slots are defined in `report/SCREENSHOTS.md`. Figure 5 (`05-swagger-overview.png`) is captured and verified; remaining terminal/browser captures are marked as `[Pending capture]` with exact commands provided so they can be captured without invalidating the empirical results.
* **Cover Sheet:** Student must attach the official institutional coursework cover sheet and sign the authorship declaration as stipulated in the module guide.
