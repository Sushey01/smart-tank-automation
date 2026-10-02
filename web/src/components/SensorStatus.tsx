import { CheckCircle2, CircleOff, Radio, Waves } from 'lucide-react';
import type { DeviceStatus, SensorReading } from '../types';

type Condition = 'good' | 'warn' | 'danger' | 'offline';

const style: Record<Condition, { className: string; label: string }> = {
  good: { className: 'badge-ok', label: 'Good condition' },
  warn: { className: 'badge-warn', label: 'Check' },
  danger: { className: 'badge-danger', label: 'Alert' },
  offline: { className: 'badge', label: 'No signal' },
};

function ConditionBadge({ condition, label }: { condition: Condition; label: string }) {
  const item = style[condition];
  const Icon = condition === 'good' ? CheckCircle2 : condition === 'offline' ? CircleOff : Radio;
  return (
    <span className={item.className}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

export function SensorStatus({ reading, status }: { reading: SensorReading | null; status: DeviceStatus }) {
  const floats = reading?.telemetry.float_switches;
  const offline = status !== 'online' || !reading;
  const high = Boolean(floats?.high_level_overflow);
  const low = Boolean(floats?.low_level_dry_run);
  const sensors: { name: string; detail: string; condition: Condition; label: string }[] = [
    {
      name: 'Ultrasonic level',
      detail: 'Measures how full the tank is',
      condition: offline ? 'offline' : 'good',
      label: offline ? 'No signal' : 'Good condition',
    },
    {
      name: 'High float',
      detail: 'Trips at 85% to catch overflow',
      condition: offline ? 'offline' : high ? 'danger' : 'good',
      label: offline ? 'No signal' : high ? 'Overflow' : 'Good condition',
    },
    {
      name: 'Low float',
      detail: 'Trips at 25% to catch a dry-run',
      condition: offline ? 'offline' : low ? 'warn' : 'good',
      label: offline ? 'No signal' : low ? 'Dry-run' : 'Good condition',
    },
  ];
  const allGood = sensors.every((sensor) => sensor.condition === 'good');

  return (
    <section className="card" aria-label="Tank sensors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Waves size={18} className="text-brand-600" aria-hidden />
            Sensors
          </h2>
          <p className="text-sm text-ink-muted">HOME_HUB_01 · three sensors on this tank</p>
        </div>
        <ConditionBadge condition={allGood ? 'good' : offline ? 'offline' : 'danger'} label={allGood ? 'All in good condition' : offline ? 'Hub offline' : 'Needs attention'} />
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {sensors.map((sensor) => (
          <li key={sensor.name} className="rounded-2xl border border-surface-border bg-surface-muted px-4 py-3">
            <p className="font-medium">{sensor.name}</p>
            <p className="mt-1 text-sm text-ink-muted">{sensor.detail}</p>
            <div className="mt-3">
              <ConditionBadge condition={sensor.condition} label={sensor.label} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
