import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getHistory, getHistorySeries } from '../api/telemetry';
import { DataTable } from '../components/DataTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { downloadCsv, errorMessage, formatClock, formatNumber, formatWhen } from '../lib/format';

const poll = { refetchInterval: 5000, refetchIntervalInBackground: false } as const;

export function HistoryPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<'minute' | 'hour'>('minute');
  const range = {
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  };

  const list = useQuery({
    queryKey: ['history', from, to, page],
    queryFn: () => getHistory({ ...range, page, limit: 20 }),
    ...poll,
  });
  const series = useQuery({
    queryKey: ['history-series', bucket, from, to],
    queryFn: () => getHistorySeries({
      bucket,
      from: range.from ?? new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      to: range.to,
    }),
    ...poll,
  });

  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.limit ?? 20)));

  function exportCsv() {
    const rows = (list.data?.items ?? []).map((item) => ({
      device_id: item.device_id,
      timestamp: item.timestamp,
      level_pct: item.telemetry.water_tank.ultrasonic_depth_pct,
      volume_litres: item.telemetry.water_tank.volume_litres,
      distance_cm: item.telemetry.water_tank.distance_cm,
      high_float: item.telemetry.float_switches.high_level_overflow,
      low_float: item.telemetry.float_switches.low_level_dry_run,
      inlet_valve: item.telemetry.actuator_states.inlet_valve,
      booster_pump: item.telemetry.actuator_states.booster_pump,
      rssi: item.metadata.signal_rssi,
      alert_reasons: item.alert_reasons.join('|'),
    }));
    downloadCsv('tank-history.csv', rows);
  }

  return (
    <div className="animate-fade-up space-y-4">
      <form className="card grid gap-3 md:grid-cols-3" onSubmit={(event) => event.preventDefault()}>
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
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-sm" disabled={!list.data?.items.length}>
            <Download size={16} aria-hidden />
            CSV
          </button>
        </div>
      </form>

      <article className="card h-72" role="img" aria-label="Water level history with 25 and 85 percent marks">
        {series.isLoading && <Skeleton className="h-full" />}
        {series.isError && <ErrorState message={errorMessage(series.error)} onRetry={() => { void series.refetch(); }} />}
        {series.data && series.data.points.length === 0 && <EmptyState title="No trend points" body="Widen the date range or wait for the simulator to publish." />}
        {series.data && series.data.points.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.data.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.35} />
              <XAxis dataKey="bucket" tickFormatter={formatClock} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <ReferenceLine y={85} stroke="#dc2626" strokeDasharray="4 4" />
              <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="avg" name="Level %" stroke="#0891b2" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </article>

      {list.isLoading && <Skeleton className="h-40" />}
      {list.isError && <ErrorState message={errorMessage(list.error)} onRetry={() => { void list.refetch(); }} />}
      {list.data && list.data.items.length === 0 && <EmptyState title="No stored readings" body="This range has no HOME_HUB_01 documents." />}
      {list.data && list.data.items.length > 0 && (
        <article className="card">
          <DataTable
            rows={list.data.items}
            rowKey={(row) => row._id ?? row.timestamp}
            columns={[
              { key: 'time', header: 'Time', render: (row) => formatWhen(row.timestamp) },
              { key: 'level', header: 'Level', render: (row) => `${formatNumber(row.telemetry.water_tank.ultrasonic_depth_pct, 1)}%` },
              { key: 'litres', header: 'Litres', render: (row) => formatNumber(row.telemetry.water_tank.volume_litres, 0) },
              { key: 'valve', header: 'Valve', render: (row) => row.telemetry.actuator_states.inlet_valve },
              { key: 'pump', header: 'Pump', render: (row) => row.telemetry.actuator_states.booster_pump },
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
