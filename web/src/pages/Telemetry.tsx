import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getTelemetry, getSeries } from '../api/telemetry';
import { DataTable } from '../components/DataTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { downloadCsv, errorMessage, formatClock, formatNumber, formatWhen, reasonLabel } from '../lib/format';
import { METRIC_OPTIONS } from '../types';

export function TelemetryPage() {
  const [deviceId, setDeviceId] = useState('TANK_01');
  const [deviceType, setDeviceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<'minute' | 'hour'>('minute');
  const [metric, setMetric] = useState('ultrasonic_depth_pct');

  const list = useQuery({
    queryKey: ['telemetry', deviceId, deviceType, from, to, page],
    queryFn: () => getTelemetry({
      device_id: deviceId || undefined,
      device_type: deviceType || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      page,
      limit: 20,
    }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const series = useQuery({
    queryKey: ['series', deviceId, metric, bucket, from, to],
    queryFn: () => getSeries({
      device_id: deviceId,
      metric,
      bucket,
      from: from ? new Date(from).toISOString() : new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      to: to ? new Date(to).toISOString() : undefined,
    }),
    enabled: Boolean(deviceId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.limit ?? 20)));
  const chartLabel = useMemo(() => `${metric.replaceAll('_', ' ')} for ${deviceId}`, [metric, deviceId]);

  function exportCsv() {
    const rows = (list.data?.items ?? []).map((item) => ({
      device_id: item.device_id,
      device_type: item.device_type,
      location: item.location,
      timestamp: item.timestamp,
      alert: item.alert,
      alert_reasons: item.alert_reasons.join('|'),
      level_pct: item.water_tank?.ultrasonic_depth_pct ?? '',
      temperature_c: item.climate?.temperature_c ?? '',
      power_w: item.power_meter?.power_w ?? '',
    }));
    downloadCsv('telemetry.csv', rows);
  }

  return (
    <div className="animate-fade-up space-y-4">
      <form className="card grid gap-3 md:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Device</span>
          <select className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2" value={deviceId} onChange={(event) => { setDeviceId(event.target.value); setPage(1); }}>
            {['TANK_01', 'TANK_02', 'CLIMATE_01', 'POWER_01'].map((id) => <option key={id}>{id}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Type</span>
          <select className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2" value={deviceType} onChange={(event) => { setDeviceType(event.target.value); setPage(1); }}>
            <option value="">Any</option>
            <option value="water_tank">water tank</option>
            <option value="climate">climate</option>
            <option value="power_meter">power meter</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Metric</span>
          <select className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2" value={metric} onChange={(event) => setMetric(event.target.value)}>
            {METRIC_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">From</span>
          <input type="datetime-local" className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">To</span>
          <input type="datetime-local" className="w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </label>
        <div className="flex items-end gap-2">
          {(['minute', 'hour'] as const).map((item) => (
            <button key={item} type="button" className={`badge ${bucket === item ? 'border-brand-600 bg-brand-600 text-white' : ''}`} onClick={() => setBucket(item)} aria-pressed={bucket === item}>
              {item}
            </button>
          ))}
        </div>
      </form>

      <article className="card h-72" role="img" aria-label={chartLabel}>
        {series.isLoading && <Skeleton className="h-full" />}
        {series.isError && <ErrorState message={errorMessage(series.error)} onRetry={() => { void series.refetch(); }} />}
        {series.data && series.data.points.length === 0 && <EmptyState title="No trend points" body="Widen the date range or pick a metric this device actually records." />}
        {series.data && series.data.points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.data.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.35} />
              <XAxis dataKey="bucket" tickFormatter={formatClock} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={48} />
              <Tooltip />
              <Line type="monotone" dataKey="avg" name="Average" stroke="#0891b2" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="max" name="Max" stroke="#f59e0b" dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </article>

      {list.isLoading && <Skeleton className="h-48" />}
      {list.isError && <ErrorState message={errorMessage(list.error)} onRetry={() => { void list.refetch(); }} />}
      {list.data && list.data.items.length === 0 && <EmptyState title="No rows match these filters" body="Clear the dates or choose another device." />}
      {list.data && list.data.items.length > 0 && (
        <article className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">{formatNumber(list.data.total)} documents</p>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-sm" onClick={exportCsv}>
              <Download size={16} aria-hidden />
              Export CSV
            </button>
          </div>
          <DataTable
            rows={list.data.items}
            rowKey={(row) => row._id ?? `${row.device_id}-${row.timestamp}`}
            columns={[
              { key: 'time', header: 'Time', render: (row) => formatWhen(row.timestamp) },
              { key: 'device', header: 'Device', render: (row) => <span className="font-mono">{row.device_id}</span> },
              { key: 'type', header: 'Type', render: (row) => row.device_type },
              { key: 'value', header: 'Reading', render: (row) => summaryValue(row) },
              { key: 'alert', header: 'Alert', render: (row) => row.alert ? <span className="badge-danger">{row.alert_reasons.map(reasonLabel).join(', ')}</span> : <span className="badge-ok">Clear</span> },
            ]}
          />
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" className="rounded-xl border border-surface-border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span className="text-ink-muted">Page {page} of {pages}</span>
            <button type="button" className="rounded-xl border border-surface-border px-3 py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </article>
      )}
    </div>
  );
}

function summaryValue(row: { water_tank?: { ultrasonic_depth_pct: number }; climate?: { temperature_c: number }; power_meter?: { power_w: number } }) {
  if (row.water_tank) return `${formatNumber(row.water_tank.ultrasonic_depth_pct, 1)}%`;
  if (row.climate) return `${formatNumber(row.climate.temperature_c, 1)}°C`;
  if (row.power_meter) return `${formatNumber(row.power_meter.power_w, 0)} W`;
  return '—';
}
