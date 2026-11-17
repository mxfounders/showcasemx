'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons/gota';
import { addDays, lastBookableDay } from '@/lib/ads/model';
import type { Dictionary } from '@/i18n/dictionary';

const monthOf = (day: string) => day.slice(0, 7);

function shiftMonth(month: string, by: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 7);
}

function daysInMonth(month: string) {
  const [year, index] = month.split('-').map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

/**
 * Picks a booking window on a month calendar that shows which days have no slot left
 * (SHCWS-77). First click sets the first day (keeping the current length when it fits),
 * the next one the last day. A range can never cross a full day: days past the first
 * full one are not selectable as its end. The server checks capacity again when paying.
 *
 * Keyboard: arrows move by day and week, Page Up/Down by month, Enter or Space picks.
 */
export function AvailabilityCalendar({
  today,
  lastStart,
  horizon,
  full,
  start,
  end,
  maxDays,
  onChange,
  dict,
  locale,
  weekStartsOn,
}: {
  /** First selectable day. */
  today: string;
  /** Last day a booking may start. */
  lastStart: string;
  /** Last day shown. */
  horizon: string;
  /** Days with no free slot; null while unknown. */
  full: readonly string[] | null;
  start: string;
  /** Inclusive last day. */
  end: string;
  maxDays: number;
  onChange: (start: string, end: string) => void;
  dict: Dictionary['ads']['form']['calendar'];
  /** BCP 47 tag for month and day names. */
  locale: string;
  weekStartsOn: 0 | 1;
}) {
  const [month, setMonth] = useState(monthOf(start));
  const [picking, setPicking] = useState<'start' | 'end'>('start');
  const [focusDay, setFocusDay] = useState(start);
  const moved = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const fullDays = useMemo(() => full ?? [], [full]);
  const length = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1);
  const lastEnd = picking === 'end' ? lastBookableDay(start, fullDays, maxDays) : null;

  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const monthName = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
  // 1 November 2026 is a Sunday: the reference week for the weekday header.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2026, 10, 1 + ((index + weekStartsOn) % 7))),
    ),
  );

  const isFull = (day: string) => fullDays.includes(day);
  const selectable = (day: string) => {
    if (day < today || day > horizon) return false;
    if (picking === 'end' && day >= start) return lastEnd !== null && day <= lastEnd;
    return day <= lastStart && !isFull(day);
  };

  function pick(day: string) {
    if (!selectable(day)) return;
    if (picking === 'end' && day >= start) {
      onChange(start, day);
      setPicking('start');
      return;
    }
    // A new first day keeps the length already chosen when the days after it are free.
    const last = lastBookableDay(day, fullDays, maxDays) ?? day;
    const wanted = addDays(day, length - 1);
    onChange(day, wanted < last ? wanted : last);
    setPicking('end');
  }

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    buttons.current.get(focusDay)?.focus();
  }, [focusDay, month]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: string | null = null;
    if (event.key in steps) next = addDays(focusDay, steps[event.key]);
    if (event.key === 'PageUp') next = addDays(focusDay, -daysInMonth(shiftMonth(month, -1)));
    if (event.key === 'PageDown') next = addDays(focusDay, daysInMonth(month));
    if (!next) return;
    event.preventDefault();
    if (next < today) next = today;
    if (next > horizon) next = horizon;
    moved.current = true;
    setFocusDay(next);
    setMonth(monthOf(next));
  }

  const firstWeekday = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;
  const days = Array.from(
    { length: daysInMonth(month) },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
  // The roving focus stays on a day of the month on screen.
  const tabDay = monthOf(focusDay) === month ? focusDay : (days.find(selectable) ?? days[0]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= monthOf(today)}
          aria-label={dict.previous}
          className="inline-flex size-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-30"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
        </button>
        <p className="text-sm font-medium text-stone-900 first-letter:uppercase" aria-live="polite">
          {monthName}
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= monthOf(horizon)}
          aria-label={dict.next}
          className="inline-flex size-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-30"
        >
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" aria-hidden="true">
        {weekdays.map((name, index) => (
          <span key={index} className="py-1 text-[11px] font-medium uppercase text-stone-400">
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" onKeyDown={onKeyDown}>
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {days.map(day => {
          const inRange = day >= start && day <= end;
          const edge = day === start || day === end;
          const dayFull = isFull(day);
          const enabled = selectable(day);
          const label = [
            longDate.format(new Date(`${day}T00:00:00Z`)),
            dayFull ? dict.fullDay : null,
            inRange ? dict.selectedDay : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              key={day}
              ref={element => {
                if (element) buttons.current.set(day, element);
                else buttons.current.delete(day);
              }}
              type="button"
              tabIndex={day === tabDay ? 0 : -1}
              aria-label={label}
              aria-pressed={inRange}
              aria-disabled={!enabled}
              onFocus={() => setFocusDay(day)}
              onClick={() => pick(day)}
              className={`flex h-10 items-center justify-center rounded-xl text-sm tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#365DC4] ${
                edge
                  ? 'bg-[#365DC4] font-semibold text-white'
                  : inRange
                    ? 'bg-[#E4EBFC] font-medium text-[#365DC4]'
                    : dayFull
                      ? 'cursor-not-allowed bg-stone-100 text-stone-400 line-through'
                      : enabled
                        ? 'text-stone-800 hover:bg-stone-100'
                        : 'cursor-not-allowed text-stone-300'
              } ${day === today && !inRange ? 'ring-1 ring-inset ring-stone-300' : ''}`}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded border border-stone-300 bg-white" />
          {dict.free}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded bg-stone-200" />
          {dict.full}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded bg-[#365DC4]" />
          {dict.selected}
        </span>
      </div>
      <p className="mt-3 text-xs text-stone-600" aria-live="polite">
        {full === null ? dict.loading : picking === 'start' ? dict.pickStart : dict.pickEnd}
      </p>
    </div>
  );
}
