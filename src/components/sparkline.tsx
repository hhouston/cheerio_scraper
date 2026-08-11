import type { GeneratedSeriesPoint } from '@/lib/registry';

/** Dependency-free inline SVG series chart. */
export function Sparkline({ label, points }: { label: string; points: GeneratedSeriesPoint[] }) {
  if (points.length < 2) return null;
  const w = 560;
  const h = 120;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  return (
    <figure className="border-line rounded-xl border bg-panel p-4">
      <figcaption className="mb-2 font-mono text-xs uppercase tracking-wider text-dim">
        {label}
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={label}>
        <path d={d} fill="none" stroke="var(--color-signal)" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3" fill="var(--color-signal)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-dim">
        <span>
          {points[0]?.date} · {points[0]?.value.toFixed(2)}
        </span>
        <span>
          {points[points.length - 1]?.date} · {points[points.length - 1]?.value.toFixed(2)}
        </span>
      </div>
    </figure>
  );
}
