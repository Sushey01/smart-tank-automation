# Smart Water Management Platform: Enhancement Specification & Audit

> **Module:** CMP6207 Modern Data Stores (Level 6)  
> **System:** IoThings Smart Tank Automation (`HOME_HUB_01`)  
> **Target:** Upgrade from "SENSE → STORE → AUTOMATE" to "SENSE → STORE → ANALYSE → WARN → PREDICT → AUTOMATE"  
> **Status:** Specification & Review Document (Prior to Implementation)

---

## 1. Key Architectural Inquiries Addressed

### Q1: "I think 30k seeded is too much, isn't it? Should we reduce it?"
**Decision: Keep the 30,985 documents intact. Do not reduce them.**

#### The Academic & Empirical Reason:
1. **The Empirical Benchmark in Table 3 of your Report:**
   In your submission report (`CMP6207-report.tex`, Section 4.4 and Table 3), you report an empirical query execution benchmark:
   * **Unindexed Collection Scan (`COLLSCAN`):** 105 ms (examining all 30,985 documents).
   * **Compound Index Scan (`IXSCAN` on `{ device_id: 1, timestamp: -1 }`):** 1 ms (examining exactly 50 documents).
   * **Speedup Factor:** **105.0x**.
   This is backed by `evidence/benchmark-30985.txt`.
2. **Why 30k is required for MongoDB benchmarks:**
   MongoDB's WiredTiger storage engine operates heavily in RAM cache. If the collection is reduced to 500 or 1,000 documents, a full collection scan (`COLLSCAN`) executes in under 1 ms. Comparing 1 ms vs 1 ms yields a ~1.0x ratio, making it **impossible to empirically prove the $O(\log N)$ B-Tree index efficiency required for Learning Outcome 3 (LO3)**.
3. **Storage footprint is tiny:**
   30,985 documents in MongoDB BSON occupies only **~15 MB** on disk. It does not strain memory, disk space, or CPU.
4. **Replica Set Evidence Consistency:**
   Your cluster evidence files (`evidence/member-counts-1790923572599.json`) record all three replica set members synchronized at exactly 30,985 documents. Reducing the seed count would invalidate existing evidence captures.

---

### Q2: "Are we adding sensors or just a software layer?"
**Decision: Pure Software Intelligence Layer (No new sensors, no hardware changes).**

#### Technical Justification:
* The existing simulated tank already emits high-frequency telemetry via MQTT QoS 1:
  * `telemetry.water_tank.ultrasonic_depth_pct` (0.0% – 100.0%)
  * `telemetry.water_tank.volume_litres` (0 L – 2,000 L)
  * `telemetry.float_switches.high_level_overflow` (boolean)
  * `telemetry.float_switches.low_level_dry_run` (boolean)
  * `telemetry.actuator_states.inlet_valve` (`OPEN` / `CLOSED`)
  * `telemetry.actuator_states.booster_pump` (`ACTIVE` / `INACTIVE` / `EMERGENCY_STOP`)
  * `timestamp` (ISO 8601 UTC)
* **What we are adding:**
  An **analytics and intelligence service** that interrogates this telemetry using **MongoDB Aggregation Pipelines** and deterministic rules:
  1. **Water Consumption:** Derived from non-filling volume differentials over time.
  2. **Leak / Abnormal Loss Detection:** Derived from persistent water-level drops during quiet household hours (e.g., 01:00–04:30) while the pump is inactive.
  3. **Depletion Prediction:** Derived from rolling consumption rates vs current reserve volume.
  4. **Smart Notifications:** Stored in the existing `alerts` collection with enhanced actionable metadata.

No new hardware, no physical pipe sensors, and no complex plumbing are required.

---

## 2. Enhancement Architecture Overview

