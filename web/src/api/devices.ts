import { apiGet } from './client';
import type { DeviceSummary } from '../types';

export function getDevices() {
  return apiGet<{ devices: DeviceSummary[] }>('/api/devices');
}
