import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../api/health';
import { MemberBadge } from '../components/StatusBadge';
import { ErrorState, Skeleton } from '../components/States';
import { errorMessage, formatWhen } from '../lib/format';

interface FailoverEvent {
  at: string;
  text: string;
}

export function ClusterPage() {
  const [banner, setBanner] = useState<string | null>(null);
  const [events, setEvents] = useState<FailoverEvent[]>([]);
  const previous = useRef<string | null | undefined>(undefined);
  const health = useQuery({
    queryKey: ['health', 'cluster'],
    queryFn: getHealth,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!health.data) return;
    const primary = health.data.primary;
    if (previous.current !== undefined && previous.current !== primary && primary) {
      const at = new Date().toLocaleTimeString('en-GB');
      setBanner(`Failover detected: new primary ${primary} at ${at}`);
      setEvents((current) => [{ at, text: `${previous.current ?? 'none'} → ${primary}` }, ...current].slice(0, 12));
    }
    previous.current = primary;
  }, [health.data]);

  if (health.isLoading) {
    return <div className="grid gap-4 md:grid-cols-3" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40" />)}</div>;
  }
  if (health.isError) return <ErrorState message={errorMessage(health.error)} onRetry={() => { void health.refetch(); }} />;
  if (!health.data) return <ErrorState message="Replica set status unavailable" onRetry={() => { void health.refetch(); }} />;

  const members = health.data.members;

  return (
    <div className="animate-fade-up space-y-4">
      {banner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm" role="status">
          <p>{banner}</p>
          <button type="button" className="font-medium" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}
      <p className="text-sm text-ink-muted">
        Set <span className="font-mono">{health.data.set}</span> · checked {formatWhen(health.data.checkedAt)} · polling every 2 seconds
      </p>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Replica set members">
        {members.map((member) => (
          <article key={member.name} className={`card ${member.isPrimary ? 'shadow-glow' : ''}`}>
            <p className="font-mono text-sm">{member.name}</p>
            <div className="mt-3">
              <MemberBadge state={member.state} />
            </div>
            <p className="mt-3 text-sm text-ink-muted">Health {member.health === 1 ? 'up' : 'down'} ({member.health})</p>
          </article>
        ))}
      </section>
      <article className="card" role="img" aria-label="Replica set topology with the current primary highlighted">
        <h2 className="text-lg font-semibold">Topology</h2>
        <svg viewBox="0 0 640 220" className="mt-2 h-52 w-full">
          <line x1="320" y1="40" x2="120" y2="160" stroke="#0891b2" strokeWidth="2" />
          <line x1="320" y1="40" x2="320" y2="160" stroke="#0891b2" strokeWidth="2" />
          <line x1="320" y1="40" x2="520" y2="160" stroke="#0891b2" strokeWidth="2" />
          <circle cx="320" cy="36" r="22" fill="#0891b2" />
          <text x="320" y="40" textAnchor="middle" fill="white" fontSize="11">{health.data.set}</text>
          {members.slice(0, 3).map((member, index) => {
            const x = [120, 320, 520][index];
            return (
              <g key={member.name}>
                <rect x={x - 70} y="150" width="140" height="48" rx="14" fill={member.isPrimary ? '#0891b2' : '#e7eef2'} stroke="#0e7490" />
                <text x={x} y="170" textAnchor="middle" fontSize="11" fill={member.isPrimary ? 'white' : '#0f172a'}>{member.name}</text>
                <text x={x} y="186" textAnchor="middle" fontSize="10" fill={member.isPrimary ? 'white' : '#334155'}>{member.state}</text>
              </g>
            );
          })}
        </svg>
      </article>
      <article className="card">
        <h2 className="text-lg font-semibold">Failover log</h2>
        {events.length === 0 && <p className="mt-2 text-sm text-ink-muted">No primary change since this page opened. Stop the current primary process to record one.</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {events.map((event) => (
            <li key={`${event.at}-${event.text}`} className="font-mono text-ink-muted">{event.at} · {event.text}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
