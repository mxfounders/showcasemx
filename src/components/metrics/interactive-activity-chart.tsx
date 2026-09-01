"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";

type ActivityDay = { day: string; views: number; clicks: number };
type Point = { x: number; y: number };

const WIDTH = 760;
const HEIGHT = 260;
const LEFT = 34;
const RIGHT = 24;
const TOP = 24;
const BOTTOM = 36;
const number = new Intl.NumberFormat("es-MX");

function smoothPath(points: Point[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const controlOne = { x: current.x + (next.x - previous.x) / 6, y: Math.min(HEIGHT - BOTTOM, Math.max(TOP, current.y + (next.y - previous.y) / 6)) };
    const controlTwo = { x: next.x - (after.x - current.x) / 6, y: Math.min(HEIGHT - BOTTOM, Math.max(TOP, next.y - (after.y - current.y) / 6)) };
    path += ` C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function shortDate(value?: string) {
  return value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })
    : "";
}

function longDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function InteractiveActivityChart({ days }: { days: ActivityDay[] }) {
  const gradientId = useId().replaceAll(":", "");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const maximum = Math.max(1, ...days.flatMap((day) => [day.views, day.clicks]));
    const plotWidth = WIDTH - LEFT - RIGHT;
    const plotHeight = HEIGHT - TOP - BOTTOM;
    const point = (value: number, index: number): Point => ({
      x: LEFT + plotWidth * (index / Math.max(1, days.length - 1)),
      y: TOP + plotHeight * (1 - value / maximum),
    });
    const views = days.map((day, index) => point(day.views, index));
    const clicks = days.map((day, index) => point(day.clicks, index));
    const viewsPath = smoothPath(views);
    const baseline = HEIGHT - BOTTOM;
    const areaPath = views.length
      ? `${viewsPath} L ${views.at(-1)?.x ?? LEFT} ${baseline} L ${views[0].x} ${baseline} Z`
      : "";
    return { maximum, views, clicks, viewsPath, clicksPath: smoothPath(clicks), areaPath };
  }, [days]);

  const active = activeIndex === null ? null : days[activeIndex];
  const activeViews = activeIndex === null ? null : chart.views[activeIndex];
  const activeClicks = activeIndex === null ? null : chart.clicks[activeIndex];
  const middle = days[Math.floor(days.length / 2)];

  function move(event: PointerEvent<SVGSVGElement>) {
    if (!days.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.min(1, Math.max(0, (x - LEFT) / (WIDTH - LEFT - RIGHT)));
    setActiveIndex(Math.round(ratio * (days.length - 1)));
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!days.length || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setActiveIndex(0);
    if (event.key === "End") return setActiveIndex(days.length - 1);
    const current = activeIndex ?? days.length - 1;
    setActiveIndex(Math.min(days.length - 1, Math.max(0, current + (event.key === "ArrowRight" ? 1 : -1))));
  }

  const tooltipLeft = activeViews ? `${(activeViews.x / WIDTH) * 100}%` : "0%";
  const tooltipSide = activeIndex !== null && activeIndex > days.length * 0.68 ? "-translate-x-full -ml-3" : "ml-3";

  return (
    <div
      className="relative overflow-x-auto pb-2 focus-visible:outline-none"
      tabIndex={0}
      onFocus={() => setActiveIndex((index) => index ?? Math.max(0, days.length - 1))}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={keyDown}
      aria-label="Actividad diaria. Usa las flechas izquierda y derecha para explorar cada fecha."
    >
      <div className="relative min-w-[680px]">
        <svg
          role="img"
          aria-labelledby={`${gradientId}-title ${gradientId}-description`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-pan-y"
          onPointerMove={move}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <title id={`${gradientId}-title`}>Actividad diaria de los últimos 30 días</title>
          <desc id={`${gradientId}-description`}>Curva azul para visitas y curva verde segmentada para clics al sitio oficial.</desc>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#365DC4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#365DC4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((position) => (
            <line key={position} x1={LEFT} x2={WIDTH - RIGHT} y1={TOP + (HEIGHT - TOP - BOTTOM) * position} y2={TOP + (HEIGHT - TOP - BOTTOM) * position} stroke="#e7e5e4" strokeWidth="1" />
          ))}
          <path d={chart.areaPath} fill={`url(#${gradientId})`} />
          <path d={chart.viewsPath} fill="none" stroke="#365DC4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={chart.clicksPath} fill="none" stroke="#416B50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 7" vectorEffect="non-scaling-stroke" />
          {activeViews && activeClicks && (
            <g aria-hidden="true">
              <line x1={activeViews.x} x2={activeViews.x} y1={TOP} y2={HEIGHT - BOTTOM} stroke="#a8a29e" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={activeViews.x} cy={activeViews.y} r="5" fill="white" stroke="#365DC4" strokeWidth="3" />
              <circle cx={activeClicks.x} cy={activeClicks.y} r="5" fill="white" stroke="#416B50" strokeWidth="3" />
            </g>
          )}
          <text x={LEFT} y={17} fill="#a8a29e" fontSize="11">máx. {number.format(chart.maximum)}</text>
          <text x={LEFT} y={HEIGHT - 5} fill="#a8a29e" fontSize="11">{shortDate(days[0]?.day)}</text>
          <text x={WIDTH / 2} y={HEIGHT - 5} fill="#a8a29e" fontSize="11" textAnchor="middle">{shortDate(middle?.day)}</text>
          <text x={WIDTH - RIGHT} y={HEIGHT - 5} fill="#a8a29e" fontSize="11" textAnchor="end">{shortDate(days.at(-1)?.day)}</text>
        </svg>
        {active && (
          <div
            className={`pointer-events-none absolute top-8 z-10 min-w-40 rounded-2xl border border-stone-200/80 bg-white/95 p-3.5 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.3)] backdrop-blur ${tooltipSide}`}
            style={{ left: tooltipLeft }}
          >
            <p className="text-[11px] capitalize text-stone-400">{longDate(active.day)}</p>
            <div className="mt-3 grid grid-cols-2 gap-5">
              <div><span className="flex items-center gap-1.5 text-[11px] text-stone-500"><span className="size-1.5 rounded-full bg-[#365DC4]" />Vistas</span><strong className="mt-1 block text-lg tabular-nums">{number.format(active.views)}</strong></div>
              <div><span className="flex items-center gap-1.5 text-[11px] text-stone-500"><span className="size-1.5 rounded-full bg-[#416B50]" />Clics</span><strong className="mt-1 block text-lg tabular-nums">{number.format(active.clicks)}</strong></div>
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{active ? `${longDate(active.day)}: ${active.views} visitas y ${active.clicks} clics.` : ""}</p>
    </div>
  );
}
