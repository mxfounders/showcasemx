import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { isHandleShape } from './handle-shape';

// What the middleware does with /<locale>/c/<segment> (SHCWS-120), decided before
// anything renders so the answers are real HTTP statuses (the marketing layout has a
// loading.tsx, under which a page can only answer 200, CLAUDE.md §53):
//
// - the current handle of a visible profile → the page;
// - the same in other letter case → 301 to the lowercase handle;
// - a handle the profile used before → 301 to its current one;
// - anything else (unknown, never turned on, off, hidden by ops, retired by ops) → 404;
// - any doubt (no database, a failed read) → the page, which reads the database itself.
//
// Same cache as listing slugs (src/lib/solutions/slug-routing.ts): every visible handle in
// memory, reloaded at most once a minute, or every 15 seconds while it meets handles it
// does not know (a profile turned on a moment ago). Bots probing made-up paths never reach
// the database per request (CLAUDE.md §79). A profile switched off can keep answering its
// page for up to a minute; the page then reads the database and shows «not found».

export type ProfileRoute =
  { kind: 'page' } | { kind: 'redirect'; handle: string } | { kind: 'missing' };

export type HandleSnapshot = {
  current: ReadonlySet<string>;
  /** A handle used before → the current one. */
  retired: ReadonlyMap<string, string>;
};

export type HandleRow = { handle: string; retired: string | null };

export function buildHandleSnapshot(rows: readonly HandleRow[]): HandleSnapshot {
  const current = new Set<string>();
  const retired = new Map<string, string>();
  for (const row of rows) {
    if (row.retired) retired.set(row.retired, row.handle);
    else current.add(row.handle);
  }
  return { current, retired };
}

/** The decision for one segment against a snapshot; pure, so it is tested directly. */
export function routeProfile(segment: string, snapshot: HandleSnapshot): ProfileRoute {
  const handle = segment.toLowerCase();
  if (!isHandleShape(handle)) return { kind: 'missing' };
  if (snapshot.current.has(handle))
    return handle === segment ? { kind: 'page' } : { kind: 'redirect', handle };
  const now = snapshot.retired.get(handle);
  return now ? { kind: 'redirect', handle: now } : { kind: 'missing' };
}

const freshFor = 60_000;
const missRetryAfter = 15_000;
let state: { snapshot: HandleSnapshot | null; at: number } = { snapshot: null, at: 0 };
let loading: Promise<HandleSnapshot | null> | null = null;

async function loadSnapshot(): Promise<HandleSnapshot | null> {
  const url = getDatabaseUrl();
  if (!url) return null;
  const sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  const rows = await sql`
    SELECT p.handle, NULL::text AS retired FROM public_profiles p WHERE profile_visible(p.account_id)
    UNION ALL
    SELECT p.handle, h.handle FROM profile_handle_history h
    JOIN public_profiles p ON p.account_id = h.account_id WHERE profile_visible(p.account_id)`;
  return buildHandleSnapshot(rows as HandleRow[]);
}

async function handleSnapshot(maxAge: number): Promise<HandleSnapshot | null> {
  if (Date.now() - state.at < maxAge) return state.snapshot;
  loading ??= loadSnapshot()
    .then(snapshot => {
      state = { snapshot: snapshot ?? state.snapshot, at: Date.now() };
      return state.snapshot;
    })
    .catch(() => {
      state = { snapshot: state.snapshot, at: Date.now() };
      return state.snapshot;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Where /c/<segment> goes. Never throws: any doubt means «render the page». */
export async function profileRoute(segment: string): Promise<ProfileRoute> {
  if (!isHandleShape(segment.toLowerCase())) return { kind: 'missing' };
  const known = await handleSnapshot(freshFor);
  if (!known) return { kind: 'page' };
  const route = routeProfile(segment, known);
  if (route.kind !== 'missing') return route;
  // Possibly a profile turned on or renamed after the last reload: look again, rarely.
  const again = await handleSnapshot(missRetryAfter);
  return again ? routeProfile(segment, again) : { kind: 'page' };
}

/** Replaces the in-memory handles, as if just loaded. For tests. */
export function primeProfileHandles(rows: readonly HandleRow[]) {
  state = { snapshot: buildHandleSnapshot(rows), at: Date.now() };
}
