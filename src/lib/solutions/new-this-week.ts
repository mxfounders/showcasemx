import { localDate } from '@/lib/recognition/model';

/**
 * «Nuevo esta semana» (SHCWS-125): shwcs's launch moment without a midnight race. Every
 * newly approved listing is highlighted for seven full days, ordered by its first
 * approval, never by votes. Older ones go to a weekly archive, Monday to Sunday in
 * Mexico City time (the same weeks as «Top de la semana», src/lib/recognition).
 */
export const newWindowDays = 7;
export const archiveWeeks = 12;

type Dated = { firstPublishedAt?: string | null };

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The Monday (YYYY-MM-DD) of the Mexico City week that contains `instant`. */
export function weekOf(instant: Date): string {
  const day = localDate(instant);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

function time(product: Dated) {
  const value = product.firstPublishedAt ? new Date(product.firstPublishedAt).getTime() : NaN;
  return Number.isNaN(value) ? null : value;
}

/**
 * Splits published listings into the current window (approved in the last seven days,
 * newest first) and the archive of earlier weeks (newest week first, at most
 * `archiveWeeks` of them). A listing without a known first approval appears in neither.
 */
export function splitNewListings<T extends Dated>(products: readonly T[], now = new Date()) {
  const windowStart = now.getTime() - newWindowDays * 86_400_000;
  const dated = products
    .map(product => ({ product, at: time(product) }))
    .filter(
      (item): item is { product: T; at: number } => item.at !== null && item.at <= now.getTime(),
    )
    .sort((a, b) => b.at - a.at);
  const current = dated.filter(item => item.at >= windowStart).map(item => item.product);
  const oldest = addDays(weekOf(now), -7 * archiveWeeks);
  const weeks = new Map<string, T[]>();
  for (const item of dated) {
    if (item.at >= windowStart) continue;
    const start = weekOf(new Date(item.at));
    if (start < oldest) continue;
    weeks.set(start, [...(weeks.get(start) ?? []), item.product]);
  }
  return {
    current,
    archive: [...weeks.entries()].map(([start, items]) => ({
      start,
      end: addDays(start, 6),
      items,
    })),
  };
}
