/**
 * Device registry, payload builders, and alert rules.
 * Synthetic readings only — no personal data.
 */

const TANK_CAPACITY_L = 2000;
const TANK_HEIGHT_CM = 150;

const ALERT = {
  OVERFLOW: 'TANK_OVERFLOW',
  DRY_RUN: 'TANK_DRY_RUN',
  HIGH_TEMP: 'HIGH_TEMPERATURE',
  POWER_SPIKE: 'POWER_SPIKE',
};

const COMMANDS = {
  pump_on: { booster_pump: true },
  pump_off: { booster_pump: false },
  valve_open: { inlet_valve: true },
  valve_close: { inlet_valve: false },
};

const METRICS = {
  ultrasonic_depth_pct: 'water_tank.ultrasonic_depth_pct',
  volume_litres: 'water_tank.volume_litres',
  distance_cm: 'water_tank.distance_cm',
  temperature_c: 'climate.temperature_c',
  humidity_pct: 'climate.humidity_pct',
  co2_ppm: 'climate.co2_ppm',
  voltage_v: 'power_meter.voltage_v',
  power_w: 'power_meter.power_w',
  current_a: 'power_meter.current_a',
  energy_kwh_total: 'power_meter.energy_kwh_total',
};

const devices = [
  { device_id: 'TANK_01', device_type: 'water_tank', location: 'roof', firmware: '1.4.2' },
  { device_id: 'TANK_02', device_type: 'water_tank', location: 'basement', firmware: '1.4.2' },
  { device_id: 'CLIMATE_01', device_type: 'climate', location: 'plant_room', firmware: '2.1.0' },
  { device_id: 'POWER_01', device_type: 'power_meter', location: 'electrical_cupboard', firmware: '3.0.1' },
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function findDevice(deviceId) {
  return devices.find((device) => device.device_id === deviceId) || null;
}

function waterLevelPct() {
  const roll = Math.random();
  if (roll < 0.08) return rand(85, 90);
  if (roll < 0.16) return rand(20, 25);
  return rand(26, 84);
}

function buildWaterTelemetry(overrides = {}) {
  const pct = round(waterLevelPct(), 1);
  const volume = round((TANK_CAPACITY_L * pct) / 100, 0);
  const distance = round(TANK_HEIGHT_CM * (1 - pct / 100), 1);
  const high = pct >= 85;
  const low = pct <= 25;
  const inlet = overrides.inlet_valve ?? pct < 40;
  const pump = overrides.booster_pump ?? (!low && pct > 30);
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
      inlet_valve: inlet,
      booster_pump: pump,
    },
  };
}

function buildClimateTelemetry() {
  const roll = Math.random();
  const temperature = roll < 0.1 ? rand(35.1, 39.5) : rand(16, 34);
  return {
    climate: {
      temperature_c: round(temperature, 1),
      humidity_pct: round(rand(30, 80), 0),
      co2_ppm: Math.round(rand(420, 1400)),
    },
  };
}

function buildPowerTelemetry(energyKwh) {
  const roll = Math.random();
  const power = roll < 0.1 ? rand(3501, 4200) : rand(180, 2800);
  const voltage = rand(228, 245);
  return {
    power_meter: {
      voltage_v: round(voltage, 1),
      power_w: round(power, 0),
      current_a: round(power / voltage, 2),
      energy_kwh_total: round(energyKwh, 2),
    },
  };
}

function buildTelemetry(device, options = {}) {
  if (device.device_type === 'water_tank') {
    return buildWaterTelemetry(options.actuators || {});
  }
  if (device.device_type === 'climate') {
    return buildClimateTelemetry();
  }
  return buildPowerTelemetry(options.energyKwh ?? rand(80, 160));
}

function buildPayload(device, options = {}) {
  const timestamp = options.timestamp instanceof Date ? options.timestamp : new Date();
  return {
    device_id: device.device_id,
    device_type: device.device_type,
    location: device.location,
    timestamp: timestamp.toISOString(),
    metadata: {
      firmware: device.firmware,
      signal_rssi: Math.round(rand(-90, -40)),
    },
    telemetry: buildTelemetry(device, options),
  };
}

function evaluateAlerts(doc) {
  const reasons = [];
  const depth = doc.water_tank && doc.water_tank.ultrasonic_depth_pct;
  const floats = doc.float_switches || {};
  if ((typeof depth === 'number' && depth >= 85) || floats.high_level_overflow === true) {
    reasons.push(ALERT.OVERFLOW);
  }
  if ((typeof depth === 'number' && depth <= 25) || floats.low_level_dry_run === true) {
    reasons.push(ALERT.DRY_RUN);
  }
  const temperature = doc.climate && doc.climate.temperature_c;
  if (typeof temperature === 'number' && temperature > 35) {
    reasons.push(ALERT.HIGH_TEMP);
  }
  const power = doc.power_meter && doc.power_meter.power_w;
  if (typeof power === 'number' && power > 3500) {
    reasons.push(ALERT.POWER_SPIKE);
  }
  return { alert_reasons: reasons, alert: reasons.length > 0 };
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'payload must be an object';
  }
  if (typeof payload.device_id !== 'string' || payload.device_id.trim() === '') {
    return 'device_id is required';
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(payload.device_id)) {
    return 'device_id has an invalid shape';
  }
  if (typeof payload.device_type !== 'string' || payload.device_type.trim() === '') {
    return 'device_type is required';
  }
  if (!/^[a-z0-9_]{1,64}$/.test(payload.device_type)) {
    return 'device_type has an invalid shape';
  }
  const timestamp = new Date(payload.timestamp);
  if (!payload.timestamp || Number.isNaN(timestamp.getTime())) {
    return 'timestamp is invalid';
  }
  if (!payload.telemetry || typeof payload.telemetry !== 'object' || Array.isArray(payload.telemetry)) {
    return 'telemetry object is required';
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
  const doc = {
    device_id: payload.device_id,
    device_type: payload.device_type,
    location: typeof payload.location === 'string' ? payload.location : 'unknown',
    timestamp: new Date(payload.timestamp),
    metadata: {
      firmware: String(payload.metadata.firmware || 'unknown'),
      signal_rssi: Number(payload.metadata.signal_rssi),
    },
    ...payload.telemetry,
  };
  if (!Number.isFinite(doc.metadata.signal_rssi)) {
    doc.metadata.signal_rssi = null;
  }
  const alerts = evaluateAlerts(doc);
  return { ...doc, ...alerts, ingested_at: ingestedAt };
}

function topicFor(device, kind) {
  return `iothings/${device.device_type}/${device.device_id}/${kind}`;
}

module.exports = {
  ALERT,
  COMMANDS,
  METRICS,
  TANK_CAPACITY_L,
  TANK_HEIGHT_CM,
  devices,
  findDevice,
  buildPayload,
  evaluateAlerts,
  validatePayload,
  toStoredReading,
  topicFor,
};
