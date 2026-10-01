# Design research

Notes taken before building the React UI, from current dashboard practice for tanks, smart homes, and operations views.

## Sources consulted

- Node-RED Dashboard 2 water-tank gauge: a vertical tank, numeric value, units, and colour segments for ranges (FlowFuse ui-gauge, water tank type).
- Industrial tank widgets (Rayven tank-level widget; Node-RED multi-tank templates): one widget per tank, fill height as a percentage of capacity, unit shown next to the number, thresholds as coloured bands.
- Ultrasonic tank dashboards (NCD): live level as a percent scaled from distance, a separate history chart, and a battery or health indicator beside the tank.
- Home Assistant Lovelace and Mushroom-style cards: rounded cards, an icon plus a state name, room or device grouping, sparklines for recent history (Passhulk, 2024; Grafana Labs home-assistant walkthrough).
- Grafana: stat panels for KPIs, time-series with min/max, threshold colours, and an alert list that stays quiet when nothing is firing.
- Dark themes for Home Assistant: neutral surfaces with a single accent (cyan for water or climate), semantic red and amber reserved for alerts, and a theme toggle rather than a second set of components.

## Patterns adopted

1. **Glanceable KPIs.** The first row is four numbers: documents stored, readings in the last hour, active alerts, devices online. Values use tabular numerals so digits do not jump sideways.
2. **Status is icon + text + colour.** Online, offline, overflow, and dry-run each have a label. Colour supports the label. This matches WCAG guidance not to use colour as the only cue.
3. **Live tank gauge.** Each water tank is an SVG vessel. Fill height is `ultrasonic_depth_pct`. The water surface uses a slow wave. Percent and litres are both visible because operators think in both units. High and low floats sit on the vessel. Valve and pump are chips, not implied by the water colour.
4. **Thresholds on the vessel.** Below 25% and at or above 85% match the alert rules, so the gauge and the alert feed agree.
5. **Alert feed.** The dashboard shows the last eight alert documents. The alerts page has reason filters and an hourly bar chart. Empty feeds say that no alerts matched, instead of hiding the panel.
6. **Trend next to the latest value.** Climate and power cards show the current reading and a sparkline from `/api/telemetry/series`. The telemetry page adds bucket choice (minute or hour) and CSV export of the current table page.
7. **Device health.** Last-seen age drives online (under 30 s) or offline. RSSI and firmware `v2.4.1` appear in the device drawer, not on the home KPI row.
8. **Cluster as an operations page.** Three node cards, a simple topology, a 2 s poll, and a banner when the primary name changes. That page is the failover screenshot.
9. **Empty, loading, and error on every view.** Skeletons while loading, an empty explanation when the collection has no rows, and a retry control on failure. If the API process is down, a full-page message names `npm run server`.
10. **Calm water-tech surface.** Slate neutrals, cyan accent (`#0891b2` / `#0e7490`), generous padding, 2xl cards, soft shadow. Motion (wave, live dot, fade-up) is disabled under `prefers-reduced-motion`.

## Patterns rejected

- A dense SCADA mimic with pipes and pumps drawn to scale. It looks impressive and fails on a 375 px screen.
- Colour-only tank fills (red tank with no “Overflow” text).
- Auto-hiding the alert region when it is empty. Markers need to see the empty state.
- A second charting library. Recharts covers sparklines, line, area, and bar charts.
