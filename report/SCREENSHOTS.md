# Coursework Screenshots & Figures Register

Module: **CMP6207 Modern Data Stores**  
System: **Smart Tank Automation (`HOME_HUB_01`)**  
Database: **`smart_water`** | Replica Set: **`rs0`**

This register catalogues every visual evidence slot defined in the coursework report (`report/CMP6207-report.md`). Each entry specifies the exact terminal command or browser view to capture, the expected visual elements, and its current status.

---

## Figures Register

| Fig # | Target Image Path | Source / Command | What to Capture & Show | Status |
|:---:|:---|:---|:---|:---:|
| **Fig 1** | `report/images/01-system-architecture.png` | Architecture Schematic / Mermaid Diagram | Complete multi-tier pipeline: Edge simulator, Mosquitto MQTT broker (1883), Express API (3000), 3-node MongoDB Replica Set `rs0` (27017, 27018, 27019), and React Web Frontend (5173). | **[Pending capture]** (Rendered as inline Mermaid diagram in report) |
| **Fig 2** | `report/images/02-replica-status.png` | `mongosh --port 27017 --eval "rs.status()"` | Terminal output displaying replica set `rs0` members, member states (`PRIMARY`, `SECONDARY`), health: 1, and optimes. | **[Pending capture]** |
| **Fig 3** | `report/images/03-collections-document.png` | MongoDB Compass or `mongosh` | Left sidebar showing `smart_water` database with all collections (`sensor_activations`, `homes`, `devices`, `alerts`, `rejected_messages`, `failover_probe`) and one expanded document with BSON types. | **[Pending capture]** |
| **Fig 4** | `report/images/04-index-explain.png` | `npm run benchmark` | Terminal benchmark output comparing `COLLSCAN` (30,985 docs examined) vs `IXSCAN` (`device_time`, 50 docs examined) showing 105x speedup. | **[Pending capture]** |
| **Fig 5** | `report/images/05-swagger-overview.png` | Browser at `http://localhost:3000/api-docs` | Interactive Swagger UI API documentation listing all 14 REST endpoints, tagged into System, Fleet, Telemetry, and Automation. | **[Captured & Verified]** (File exists in `report/images/05-swagger-overview.png`) |
| **Fig 6** | `report/images/06-swagger-health.png` | Browser at `http://localhost:3000/api-docs` | Swagger execution of `GET /api/health` displaying HTTP 200 with replica set `rs0` members, primary, and live ingestion counters. | **[Pending capture]** |
| **Fig 7** | `report/images/07-swagger-crud.png` | Browser at `http://localhost:3000/api-docs` | Swagger execution of `POST /api/homes` or `POST /api/devices` with `X-API-Key` header showing HTTP 201 Created. | **[Pending capture]** |
| **Fig 8** | `report/images/08-web-dashboard.png` | Browser at `http://localhost:5173` | React 18 web dashboard displaying animated water tank gauge, volume in litres, active valve/pump indicators, and historical trend chart. | **[Pending capture]** |
| **Fig 9** | `report/images/09-cluster-failover.png` | Browser at `http://localhost:5173/cluster` or Terminal | Cluster health view or terminal showing Primary node step-down / termination and election of a new Primary member. | **[Pending capture]** |
| **Fig 10** | `report/images/10-test-suite-pass.png` | `npm test` | Clean terminal banner showing all 14 automated unit/integration tests passing with 0 failures. | **[Pending capture]** |
| **Fig 11** | `report/images/11-mqtt-ingestion.png` | `node src/server.js` | Backend server terminal showing active subscription to `iothings/home/telemetry`, stored readings, and idempotent duplicate skipped logs. | **[Pending capture]** |
| **Fig 12** | `report/images/12-failover-probe.png` | `npm run measure:failover -- --duration 10` | Failover probe summary displaying attempted writes, acknowledged writes with `w: "majority"`, average latency, and 0 missing writes. | **[Pending capture]** |
| **Fig 13** | `report/images/13-backup-restore.png` | `node scripts/backup-demo.js` | Terminal execution of `mongodump` with oplog archiving and restore into isolated demonstration database with document count parity. | **[Pending capture]** |

---

## Instructions for Capturing Evidence Screenshots
1. **Window Sizing & Readability:** Crop terminal windows tightly around the relevant commands and JSON responses. Use high-contrast fonts (white text on dark background).
2. **Confidentiality:** Ensure no private local absolute directory paths or API secrets are visible in browser URLs or shell prompts.
3. **Format & Placement:** Save images in PNG format inside `report/images/` using the exact filenames listed above.