```
                      +---------------------------------------+
                      |       Sensor / Tank Simulator         |
                      |  (Continuous Ultrasonic Depth & Pct)  |
                      +---------------------------------------+
                                          |
                                          | MQTT QoS 1
                                          v
                      +---------------------------------------+
                      |      Node.js Ingestion Engine         |
                      |    (Payload Validation & Dedupe)      |
                      +---------------------------------------+
                                          |
                                          | w: 'majority'
                                          v
+-----------------------------------------------------------------------------------+
|                           MongoDB Replica Set (rs0)                               |
|                  Primary (27017) <--> Secondaries (27018, 27019)                   |
|                                                                                   |
|  Collections:                                                                     |
|  - sensor_activations (30,985 historical records + continuous incoming)           |
|  - alerts (Extended schema: severity, type, excess_loss_l, recommendation)        |
|  - homes & devices (Master registries)                                            |
+-----------------------------------------------------------------------------------+
       ^                                                 |
       | Write alerts                                    | secondaryPreferred reads
       |                                                 v
+------------------------------------+   +------------------------------------------+
|  Overnight Leak & Anomaly Engine   |   |        MongoDB Aggregation Engine        |
|  (Deterministic baseline rules)    |   |    ($dateTrunc, $group, $facet, $sort)   |
+------------------------------------+   +------------------------------------------+
                  \                                   /
                   \                                 /
                    v                               v
       +-------------------------------------------------------+
       |               Express REST API (Port 3000)            |
       |  - /api/analytics/consumption/today                   |
       |  - /api/analytics/consumption/daily                   |
       |  - /api/analytics/consumption/monthly                 |
       |  - /api/analytics/summary                             |
       |  - /api/alerts (with unread / acknowledge filter)     |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |             React Web Dashboard (Port 5173)           |
       |         >>> SMART WATER INSIGHTS PANEL <<<            |
       |  - Cards: Today's Usage | Daily Avg | Monthly Usage   |
       |  - Depletion Time: "4h 30m until critical level"      |
       |  - Alert Banner: "Abnormal Overnight Loss (85 L)"     |
       +-------------------------------------------------------+
```

---

## 3. Detailed Specifications for the 9 Features

### Feature 1: Water Consumption Analytics
* **Goal:** Calculate realistic water usage in Litres without inventing sensor data.
* **Physics / Math Model:**
  * In a domestic tank, water consumption occurs when the water volume decreases:
    $$\Delta V = V_{t-1} - V_{t}$$
  * If the inlet valve is `OPEN` or $\Delta V < 0$, the tank is refilling; this interval represents an inflow event rather than household consumption.
  * Household consumption over any time interval $[T_0, T_1]$ is the sum of positive drain deltas:
    $$\text{Consumption} = \sum_{\text{draining intervals}} (V_{i-1} - V_i)$$
* **MongoDB Aggregation Strategy:**
  * Uses `$match` with `{ device_id: 'HOME_HUB_01', timestamp: { $gte: startOfDay } }`.
  * Evaluates bucketed consumption using `$dateTrunc` (by `day` or `hour`) with secondary read preference (`secondaryPreferred`) so analytics never block write ingestion on the Primary.
* **Endpoints:**
  * `GET /api/analytics/consumption/today` $\to$ `{ today_litres: 680, confidence: "calculated" }`
  * `GET /api/analytics/consumption/daily` $\to$ Returns last 7–14 days bucketed consumption.
  * `GET /api/analytics/consumption/monthly` $\to$ Current month total + previous month comparison.
  * `GET /api/analytics/summary` $\to$ High-level summary payload for dashboard cards.

---

### Feature 2: Abnormal Water Use / Possible Leak Detection
* **Academic Positioning:** Transparent, rule-based anomaly detection (Level 6 academic standard; no opaque "fake AI").
* **Configurable Detection Parameters (`src/lib/water-config.js`):**
  * `LOW_USAGE_START`: `01:00` (1:00 AM UTC/local)
  * `LOW_USAGE_END`: `04:30` (4:30 AM UTC/local)
  * `MIN_PERSISTENT_DROP_PCT`: `1.5%` (or $\ge 30\text{ L}$) over the window.
  * `MIN_DURATION_MINUTES`: `45` minutes of continuous downward trend.
* **Detection Rule:**
  1. Timestamp falls within the designated `LOW_USAGE` window.
  2. Booster pump is `INACTIVE` (ruling out intentional heavy domestic pumping).
  3. Inlet valve is `CLOSED`.
  4. Water level consistently decreases across multiple consecutive samples ($N \ge 6$) exceeding normal sensor noise ($\pm 0.2\%$).
* **Alert Generation & Anti-Spam:**
  * Generates alert:
    * **Type:** `ABNORMAL_WATER_USAGE`
    * **Severity:** `warning` (or `critical` if loss $> 100\text{ L}$)
    * **Message:** `⚠ Abnormal Overnight Water Usage Detected`
    * **Metadata:** `{ excess_loss_litres: 85, detection_period: "01:00 - 03:30", recommendation: "Please check household taps, toilets and pipelines for possible leakage." }`
  * **Idempotency/Anti-Spam:** Before inserting an alert into the `alerts` collection, MongoDB queries for an existing active alert of the same type within the last 4 hours. No duplicate spam is created.

---

