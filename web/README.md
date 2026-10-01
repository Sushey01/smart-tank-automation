# Smart Tank web UI

Vite + React 18 + TypeScript dashboard for the coursework API.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install UI dependencies |
| `npm run dev` | Dev server on http://localhost:5173, proxying `/api` to http://localhost:3000 |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build |

Start the API from the repository root (`npm run server`) before expecting live data. Three terminals are enough: API, simulator, and this dev server. MongoDB and Mosquitto run in their own terminals.

## Folder structure

```
web/
  index.html
  tailwind.config.js
  src/
    api/          one module per resource, plus client.ts
    components/   shell, gauges, tables, states
    lib/          formatting and theme
    pages/        dashboard, devices, telemetry, alerts, cluster, analytics
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

No trailing slash. Restart `npm run dev` after changing it. The API only sends CORS for `http://localhost:5173`, so a different UI origin needs a matching CORS change in `src/server.js`.
