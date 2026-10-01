import { Droplets } from 'lucide-react';
import type { DeviceStatus, SensorReading } from '../types';
import { formatNumber } from '../lib/format';
import { StatusBadge } from './StatusBadge';

export function TankGauge({ reading, status }: { reading: SensorReading | null; status: DeviceStatus }) {
  const tank = reading?.telemetry.water_tank;
  const level = tank?.ultrasonic_depth_pct ?? 0;
  const litres = tank?.volume_litres;
  const clamped = Math.max(0, Math.min(100, level));
  const high = reading?.telemetry.float_switches.high_level_overflow;
  const low = reading?.telemetry.float_switches.low_level_dry_run;
  const valve = reading?.telemetry.actuator_states.inlet_valve ?? 'CLOSED';
  const pump = reading?.telemetry.actuator_states.booster_pump ?? 'EMERGENCY_STOP';

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-ink-muted">HOME_HUB_01</p>
          <h2 className="text-lg font-semibold">Home tank</h2>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <div
          className="relative h-64 w-36 overflow-hidden rounded-b-3xl rounded-t-lg border-2 border-brand-700/30 bg-surface-muted"
          role="img"
          aria-label={`Home tank is ${formatNumber(level, 1)} percent full, about ${formatNumber(litres, 0)} litres`}
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
          <p className="badge">Inlet valve {valve}</p>
          <p className={pump === 'EMERGENCY_STOP' ? 'badge-danger' : 'badge-ok'}>
            Booster pump {pump === 'EMERGENCY_STOP' ? 'emergency stop' : 'active'}
          </p>
        </div>
      </div>
    </article>
  );
}
