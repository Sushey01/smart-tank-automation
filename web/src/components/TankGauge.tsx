import { useState } from 'react';
import { Droplets } from 'lucide-react';
import type { DeviceSummary, TankCommand } from '../types';
import { formatNumber } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';

const ACTIONS: { command: TankCommand; label: string }[] = [
  { command: 'pump_on', label: 'Pump on' },
  { command: 'pump_off', label: 'Pump off' },
  { command: 'valve_open', label: 'Valve open' },
  { command: 'valve_close', label: 'Valve close' },
];

export function TankGauge({
  device,
  onCommand,
}: {
  device: DeviceSummary;
  onCommand: (deviceId: string, command: TankCommand) => Promise<void>;
}) {
  const [pending, setPending] = useState<TankCommand | null>(null);
  const [busy, setBusy] = useState(false);
  const level = device.latest?.water_tank?.ultrasonic_depth_pct ?? 0;
  const litres = device.latest?.water_tank?.volume_litres;
  const clamped = Math.max(0, Math.min(100, level));
  const high = device.latest?.float_switches?.high_level_overflow;
  const low = device.latest?.float_switches?.low_level_dry_run;
  const valve = device.latest?.actuator_states?.inlet_valve;
  const pump = device.latest?.actuator_states?.booster_pump;
  const location = device.location.replaceAll('_', ' ');

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await onCommand(device.id, pending);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-ink-muted">{device.id}</p>
          <h2 className="text-lg font-semibold capitalize">{location} tank</h2>
        </div>
        <StatusBadge status={device.status} />
      </div>
      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <div
          className="relative h-64 w-36 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-brand-700/30 bg-surface-muted"
          role="img"
          aria-label={`${device.id} is ${formatNumber(level, 1)} percent full, about ${formatNumber(litres, 0)} litres`}
        >
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-700 to-brand-400" style={{ height: `${clamped}%` }}>
            <svg className="absolute -top-3 left-0 h-6 w-[200%] animate-wave text-brand-200" viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden>
              <path d="M0 12 Q 15 2 30 12 T 60 12 T 90 12 T 120 12 V 22 H 0 Z" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute inset-x-1 border-t border-dashed border-status-danger/80" style={{ bottom: '85%' }} />
          <div className="absolute inset-x-1 border-t border-dashed border-status-warn" style={{ bottom: '25%' }} />
          <div className="absolute inset-x-0 bottom-3 text-center font-mono text-lg font-semibold text-white drop-shadow">
            {formatNumber(level, 1)}%
          </div>
        </div>
        <div className="w-full space-y-2 text-sm">
          <p className="flex items-center gap-2 text-ink">
            <Droplets size={16} className="text-brand-600" aria-hidden />
            <span className="font-mono tabular-nums">{formatNumber(litres, 0)} L</span>
            <span className="text-ink-faint">of 2,000 L</span>
          </p>
          <p className={high ? 'badge-danger' : 'badge'}>
            {high ? 'High float: overflow' : 'High float: clear'}
          </p>
          <p className={low ? 'badge-warn' : 'badge'}>
            {low ? 'Low float: dry-run' : 'Low float: clear'}
          </p>
          <p className="badge">{valve ? 'Inlet valve open' : 'Inlet valve closed'}</p>
          <p className="badge">{pump ? 'Booster pump on' : 'Booster pump off'}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.command}
            type="button"
            className="rounded-xl border border-surface-border px-2 py-2 text-xs font-medium text-ink hover:border-brand-500"
            onClick={() => setPending(action.command)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={`Send ${pending?.replaceAll('_', ' ') ?? 'command'}?`}
        body={`This publishes a QoS 1 command for ${device.id}. The simulator applies it on the next telemetry message.`}
        confirmLabel={busy ? 'Sending…' : 'Send command'}
        onConfirm={() => { void confirm(); }}
        onCancel={() => { if (!busy) setPending(null); }}
      />
    </article>
  );
}
