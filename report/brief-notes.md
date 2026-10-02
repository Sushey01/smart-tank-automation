# CMP6207 Modern Data Stores: Brief Notes & Specification Template

> **Note to Student:** This file is a working template populated from the module requirements. You must review your official module brief on Moodle and fill in/confirm any exact institutional deadlines, submission procedures, and specific marking weightings before final submission.

---

## 1. Assessment Overview & Metadata
* **Module Code & Title:** CMP6207 Modern Data Stores
* **Academic Level & Credit Weight:** Level 6 / 20 Credits (Coursework Component: 60%)
* **Institution:** Birmingham City University (Faculty of Computing, Engineering and the Built Environment)
* **Module Leader:** Konstantinos Vlachos
* **Brief Context:** Assessment Year 2024–2025 / 2025–2026
* **Official Deadline:** *[Insert official submission deadline from Moodle / Course Guide]*

---

## 2. Word-Count Rules & Budget Allocation
* **Prescribed Workload:** Approximately 4,000 words for the main narrative.
* **Main Assessed Narrative:** Sections 1 through 6.
  * Section 1 (Introduction): ~300 words
  * Section 2 (Principal NoSQL Types & Theoretical Basis): ~900 words
  * Section 3 (Critical Comparison: Relational vs Document): ~900 words
  * Section 4 (Design, Implementation & Distributed Management): ~1,300 words
  * Section 5 (API Implementation & Dashboard Evidence): ~350 words
  * Section 6 (Summary, Conclusion & Future Investment): ~250 words
  * **Target Total:** ~4,000 words (±10%: 3,600 – 4,400 words)
* **Exclusions from Main Word Count:** Cover page, Contents, List of Figures/Tables, code snippets, syntax blocks, Markdown tables, figure captions, references/bibliography, and Appendices (A through F).

---

## 3. Minimum Requirements & Artifact Checklist
* **Minimum Device Models:** At least 1 physical or simulated IoT asset (this project implements `HOME_HUB_01` smart tank controller, plus registry records for companion sensors).
* **Minimum Document Counts:** Realistic scale demonstration (seeded dataset of 30,985 documents in `sensor_activations`).
* **Minimum API Endpoints:** Complete RESTful API with full CRUD capability across master registries (`/api/homes`, `/api/devices`), telemetry inspection, analytical aggregations, and OpenAPI/Swagger documentation.
* **Clustering & Distribution:** 3-node MongoDB Replica Set (`rs0`) on distinct ports (27017, 27018, 27019) demonstrating Raft consensus elections, majority write concerns, and automatic failover with zero acknowledged-write loss.

---

## 4. Authorship & Generative AI Rules
* **Declaration Requirement:** Students must sign and prepend the official University Coursework Declaration stating original authorship and detailing any ethical AI assistance utilized during drafting/refactoring.
* **Independent Verification:** All reported metrics, benchmarks, cluster states, and execution outputs must originate from real executions in this repository (`evidence/` directory).

---

## 5. Marking Criteria & Learning Outcome Mapping
* **LO1 (20%):** Critical theoretical appraisal of NoSQL architectures (Key-Value, Document, Wide-Column, Graph), CAP theorem, PACELC, and consistency models.
* **LO2 (20%):** Comparative evaluation of Relational vs NoSQL paradigms, schema polymorphism, impedance mismatch, and transactional guarantees.
* **LO3 (20%):** Data modeling, indexing strategies, time-series aggregations, and query optimization.
* **LO4 (20%):** Distributed clustering, high availability, replica set election mechanics, quorum analysis, and fault tolerance.
* **LO5 (20%):** Software engineering quality, API design, security posture, automated verification, and critical evaluation.
