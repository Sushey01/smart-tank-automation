export type DeviceStatus = 'online' | 'stale' | 'offline';

export type AlertReason = 'TANK_OVERFLOW' | 'TANK_DRY_RUN' | 'HIGH_TEMPERATURE' | 'POWER_SPIKE';

export type TankCommand = 'pump_on' | 'pump_off' | 'valve_open' | 'valve_close';

export interface SensorReading {
  _id?: string;
  device_id: string;
  device_type: string;
  location: string;
  timestamp: string;
  metadata: { firmware: string; signal_rssi: number | null };
  water_tank?: { ultrasonic_depth_pct: number; volume_litres: number; distance_cm: number };
  float_switches?: { high_level_overflow: boolean; low_level_dry_run: boolean };
  actuator_states?: { inlet_valve: boolean; booster_pump: boolean };
  climate?: { temperature_c: number; humidity_pct: number; co2_ppm: number };
  power_meter?: { voltage_v: number; power_w: number; current_a: number; energy_kwh_total: number };
  alert_reasons: AlertReason[];
  alert: boolean;
  ingested_at: string;
}

export interface DeviceSummary {
  id: string;
  type: string;
  location: string;
  last_seen: string | null;
  status: DeviceStatus;
  latest: SensorReading | null;
}

export interface MemberStatus {
  name: string;
  state: string;
  health: number;
  isPrimary: boolean;
}

export interface HealthResponse {
  set: string;
  primary: string | null;
  members: MemberStatus[];
  checkedAt: string;
}

export interface PageResult<T> {
  page: number;
  limit: number;
  total: number;
  items: T[];
}

export interface SeriesPoint {
  bucket: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface SeriesResponse {
  device_id: string;
  metric: string;
  bucket: 'minute' | 'hour';
  points: SeriesPoint[];
}

export interface AverageRow {
  device_id: string;
  device_type: string;
  readings: number;
  avg_water_level: number | null;
  avg_temp: number | null;
  avg_power: number | null;
  alert_count: number;
}

export interface HourlyAlert {
  hour: string;
  reason: string;
  count: number;
}

export interface StatsResponse {
  total_documents: number;
  documents_last_hour: number;
  active_alerts: number;
  devices_online: number;
}

export interface CommandResponse {
  ok: boolean;
  device_id: string;
  command: TankCommand;
  topic: string;
  publishedAt: string;
}

export const ALERT_REASONS: AlertReason[] = [
  'TANK_OVERFLOW',
  'TANK_DRY_RUN',
  'HIGH_TEMPERATURE',
  'POWER_SPIKE',
];

export const METRIC_OPTIONS = [
  { id: 'ultrasonic_depth_pct', label: 'Water level %', type: 'water_tank' },
  { id: 'volume_litres', label: 'Volume (L)', type: 'water_tank' },
  { id: 'temperature_c', label: 'Temperature °C', type: 'climate' },
  { id: 'humidity_pct', label: 'Humidity %', type: 'climate' },
  { id: 'co2_ppm', label: 'CO₂ ppm', type: 'climate' },
  { id: 'power_w', label: 'Power W', type: 'power_meter' },
  { id: 'voltage_v', label: 'Voltage V', type: 'power_meter' },
  { id: 'current_a', label: 'Current A', type: 'power_meter' },
  { id: 'energy_kwh_total', label: 'Energy kWh', type: 'power_meter' },
] as const;
