import { rgb, type SeriesColor } from './scale';

/** Tiny trend line: de-emphasised stroke, the latest point marked in the accent. */
export function Sparkline({
  values,
  color = 'series-1',
  width = 96,
  height = 28,
  label,
}: {
  values: number[];
  color?: SeriesColor;
  width?: number;
  height?: number;
  label?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pad = 3;
  const points = values.map(
    (value, i) => [i * step, height - pad - (value / max) * (height - pad * 2)] as const,
  );
  const path = points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`-2 0 ${width + 4} ${height}`}
      role="img"
      aria-label={label ?? `Tendencia: último valor ${values[values.length - 1]}`}
      className="overflow-visible"
    >
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={rgb(color, 0.08)} />
      <path
        d={path}
        fill="none"
        stroke={rgb(color, 0.55)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={3}
        fill={rgb(color)}
        stroke="rgb(var(--surface))"
        strokeWidth={1.5}
      />
    </svg>
  );
}
