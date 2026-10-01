# Frontend specification

Folder: `web/`. Stack: Vite, React 18, TypeScript, Tailwind CSS 3.4, React Router, TanStack Query, Recharts, lucide-react, clsx.

## Routes

| Path | Page | Data |
| --- | --- | --- |
| `/` | Dashboard | `/api/stats`, `/api/devices`, `/api/alerts?limit=8`, `/api/health`, series for climate and power |
| `/devices` | Devices | `/api/devices`, `/api/telemetry/latest`, `/api/telemetry/series` |
| `/telemetry` | Telemetry | `/api/telemetry`, `/api/telemetry/series` |
| `/alerts` | Alerts | `/api/alerts`, `/api/analytics/alerts-hourly` |
| `/cluster` | Cluster | `/api/health` every 2 s |
| `/analytics` | Analytics | `/api/analytics/averages`, `/api/analytics/alerts-hourly` |

Global poll interval is 5 s with `refetchIntervalInBackground: false`. Cluster overrides the interval to 2 s.

## API contract

Base URL is empty in development so Vite proxies `/api` to `http://localhost:3000`. Override with `VITE_API_BASE_URL` (no trailing slash).

- `GET /api/health` → `{ set, primary, members: [{ name, state, health, isPrimary }], checkedAt }`
- `GET /api/devices` → `{ devices: [{ id, type, location, last_seen, status, latest }] }`
- `status` is `online` if `last_seen` is under 30 s, `stale` if under 5 min, otherwise `offline`.
- `GET /api/telemetry/latest?device_id=` → `{ reading }`
- `GET /api/telemetry` → `{ page, limit, total, items }`
- `GET /api/telemetry/series?device_id&metric&from&to&bucket` → `{ device_id, metric, bucket, points: [{ bucket, avg, min, max, count }] }`
- Allowed metrics: `ultrasonic_depth_pct`, `volume_litres`, `distance_cm`, `temperature_c`, `humidity_pct`, `co2_ppm`, `voltage_v`, `power_w`, `current_a`, `energy_kwh_total`
- `GET /api/alerts?page&limit&reason` → `{ page, limit, total, items }`
- `GET /api/analytics/averages` → `{ devices: [{ device_id, device_type, readings, avg_water_level, avg_temp, avg_power, alert_count }] }`
- `GET /api/analytics/alerts-hourly` → `{ buckets: [{ hour, reason, count }] }`
- `GET /api/stats` → `{ total_documents, documents_last_hour, active_alerts, devices_online }`
- `POST /api/devices/:id/commands` body `{ command }` → `{ ok, device_id, command, topic, publishedAt }`

Errors: `{ error: string }` with HTTP 400 or 500. Network failure is surfaced as “Backend unreachable”.

## Tokens

Defined in `web/tailwind.config.js` and `web/src/index.css`.

- `darkMode: 'class'`. Class applied on `<html>`. Choice stored in `localStorage` key `theme` (`light`, `dark`, or unset for system).
- `brand` cyan scale, primary 500 `#0891b2`, 600 `#0e7490`.
- `ink` and `surface` read CSS variables so dark mode does not duplicate utility classes.
- `status.ok` `#16a34a`, `status.warn` `#f59e0b`, `status.danger` `#dc2626`, `status.info` `#2563eb`.
- Fonts: Inter for UI, JetBrains Mono for IDs and KPIs, with system fallbacks.
- Radius `2xl` (1.25 rem) on cards. Shadows `card` and `glow`.
- Keyframes: `wave`, `pulse-ring`, `fade-up`. Reduced motion short-circuits them.
- Component classes: `.card`, `.badge`, `.badge-ok`, `.badge-warn`, `.badge-danger`, `.kpi-value`.

## Components

- `AppShell`, `Sidebar`, `Topbar` (theme toggle, API status).
- `StatCard`, `TankGauge`, `StatusBadge`, `DataTable`, `Sparkline`.
- `EmptyState`, `ErrorState`, `Skeleton`, `Toast`, `ConfirmDialog`.
- `BackendDown` when `/api/health` cannot be reached.
- API modules in `web/src/api/`, types in `web/src/types.ts`.

## Behaviour details

- Mobile under `md`: sidebar hidden, bottom navigation shown. Layout checked at 375 px, tablet, and 1440 px.
- Focus rings use the brand colour. Gauges and charts have `aria-label`s. Dialogs close on Escape.
- Tank commands open a confirm dialog, then a toast with the API result.
- Telemetry CSV is built in the browser from the current page of rows.
- Device drawer shows collapsible pretty-printed JSON.

## States per view

| View | Loading | Empty | Error |
| --- | --- | --- | --- |
| Dashboard | skeleton cards | “No readings yet” plus simulator hint | retry, or backend-down screen |
| Devices | skeleton rows | same empty copy | retry |
| Telemetry | skeleton chart and rows | “No rows match these filters” | retry |
| Alerts | skeleton list | “No alerts in this filter” | retry |
| Cluster | skeleton nodes | “Replica set status unavailable” | retry |
| Analytics | skeleton table | “Seed the database to see averages” | retry |
