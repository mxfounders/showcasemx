'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';
import { fmtCompact, fmtDay, fmtNumber } from '@/lib/format';
import { niceTicks, rgb, type SeriesColor } from './scale';

export interface ChartSeries {
  key: string;
  label: string;
  color: SeriesColor;
}

type Row = { day: string } & Record<string, number | string>;

const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

/**
 * Daily time series on ONE shared axis (callers never mix units here). Lines are
 * 2px, the first series gets a 10% wash, the crosshair snaps to the nearest day
 * and lists every series. Keyboard: focus the plot, then ←/→/Home/End. A table
 * view carries the same numbers without hovering.
 */
export function AreaChart({
  series,
  data,
  height = 220,
  title,
  emptyLabel = 'Sin actividad en este periodo.',
}: {
  series: ChartSeries[];
  data: Row[];
  height?: number;
  title: string;
  emptyLabel?: string;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const descriptionId = useId();

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 640);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const value = (row: Row, key: string) => Number(row[key] ?? 0) || 0;
  const max = useMemo(
    () => Math.max(0, ...data.flatMap(row => series.map(s => value(row, s.key)))),
    [data, series],
  );
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const empty = max === 0;

  const paths = series.map(s => {
    const line = data
      .map((row, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(value(row, s.key)).toFixed(1)}`)
      .join(' ');
    const area = `${line} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
    return { ...s, line, area };
  });

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 90))));

  function pick(clientX: number) {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return;
    const relative = clientX - rect.left - PAD.left;
    const index = Math.round((relative / innerW) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, index)));
  }

  const activeRow = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 90), width - 90) : 0;

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {series.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-4" aria-label="Leyenda">
            {series.map(s => (
              <li key={s.key} className="flex items-center gap-2 text-[12.5px] text-muted">
                <span
                  aria-hidden
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: rgb(s.color) }}
                />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setShowTable(v => !v)}
          aria-pressed={showTable}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-muted transition hover:bg-surface-3 hover:text-fg"
        >
          <Table2 aria-hidden className="size-3.5" />
          {showTable ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-[320px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-[12.5px]">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface-2">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted">
                  Día
                </th>
                {series.map(s => (
                  <th
                    key={s.key}
                    scope="col"
                    className="px-3 py-2 text-right font-semibold text-muted"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map(row => (
                <tr key={row.day}>
                  <td className="px-3 py-1.5 text-fg-2">{fmtDay(row.day + 'T12:00:00Z')}</td>
                  {series.map(s => (
                    <td key={s.key} className="num px-3 py-1.5 text-right text-fg">
                      {fmtNumber(value(row, s.key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrapper}
          className="relative select-none outline-none"
          style={{ height }}
          tabIndex={0}
          role="group"
          aria-label={`${title}. Usa las flechas para recorrer los días.`}
          aria-describedby={descriptionId}
          onPointerMove={event => pick(event.clientX)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(a => a ?? data.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={event => {
            if (!data.length) return;
            if (event.key === 'ArrowLeft') setActive(a => Math.max(0, (a ?? data.length - 1) - 1));
            else if (event.key === 'ArrowRight')
              setActive(a => Math.min(data.length - 1, (a ?? 0) + 1));
            else if (event.key === 'Home') setActive(0);
            else if (event.key === 'End') setActive(data.length - 1);
            else return;
            event.preventDefault();
          }}
        >
          <svg width={width} height={height} aria-hidden className="block overflow-visible">
            {ticks.map(tick => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="rgb(var(--line))"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="num fill-[rgb(var(--muted))] text-[11px]"
                >
                  {fmtCompact(tick)}
                </text>
              </g>
            ))}
            {data.map((row, i) =>
              i % labelEvery === 0 || i === data.length - 1 ? (
                <text
                  key={row.day}
                  x={x(i)}
                  y={height - 6}
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                  className="fill-[rgb(var(--muted))] text-[11px]"
                >
                  {fmtDay(row.day + 'T12:00:00Z')}
                </text>
              ) : null,
            )}
            {!empty && paths[0] && <path d={paths[0].area} fill={rgb(paths[0].color, 0.1)} />}
            {!empty &&
              paths.map(p => (
                <path
                  key={p.key}
                  d={p.line}
                  fill="none"
                  stroke={rgb(p.color)}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            {activeRow && active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke="rgb(var(--line-strong))"
                  strokeWidth={1}
                />
                {series.map(s => (
                  <circle
                    key={s.key}
                    cx={x(active)}
                    cy={y(value(activeRow, s.key))}
                    r={4}
                    fill={rgb(s.color)}
                    stroke="rgb(var(--surface))"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}
          </svg>
          {empty && (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] text-muted">
              {emptyLabel}
            </p>
          )}
          {activeRow && active !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-[150px] -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 shadow-pop"
              style={{ left: tooltipLeft }}
            >
              <p className="text-[11.5px] font-medium text-muted">
                {fmtDay(activeRow.day + 'T12:00:00Z')}
              </p>
              <ul className="mt-1 space-y-0.5">
                {series.map(s => (
                  <li key={s.key} className="flex items-center gap-2 text-[12.5px]">
                    <span
                      aria-hidden
                      className="h-0.5 w-3 rounded-full"
                      style={{ background: rgb(s.color) }}
                    />
                    <span className="num font-semibold text-fg">
                      {fmtNumber(value(activeRow, s.key))}
                    </span>
                    <span className="text-muted">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p id={descriptionId} className="sr-only" aria-live="polite">
            {activeRow
              ? `${fmtDay(activeRow.day + 'T12:00:00Z')}: ${series.map(s => `${s.label} ${value(activeRow, s.key)}`).join(', ')}`
              : ''}
          </p>
        </div>
      )}
    </figure>
  );
}
