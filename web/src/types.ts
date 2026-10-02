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

export interface WaterInsights {
  device_id: string;
  tank_capacity_litres: number;
  current_level_pct: number;
  current_volume_litres: number;
  consumption: {
    today_litres: number;
    is_today_estimated: boolean;
    yesterday_litres: number;
    daily_average_litres: number;
    monthly_litres: number;
    previous_month_litres: number;
  };
  prediction: {
    status: 'draining' | 'stable_or_filling' | 'stable' | 'critical_reached' | 'insufficient_data';
    current_level_pct?: number;
    critical_level_pct?: number;
    available_litres?: number;
    drain_rate_lph?: number;
    hours_to_critical?: number | null;
    display: string;
    message?: string;
    recommendation?: string;
  };
  latest_alert: {
    _id: string;
    alert_type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    estimated_excess_loss_litres?: number;
    recommendation?: string;
    status: 'unread' | 'acknowledged' | 'resolved';
    timestamp: string;
  } | null;
  generated_at: string;
}

export interface DailyConsumptionPoint {
  date: string;
  litres: number;
  refills?: number;
}

export interface SmartAlert {
  _id: string;
  device_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  measured_drop_pct?: number;
  estimated_excess_loss_litres?: number;
  detection_period?: string;
  recommendation?: string;
  status: 'unread' | 'acknowledged' | 'resolved';
  timestamp: string;
}

export interface HomeRecord {
  _id?: string;
  home_id: string;
  owner: string;
  address: string;
  city: string;
  postcode?: string;
  country: string;
  water_tariff?: string;
}

