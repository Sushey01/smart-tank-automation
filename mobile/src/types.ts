export type DeviceStatus = 'online' | 'offline';
export type Trend = 'rising' | 'falling' | 'steady';
export type AlertReason = 'TANK_OVERFLOW' | 'TANK_DRY_RUN';

export interface SensorReading {
  _id?: string;
  device_id: string;
  device_type: string;
  location: string;
  timestamp: string;
  metadata: { firmware: string; signal_rssi: number | null };
  telemetry: {
    water_tank: { ultrasonic_depth_pct: number; volume_litres: number; distance_cm: number };
    float_switches: { high_level_overflow: boolean; low_level_dry_run: boolean };
    actuator_states: { inlet_valve: 'OPEN' | 'CLOSED'; booster_pump: 'ACTIVE' | 'EMERGENCY_STOP' };
  };
  alert_reasons: AlertReason[];
  alert: boolean;
  ingested_at: string;
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

export interface HistorySeries {
  device_id: string;
  bucket: 'minute' | 'hour';
  points: SeriesPoint[];
}

export interface TankSummary {
  reading: SensorReading | null;
  status: DeviceStatus;
  trend: Trend;
  rate_litres_per_hour: number | null;
  estimate: { kind: 'empty' | 'full' | 'not_estimated'; minutes: number | null };
  last_hour: { min: number | null; max: number | null };
  last_seen: string | null;
  signal_rssi: number | null;
}

export interface AverageRow {
  device_id: string;
  device_type: string;
  readings: number;
  avg_water_level: number | null;
  avg_volume_litres: number | null;
  alert_count: number;
}

export const ALERT_REASONS: AlertReason[] = ['TANK_OVERFLOW', 'TANK_DRY_RUN'];
