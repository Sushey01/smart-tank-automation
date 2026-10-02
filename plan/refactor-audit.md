# Refactor Audit Report

**Date:** 2026-10-02  
**System:** Smart Tank Automation (`HOME_HUB_01`)  
**Module:** CMP6207 Modern Data Stores  

---

## 1. Existing System Audit vs. Specification Requirements

| Component / Requirement | Current Implementation | Specification Requirement (Sections 2–4) | Deviation & Gap | Risk of Change |
| :--- | :--- | :--- | :--- | :---: |
| **Ingestion Idempotency** | Index `{device_id: 1, timestamp: -1}` is non-unique. Insert duplicate key errors crash or are unhandled. | Unique index on `{device_id: 1, timestamp: 1}`. Catch code 11000, log "duplicate skipped", expose metrics in `/api/health` and `/api/stats`. | Current schema allows duplicate MQTT deliveries on QoS 1 redelivery. | Low (Standard duplicate key pattern; safe handling). |
| **Dead-Letter Storage** | Invalid MQTT messages are logged to console and dropped. | Save rejected messages to `rejected_messages` collection with `reason`, `topic`, truncated `payload` (max 2 KB), `received_at` and 7-day TTL index. | Currently no persistent dead-letter queue; telemetry drops are silent. | Low (Independent collection write). |
| **MQTT Client Session** | Ephemeral clientId (`smart-tank-ingest-${process.pid}`), default `clean: true`. | Fixed clientId (`smart-tank-ingestion-service`), `clean: false`, QoS 1 subscription. | Ingestion restart currently loses messages buffered by broker during downtime. | Low (Standard MQTT v3.1.1/5.0 persistent session). |
| **Control & Hysteresis Logic** | Hardcoded thresholds in `devices.js`. Valve and pump states derived purely from single current level. | Single exported `CONTROL_CONFIG` object. Hysteresis loops: Inlet (open $\le 40$, close $\ge 85$), Pump (stop $\le 25$, restart $\ge 35$), Leak ($-\Delta L \ge 2.5\%$ in $\le 30$s). State memory across readings. | Current logic causes motor/valve chattering around threshold boundaries. | Medium (Requires actuator state persistence in controller). |
| **Telemetry Simulator** | Random level jumping via `waterLevelPct()` (20–90%). Fixed firmware `v2.4.1`. | Continuous physics model: level decreases with pump consumption, increases with valve inlet, plus noise. Interval 2–9s. Switches: `LEAK_TEST=1`, `FIRMWARE=v2.5.0` (with `water_quality`). `npm run demo:schema`. | Current random jumping is unrealistic for leak detection and hysteresis. | Low (Physics state accumulator in simulator). |
| **Failover Measurement** | Manual instructions in `docs/failover-steps.md`. No automated probe. | `scripts/measure-failover.js` probing `failover_probe` every 500 ms with `w: "majority"`. Produces `evidence/failover-<timestamp>.json`. Docs on graceful vs hard kill. | No empirical measurement of write pause duration during election. | Low (Standalone diagnostic script). |
| **Quorum Verification** | Manual description in report. | `scripts/quorum-demo.js` testing minority write failure. `docs/quorum-demo.md` explaining 2-of-3 node loss. | Missing executable quorum script. | Low (Standalone diagnostic script). |
| **Scale Benchmarking** | Hardcoded 1200 records in `seed.js`. Simple `benchmark.js`. | `npm run seed -- 100000` supporting batching and unique timestamps. `npm run benchmark` comparing COLLSCAN vs index on actual size, outputting `evidence/benchmark-<count>.txt`. | Cannot easily benchmark with 100k+ documents. | Medium (Batched bulk write and timestamp generator). |
| **API Architecture & Auth** | CRUD directly on `/api/telemetry`. No API key auth. Basic `/api/devices` and `/api/homes`. | Move full CRUD to `/api/homes` and `/api/devices`. Keep telemetry CRUD under `ENABLE_TELEMETRY_ADMIN=true`. Add `X-API-Key` middleware. Swagger `securitySchemes`. Pagination max 100. | Ingestion telemetry should be append-only; missing API security middleware. | Medium (Refactoring Express route handlers and middleware). |
| **Automated Testing** | Custom assert runner in `src/test.js` with some mock DB fallbacks. | Real assertions with zero fake passes. Separate test DB `smart_water_test`. Clean skip if cluster unreachable. `npm test \| tee evidence/test-output.txt`. | Must ensure tests verify all new hysteresis, duplicate, and auth rules. | Low (Refined test suite). |
| **Evidence Helper** | None. | `npm run evidence` (`scripts/generate-evidence.js`) extracting cluster status, counts, indexes, and 3 sample documents to `evidence/`. | Currently evidence must be manually copied. | Low (Automated diagnostic extractor). |
| **Report Structure & Placeholders** | Single draft report with raw placeholders. Some non-existent items mentioned. | `report/CMP6207-report.md` aligned with codebase, Harvard references strictly matching references, word count script (`npm run report:wordcount`), only real evidence from `evidence/`. | Discrepancy between code features and report claims. | Low (Editorial and structural alignment). |

---

## 2. Identified Repository Ground Values

* **Database Name:** `smart_water` (configured in `src/lib/config.js`)
* **Primary Collection:** `sensor_activations`
* **Companion Collections:** `homes`, `devices`, `alerts`, `rejected_messages`, `failover_probe`
* **Test Database:** `smart_water_test`
* **Device ID:** `HOME_HUB_01`
* **Topic:** `iothings/home/telemetry`
* **Replica Set Name:** `rs0`
* **MongoDB Ports:** 27017 (Primary), 27018 (Secondary), 27019 (Secondary)
* **Mosquitto Port:** 1883
* **Express Port:** 3000
* **Vite Dashboard Port:** 5173

---

## 3. Implementation Plan & Execution Sequence

1. **Step 1:** Idempotent Ingestion, Metrics & Dead-Letter Queue (`src/server.js`, `src/lib/indexes.js`, `src/lib/config.js`).
2. **Step 2:** Single-Source Thresholds, Controller State & Hysteresis Logic (`src/lib/devices.js`).
3. **Step 3:** Realistic Dynamic Simulator, Schema Evolution Demo & `demo:schema` (`src/simulator.js`, `scripts/demo-schema.js`).
4. **Step 4:** Failover Measurement Probe & Quorum Demo (`scripts/measure-failover.js`, `scripts/quorum-demo.js`, `docs/`).
5. **Step 5:** Scale Benchmark (100k seed), Explain Stats & Evidence Helper (`src/seed.js`, `src/benchmark.js`, `scripts/generate-evidence.js`).
6. **Step 6:** API Key Middleware, Registry CRUD (`homes`, `devices`), Telemetry Admin Guard & Swagger Alignment (`src/server.js`, `src/lib/swagger.js`).
7. **Step 7:** Comprehensive Test Suite (`src/test.js`) and Execution Evidence.
8. **Step 8:** Documentation & Evidence Checklist (`README.md`, `docs/evidence-checklist.md`, `plan/`).
9. **Step 9:** Report Refactoring & Word Count Tool (`report/CMP6207-report.md`, `scripts/count-report-words.js`).
