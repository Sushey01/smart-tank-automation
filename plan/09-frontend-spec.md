# Frontend specification

Folder: `web/`. Stack: Vite, React 18, TypeScript, Tailwind CSS 3.4, React Router, TanStack Query, Recharts, lucide-react, clsx.

## Routes

| Path | Page | Data |
| --- | --- | --- |
| `/` | Dashboard | `/api/telemetry/summary`, `/api/telemetry/alerts?limit=5`, `/api/telemetry/history?bucket=minute`, `/api/telemetry/analytics/averages`, `/api/health` |
| `/history` | History | `/api/telemetry/history` as documents and as `bucket=minute` or `hour` |
| `/alerts` | Alerts | `/api/telemetry/alerts` |
| `/cluster` | Cluster | `/api/health` every 2 s |

Global poll interval is 5 s with `refetchIntervalInBackground: false`. Cluster overrides the interval to 2 s.

## API contract

Base URL is empty in development so Vite proxies `/api` to `http://localhost:3000`. Override with `VITE_API_BASE_URL` (no trailing slash).

- `GET /api/health` → `{ set, primary, members: [{ name, state, health, isPrimary }], checkedAt }`
- `GET /api/telemetry/latest` → `{ reading }` for `HOME_HUB_01`
- `GET /api/telemetry/alerts?page&limit&reason` → `{ page, limit, total, items }` where items have a high or low float
- `GET /api/telemetry/analytics/averages` → `{ devices: [{ device_id, device_type, readings, avg_water_level, avg_volume_litres, alert_count }] }`
- `GET /api/telemetry/history?from&to&page&limit` → `{ page, limit, total, items }`
- `GET /api/telemetry/history?bucket=minute|hour&from&to` → `{ device_id, bucket, points: [{ bucket, avg, min, max, count }] }`
- `GET /api/telemetry/summary` → `{ reading, status, trend, rate_litres_per_hour, estimate, last_hour, last_seen, signal_rssi }`
- `status` is `online` if `last_seen` is under 30 s, otherwise `offline`
- `trend` is `rising`, `falling`, or `steady`
- `estimate.kind` is `empty`, `full`, or `not_estimated`

A stored reading keeps `telemetry.water_tank`, `telemetry.float_switches`, and `telemetry.actuator_states` nested. Actuator strings are `OPEN`/`CLOSED` and `ACTIVE`/`EMERGENCY_STOP`.

Errors: `{ error: string }` with HTTP 400 or 500. Network failure is surfaced as “Backend unreachable”.

## Siren

`SirenControl` lives in the header. **Arm siren** creates or resumes an `AudioContext` inside that click and stores `tank-siren-armed=1`. While armed, `reading.alert === true` starts a sawtooth sweep between 520 Hz and 880 Hz through a gain node. **Silence** stops the oscillators until the alert clears and a new one starts. The control does not call Telegram and does not read the bot token.

## Tokens

Defined in `web/tailwind.config.js` and `web/src/index.css`.

- `darkMode: 'class'`. Choice stored in `localStorage` key `theme`.
- Brand 500 `#0891b2`, brand 600 `#0e7490`.
- Status ok `#16a34a`, warn `#f59e0b`, danger `#dc2626`.
- Fonts: Inter and JetBrains Mono.
- Motion: wave, pulse-ring, fade-up. Disabled under `prefers-reduced-motion`. The siren is a separate control and is off until armed.

## States per view

Every page has a skeleton, an empty state, and an error state with retry. If `/api/health` cannot be reached, the shell shows `npm run server` instead of the page.
