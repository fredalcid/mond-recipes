/**
 * Small single-series column chart for admin analytics (server-rendered SVG).
 * One hue (olive, validated against the card surface), thin columns with a 2px gap,
 * 4px rounded data-ends, a hairline baseline, a hover tooltip on every column
 * (native SVG title) and a table view for screen readers and exact values.
 */
export function MiniBarChart({ title, points, total, unit = "" }: { title: string; points: { label: string; value: number }[]; total?: number; unit?: string }) {
  const W = 320;
  const H = 96;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = W / Math.max(points.length, 1);
  const bar = Math.max(2, Math.min(24, slot - 2));
  const sum = total ?? points.reduce((s, p) => s + p.value, 0);
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0] ?? { label: "", value: 0 });

  return (
    <figure className="flex flex-col gap-2 rounded-card border border-sand-strong bg-white p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="font-display text-2xl font-semibold text-forest-900 tabular-nums">
          {sum.toLocaleString("en-CA")}
          {unit}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 1}`} className="h-24 w-full overflow-visible" role="img" aria-label={`${title}: ${sum} in total${peak.value ? `, highest ${peak.value} on ${peak.label}` : ""}`}>
        {points.map((p, i) => {
          const h = p.value === 0 ? 0 : Math.max(3, (p.value / max) * (H - 4));
          const x = i * slot + (slot - bar) / 2;
          const y = H - h;
          const r = Math.min(4, bar / 2, h);
          return (
            <g key={p.label} className="group">
              <title>{`${p.label}: ${p.value.toLocaleString("en-CA")}`}</title>
              {/* Hit target taller and wider than the column. */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + bar - r} Q${x + bar},${y} ${x + bar},${y + r} V${H} Z`}
                  className="fill-olive-700 transition-opacity group-hover:opacity-70"
                />
              )}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} className="stroke-sand-strong" strokeWidth={1} />
      </svg>
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-ink-muted">Show as a table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-ink-muted">
              <th scope="col">Day</th>
              <th scope="col" className="text-right">
                {title}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td className="text-right tabular-nums">{p.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
