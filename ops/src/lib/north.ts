// North-star metrics (SHCWS-110, docs/strategy.md «Métricas norte»). Pure helpers: the
// comparison windows and how a change is read. No '@/' imports: root tests import this.

const TIME_ZONE = 'America/Mexico_City';
const DAY = 86_400_000;

function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/** The instant a calendar day (YYYY-MM-DD) starts in Mexico City. */
export function localDayStart(date: string): Date {
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  const firstGuess = utcMidnight - zoneOffsetMinutes(new Date(utcMidnight)) * 60_000;
  return new Date(utcMidnight - zoneOffsetMinutes(new Date(firstGuess)) * 60_000);
}

export function localToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export interface Periods {
  /** First instant of this calendar month in Mexico City. */
  curStart: Date;
  now: Date;
  /** First instant of the previous month. */
  prevStart: Date;
  /** As far into the previous month as we are into this one (never past its end). */
  prevEnd: Date;
  /** Today in Mexico City, YYYY-MM-DD. */
  today: string;
  /** The same calendar day last month, for «at this point last month». */
  prevToday: string;
  /** The last 28 days (four whole weeks), and the 28 before them. */
  weeksStart: Date;
  prevWeeksStart: Date;
}

/**
 * Month to date against the same stretch of the previous month: comparing eleven days of
 * November with thirty of October would always read as a drop.
 */
export function periods(now: Date = new Date()): Periods {
  const today = localToday(now);
  const [year, month] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const curStart = localDayStart(`${year}-${pad(month)}-01`);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevStart = localDayStart(`${prevYear}-${pad(prevMonth)}-01`);
  const elapsed = now.getTime() - curStart.getTime();
  const prevEnd = new Date(Math.min(prevStart.getTime() + elapsed, curStart.getTime()));
  return {
    curStart,
    now,
    prevStart,
    prevEnd,
    today,
    prevToday: localToday(new Date(prevEnd.getTime() - 1)),
    weeksStart: new Date(now.getTime() - 28 * DAY),
    prevWeeksStart: new Date(now.getTime() - 56 * DAY),
  };
}

export type DeltaTone = 'sage' | 'terracotta' | 'neutral';

/**
 * How a value moved against its comparison. `better` says which direction is good
 * (fewer hours to answer is good). No comparison, or nothing to compare with, is neutral.
 */
export function delta(
  current: number | null,
  previous: number | null,
  better: 'up' | 'down' = 'up',
): { change: number | null; tone: DeltaTone; arrow: '↑' | '↓' | '→' } {
  if (current === null || previous === null) return { change: null, tone: 'neutral', arrow: '→' };
  const change = current - previous;
  if (change === 0) return { change: 0, tone: 'neutral', arrow: '→' };
  const good = better === 'up' ? change > 0 : change < 0;
  return { change, tone: good ? 'sage' : 'terracotta', arrow: change > 0 ? '↑' : '↓' };
}

/** A duration in seconds, the way people say it: «45 min», «6 h», «2.5 días». */
export function fmtSpan(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`.replace('.', ',');
  return `${Math.round((hours / 24) * 10) / 10} días`.replace('.', ',');
}

/** A share 0..1 as a whole percentage, or null when there is nothing to divide. */
export function rate(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}
