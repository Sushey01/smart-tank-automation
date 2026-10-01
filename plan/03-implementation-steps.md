# Implementation steps

- [x] Write planning documents `plan/00` through `plan/09`
- [x] Add `.gitignore` for `node_modules/`, `.env`, `mongo-cluster/`, `dist/`, logs, and the generated seed file
- [x] Add root `package.json` with `express`, `mongodb`, `mqtt`, `cors`, `dotenv`
- [x] Implement `src/lib/devices.js` for `HOME_HUB_01` only
- [x] Implement `src/lib/indexes.js` (query indexes and 30-day TTL)
- [x] Implement `src/lib/telegram.js` and `src/lib/insights.js`
- [x] Implement `src/simulator.js` (`client.once('connect')`, QoS 1)
- [x] Implement `src/server.js` (ingest, majority writes, REST, CORS)
- [x] Implement file-only `src/seed.js` and `src/benchmark.js`
- [x] Implement `src/smoke.js` for every GET route
- [x] Point `scripts/replica-init.js` at ports 27017–27019 and refuse a foreign `mongod`
- [x] Keep optional `docker-compose.yml` on ports 27217–27219 plus Mosquitto
- [x] Rebuild `web/` around one tank, history, alerts, cluster, and the siren
- [x] Write `README.md`, `web/README.md`, `.env.example`, and `docs/failover-steps.md`
- [ ] Marker: compare device count, record count, and endpoints with the brief
- [ ] Marker: capture screenshots in `plan/06-evidence-checklist.md`
