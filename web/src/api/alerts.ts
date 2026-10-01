import { apiGet } from './client';
import type { PageResult, SensorReading } from '../types';

export function getAlerts(query: { page?: number; limit?: number; reason?: string }) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.reason) params.set('reason', query.reason);
  return apiGet<PageResult<SensorReading>>(`/api/alerts?${params.toString()}`);
}
