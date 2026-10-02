import { apiGet, apiSend } from './client';
import type { AverageRow, HistorySeries, PageResult, SensorReading, TankSummary } from '../types';

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function getLatest() {
  return apiGet<{ reading: SensorReading | null }>('/api/telemetry/latest');
}

export function getSummary() {
  return apiGet<TankSummary>('/api/telemetry/summary');
}

export function getAlerts(params: { page?: number; limit?: number; reason?: string }) {
  return apiGet<PageResult<SensorReading>>(`/api/telemetry/alerts${query(params)}`);
}

export function getAverages() {
  return apiGet<{ devices: AverageRow[] }>('/api/telemetry/analytics/averages');
}

export function getHistory(params: { from?: string; to?: string; page?: number; limit?: number }) {
  return apiGet<PageResult<SensorReading>>(`/api/telemetry/history${query(params)}`);
}

export function getHistorySeries(params: { from?: string; to?: string; bucket: 'minute' | 'hour' }) {
  return apiGet<HistorySeries>(`/api/telemetry/history${query(params)}`);
}

export function createReading(ultrasonicDepthPct: number) {
  return apiSend<{ reading: SensorReading }>('/api/telemetry', 'POST', {
    ultrasonic_depth_pct: ultrasonicDepthPct,
  });
}

export function updateReading(id: string, ultrasonicDepthPct: number) {
  return apiSend<{ reading: SensorReading }>(`/api/telemetry/${id}`, 'PATCH', {
    ultrasonic_depth_pct: ultrasonicDepthPct,
  });
}

export function deleteReading(id: string) {
  return apiSend<{ deleted: boolean; id: string }>(`/api/telemetry/${id}`, 'DELETE');
}

export function getWaterInsights(deviceId?: string) {
  return apiGet<import('../types').WaterInsights>(`/api/analytics/summary${query({ device_id: deviceId })}`);
}

export function getDailyConsumptionSeries(days = 7, deviceId?: string) {
  return apiGet<{ device_id: string; days: number; series: import('../types').DailyConsumptionPoint[] }>(
    `/api/analytics/consumption/daily${query({ days, device_id: deviceId })}`
  );
}

export function getHomes() {
  return apiGet<{ count: number; homes: import('../types').HomeRecord[] }>('/api/homes');
}

export function getSmartAlerts(params: { status?: string; limit?: number }) {
  return apiGet<PageResult<import('../types').SmartAlert>>(`/api/alerts${query(params)}`);
}

export function ackAlert(id: string) {
  return apiSend<{ success: boolean; alert: import('../types').SmartAlert }>(`/api/alerts/${id}/ack`, 'PATCH', {});
}
