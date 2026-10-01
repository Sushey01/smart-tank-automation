import { useEffect } from 'react';

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="card w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-surface-border px-3 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
