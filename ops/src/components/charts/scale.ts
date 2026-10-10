/** Rounds a maximum up to a clean axis top and returns evenly spaced ticks. */
export function niceTicks(max: number, count = 4, integer = true): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  let step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  // Counts never have half-events on the axis.
  if (integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step)
    ticks.push(Math.round(value * 1e6) / 1e6);
  return ticks;
}

export const SERIES_VAR = {
  'series-1': 'var(--series-1)',
  'series-2': 'var(--series-2)',
  'series-3': 'var(--series-3)',
} as const;

export type SeriesColor = keyof typeof SERIES_VAR;

export function rgb(color: SeriesColor, alpha = 1) {
  return `rgb(${SERIES_VAR[color]} / ${alpha})`;
}
