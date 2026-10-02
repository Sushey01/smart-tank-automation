/**
 * Device definitions, physical water tank model, single-source thresholds,
 * hysteresis control logic, and payload validation.
 * Synthetic readings only — no personal customer data (UK GDPR compliant).
 */

const CONTROL_CONFIG = {
  INLET_OPEN_BELOW: 40,      // Inlet valve opens when depth <= 40%
  HIGH_LEVEL: 85,            // Inlet valve closes when depth >= 85% -> TANK_OVERFLOW alert
  LOW_LEVEL: 25,             // Booster pump EMERGENCY_STOP when depth <= 25% -> TANK_DRY_RUN alert
  PUMP_RESUME_ABOVE: 35,     // Booster pump restarts only when depth >= 35%
  LEAK_DROP_THRESHOLD: 2.5,  // Drop >= 2.5 percentage points within window
  LEAK_WINDOW_SECONDS: 30,   // Within <= 30 seconds while pump stopped
  TANK_CAPACITY_L: 2000,
  TANK_HEIGHT_CM: 200,
};

const DEFAULT_FIRMWARE = 'v2.4.1';
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

// Global actuator memory per device to enforce hysteresis without chattering
const actuatorMemory = new Map();

function getActuatorState(deviceId = HOME_HUB.device_id) {
  if (!actuatorMemory.has(deviceId)) {
    actuatorMemory.set(deviceId, {
      inlet_valve: 'OPEN',
      booster_pump: 'ACTIVE',
    });
  }
  return actuatorMemory.get(deviceId);
}

function setActuatorState(deviceId = HOME_HUB.device_id, state = {}) {
  const current = getActuatorState(deviceId);
  if (state.inlet_valve) current.inlet_valve = state.inlet_valve;
  if (state.booster_pump) current.booster_pump = state.booster_pump;
  actuatorMemory.set(deviceId, current);
  return current;
}

function resetActuatorMemory(deviceId = HOME_HUB.device_id) {
  actuatorMemory.set(deviceId, {
    inlet_valve: 'OPEN',
    booster_pump: 'ACTIVE',
  });
}

let controlMode = {
  mode: 'AUTO', // 'AUTO' or 'MANUAL'
  pump_command: 'ACTIVE',
  valve_command: 'OPEN',
  last_command_at: new Date().toISOString(),
};

function getControlState() {
  return { ...controlMode };
}

