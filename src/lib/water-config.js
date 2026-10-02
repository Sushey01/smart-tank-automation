/**
 * Central Configuration for Smart Water Management and Automation Platform.
 * Single source of truth for tank dimensions, hysteresis limits,
 * overnight anomaly/leak heuristics, depletion prediction, and alert categories.
 */

const WATER_CONFIG = {
  // Physical Tank Specifications
  TANK_CAPACITY_L: 2000,
  TANK_HEIGHT_CM: 200,

  // Automation & Hysteresis Thresholds (%)
  THRESHOLDS: {
    OVERFLOW_PCT: 85.0,            // Inlet valve closes; TANK_OVERFLOW alert
    INLET_OPEN_PCT: 40.0,          // Inlet valve opens to replenish water
    BOOSTER_PUMP_CUTOFF_PCT: 25.0, // Booster pump emergency stop; TANK_DRY_RUN alert
    BOOSTER_PUMP_RESUME_PCT: 35.0, // Booster pump safe restart hysteresis threshold
    CRITICAL_LEVEL_PCT: 25.0,      // Minimum safe volume target for depletion prediction
  },

  // Abnormal Overnight Water Loss / Leak Detection Rules
  LEAK_DETECTION: {
    LOW_USAGE_START_HOUR: 1,       // 01:00 AM (Quiet household hours)
    LOW_USAGE_END_HOUR: 5,         // 05:00 AM
    MIN_DROP_PCT: 1.5,             // Minimum percentage drop to consider an anomaly (1.5% = 30 L)
    MIN_DROP_LITRES: 30,           // Equivalent absolute threshold in litres
    MIN_DURATION_MINUTES: 45,      // Minimum sustained duration across consecutive readings
    MIN_SAMPLES: 4,                // Avoid triggering on a single jitter/reading
    NOISE_TOLERANCE_PCT: 0.25,     // Ignore minor ultrasonic sensor fluctuation
    ALERT_COOLDOWN_HOURS: 4,       // Cooldown window to prevent duplicate alert spam
  },

  // Depletion & Availability Prediction Window
  PREDICTION: {
    LOOKBACK_HOURS: 3,             // Rolling window to compute representative drain rate
    MIN_DRAIN_RATE_LPH: 5.0,       // Minimum drain rate (L/hour) required to project depletion
    MIN_READINGS: 4,               // Minimum samples needed in lookback window
    CONFIDENCE_LEVELS: {
      HIGH: 'high',
      ESTIMATED: 'estimated',
      INSUFFICIENT: 'insufficient_data',
    },
  },

  // Alert Types & Categories
  ALERT_TYPES: {
    OVERFLOW_PROTECTION: 'OVERFLOW_PROTECTION',
    LOW_WATER: 'LOW_WATER',
    ABNORMAL_WATER_USAGE: 'ABNORMAL_WATER_USAGE',
    POSSIBLE_LEAK: 'POSSIBLE_LEAK',
    PUMP_ABNORMALITY: 'PUMP_ABNORMALITY',
    DRY_RUN: 'TANK_DRY_RUN',
  },
};

module.exports = WATER_CONFIG;
