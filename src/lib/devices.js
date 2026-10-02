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
  LEAK_DETECTED: 'LEAK_DETECTED',
};

const HOME_HUB = {
  device_id: 'HOME_HUB_01',
  device_type: 'water_tank',
  location: 'home',
};

let controlState = {
  mode: 'AUTO', // 'AUTO' or 'MANUAL'
  pump_command: 'ACTIVE',
  valve_command: 'OPEN',
  last_command_at: new Date().toISOString(),
};

function getControlState() {
  return { ...controlState };
}

function setControlState(updates = {}) {
  if (updates.mode && ['AUTO', 'MANUAL'].includes(String(updates.mode).toUpperCase())) {
    controlState.mode = String(updates.mode).toUpperCase();
  }
  if (updates.pump) {
    const p = String(updates.pump).toUpperCase();
    if (['ACTIVE', 'ON', 'START'].includes(p)) controlState.pump_command = 'ACTIVE';
    else if (['EMERGENCY_STOP', 'STOP', 'OFF'].includes(p)) controlState.pump_command = 'EMERGENCY_STOP';
  }
  if (updates.valve) {
    const v = String(updates.valve).toUpperCase();
    if (['OPEN', 'CLOSED'].includes(v)) controlState.valve_command = v;
  }
  controlState.last_command_at = new Date().toISOString();
  return { ...controlState };
}

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

  let valveState = high ? 'CLOSED' : 'OPEN';
  let pumpState = low ? 'EMERGENCY_STOP' : 'ACTIVE';

  if (controlState.mode === 'MANUAL') {
    // Manual override with hardware safety limits
    valveState = high ? 'CLOSED' : controlState.valve_command;
    pumpState = low ? 'EMERGENCY_STOP' : controlState.pump_command;
  }

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
      inlet_valve: valveState,
      booster_pump: pumpState,
    },
    control_mode: controlState.mode,
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

function evaluateAlerts(doc, previousDoc = null) {
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

  // Algorithmic rate-of-drop leak detection
  if (previousDoc && tankOf(previousDoc)) {
    const prevDepth = tankOf(previousDoc).ultrasonic_depth_pct;
    const prevTime = new Date(previousDoc.timestamp).getTime();
    const currTime = new Date(doc.timestamp).getTime();
    const elapsedSec = (currTime - prevTime) / 1000;
    const actuatorStates = (doc && doc.telemetry && doc.telemetry.actuator_states) || {};

    if (elapsedSec > 0 && elapsedSec <= 30 && actuatorStates.booster_pump !== 'ACTIVE') {
      const dropPct = prevDepth - depth;
      if (dropPct >= 2.5) {
        reasons.push(ALERT.LEAK_DETECTED);
      }
    }
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

function readingFromLevel(levelPct, timestamp = new Date()) {
  const level = Number(levelPct);
  if (!Number.isFinite(level) || level < 0 || level > 100) {
    const err = new Error('ultrasonic_depth_pct must be a number from 0 to 100');
    err.status = 400;
    throw err;
  }
  const when = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(when.getTime())) {
    const err = new Error('timestamp is invalid');
    err.status = 400;
    throw err;
  }
  return toStoredReading(buildPayload({ levelPct: level, timestamp: when }), new Date());
}

function replaceLevel(doc, levelPct) {
  const level = Number(levelPct);
  if (!Number.isFinite(level) || level < 0 || level > 100) {
    const err = new Error('ultrasonic_depth_pct must be a number from 0 to 100');
    err.status = 400;
    throw err;
  }
  const next = {
    ...doc,
    telemetry: buildWaterTelemetry(level),
    metadata: { ...doc.metadata, firmware: FIRMWARE },
  };
  return { ...next, ...evaluateAlerts(next) };
}

function toStoredReading(payload, ingestedAt = new Date(), previousDoc = null) {
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
  return { ...doc, ...evaluateAlerts(doc, previousDoc), ingested_at: ingestedAt };
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
  readingFromLevel,
  replaceLevel,
  validatePayload,
  toStoredReading,
  getControlState,
  setControlState,
};
