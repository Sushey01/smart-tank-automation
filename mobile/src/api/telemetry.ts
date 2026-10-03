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

export function getSummary() {
  return apiGet<TankSummary>('/api/telemetry/summary');
}

export function getAlerts(params: { page?: number; limit?: number; reason?: string }) {
  return apiGet<PageResult<SensorReading>>(`/api/telemetry/alerts${query(params)}`);
}

export function getAverages() {
  return apiGet<{ devices: AverageRow[] }>('/api/telemetry/analytics/averages');
}

export function getHistory(params: { page?: number; limit?: number }) {
  return apiGet<PageResult<SensorReading>>(`/api/telemetry/history${query(params)}`);
}

export function getHistorySeries(params: { from?: string; bucket: 'minute' | 'hour' }) {
  return apiGet<HistorySeries>(`/api/telemetry/history${query(params)}`);
}

export function getWaterInsights() {
  return apiGet<import('../types').WaterInsights>('/api/analytics/summary');
}

export function getSmartAlerts(params: { page?: number; limit?: number } = {}) {
  return apiGet<PageResult<import('../types').SmartAlert>>(`/api/alerts${query(params)}`);
}
