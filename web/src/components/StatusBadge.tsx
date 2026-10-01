import { CheckCircle2, CircleOff, Crown, Database } from 'lucide-react';
import type { DeviceStatus } from '../types';

const deviceMap: Record<DeviceStatus, { className: string; label: string; Icon: typeof CheckCircle2 }> = {
  online: { className: 'badge-ok', label: 'Online', Icon: CheckCircle2 },
  offline: { className: 'badge-danger', label: 'Offline', Icon: CircleOff },
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const item = deviceMap[status];
  const Icon = item.Icon;
  return (
    <span className={item.className}>
      <Icon size={14} aria-hidden />
      {item.label}
    </span>
  );
}

export function MemberBadge({ state }: { state: string }) {
  const primary = state === 'PRIMARY';
  const secondary = state === 'SECONDARY';
  const Icon = primary ? Crown : Database;
  const className = primary ? 'badge-ok' : secondary ? 'badge' : 'badge-danger';
  const label = primary ? 'Primary' : secondary ? 'Secondary' : state;
  return (
    <span className={className}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}
