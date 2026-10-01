import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAverages } from '../api/analytics';
import { DataTable } from '../components/DataTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { errorMessage, formatNumber } from '../lib/format';

export function AnalyticsPage() {
  const averages = useQuery({
    queryKey: ['averages'],
    queryFn: getAverages,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  if (averages.isLoading) return <Skeleton className="h-64" />;
  if (averages.isError) return <ErrorState message={errorMessage(averages.error)} onRetry={() => { void averages.refetch(); }} />;
  if (!averages.data || averages.data.devices.length === 0) {
    return <EmptyState title="Seed the database to see averages" body="node src/seed.js loads 10,000 synthetic documents split across the four devices." />;
  }

  return (
    <div className="animate-fade-up space-y-4">
      <article className="card">
        <h2 className="text-lg font-semibold">Averages per device</h2>
        <p className="mt-1 text-sm text-ink-muted">This aggregation uses readPreference secondaryPreferred, so it may trail the primary by a short replication delay.</p>
        <div className="mt-4">
          <DataTable
            rows={averages.data.devices}
            rowKey={(row) => row.device_id}
            columns={[
              { key: 'id', header: 'Device', render: (row) => <span className="font-mono">{row.device_id}</span> },
              { key: 'type', header: 'Type', render: (row) => row.device_type.replaceAll('_', ' ') },
              { key: 'n', header: 'Readings', render: (row) => formatNumber(row.readings) },
              { key: 'water', header: 'Avg level %', render: (row) => formatNumber(row.avg_water_level, 1) },
              { key: 'temp', header: 'Avg °C', render: (row) => formatNumber(row.avg_temp, 1) },
              { key: 'power', header: 'Avg W', render: (row) => formatNumber(row.avg_power, 0) },
              { key: 'alerts', header: 'Alerts', render: (row) => formatNumber(row.alert_count) },
            ]}
          />
        </div>
      </article>
      <article className="card h-72" role="img" aria-label="Alert document count per device">
        <h2 className="mb-2 text-lg font-semibold">Alerts per device</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={averages.data.devices}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.35} />
            <XAxis dataKey="device_id" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={40} />
            <Tooltip />
            <Bar dataKey="alert_count" name="Alert documents" fill="#dc2626" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
      <article className="card">
        <h2 className="text-lg font-semibold">Why MongoDB</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
          Tank, climate, and power readings share <span className="font-mono">iothings.sensor_readings</span> without a shared column list.
          Each document stores only the sensor object that device produced, plus the same identity, time, and alert fields.
          A replica set copies that collection for availability. It does not shard it, so extra nodes do not increase write capacity.
          Acknowledged inserts use majority write concern. If the primary stops, clients see automatic failover with no acknowledged-write loss and a brief write pause during election (about 10 seconds).
        </p>
      </article>
    </div>
  );
}
