# Implementation steps

- [x] Write planning documents `plan/00` through `plan/09`
- [x] Add `.gitignore` for `node_modules/`, `.env`, `mongo-cluster/`, `dist/`, logs
- [x] Add root `package.json` with `express`, `mongodb`, `mqtt`, `cors`
- [x] Implement `src/lib/devices.js` (registry, payloads, alerts)
- [x] Implement `src/lib/indexes.js` (query indexes and 30-day TTL)
- [x] Implement `src/simulator.js` (independent timers, QoS 1)
- [x] Implement `src/server.js` (ingest, majority writes, REST, CORS)
- [x] Implement `src/seed.js` and `src/benchmark.js`
- [x] Implement `src/smoke.js` for every GET route
- [x] Add `scripts/replica-init.js` for ports 27117–27119
- [x] Keep optional `docker-compose.yml` on ports 27217–27219 plus Mosquitto
- [x] Scaffold `web/` with Vite, React 18, TypeScript, Tailwind 3.4
- [x] Add design tokens, theme toggle, shared shell and states
- [x] Build dashboard, devices, telemetry, alerts, cluster, analytics
- [x] Write `README.md`, `web/README.md`, and `docs/failover-steps.md`
- [ ] Marker: compare device count, record count, and endpoints with the brief
- [ ] Marker: capture screenshots in `plan/06-evidence-checklist.md`