### Feature 3: Low-Water / Depletion Prediction
* **Goal:** Estimate how long current stored water will last before reaching the critical safety threshold (25%).
* **Formula:**
  $$\text{Available Volume} = \max(0, V_{\text{current}} - V_{\text{critical}})$$
  $$\text{Recent Consumption Rate } (R) = \frac{\Delta V_{\text{consumed}}}{\Delta t_{\text{hours}}} \quad (\text{over the past 2–4 hours})$$
  $$\text{Estimated Time to Critical } (T_{\text{crit}}) = \frac{\text{Available Volume}}{R}$$
* **Graceful Degradation:**
  * If the tank is currently refilling ($R \le 0$) or if telemetry span has fewer than 10 readings:
    * Returns: `{ status: "stable_or_filling", estimated_hours: null, message: "Tank is stable or refilling" }`
  * If consumption is detected:
    * Returns: `{ status: "draining", estimated_hours: 4.5, display: "~4h 30m", critical_level_pct: 25 }`
  * If level $\le 25\%$:
    * Generates `LOW_WATER` alert immediately.

---

### Feature 4: Smart Notifications & Audio Buzzer
* **Alert Categories:**
  * `OVERFLOW_PROTECTION` (Level $\ge 85\%$)
  * `LOW_WATER` (Level $\le 25\%$)
  * `ABNORMAL_WATER_USAGE` (Overnight unmetered continuous drain)
  * `POSSIBLE_LEAK` (Sudden rate-of-drop $> 2.5\%$ in 10s)
  * `PUMP_ABNORMALITY` (Pump commanded active but level dropping faster than max discharge)
* **Audio Buzzer Integration:**
  * Hooks into the existing Web Audio API synthesizer (`web/src/components/SirenControl.tsx`).
  * Emits an audible warning chime/buzzer when an `ABNORMAL_WATER_USAGE` or `POSSIBLE_LEAK` alert triggers.
  * Includes an interactive "Silence / Acknowledge" button in the dashboard alert banner.
* **Schema Extension in `alerts` collection:**
  ```javascript
  {
    _id: ObjectId("..."),
    device_id: "HOME_HUB_01",
    alert_type: "ABNORMAL_WATER_USAGE",
    severity: "warning", // "info" | "warning" | "critical"
    message: "Abnormal Overnight Water Usage Detected",
    measured_value: "68.5%",
    baseline_value: "70.0%",
    estimated_excess_loss_litres: 85,
    recommendation: "Please check household taps, toilets, and pipelines.",
    status: "unread", // "unread" | "acknowledged" | "resolved"
    timestamp: ISODate("2026-10-02T03:15:00Z"),
    resolved_at: null
  }
  ```
* **API Endpoints:**
  * `GET /api/alerts?status=unread` $\to$ List unacknowledged alerts.
  * `PATCH /api/alerts/:id/acknowledge` $\to$ Mark alert as acknowledged.

---

### Feature 5: Dashboard Enhancement & Family Home Setup
* **Resident Household Profile:**
  * Clean household header card: shows active home (*"Alex Mercer — 142 Elm Road, Birmingham (H001)"*), tariff rate, and tank capacity (2,000 L).
  * Lightweight Resident switcher modal to easily switch or log in as family house without heavy external auth bloat.
* **Smart Water Insights Panel:**
  1. **Analytics Stat Cards:**
     * **Today's Usage:** `680 L`
     * **Yesterday:** `620 L`
     * **Daily Average:** `645 L`
     * **Monthly Total:** `18,420 L`
  2. **Availability Forecast Gauge:**
     * `~4h 30m` until critical reserve (25%), with status pill: *Green (> 6h)*, *Orange (2–6h)*, *Red (< 2h)*.
  3. **Alert Banner & Buzzer Card:**
     * Active alert banner showing estimated excess loss ($85\text{ L}$), actionable recommendation, and Audio Buzzer silence control.
  4. **Consumption Chart:**
     * 7-day daily bar chart showing water usage trends.

---

### Feature 6: Demo Mode & Master Viva Demonstration Walkthrough
This flow provides a complete, repeatable demonstration narrative:

