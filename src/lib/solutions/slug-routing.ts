import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { isSolutionSlug } from './slug';

// What the middleware does with /<locale>/soluciones/<segment> (SHCWS-101), decided
// before anything renders so the answers are real HTTP statuses: a page under a
// loading.tsx can only answer 200, even for notFound() or redirect() (CLAUDE.md §53).
//
// - a listing's UUID with a slug → 301 to the slug;
// - a slug the listing no longer uses → 301 to its current one;
// - a current slug → the page;
// - an unknown slug → 404;
// - a UUID without a slug, or any doubt (no database, a failed read) → the page, which
//   reads the database itself and still works by UUID.
//
// The middleware runs on every request, so it never queries per request: it keeps every
// published slug in memory (a few bytes per listing) and reloads them at most once a
// minute, or at most every 15 seconds while it meets slugs it does not know yet (a listing
// published a moment ago). Not faster: bots probing made-up paths would otherwise keep the
// database awake (CLAUDE.md §79), and a listing that 404s for a few seconds after its
// approval is the lesser cost. Only published listings are kept, so an unpublished slug
// is unknown like any other.

export type ListingRoute =
  { kind: 'page' } | { kind: 'redirect'; slug: string } | { kind: 'missing' };

export type SlugSnapshot = {
  /** Current slug → listing id. */
  current: ReadonlyMap<string, string>;
  /** Listing id → current slug. */
  byId: ReadonlyMap<string, string>;
  /** A slug the listing used before → its current slug. */
  retired: ReadonlyMap<string, string>;
};

export type SlugRow = { slug: string; id: string; retired: string | null };

const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildSlugSnapshot(rows: readonly SlugRow[]): SlugSnapshot {
  const current = new Map<string, string>();
  const byId = new Map<string, string>();
  const retired = new Map<string, string>();
  for (const row of rows) {
    if (row.retired) retired.set(row.retired, row.slug);
    else {
      current.set(row.slug, row.id);
      byId.set(row.id.toLowerCase(), row.slug);
    }
  }
  return { current, byId, retired };
}

/** The decision for one segment against a snapshot; pure, so it is tested directly. */
export function routeListing(segment: string, snapshot: SlugSnapshot): ListingRoute {
  if (uuidShape.test(segment)) {
    const slug = snapshot.byId.get(segment.toLowerCase());
    return slug ? { kind: 'redirect', slug } : { kind: 'page' };
  }
  if (!isSolutionSlug(segment)) return { kind: 'missing' };
  if (snapshot.current.has(segment)) return { kind: 'page' };
  const slug = snapshot.retired.get(segment);
  return slug ? { kind: 'redirect', slug } : { kind: 'missing' };
}

const freshFor = 60_000;
const missRetryAfter = 15_000;
let state: { snapshot: SlugSnapshot | null; at: number } = { snapshot: null, at: 0 };
let loading: Promise<SlugSnapshot | null> | null = null;

async function loadSnapshot(): Promise<SlugSnapshot | null> {
  const url = getDatabaseUrl();
  if (!url) return null;
  const sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  const rows = await sql`
    SELECT s.slug, s.id::text AS id, NULL::text AS retired FROM founder_solutions s
    WHERE s.slug IS NOT NULL AND s.published_data IS NOT NULL
    UNION ALL
    SELECT s.slug, s.id::text, h.slug FROM solution_slug_history h
    JOIN founder_solutions s ON s.id = h.solution_id
    WHERE s.slug IS NOT NULL AND s.published_data IS NOT NULL`;
  return buildSlugSnapshot(rows as SlugRow[]);
}

async function slugSnapshot(maxAge: number): Promise<SlugSnapshot | null> {
  if (Date.now() - state.at < maxAge) return state.snapshot;
  loading ??= loadSnapshot()
    .then(snapshot => {
      state = { snapshot: snapshot ?? state.snapshot, at: Date.now() };
      return state.snapshot;
    })
    .catch(() => {
      // Keep serving what was known; with nothing known every listing goes to its page.
      state = { snapshot: state.snapshot, at: Date.now() };
      return state.snapshot;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Where /soluciones/<segment> goes. Never throws: any doubt means «render the page». */
export async function listingRoute(segment: string): Promise<ListingRoute> {
  if (!uuidShape.test(segment) && !isSolutionSlug(segment)) return { kind: 'missing' };
  const known = await slugSnapshot(freshFor);
  if (!known) return { kind: 'page' };
  const route = routeListing(segment, known);
  const unsure = route.kind === 'missing' || (route.kind === 'page' && uuidShape.test(segment));
  if (!unsure) return route;
  // Possibly a listing published or renamed after the last reload: look again, rarely.
  const again = await slugSnapshot(missRetryAfter);
  return again ? routeListing(segment, again) : { kind: 'page' };
}

/** Replaces the in-memory slugs, as if just loaded. For tests. */
export function primeListingSlugs(rows: readonly SlugRow[]) {
  state = { snapshot: buildSlugSnapshot(rows), at: Date.now() };
}
