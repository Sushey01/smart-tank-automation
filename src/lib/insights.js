const { TANK_CAPACITY_L } = require('./devices');

const STEADY_PCT = 0.3;
const MIN_RATE_LPH = 5;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function levelPct(doc) {
  return finite(doc && doc.telemetry && doc.telemetry.water_tank && doc.telemetry.water_tank.ultrasonic_depth_pct);
}

function litres(doc) {
  return finite(doc && doc.telemetry && doc.telemetry.water_tank && doc.telemetry.water_tank.volume_litres);
}

function deriveInsight({ latest, previous, windowDocs, hourMin, hourMax, now = Date.now() }) {
  const latestPct = levelPct(latest);
  const previousPct = levelPct(previous);
  let trend = 'steady';
  if (latestPct !== null && previousPct !== null) {
    const delta = latestPct - previousPct;
    if (delta >= STEADY_PCT) trend = 'rising';
    else if (delta <= -STEADY_PCT) trend = 'falling';
  }

  let rate = null;
  if (windowDocs.length >= 2) {
    const first = windowDocs[0];
    const last = windowDocs[windowDocs.length - 1];
    const firstLitres = litres(first);
    const lastLitres = litres(last);
    const hours = (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3_600_000;
    if (firstLitres !== null && lastLitres !== null && hours > 0) {
      rate = (lastLitres - firstLitres) / hours;
    }
  }

  let estimate = { kind: 'not_estimated', minutes: null };
  const currentLitres = litres(latest);
  if (rate !== null && currentLitres !== null && Math.abs(rate) >= MIN_RATE_LPH) {
    if (rate < 0 && trend === 'falling') {
      estimate = {
        kind: 'empty',
        minutes: Math.round((currentLitres / Math.abs(rate)) * 60),
      };
    } else if (rate > 0 && trend === 'rising') {
      estimate = {
        kind: 'full',
        minutes: Math.round((Math.max(0, TANK_CAPACITY_L - currentLitres) / rate) * 60),
      };
    }
  }

  const lastSeen = latest && latest.timestamp ? new Date(latest.timestamp) : null;
  const status = lastSeen && (now - lastSeen.getTime()) < 30_000 ? 'online' : 'offline';
  const rssi = latest && latest.metadata ? latest.metadata.signal_rssi : null;

  return {
    trend,
    rate_litres_per_hour: rate === null ? null : Math.round(rate * 10) / 10,
    estimate,
    last_hour: {
      min: finite(hourMin),
      max: finite(hourMax),
    },
    last_seen: lastSeen ? lastSeen.toISOString() : null,
    signal_rssi: finite(rssi),
    status,
  };
}

module.exports = { deriveInsight };
