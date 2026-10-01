import { apiGet } from './client';
import type { AverageRow, HourlyAlert } from '../types';

export function getAverages() {
  return apiGet<{ devices: AverageRow[] }>('/api/analytics/averages');
}

export function getAlertsHourly() {
  return apiGet<{ buckets: HourlyAlert[] }>('/api/analytics/alerts-hourly');
}
