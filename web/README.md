# Smart Tank web UI

Vite + React 18 + TypeScript dashboard for the one-tank API.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install UI dependencies |
| `npm run dev` | Dev server on http://localhost:5173, proxying `/api` to http://localhost:3000 |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |

Start the API from the repository root (`npm run server`) before expecting live data. Three terminals are enough: API, simulator, and this dev server. MongoDB and Mosquitto run in their own terminals.

## Pages

| Path | What it shows |
| --- | --- |
| `/` | Level, litres, trend, time estimate, tank gauge, last-hour sparkline, alert feed, cluster mini-status |
| `/history` | Minute or hour level chart, table, CSV of the current page |
| `/alerts` | Overflow and dry-run documents |
| `/cluster` | Three replica-set members, polled every 2 seconds |

The header has **Arm siren**. That click creates the audio context. While armed, an active overflow or dry-run plays a two-tone sweep. **Silence** stops it. The choice is stored in `localStorage` under `tank-siren-armed`. A fresh visit still needs a click before any sound, because browsers block autoplay.

## Folder structure

```
web/
  index.html
  tailwind.config.js
  src/
    api/          client, health, telemetry
    components/   shell, gauge, siren, tables, states
    lib/          formatting and theme
    pages/        dashboard, history, alerts, cluster
    types.ts
    App.tsx
    main.tsx
    index.css
```

## API base URL

In development, leave `VITE_API_BASE_URL` unset. Requests go to `/api/...` and Vite forwards them to port 3000.

To point at another origin, create `web/.env`:

```
VITE_API_BASE_URL=http://localhost:3000
```