function setControlState(updates = {}) {
  if (updates.mode && ['AUTO', 'MANUAL'].includes(String(updates.mode).toUpperCase())) {
    controlMode.mode = String(updates.mode).toUpperCase();
  }
  if (updates.pump) {
    const p = String(updates.pump).toUpperCase();
    if (['ACTIVE', 'ON', 'START'].includes(p)) controlMode.pump_command = 'ACTIVE';
    else if (['EMERGENCY_STOP', 'STOP', 'OFF'].includes(p)) controlMode.pump_command = 'EMERGENCY_STOP';
  }
  if (updates.valve) {
    const v = String(updates.valve).toUpperCase();
    if (['OPEN', 'CLOSED'].includes(v)) controlMode.valve_command = v;
  }
  controlMode.last_command_at = new Date().toISOString();
  return { ...controlMode };
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Computes water tank physical metrics and actuator states using hysteresis.
 * State is NOT decided from the current reading alone.
 */
function buildWaterTelemetry(levelPct, options = {}) {
  const pct = round(Number(levelPct), 1);
  const volume = round((CONTROL_CONFIG.TANK_CAPACITY_L * pct) / 100, 0);
  const distance = round(CONTROL_CONFIG.TANK_HEIGHT_CM * (1 - pct / 100), 1);

  const deviceId = options.device_id || HOME_HUB.device_id;
  const prevState = options.previousActuatorState || getActuatorState(deviceId);

  let nextValve = prevState.inlet_valve || 'OPEN';
  let nextPump = prevState.booster_pump || 'ACTIVE';

  if (controlMode.mode === 'MANUAL') {
    // Manual override with hardware safety limits
    nextValve = pct >= CONTROL_CONFIG.HIGH_LEVEL ? 'CLOSED' : controlMode.valve_command;
    nextPump = pct <= CONTROL_CONFIG.LOW_LEVEL ? 'EMERGENCY_STOP' : controlMode.pump_command;
  } else {
    // Closed-loop hysteresis automation

    // 1. Inlet Valve Loop: opens when <= 40%, closes when >= 85%
    if (pct >= CONTROL_CONFIG.HIGH_LEVEL) {
      nextValve = 'CLOSED';
    } else if (pct <= CONTROL_CONFIG.INLET_OPEN_BELOW) {
      nextValve = 'OPEN';
    }
    // Between 40% and 85%: retains previous state (no chattering)

    // 2. Booster Pump Loop: stops when <= 25%, restarts only when >= 35%
    if (pct <= CONTROL_CONFIG.LOW_LEVEL) {
      nextPump = 'EMERGENCY_STOP';
    } else if (pct >= CONTROL_CONFIG.PUMP_RESUME_ABOVE) {
      nextPump = 'ACTIVE';
    }
    // Between 25% and 35%: retains previous state (no chattering)
  }

  // Update memory unless explicitly told not to mutate
  if (options.persistState !== false) {
    setActuatorState(deviceId, { inlet_valve: nextValve, booster_pump: nextPump });
  }

  const highFloat = pct >= CONTROL_CONFIG.HIGH_LEVEL;
  const lowFloat = pct <= CONTROL_CONFIG.LOW_LEVEL;

  const telemetry = {
    water_tank: {
      ultrasonic_depth_pct: pct,
      volume_litres: volume,
      distance_cm: distance,
    },
    float_switches: {
      high_level_overflow: highFloat,
      low_level_dry_run: lowFloat,
    },
    actuator_states: {
      inlet_valve: nextValve,
      booster_pump: nextPump,
    },
    control_mode: controlMode.mode,
  };

  // Schema evolution: if firmware v2.5.0 is requested, include water_quality
  const firmware = options.firmware || process.env.FIRMWARE || DEFAULT_FIRMWARE;
  if (firmware.startsWith('v2.5')) {
    telemetry.water_quality = {
      tds_ppm: options.tds_ppm !== undefined ? options.tds_ppm : 190,
      ph: options.ph !== undefined ? options.ph : 7.3,
    };
  }

  return telemetry;
}

function buildPayload(options = {}) {
  const timestamp = options.timestamp instanceof Date ? options.timestamp : new Date(options.timestamp || Date.now());
  const firmware = options.firmware || process.env.FIRMWARE || DEFAULT_FIRMWARE;
  const level = options.levelPct !== undefined ? options.levelPct : 50.0;
  const rssi = options.signal_rssi !== undefined ? options.signal_rssi : -65;

  return {
    device_id: options.device_id || HOME_HUB.device_id,
    device_type: options.device_type || HOME_HUB.device_type,
    location: options.location || HOME_HUB.location,
    timestamp: timestamp.toISOString(),
    metadata: {
      firmware,
      signal_rssi: rssi,
    },
    telemetry: buildWaterTelemetry(level, {
      device_id: options.device_id || HOME_HUB.device_id,
      firmware,
      previousActuatorState: options.previousActuatorState,
      persistState: options.persistState,
    }),
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

  if ((typeof depth === 'number' && depth >= CONTROL_CONFIG.HIGH_LEVEL) || floats.high_level_overflow === true) {
    reasons.push(ALERT.OVERFLOW);
  }
  if ((typeof depth === 'number' && depth <= CONTROL_CONFIG.LOW_LEVEL) || floats.low_level_dry_run === true) {
    reasons.push(ALERT.DRY_RUN);
  }

  // Algorithmic rate-of-drop leak detection:
  // Drop >= 2.5 percentage points within <= 30 seconds while booster pump is stopped
  if (previousDoc && tankOf(previousDoc)) {
    const prevDepth = tankOf(previousDoc).ultrasonic_depth_pct;
    const prevTime = new Date(previousDoc.timestamp).getTime();
    const currTime = new Date(doc.timestamp).getTime();
    const elapsedSec = (currTime - prevTime) / 1000;
    const actuatorStates = (doc && doc.telemetry && doc.telemetry.actuator_states) || {};

    if (
      elapsedSec > 0 &&
      elapsedSec <= CONTROL_CONFIG.LEAK_WINDOW_SECONDS &&
      actuatorStates.booster_pump !== 'ACTIVE'
    ) {
      const dropPct = prevDepth - depth;
      if (dropPct >= CONTROL_CONFIG.LEAK_DROP_THRESHOLD) {
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
  if (!payload.timestamp) {
    return 'timestamp is required';
  }
  const timestamp = new Date(payload.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return 'timestamp is invalid';
  }
  if (!payload.telemetry || typeof payload.telemetry !== 'object' || Array.isArray(payload.telemetry)) {
    return 'telemetry object is required';
  }
  if (!payload.telemetry.water_tank || typeof payload.telemetry.water_tank !== 'object') {
    return 'telemetry.water_tank is required';
  }
  const depth = payload.telemetry.water_tank.ultrasonic_depth_pct;
  if (typeof depth !== 'number' || !Number.isFinite(depth) || depth < 0 || depth > 100) {
    return 'ultrasonic_depth_pct must be a number between 0 and 100';
  }
  if (!payload.metadata || typeof payload.metadata !== 'object' || Array.isArray(payload.metadata)) {
    return 'metadata object is required';
  }
  if (!payload.metadata.firmware || typeof payload.metadata.firmware !== 'string') {
    return 'metadata.firmware is required';
  }
  return null;
}

function readingFromLevel(levelPct, timestamp = new Date(), options = {}) {
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
  const payload = buildPayload({ levelPct: level, timestamp: when, ...options });
  return toStoredReading(payload, new Date(), options.previousDoc || null);
}

function replaceLevel(doc, levelPct, options = {}) {
  const level = Number(levelPct);
  if (!Number.isFinite(level) || level < 0 || level > 100) {
    const err = new Error('ultrasonic_depth_pct must be a number from 0 to 100');
    err.status = 400;
    throw err;
  }
  const firmware = doc.metadata?.firmware || DEFAULT_FIRMWARE;
  const next = {
    ...doc,
    telemetry: buildWaterTelemetry(level, {
      device_id: doc.device_id,
      firmware,
      previousActuatorState: doc.telemetry?.actuator_states,
      ...options,
    }),
    metadata: { ...doc.metadata, firmware },
  };
  return { ...next, ...evaluateAlerts(next, options.previousDoc || null) };
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
      firmware: payload.metadata.firmware || DEFAULT_FIRMWARE,
      signal_rssi: Number.isFinite(rssi) ? rssi : null,
    },
    telemetry: payload.telemetry,
  };
  return { ...doc, ...evaluateAlerts(doc, previousDoc), ingested_at: ingestedAt };
}

module.exports = {
  CONTROL_CONFIG,
  ALERT,
  DEFAULT_FIRMWARE,
  FIRMWARE: DEFAULT_FIRMWARE,
  HOME_HUB,
  TELEMETRY_TOPIC,
  TANK_CAPACITY_L: CONTROL_CONFIG.TANK_CAPACITY_L,
  TANK_HEIGHT_CM: CONTROL_CONFIG.TANK_HEIGHT_CM,
  actuatorMemory,
  getActuatorState,
  setActuatorState,
  resetActuatorMemory,
  getControlState,
  setControlState,
  buildWaterTelemetry,
  buildPayload,
  evaluateAlerts,
  readingFromLevel,
  replaceLevel,
  validatePayload,
  toStoredReading,
};
