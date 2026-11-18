import type { OfferFacts } from '@/lib/solutions/offer';
import { validProjectKey, type BuyerProject } from './model';
import type { ProviderFacts } from '@/lib/solutions/provider';
import type { ReviewSummary } from '@/lib/reviews/server';
import type { ResponseSignal } from '@/lib/solutions/response-model';

/**
 * The comparator's rules (SHCWS-53), pure so they can be tested without a database.
 *
 * - A comparison is two or three listings, each named once, by the same keys the library
 *   saves (`solution:<uuid>`, `catalog:cord`); a slug or a made-up key never resolves.
 * - It only ever shows published data: a key that does not resolve to a published listing
 *   makes the whole selection invalid (temporary comparison) or shows «no disponible»
 *   (a list keeps what the buyer saved, §8).
 * - Nothing is scored or recommended. A cell says what the project declared, «no lo
 *   declara» when it answered the question differently, or that it never answered.
 * - A temporary comparison persists nothing: it lives in the URL.
 */
export const minCompared = 2;
export const maxCompared = 3;

/** Raw `?project=` values as 2–3 distinct valid keys, in the order given; else null. */
export function selectionKeys(value: unknown): string[] | null {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  if (list.length < minCompared || list.length > maxCompared) return null;
  if (list.some(key => !validProjectKey(key))) return null;
  const keys = Array.from(new Set(list as string[]));
  return keys.length === list.length ? keys : null;
}

/**
 * A temporary comparison: the selection, only if every key is a listing that is
 * published right now (`published` comes from the server, never from the browser).
 */
export function publishedSelection(value: unknown, published: readonly string[]) {
  const keys = selectionKeys(value);
  return keys && keys.every(key => published.includes(key)) ? keys : null;
}

/** The URL of a temporary comparison, for the tray and the «save as list» return path. */
export function comparisonHref(keys: readonly string[]) {
  return `/comparar?${new URLSearchParams(keys.map(key => ['project', key]))}`;
}

/** A listing as the comparator reads it: the library's public fields plus decision data. */
export type ComparedProject = BuyerProject &
  ProviderFacts &
  OfferFacts & {
    capabilities?: string[];
    integrationKeys?: string[];
    setupTime?: string;
    compliance?: string[];
    /** Clients named in the project's declared cases (never confirmed by them). */
    caseClients?: string[];
    /** «Verificado por shwcs» for the host the listing points at today. */
    verified?: boolean;
    /** Current TXT proof of the listing's domain, or null. */
    verifiedDomain?: string | null;
    reviews?: ReviewSummary | null;
    /** How the founder answers requests; null below the minimum (SHCWS-52). */
    response?: ResponseSignal | null;
  };

/**
 * One row per value any of the compared listings declared (capabilities, integrations),
 * in the order they first appear. Each cell is:
 * - `yes`: the listing declared it;
 * - `no`: the listing answered the question and this value is not in its answer;
 * - `none`: for integrations only, it declared that it connects to nothing ([]);
 * - `unknown`: the listing never answered the question.
 */
export type MatrixCell = 'yes' | 'no' | 'none' | 'unknown';
export function declaredMatrix(
  lists: readonly (readonly string[] | undefined)[],
): { value: string; cells: MatrixCell[] }[] {
  const values: string[] = [];
  for (const list of lists)
    for (const value of list ?? []) if (!values.includes(value)) values.push(value);
  return values.map(value => ({
    value,
    cells: lists.map(list =>
      list === undefined ? 'unknown' : list.includes(value) ? 'yes' : list.length ? 'no' : 'none',
    ),
  }));
}
