import { apiGet } from './client';
import type { PageResult, SensorReading, SeriesResponse } from '../types';

export interface TelemetryQuery {
  device_id?: string;
  device_type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function getLatest(deviceId?: string) {
  const params = new URLSearchParams();
  if (deviceId) params.set('device_id', deviceId);
  const query = params.toString();
  return apiGet<{ reading: SensorReading | null }>(`/api/telemetry/latest${query ? `?${query}` : ''}`);
}

export function getTelemetry(query: TelemetryQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return apiGet<PageResult<SensorReading>>(`/api/telemetry?${params.toString()}`);
}

export function getSeries(query: {
  device_id: string;
  metric: string;
  from?: string;
  to?: string;
  bucket: 'minute' | 'hour';
}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return apiGet<SeriesResponse>(`/api/telemetry/series?${params.toString()}`);
}
