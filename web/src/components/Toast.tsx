import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ToastContext } from './toast-context';

interface ToastItem {
  id: number;
  message: string;
  tone: 'ok' | 'danger';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: 'ok' | 'danger' = 'ok') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full max-w-md items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-card ${
              item.tone === 'danger'
                ? 'border-red-600/30 bg-surface-card text-status-danger'
                : 'border-surface-border bg-surface-card text-ink'
            }`}
          >
            <p>{item.message}</p>
            <button
              type="button"
              className="rounded-md p-1 text-ink-muted"
              aria-label="Dismiss notification"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
