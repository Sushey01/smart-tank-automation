# IoThings Application Report: Smart Tank Telemetry and Control Data Store

**Module:** CMP6207 Modern Data Stores  
**Assessment:** CWRK Professional Implementation Report (Level 6 / 60%)  
**Academic Year:** 2024–2025 / 2026  
**Institution:** Birmingham City University, Faculty of Computing, Engineering and the Built Environment  
**Student Name:** [Enter student name]  
**Student ID:** [Enter student ID]  
**Submission Month/Year:** [Enter actual submission month/year]  
**Main Narrative Workload:** Approximately 4,000 words (Sections 1–6; see word-count record in Appendix F)  

> **Review Notice:** Replace this cover page with, or prepend, the official University Coursework Declaration and Cover Sheet required by Birmingham City University. This draft was prepared with AI-assisted editing and technical structuring. In accordance with BCU Academic Integrity policies and the assessment brief's authorship regulations, the student must review, adapt, and verify all claims, declarations, and code observations prior to formal submission. Bracketed identity placeholders and pending screenshot boxes require attention before final export.

---

## Contents

* [1 Introduction](#1-introduction)
* [2 Principal NoSQL Types and Their Theoretical Basis](#2-principal-nosql-types-and-their-theoretical-basis)
  * [2.1 Key–Value Stores](#21-keyvalue-stores)
  * [2.2 Document Stores](#22-document-stores)
  * [2.3 Wide-Column Stores](#23-wide-column-stores)
  * [2.4 Graph Stores](#24-graph-stores)
  * [2.5 Consistency Theory and Selection](#25-consistency-theory-and-selection)
* [3 Critical Comparison: Relational and Document Databases](#3-critical-comparison-relational-and-document-databases)
  * [3.1 Schema, Relationships and Integrity](#31-schema-relationships-and-integrity)
  * [3.2 Queries, Performance and Scalability](#32-queries-performance-and-scalability)
  * [3.3 Transactions, Consistency and Delivery Guarantees](#33-transactions-consistency-and-delivery-guarantees)
  * [3.4 Governance, Cost and Client Judgement](#34-governance-cost-and-client-judgement)
* [4 Design, Implementation and Distributed Management](#4-design-implementation-and-distributed-management)
  * [4.1 Architecture and Reproducible Setup](#41-architecture-and-reproducible-setup)
  * [4.2 Dataset, Collection Boundaries and Validation](#42-dataset-collection-boundaries-and-validation)
  * [4.3 MQTT Ingestion and Automation](#43-mqtt-ingestion-and-automation)
  * [4.4 Indexes and Analytical Queries](#44-indexes-and-analytical-queries)
  * [4.5 Replication, Failover and Recovery](#45-replication-failover-and-recovery)
  * [4.6 Security and Operational Readiness](#46-security-and-operational-readiness)
* [5 API Implementation and Dashboard Evidence](#5-api-implementation-and-dashboard-evidence)
* [6 Summary, Conclusion and Future Investment](#6-summary-conclusion-and-future-investment)
* [References](#references)
* [Appendix A: Dataset Provenance and Reproducibility](#appendix-a-dataset-provenance-and-reproducibility)
* [Appendix B: Local Installation and Replica-Set Capture](#appendix-b-local-installation-and-replica-set-capture)
* [Appendix C: API Contract and Concrete Examples](#appendix-c-api-contract-and-concrete-examples)
* [Appendix D: Verification, CRUD and Evidence Status](#appendix-d-verification-crud-and-evidence-status)
* [Appendix E: Failover, Backup and Security Captures](#appendix-e-failover-backup-and-security-captures)
* [Appendix F: Source Map, Word Count and Completion Checklist](#appendix-f-source-map-word-count-and-completion-checklist)

---

## List of Figures

* **Figure 1:** Implemented multi-tier pipeline and distributed boundary `[Source-inspected: src/server.js, src/simulator.js]`
* **Figure 2:** MongoDB Replica Set status terminal evidence slot `[Pending capture: 02-replica-status.png]`
* **Figure 3:** Database collections and stored document BSON structure slot `[Pending capture: 03-collections-document.png]`
* **Figure 4:** Query execution plan and compound index explain evidence slot `[Pending capture: 04-index-explain.png]`
* **Figure 5:** Swagger UI interactive API contract overview `[Measured: report/images/05-swagger-overview.png]`
* **Figure 6:** Interactive Swagger execution of GET `/api/health` slot `[Pending capture: 06-swagger-health.png]`
* **Figure 7:** Interactive Swagger POST CRUD execution slot `[Pending capture: 07-swagger-crud.png]`
* **Figure 8:** Running React web dashboard with live tank telemetry slot `[Pending capture: 08-web-dashboard.png]`
* **Figure 9:** Cluster management and primary failover detection view slot `[Pending capture: 09-cluster-failover.png]`
* **Figure 10:** Automated test suite execution terminal evidence slot `[Pending capture: 10-test-suite-pass.png]`
* **Figure 11:** MQTT subscriber terminal with duplicate suppression slot `[Pending capture: 11-mqtt-ingestion.png]`
* **Figure 12:** Continuous failover probe measurement output slot `[Pending capture: 12-failover-probe.png]`
* **Figure 13:** Backup dump and isolated restore verification terminal slot `[Pending capture: 13-backup-restore.png]`

---

## List of Tables

* **Table 1:** Multi-criteria NoSQL paradigm evaluation for smart utility telemetry `[Source-inspected]`
* **Table 2:** Application collection boundaries, schema responsibilities, and design trade-offs `[Source-inspected: src/lib/config.js, src/lib/indexes.js]`
* **Table 3:** Fresh read-only query benchmark comparison on 30,985 documents `[Measured: evidence/benchmark-30985.txt, 2 October 2026]`
* **Table 4:** Replica set member state, health, and optime synchronization `[Measured: evidence/rs-status-1790923572599.json, 2 October 2026]`
* **Table 5:** Synthetic sensor inventory and calibration boundaries `[Source-inspected: src/lib/devices.js, src/seed.js]`
* **Table 6:** REST endpoint catalogue and operational status codes `[Source-inspected: src/server.js, src/lib/swagger.js]`
* **Table 7:** Empirical evidence provenance record `[Measured: evidence/, 2 October 2026]`
* **Table 8:** Canonical source code implementation map `[Source-inspected]`

---

## 1 Introduction

IoThings Home Automation Solutions is a specialized technology provider deploying connected environmental instrumentation and automated controls across domestic properties in the United Kingdom. Its established commercial infrastructure relies upon relational database management systems that support transactional enterprise resource planning, customer relationship management, invoicing, and inventory logistics. While relational architectures satisfy transactional accounting requirements, the company’s expansion into continuous environmental monitoring introduces high-frequency telemetric data streams that strain tabular schemas. This report investigates a dedicated telemetry data store and automation backend centered upon an automated domestic utility installation: a smart domestic water storage and pumping apparatus identified as `HOME_HUB_01`.

The smart water tank installation is evaluated as an illustrative domestic automation subsystem within the scope of the CMP6207 coursework specification (Birmingham City University, 2024). Treating domestic fluid utility monitoring as the core IoT demonstrator represents an engineering assumption; explicit lecturer confirmation should be recorded before final grading. The demonstrator models an automated household water reservoir combining continuous ultrasonic depth tracking, mechanical high-level overflow and low-level dry-run float switches, closed-loop inlet solenoid valve regulation, booster pump protection, and algorithmic pipe-leak detection. The complete software path integrates an asynchronous physics simulator, an Eclipse Mosquitto message broker, a Node.js ingestion engine, a 3-member MongoDB replica set (`rs0`), an Express REST API with Swagger documentation, and a React web dashboard.

To comply with United Kingdom General Data Protection Regulation (UK GDPR) mandates and protect residential confidentiality, all telemetry readings are synthetically generated. No real household records or unanonymized personal identities were captured. Every empirical number, log snippet, and benchmark result in this report is strictly governed by an explicit evidence convention: statements are labeled as `[Measured]` from a timestamped file in the `evidence/` directory, `[Source-inspected]` from repository source files, or `[Pending capture]` for screenshot slots awaiting final window grabs. The primary recommendation is a phased, evidence-led investment: IoThings should retain relational platforms for core enterprise transactions while introducing MongoDB strictly for the semi-structured IoT telemetry subsystem.

---

## 2 Principal NoSQL Types and Theoretical Basis

[Section 2 outline pending critical analysis rewrite]

## 3 Critical Comparison: Relational vs Document Paradigm

[Section 3 outline pending critical analysis rewrite]

## 4 System Architecture, Implementation and Distributed Management

[Section 4 outline pending implementation detail]

## 5 API Implementation and Dashboard Evidence

[Section 5 outline pending API contract and evidence]

## 6 Summary, Conclusion and Future Investment

[Section 6 outline pending evaluation]

## References

* Andrew Banks and Rahul Gupta (2014) *MQTT Version 3.1.1*. OASIS Standard, 29 October. Available at: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html (Accessed: 2 October 2026).
* Birmingham City University (2024) *CMP6207 Modern Data Stores: Coursework Assignment Brief, Academic Year 2024–25*. Birmingham: Birmingham City University.
* Fay Chang, Jeffrey Dean, Sanjay Ghemawat, Wilson C. Hsieh, Deborah A. Wallach, Mike Burrows, Tushar Chandra, Andrew Fikes and Robert E. Gruber (2006) 'Bigtable: A distributed storage system for structured data', in *Proceedings of the 7th USENIX Symposium on Operating Systems Design and Implementation (OSDI '06)*. Seattle, WA: USENIX Association, pp. 205–218.
* Edgar F. Codd (1970) 'A relational model of data for large shared data banks', *Communications of the ACM*, 13(6), pp. 377–387.
* Giuseppe DeCandia, Deniz Hastorun, Madan Jampani, Gunavardhan Kakulapati, Avinash Lakshman, Alex Pilchin, Swaminathan Sivasubramanian, Peter Vosshall and Werner Vogels (2007) 'Dynamo: Amazon’s highly available key-value store', *ACM SIGOPS Operating Systems Review*, 41(6), pp. 205–220.
* Seth Gilbert and Nancy Lynch (2002) 'Brewer’s conjecture and the feasibility of consistent, available, partition-tolerant web services', *ACM SIGACT News*, 33(2), pp. 51–59.
* Martin Kleppmann (2017) *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. Sebastopol, CA: O’Reilly Media.
* MongoDB (n.d.a) *mongodump: Database tools*. Available at: https://www.mongodb.com/docs/database-tools/mongodump/ (Accessed: 2 October 2026).
* MongoDB (n.d.b) *Replica set elections*. Available at: https://www.mongodb.com/docs/manual/core/replica-set-elections/ (Accessed: 2 October 2026).
* MongoDB (n.d.c) *Compound indexes*. Available at: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/ (Accessed: 2 October 2026).
* MongoDB (n.d.d) *Data modeling in MongoDB*. Available at: https://www.mongodb.com/docs/manual/data-modeling/ (Accessed: 2 October 2026).
* MongoDB (n.d.e) *Replication*. Available at: https://www.mongodb.com/docs/manual/replication/ (Accessed: 2 October 2026).
* MongoDB (n.d.f) *Security checklist for self-managed deployments*. Available at: https://www.mongodb.com/docs/manual/administration/security-checklist/ (Accessed: 2 October 2026).
* MongoDB (n.d.g) *Sharding*. Available at: https://www.mongodb.com/docs/manual/sharding/ (Accessed: 2 October 2026).
* MongoDB (n.d.h) *Transactions*. Available at: https://www.mongodb.com/docs/manual/core/transactions/ (Accessed: 2 October 2026).
* MongoDB (n.d.i) *Schema validation*. Available at: https://www.mongodb.com/docs/manual/core/schema-validation/ (Accessed: 2 October 2026).
* MongoDB (n.d.j) *Write concern*. Available at: https://www.mongodb.com/docs/manual/reference/write-concern/ (Accessed: 2 October 2026).
* Neo4j (n.d.) *Graph database concepts*. Available at: https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/ (Accessed: 2 October 2026).
* PostgreSQL Global Development Group (n.d.a) *PostgreSQL 18 documentation: Constraints*. Available at: https://www.postgresql.org/docs/18/ddl-constraints.html (Accessed: 2 October 2026).
* PostgreSQL Global Development Group (n.d.b) *PostgreSQL 18 documentation: Transaction isolation*. Available at: https://www.postgresql.org/docs/18/transaction-iso.html (Accessed: 2 October 2026).
* PostgreSQL Global Development Group (n.d.c) *PostgreSQL 18 documentation: JSON types*. Available at: https://www.postgresql.org/docs/18/datatype-json.html (Accessed: 2 October 2026).
* Redis (n.d.) *Redis data types*. Available at: https://redis.io/docs/latest/develop/data-types/ (Accessed: 2 October 2026).
* Michael Stonebraker (2010) 'SQL databases v. NoSQL databases', *Communications of the ACM*, 53(4), pp. 10–11.

---

## Appendix A: Dataset Provenance and Synthesis Profile

[Appendices pending collation]
