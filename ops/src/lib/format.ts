// Shared by server and client components. Every date is rendered in Mexico City
// time explicitly, so a server running in UTC and a browser abroad agree.
export const TIME_ZONE = 'America/Mexico_City';

const dateTime = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: TIME_ZONE });
const shortDay = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});
const timeOnly = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short', timeZone: TIME_ZONE });
const integer = new Intl.NumberFormat('es-MX');
const compact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });
const relative = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto', style: 'short' });

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : '—';
}

export function fmtDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateOnly.format(date) : '—';
}

export function fmtDay(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? shortDay.format(date) : '—';
}

export function fmtTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeOnly.format(date) : '—';
}

/** "hace 5 min", "ayer", "en 3 h". `now` is injectable for tests and hydration. */
export function fmtRelative(
  value: string | Date | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return '—';
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'justo ahora';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 365) return relative.format(Math.round(seconds / (86400 * 30)), 'month');
  return relative.format(Math.round(seconds / (86400 * 365)), 'year');
}

/** Whole days elapsed since `value` (0 for today). */
export function daysSince(
  value: string | Date | null | undefined,
  now: number = Date.now(),
): number {
  const date = toDate(value);
  return date ? Math.max(0, Math.floor((now - date.getTime()) / 86400000)) : 0;
}

export function fmtNumber(value: number): string {
  return integer.format(value);
}

export function fmtCompact(value: number): string {
  return Math.abs(value) < 1000 ? integer.format(value) : compact.format(value);
}

export function fmtPercent(part: number, whole: number): string {
  return whole > 0 ? percent.format(part / whole) : '0 %';
}

export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
}

export function shortId(id: string, length = 8): string {
  return id.replace(/-/g, '').slice(0, length);
}

/** Integer minor units (cents) to a currency string. */
export function fmtMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
