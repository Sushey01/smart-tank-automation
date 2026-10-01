import { apiGet, apiPost } from './client';
import type { CommandResponse, DeviceSummary, TankCommand } from '../types';

export function getDevices() {
  return apiGet<{ devices: DeviceSummary[] }>('/api/devices');
}

export function sendCommand(deviceId: string, command: TankCommand) {
  return apiPost<CommandResponse>(`/api/devices/${encodeURIComponent(deviceId)}/commands`, { command });
}
