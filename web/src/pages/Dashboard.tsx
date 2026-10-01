import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUp, Bell, Clock, Droplets, Radio } from 'lucide-react';
import { getHealth } from '../api/health';
import { getAlerts, getAverages, getHistorySeries, getSummary } from '../api/telemetry';
import { MemberBadge } from '../components/StatusBadge';
import { Sparkline } from '../components/Sparkline';
import { StatCard } from '../components/StatCard';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { TankGauge } from '../components/TankGauge';
import { ageLabel, errorMessage, formatNumber, formatWhen, reasonLabel } from '../lib/format';
import type { Trend } from '../types';

const poll = { refetchInterval: 5000, refetchIntervalInBackground: false } as const;

function trendIcon(trend: Trend) {
  if (trend === 'rising') return <ArrowUp size={18} />;
  if (trend === 'falling') return <ArrowDown size={18} />;
  return <ArrowRight size={18} />;
}

function estimateText(kind: string, minutes: number | null) {
  if (kind === 'empty' && minutes !== null) return `${formatNumber(minutes)} min`;
  if (kind === 'full' && minutes !== null) return `${formatNumber(minutes)} min`;
  return 'Not estimated';
}

function estimateHint(kind: string) {
  if (kind === 'empty') return 'until empty at the recent rate';
  if (kind === 'full') return 'until full at the recent rate';
  return 'change over 15 minutes is too small';
}

export function Dashboard() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: getSummary, ...poll });
  const alerts = useQuery({ queryKey: ['alerts', 'dash'], queryFn: () => getAlerts({ limit: 5, page: 1 }), ...poll });
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, ...poll });
  const averages = useQuery({ queryKey: ['averages'], queryFn: getAverages, ...poll });
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const series = useQuery({
    queryKey: ['history-series', 'minute', 'hour'],
    queryFn: () => getHistorySeries({ bucket: 'minute', from: hourAgo }),
    ...poll,
  });

  if (summary.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
        <Skeleton className="h-80 md:col-span-2" />
        <Skeleton className="h-80 md:col-span-2" />
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => { void summary.refetch(); }} />;
  }

  const data = summary.data;
  const tank = data.reading?.telemetry.water_tank;
  const average = averages.data?.devices[0];
  const primary = health.data?.members.find((member) => member.isPrimary);

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-status-ok animate-pulse-ring" aria-hidden />
        Last seen {ageLabel(data.last_seen)}
        <span className="font-mono">RSSI {formatNumber(data.signal_rssi, 0)} dBm</span>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
        <StatCard label="Level" value={`${formatNumber(tank?.ultrasonic_depth_pct, 1)}%`} hint="ultrasonic depth" icon={<Droplets size={18} />} />
        <StatCard label="Volume" value={`${formatNumber(tank?.volume_litres, 0)} L`} hint="of 2,000 L" icon={<Droplets size={18} />} />
        <StatCard label="Trend" value={data.trend.charAt(0).toUpperCase() + data.trend.slice(1)} hint={`${formatNumber(data.rate_litres_per_hour, 1)} L/h over 15 min`} icon={trendIcon(data.trend)} />
        <StatCard label="Time estimate" value={estimateText(data.estimate.kind, data.estimate.minutes)} hint={estimateHint(data.estimate.kind)} icon={<Clock size={18} />} />
      </section>
      {!data.reading && (
        <EmptyState title="No readings yet" body="Start the simulator so HOME_HUB_01 publishes a tank document." />
      )}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Water tank">
        <TankGauge reading={data.reading} status={data.status} />
        <article className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Last hour</h2>
            <p className="text-sm text-ink-muted">
              Min {formatNumber(data.last_hour.min, 1)}% · max {formatNumber(data.last_hour.max, 1)}%
              {average ? ` · stored average ${formatNumber(average.avg_water_level, 1)}%` : ''}
            </p>
          </div>
          {series.isLoading && <Skeleton className="h-16" />}
          {series.isError && <ErrorState message={errorMessage(series.error)} onRetry={() => { void series.refetch(); }} />}
          {series.data && <Sparkline points={series.data.points} label="Water level over the last hour" />}
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Radio size={16} aria-hidden />
            Firmware {data.reading?.metadata.firmware ?? '—'} · distance {formatNumber(tank?.distance_cm, 1)} cm
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bell size={16} aria-hidden />
              Recent alerts
            </h3>
            {alerts.isLoading && <Skeleton className="mt-2 h-16" />}
            {alerts.isError && <p className="mt-2 text-sm text-status-danger">{errorMessage(alerts.error)}</p>}
            {alerts.data && alerts.data.items.length === 0 && <p className="mt-2 text-sm text-ink-muted">No overflow or dry-run documents yet.</p>}
            <ul className="mt-2 space-y-2 text-sm">
              {(alerts.data?.items ?? []).map((item) => (
                <li key={item._id ?? item.timestamp} className="flex items-center justify-between gap-3">
                  <span className="badge-danger">{item.alert_reasons.map(reasonLabel).join(', ')}</span>
                  <span className="text-ink-muted">{formatWhen(item.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-surface-border pt-3 text-sm">
            <p className="text-ink-muted">Replica set {health.data?.set ?? '—'}</p>
            {primary ? <div className="mt-2"><MemberBadge state={primary.state} /> <span className="ml-2 font-mono text-ink-muted">{primary.name}</span></div> : <p className="mt-2 text-ink-muted">Primary not reported yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
