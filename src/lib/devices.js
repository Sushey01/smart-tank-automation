/**
 * One home hub, tank payload, and overflow / dry-run rules.
 * Synthetic readings only — no personal data.
 */

const TANK_CAPACITY_L = 2000;
const TANK_HEIGHT_CM = 200;
const FIRMWARE = 'v2.4.1';
const TELEMETRY_TOPIC = 'iothings/home/telemetry';

const ALERT = {
  OVERFLOW: 'TANK_OVERFLOW',
  DRY_RUN: 'TANK_DRY_RUN',
};

const HOME_HUB = {
  device_id: 'HOME_HUB_01',
  device_type: 'water_tank',
  location: 'home',
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function waterLevelPct() {
  const roll = Math.random();
  if (roll < 0.08) return rand(85, 90);
  if (roll < 0.16) return rand(20, 25);
  return rand(26, 84);
}

function buildWaterTelemetry(level) {
  const pct = round(level === undefined ? waterLevelPct() : level, 1);
  const volume = round((TANK_CAPACITY_L * pct) / 100, 0);
  const distance = round(TANK_HEIGHT_CM * (1 - pct / 100), 1);
  const high = pct >= 85;
  const low = pct <= 25;
  return {
    water_tank: {
      ultrasonic_depth_pct: pct,
      volume_litres: volume,
      distance_cm: distance,
    },
    float_switches: {
      high_level_overflow: high,
      low_level_dry_run: low,
    },
    actuator_states: {
      inlet_valve: high ? 'CLOSED' : 'OPEN',
      booster_pump: low ? 'EMERGENCY_STOP' : 'ACTIVE',
    },
  };
}

function buildPayload(options = {}) {
  const timestamp = options.timestamp instanceof Date ? options.timestamp : new Date();
  return {
    device_id: HOME_HUB.device_id,
    device_type: HOME_HUB.device_type,
    location: HOME_HUB.location,
    timestamp: timestamp.toISOString(),
    metadata: {
      firmware: FIRMWARE,
      signal_rssi: Math.round(rand(-90, -40)),
    },
    telemetry: buildWaterTelemetry(options.levelPct),
  };
}

function tankOf(doc) {
  return doc && doc.telemetry && doc.telemetry.water_tank;
}

function evaluateAlerts(doc) {
  const reasons = [];
  const tank = tankOf(doc);
  const depth = tank && tank.ultrasonic_depth_pct;
  const floats = (doc && doc.telemetry && doc.telemetry.float_switches) || {};
  if ((typeof depth === 'number' && depth >= 85) || floats.high_level_overflow === true) {
    reasons.push(ALERT.OVERFLOW);
  }
  if ((typeof depth === 'number' && depth <= 25) || floats.low_level_dry_run === true) {
    reasons.push(ALERT.DRY_RUN);
  }
  return { alert_reasons: reasons, alert: reasons.length > 0 };
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'payload must be an object';
  }
  if (payload.device_id !== HOME_HUB.device_id) {
    return 'device_id must be HOME_HUB_01';
  }
  if (payload.device_type !== HOME_HUB.device_type) {
    return 'device_type must be water_tank';
  }
  const timestamp = new Date(payload.timestamp);
  if (!payload.timestamp || Number.isNaN(timestamp.getTime())) {
    return 'timestamp is invalid';
  }
  if (!payload.telemetry || typeof payload.telemetry !== 'object' || Array.isArray(payload.telemetry)) {
    return 'telemetry object is required';
  }
  if (!payload.telemetry.water_tank || typeof payload.telemetry.water_tank !== 'object') {
    return 'telemetry.water_tank is required';
  }
  if (!payload.metadata || typeof payload.metadata !== 'object' || Array.isArray(payload.metadata)) {
    return 'metadata object is required';
  }
  return null;
}

function toStoredReading(payload, ingestedAt = new Date()) {
  const error = validatePayload(payload);
  if (error) {
    const err = new Error(error);
    err.status = 400;
    throw err;
  }
  const rssi = Number(payload.metadata.signal_rssi);
  const doc = {
    device_id: payload.device_id,
    device_type: payload.device_type,
    location: typeof payload.location === 'string' ? payload.location : HOME_HUB.location,
    timestamp: new Date(payload.timestamp),
    metadata: {
      firmware: FIRMWARE,
      signal_rssi: Number.isFinite(rssi) ? rssi : null,
    },
    telemetry: payload.telemetry,
  };
  return { ...doc, ...evaluateAlerts(doc), ingested_at: ingestedAt };
}

module.exports = {
  ALERT,
  FIRMWARE,
  HOME_HUB,
  TELEMETRY_TOPIC,
  TANK_CAPACITY_L,
  TANK_HEIGHT_CM,
  buildPayload,
  evaluateAlerts,
  validatePayload,
  toStoredReading,
};
