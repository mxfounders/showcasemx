export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export function pageParam(params: SearchParams, max = 10000): number {
  const parsed = Number.parseInt(param(params, 'page'), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(1, parsed)) : 1;
}

export function choice<T extends string>(
  params: SearchParams,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = param(params, name);
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Builds a link to `path` keeping the current filters, applying `patch`
 * (null/'' removes a key). Changing any filter resets pagination unless the
 * patch sets `page` itself.
 */
export function hrefWith(
  path: string,
  current: SearchParams,
  patch: Record<string, string | number | null | undefined>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) next.set(key, single);
  }
  if (!('page' in patch)) next.delete('page');
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (key === 'page' && Number(value) <= 1)
    )
      next.delete(key);
    else next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}
