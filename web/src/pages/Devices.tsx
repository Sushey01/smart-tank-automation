import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDevices } from '../api/devices';
import { getSeries } from '../api/telemetry';
import { DataTable } from '../components/DataTable';
import { JsonBlock } from '../components/JsonBlock';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { ageLabel, errorMessage, formatClock, formatNumber } from '../lib/format';
import type { DeviceSummary } from '../types';

const types = ['all', 'water_tank', 'climate', 'power_meter'] as const;

function metricFor(type: string) {
  if (type === 'water_tank') return 'ultrasonic_depth_pct';
  if (type === 'climate') return 'temperature_c';
  return 'power_w';
}

export function DevicesPage() {
  const [type, setType] = useState<(typeof types)[number]>('all');
  const [selected, setSelected] = useState<DeviceSummary | null>(null);
  const devices = useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const series = useQuery({
    queryKey: ['series', selected?.id, 'hour'],
    queryFn: () => getSeries({
      device_id: selected!.id,
      metric: metricFor(selected!.type),
      bucket: 'hour',
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }),
    enabled: Boolean(selected),
  });

  const rows = useMemo(
    () => (devices.data?.devices ?? []).filter((device) => type === 'all' || device.type === type),
    [devices.data, type],
  );

  if (devices.isLoading) {
    return <div className="space-y-3" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16" />)}</div>;
  }
  if (devices.isError) return <ErrorState message={errorMessage(devices.error)} onRetry={() => { void devices.refetch(); }} />;
  if ((devices.data?.devices ?? []).every((device) => !device.latest)) {
    return <EmptyState title="No device readings" body="Run npm run seed or npm run simulator, then refresh this page." />;
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by device type">
        {types.map((item) => (
          <button key={item} type="button" className={clsx('badge', type === item && 'border-brand-600 bg-brand-600 text-white')} onClick={() => setType(item)}>
            {item.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
      <div className="card hidden md:block">
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: 'id', header: 'Device', render: (row) => <span className="font-mono">{row.id}</span> },
            { key: 'type', header: 'Type', render: (row) => row.type.replaceAll('_', ' ') },
            { key: 'location', header: 'Location', render: (row) => row.location.replaceAll('_', ' ') },
            { key: 'seen', header: 'Last seen', render: (row) => ageLabel(row.last_seen) },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'open', header: '', render: (row) => <button type="button" className="text-sm font-medium text-brand-700 dark:text-brand-300" onClick={() => setSelected(row)}>Details</button> },
          ]}
        />
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <button key={row.id} type="button" className="card text-left" onClick={() => setSelected(row)}>
            <div className="flex items-center justify-between">
              <span className="font-mono">{row.id}</span>
              <StatusBadge status={row.status} />
            </div>
            <p className="mt-2 text-sm text-ink-muted">{row.location.replaceAll('_', ' ')} · {ageLabel(row.last_seen)}</p>
          </button>
        ))}
      </div>
      {rows.length === 0 && <EmptyState title="No devices in this filter" body="Choose another type to see the remaining devices." />}
      {selected && (
        <div className="fixed inset-0 z-30 flex justify-end bg-slate-950/40" role="presentation" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-lg overflow-auto bg-surface-bg p-5 shadow-glow" role="dialog" aria-modal="true" aria-label={`${selected.id} details`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-ink-muted">{selected.id}</p>
                <h2 className="text-xl font-semibold capitalize">{selected.location.replaceAll('_', ' ')}</h2>
              </div>
              <button type="button" className="rounded-xl border border-surface-border px-3 py-2 text-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              <span className="badge">RSSI {formatNumber(selected.latest?.metadata.signal_rssi, 0)} dBm</span>
              <span className="badge">Firmware {selected.latest?.metadata.firmware ?? '—'}</span>
            </div>
            <div className="card mt-4 h-56" role="img" aria-label={`Recent ${metricFor(selected.type)} for ${selected.id}`}>
              {series.isLoading && <Skeleton className="h-full" />}
              {series.isError && <p className="text-sm text-status-danger">{errorMessage(series.error)}</p>}
              {series.data && series.data.points.length === 0 && <p className="text-sm text-ink-muted">No points in the last day.</p>}
              {series.data && series.data.points.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series.data.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.35} />
                    <XAxis dataKey="bucket" tickFormatter={formatClock} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avg" stroke="#0891b2" fill="#0891b2" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4">
              <JsonBlock value={selected.latest} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
