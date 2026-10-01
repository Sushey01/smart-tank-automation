import { apiGet } from './client';
import type { StatsResponse } from '../types';

export function getStats() {
  return apiGet<StatsResponse>('/api/stats');
}
