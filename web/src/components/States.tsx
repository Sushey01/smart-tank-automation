import { AlertTriangle, Inbox, RefreshCw, ServerCrash } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-muted ${className}`} aria-hidden />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card flex flex-col items-start gap-2">
      <Inbox className="text-brand-600" aria-hidden />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-prose text-sm text-ink-muted">{body}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card flex flex-col items-start gap-3" role="alert">
      <AlertTriangle className="text-status-danger" aria-hidden />
      <h2 className="text-base font-semibold">Could not load this view</h2>
      <p className="text-sm text-ink-muted">{message}</p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white">
        <RefreshCw size={16} aria-hidden />
        Retry
      </button>
    </div>
  );
}

export function BackendDown() {
  return (
    <div className="card mx-auto max-w-xl animate-fade-up" role="alert">
      <ServerCrash className="text-status-danger" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">Backend unreachable</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The dashboard cannot reach the API on port 3000. Start MongoDB and the ingestion service, then refresh.
      </p>
      <pre className="mt-4 overflow-auto rounded-xl bg-surface-muted p-3 font-mono text-xs text-ink">npm run server</pre>
    </div>
  );
}