```
[1. Resident Login]
       ↓ Selects "Mercer Family (H001)"
[2. Home Setup Banner]
       ↓ Displays property registry, 2,000 L rooftop tank, smart tariff
[3. Live Tank & Automation]
       ↓ Shows continuous ultrasonic level; demonstrates < 40% valve open & > 85% valve close
[4. Water Consumption Analytics]
       ↓ Displays Today's Usage (680 L) and Monthly Total (18,420 L) via MongoDB Aggregations
[5. Simulate Overnight Water Loss]
       ↓ Runs `npm run demo:leak` in terminal (gradual 0.3%/min drop at 02:00 AM)
[6. Abnormal Water Alert + Audio Buzzer]
       ↓ Audible buzzer sounds; banner shows "⚠ Abnormal Overnight Water Usage Detected"
       ↓ Displays "Estimated Excess Loss: 85 L" with advice: "Check taps, toilets & pipes"
[7. Depletion Prediction]
       ↓ System calculates drain rate and predicts: "~3h 45m until critical level (25%)"
```

---

### Feature 7: MongoDB Technical Blueprint
* **Collections Utilized:**
  * `sensor_activations` (Read-heavy analytics, using existing compound index `{ device_id: 1, timestamp: -1 }`).
  * `alerts` (Event log with unique index on `{ device_id: 1, alert_type: 1, timestamp: -1 }` to prevent spam).
* **Read Preference:** All `/api/analytics/*` endpoints execute with `{ readPreference: 'secondaryPreferred' }`. This proves read/write distribution across replica set members (LO4).

---

### Feature 8: Central Configuration (`src/lib/water-config.js`)
All thresholds will be centralized in one well-documented configuration module:
```javascript
module.exports = {
  TANK_CAPACITY_L: 2000,
  THRESHOLDS: {
    OVERFLOW_PCT: 85.0,
    INLET_OPEN_PCT: 40.0,
    BOOSTER_PUMP_CUTOFF_PCT: 25.0,
    BOOSTER_PUMP_RESUME_PCT: 35.0,
  },
  LEAK_DETECTION: {
    LOW_USAGE_START_HOUR: 1,  // 01:00
    LOW_USAGE_END_HOUR: 4.5,  // 04:30
    MIN_DROP_PCT: 1.5,        // 30 Litres
    MIN_DURATION_MINUTES: 45,
    NOISE_TOLERANCE_PCT: 0.2,
    ALERT_COOLDOWN_HOURS: 4,
  },
  PREDICTION: {
    CRITICAL_LEVEL_PCT: 25.0,
    LOOKBACK_HOURS: 3,
    MIN_READINGS: 6,
  }
};
```

---

### Feature 9: Automated Test Expansion
The test runner (`src/test.js`) will retain its existing 14 tests and append tests 15 through 21:
* **Test 15:** Daily water consumption aggregation computes accurate litre sums from synthetic draining events.
* **Test 16:** Monthly aggregation pipeline correctly groups and sums time series.
* **Test 17:** Anomaly engine ignores normal minor sensor noise ($\le 0.2\%$).
* **Test 18:** Anomaly engine triggers `ABNORMAL_WATER_USAGE` on sustained overnight loss ($> 1.5\%$ drop over window).
* **Test 19:** Alert duplicate suppression enforces cooldown and prevents spamming.
* **Test 20:** Depletion predictor accurately forecasts remaining hours to 25% critical reserve.
* **Test 21:** Depletion predictor outputs graceful fallback when water level is steady or rising.

---

## 4. File Modification Roadmap

| File | Status | Action Description |
| :--- | :---: | :--- |
| `src/lib/water-config.js` | **New** | Central configuration for tank parameters, thresholds, and leak rules. |
| `src/lib/analytics.js` | **New** | MongoDB aggregation pipelines for daily/monthly consumption, leak heuristics, and depletion prediction. |
| `scripts/demo-leak.js` | **New** | Interactive script to demonstrate Scenario B (Overnight Leak Alert) on demand. |
| `src/server.js` | **Modified** | Mount `/api/analytics/*` and `/api/alerts` endpoints; configure Swagger documentation. |
| `src/lib/swagger.js` | **Modified** | Add OpenAPI definitions for all new analytics and alert routes. |
| `src/test.js` | **Modified** | Append Tests 15–21 without altering existing 14 tests. |
| `web/src/App.jsx` | **Modified** | Add "Smart Water Insights" card grid, status banner, and consumption trend chart. |
| `package.json` | **Modified** | Add `npm run demo:leak` script. |

---

## 5. Review & Approval

Please review this specification. Once you approve, we will proceed step-by-step:
1. Create `src/lib/water-config.js` and `src/lib/analytics.js`.
2. Mount endpoints in `src/server.js` and update Swagger.
3. Update `web/src/App.jsx` to render the Smart Water Insights interface.
4. Add `scripts/demo-leak.js` and verify automated tests in `src/test.js`.
