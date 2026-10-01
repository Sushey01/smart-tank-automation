import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAlerts } from '../api/alerts';
import { getAlertsHourly } from '../api/analytics';
import { DataTable } from '../components/DataTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { errorMessage, formatClock, formatWhen, reasonLabel } from '../lib/format';
import { ALERT_REASONS } from '../types';

const colors: Record<string, string> = {
  TANK_OVERFLOW: '#dc2626',
  TANK_DRY_RUN: '#f59e0b',
  HIGH_TEMPERATURE: '#2563eb',
  POWER_SPIKE: '#0891b2',
};

export function AlertsPage() {
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const alerts = useQuery({
    queryKey: ['alerts', reason, page],
    queryFn: () => getAlerts({ page, limit: 20, reason: reason || undefined }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const hourly = useQuery({
    queryKey: ['alerts-hourly'],
    queryFn: getAlertsHourly,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const chart = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    for (const bucket of hourly.data?.buckets ?? []) {
      const row = map.get(bucket.hour) ?? { hour: bucket.hour, label: formatClock(bucket.hour) };
      row[bucket.reason] = bucket.count;
      map.set(bucket.hour, row);
    }
    return [...map.values()].sort((a, b) => String(a.hour).localeCompare(String(b.hour)));
  }, [hourly.data]);

  const pages = Math.max(1, Math.ceil((alerts.data?.total ?? 0) / (alerts.data?.limit ?? 20)));

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by alert reason">
        <button type="button" className={`badge ${reason === '' ? 'border-brand-600 bg-brand-600 text-white' : ''}`} onClick={() => { setReason(''); setPage(1); }}>All</button>
        {ALERT_REASONS.map((item) => (
          <button key={item} type="button" className={`badge ${reason === item ? 'border-brand-600 bg-brand-600 text-white' : ''}`} onClick={() => { setReason(item); setPage(1); }}>
            {reasonLabel(item)}
          </button>
        ))}
      </div>
      <article className="card h-72" role="img" aria-label="Alert counts by hour and reason">
        {hourly.isLoading && <Skeleton className="h-full" />}
        {hourly.isError && <ErrorState message={errorMessage(hourly.error)} onRetry={() => { void hourly.refetch(); }} />}
        {hourly.data && chart.length === 0 && <EmptyState title="No hourly alerts" body="Alerts appear here after overflow, dry-run, high temperature, or power spike documents are stored." />}
        {chart.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.35} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Legend />
              {ALERT_REASONS.map((item) => (
                <Bar key={item} dataKey={item} name={reasonLabel(item)} stackId="alerts" fill={colors[item]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>
      {alerts.isLoading && <Skeleton className="h-40" />}
      {alerts.isError && <ErrorState message={errorMessage(alerts.error)} onRetry={() => { void alerts.refetch(); }} />}
      {alerts.data && alerts.data.items.length === 0 && <EmptyState title="No alerts in this filter" body="Try another reason, or wait for the simulator to cross a threshold." />}
      {alerts.data && alerts.data.items.length > 0 && (
        <article className="card">
          <DataTable
            rows={alerts.data.items}
            rowKey={(row) => row._id ?? row.timestamp}
            columns={[
              { key: 'time', header: 'Time', render: (row) => formatWhen(row.timestamp) },
              { key: 'device', header: 'Device', render: (row) => <span className="font-mono">{row.device_id}</span> },
              { key: 'reason', header: 'Reason', render: (row) => <span className="badge-danger">{row.alert_reasons.map(reasonLabel).join(', ')}</span> },
              { key: 'location', header: 'Location', render: (row) => row.location.replaceAll('_', ' ') },
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
