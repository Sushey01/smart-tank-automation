# Audit against the locked spec

Checked README, `plan/`, `src/`, `scripts/`, `docker-compose.yml`, `docs/`, and `web/` on 1 October 2026. Ports 3000 and 5173, `MONGO_URI` (27117–27119), MQTT `mqtt://localhost:1883`, database `iothings.sensor_readings`, the nine GET routes, indexes, seed, benchmark, and smoke script already matched. The rows below did not.

| # | Deviation | Where | Required |
| --- | --- | --- | --- |
| 1 | `CLIMATE_01` location `plant_room` | `src/lib/devices.js` line 39; `plan/02-architecture.md` example; `plan/01-requirements.md` lines 7–8 | `living_room` |
| 2 | `POWER_01` location `electrical_cupboard` | `src/lib/devices.js` line 40; `plan/02-architecture.md`; README line 3 (“plant-room”) | `main_panel` |
| 3 | Prose “plant room” / “electrical cupboard” | `web/src/pages/Dashboard.tsx` lines 98 and 106; `plan/04-report-outline.md` line 17 | living room and main panel only |
| 4 | Firmware `1.4.2`, `2.1.0`, `3.0.1` | `src/lib/devices.js` lines 37–40; architecture examples | every document `metadata.firmware` = `v2.4.1` |
| 5 | `inlet_valve` and `booster_pump` stored as booleans | `src/lib/devices.js` lines 63–84; `web/src/types.ts` line 16; architecture example | `OPEN`/`CLOSED` and `ACTIVE`/`EMERGENCY_STOP` |
| 6 | Device status adds `stale` (under 5 minutes) | `src/server.js` lines 88–93; `web/src/types.ts` line 1; `StatusBadge.tsx`; README line 110; `plan/09-frontend-spec.md` line 24 | online when last seen is under 30 s, otherwise offline |
| 7 | `POST /api/devices/:id/commands` and MQTT command topic | `src/server.js` lines 342–372; `src/simulator.js` lines 18–74; `web/src/api/devices.ts`; `TankGauge.tsx`; `Devices.tsx`; `Dashboard.tsx`; README line 118; plan 01, 02, 03, 04, 06, 09 | out of scope; remove |
| 8 | Optional Docker uses 27217–27219 | `docker-compose.yml` | kept: labelled as a separate optional path so it does not bind 27017 or the coursework ports |

Already correct, so left unchanged: replica-set ports and dbpaths in the README, `scripts/replica-init.js`, majority writes, `retryWrites`/`retryReads`, `secondaryPreferred` analytics, index names and 30-day TTL, seed default 10,000 with 5,000 batches, benchmark hints, CORS origin `http://localhost:5173`, limit cap 100, and the React stack (Vite, React 18, Tailwind 3.4, Router, TanStack Query, Recharts, lucide-react).
