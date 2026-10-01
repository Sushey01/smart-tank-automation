export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className="text-brand-600" aria-hidden>{icon}</span>
      </div>
      <p className="kpi-value mt-3">{value}</p>
      <p className="mt-1 text-xs text-ink-faint">{hint}</p>
    </article>
  );
}
