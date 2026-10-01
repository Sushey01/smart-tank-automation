import { apiGet } from './client';
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
