import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, Database, Radio } from 'lucide-react';
import { getAlerts } from '../api/alerts';
import { getDevices } from '../api/devices';
import { sendCommand } from '../api/devices';
import { getHealth } from '../api/health';
import { getStats } from '../api/stats';
import { getSeries } from '../api/telemetry';
import { MemberBadge } from '../components/StatusBadge';
import { Sparkline } from '../components/Sparkline';
import { StatCard } from '../components/StatCard';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { TankGauge } from '../components/TankGauge';
import { useToast } from '../components/toast-context';
import { ageLabel, errorMessage, formatNumber, reasonLabel } from '../lib/format';
import type { TankCommand } from '../types';

const poll = { refetchInterval: 5000, refetchIntervalInBackground: false } as const;

export function Dashboard() {
  const toast = useToast();
  const stats = useQuery({ queryKey: ['stats'], queryFn: getStats, ...poll });
  const devices = useQuery({ queryKey: ['devices'], queryFn: getDevices, ...poll });
  const alerts = useQuery({ queryKey: ['alerts', 'dash'], queryFn: () => getAlerts({ limit: 8, page: 1 }), ...poll });
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, ...poll });
  const climate = useQuery({
    queryKey: ['series', 'CLIMATE_01', 'temperature_c', 'minute'],
    queryFn: () => getSeries({
      device_id: 'CLIMATE_01',
      metric: 'temperature_c',
      bucket: 'minute',
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    }),
    ...poll,
  });
  const power = useQuery({
    queryKey: ['series', 'POWER_01', 'power_w', 'minute'],
    queryFn: () => getSeries({
      device_id: 'POWER_01',
      metric: 'power_w',
      bucket: 'minute',
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    }),
    ...poll,
  });

  async function onCommand(deviceId: string, command: TankCommand) {
    try {
      const result = await sendCommand(deviceId, command);
      toast.push(`${result.device_id}: ${command.replaceAll('_', ' ')} published`);
      await devices.refetch();
    } catch (error) {
      toast.push(errorMessage(error), 'danger');
      throw error;
    }
  }

  if (stats.isLoading || devices.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
        <Skeleton className="h-80 md:col-span-2" />
        <Skeleton className="h-80 md:col-span-2" />
      </div>
    );
  }

  if (stats.isError || devices.isError) {
    return <ErrorState message={errorMessage(stats.error ?? devices.error)} onRetry={() => { void stats.refetch(); void devices.refetch(); }} />;
  }

  const tanks = (devices.data?.devices ?? []).filter((device) => device.type === 'water_tank');
  const climateDevice = devices.data?.devices.find((device) => device.id === 'CLIMATE_01');
  const powerDevice = devices.data?.devices.find((device) => device.id === 'POWER_01');
  const hasReadings = (devices.data?.devices ?? []).some((device) => device.latest);
  const updated = Math.max(stats.dataUpdatedAt, devices.dataUpdatedAt);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-status-ok animate-pulse-ring" aria-hidden />
        Last updated {ageLabel(new Date(updated).toISOString())}
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
        <StatCard label="Documents" value={formatNumber(stats.data?.total_documents)} hint="sensor_readings" icon={<Database size={18} />} />
        <StatCard label="Last hour" value={formatNumber(stats.data?.documents_last_hour)} hint="readings stored" icon={<Activity size={18} />} />
        <StatCard label="Active alerts" value={formatNumber(stats.data?.active_alerts)} hint="alert documents in the last hour" icon={<Bell size={18} />} />
        <StatCard label="Devices online" value={formatNumber(stats.data?.devices_online)} hint="seen in the last 30 seconds" icon={<Radio size={18} />} />
      </section>
      {!hasReadings && (
        <EmptyState title="No readings yet" body="Seed the collection or start the simulator so the gauges have a latest document." />
      )}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Water tanks">
        {tanks.map((device) => <TankGauge key={device.id} device={device} onCommand={onCommand} />)}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-semibold">Plant room climate</h2>
          <p className="mt-1 font-mono text-2xl tabular-nums">
            {formatNumber(climateDevice?.latest?.climate?.temperature_c, 1)}°C
          </p>
          <p className="text-sm text-ink-muted">
            Humidity {formatNumber(climateDevice?.latest?.climate?.humidity_pct, 0)}% · CO₂ {formatNumber(climateDevice?.latest?.climate?.co2_ppm, 0)} ppm
          </p>
          <div className="mt-3">
            <Sparkline points={climate.data?.points ?? []} label="Plant room temperature over the last hour" />
          </div>
        </article>
        <article className="card">
          <h2 className="text-lg font-semibold">Power meter</h2>
          <p className="mt-1 font-mono text-2xl tabular-nums">
            {formatNumber(powerDevice?.latest?.power_meter?.power_w, 0)} W
          </p>
          <p className="text-sm text-ink-muted">
            {formatNumber(powerDevice?.latest?.power_meter?.voltage_v, 1)} V · {formatNumber(powerDevice?.latest?.power_meter?.current_a, 2)} A
          </p>
          <div className="mt-3">
            <Sparkline points={power.data?.points ?? []} label="Power draw over the last hour" />
          </div>
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="card">
          <h2 className="text-lg font-semibold">Recent alerts</h2>
          {alerts.isLoading && <Skeleton className="mt-4 h-24" />}
          {alerts.isError && <p className="mt-3 text-sm text-status-danger">{errorMessage(alerts.error)}</p>}
          {alerts.data && alerts.data.items.length === 0 && <p className="mt-3 text-sm text-ink-muted">No alert documents in the latest page.</p>}
          <ul className="mt-3 divide-y divide-surface-border">
            {alerts.data?.items.map((item) => (
              <li key={item._id ?? item.timestamp} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-mono text-ink">{item.device_id}</p>
                  <p className="text-ink-muted">{item.alert_reasons.map(reasonLabel).join(', ')}</p>
                </div>
                <time className="text-xs text-ink-faint" dateTime={item.timestamp}>{ageLabel(item.timestamp)}</time>
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2 className="text-lg font-semibold">Replica set</h2>
          <p className="mt-1 text-sm text-ink-muted">{health.data ? `Set ${health.data.set}` : 'Waiting for rs.status'}</p>
          <ul className="mt-3 space-y-2">
            {health.data?.members.map((member) => (
              <li key={member.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{member.name}</span>
                <MemberBadge state={member.state} />
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
