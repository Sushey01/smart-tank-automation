import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAlerts } from '../api/telemetry';
import { DataTable } from '../components/DataTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { errorMessage, formatNumber, formatWhen, reasonLabel } from '../lib/format';
import { ALERT_REASONS } from '../types';

export function AlertsPage() {
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const alerts = useQuery({
    queryKey: ['alerts', reason, page],
    queryFn: () => getAlerts({ page, limit: 20, reason: reason || undefined }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

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
      {alerts.isLoading && <Skeleton className="h-40" />}
      {alerts.isError && <ErrorState message={errorMessage(alerts.error)} onRetry={() => { void alerts.refetch(); }} />}
      {alerts.data && alerts.data.items.length === 0 && (
        <EmptyState title="No overflow or dry-run alerts" body="The list fills when the high float is at or above 85%, or the low float is at or below 25%." />
      )}
      {alerts.data && alerts.data.items.length > 0 && (
        <article className="card">
          <DataTable
            rows={alerts.data.items}
            rowKey={(row) => row._id ?? row.timestamp}
            columns={[
              { key: 'time', header: 'Time', render: (row) => formatWhen(row.timestamp) },
              { key: 'reason', header: 'Reason', render: (row) => <span className="badge-danger">{row.alert_reasons.map(reasonLabel).join(', ')}</span> },
              { key: 'level', header: 'Level', render: (row) => `${formatNumber(row.telemetry.water_tank.ultrasonic_depth_pct, 1)}%` },
              { key: 'litres', header: 'Litres', render: (row) => formatNumber(row.telemetry.water_tank.volume_litres, 0) },
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
