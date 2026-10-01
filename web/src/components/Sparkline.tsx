import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export function Sparkline({
  points,
  label,
}: {
  points: { bucket: string; avg: number | null }[];
  label: string;
}) {
  const data = points.filter((point) => point.avg !== null);
  if (data.length === 0) {
    return <p className="text-xs text-ink-faint">No trend points in the last hour.</p>;
  }
  return (
    <div className="h-16" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="avg" stroke="#0891b2" fill="#0891b2" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
