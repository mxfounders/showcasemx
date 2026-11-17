import { normalizeText } from '@/lib/search/normalize';

/**
 * What gets stored of a search (SHCWS-107): the normalized words, at most 80 characters,
 * and nothing that looks personal. An email, a phone number, a URL or a long number is
 * dropped whole, not trimmed: a fragment could still identify someone.
 */
export const demandSurfaces = ['search', 'home', 'category'] as const;
export type DemandSurface = (typeof demandSurfaces)[number];

export function demandQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length < 2 || value.length > 200) return null;
  if (/@|https?:|www\.|\.(com|mx|net|org|io|app)\b/i.test(value)) return null;
  if ((value.match(/\d/g) ?? []).length >= 6) return null;
  const words = normalizeText(value).split(' ').filter(Boolean);
  if (!words.length) return null;
  const query = words.join(' ').slice(0, 80).trim();
  return query.length >= 2 ? query : null;
}
