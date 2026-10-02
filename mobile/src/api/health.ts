import { apiGet } from './client';
import type { HealthResponse } from '../types';

export function getHealth() {
  return apiGet<HealthResponse>('/api/health');
}
