/**
 * «Verificado por shwcs» and recognitions (docs/recognition.md, db/solution-recognition.sql).
 * Pure rules shared by the product, the weekly job and the tests. ops/ keeps its own copy
 * of the check list (ops/src/lib/recognition.ts) because the two apps build separately.
 */

/** What the team confirms before verifying. The first three are always required. */
export const verificationChecks = ['site', 'product', 'team', 'registries'] as const;
export type VerificationCheck = (typeof verificationChecks)[number];
export const requiredVerificationChecks: readonly VerificationCheck[] = ['site', 'product', 'team'];

/**
 * The host a verification is tied to: lowercase hostname without a leading "www.".
 * Comparing this on every read means a listing that moves its website to another host
 * loses the check automatically instead of carrying it to a domain nobody reviewed.
 */
export function recognitionHost(website: unknown): string | null {
  if (typeof website !== 'string' || !website) return null;
  try {
    const url = new URL(website);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9.-]{3,253}$/.test(host) && host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

// ── Weekly recognition ────────────────────────────────────────────────────────────

/** Weeks run Monday 00:00 to Sunday 24:00 in Mexico City time, the catalogue's home. */
export const recognitionTimeZone = 'America/Mexico_City';
/** Distinct verified accounts (not the owner) that must have acted on a project that week. */
export const weeklyMinAccounts = 3;
/** Projects that must compete in a ranking before anyone is recognised in it. */
export const weeklyMinCompetitors = 3;
/** Signal weights, the same order as the catalogue: a comment costs more than a like. */
export const weeklyWeights = { like: 1, save: 2, comment: 3 } as const;

/**
 * How many places a ranking awards: one for every two projects competing, at most
 * three, none below the minimum. With three or four competitors only #1 exists, so a
 * place is never handed out just for showing up.
 */
export function weeklyPlaces(competitors: number) {
  return competitors < weeklyMinCompetitors ? 0 : Math.min(3, Math.floor(competitors / 2));
}

export type WeeklyRow = {
  solutionId: string;
  categories: readonly string[];
  /** likes×1 + saves×2 + comments×3 + Σ(review stars × review weight) within the week. */
  score: number;
  /** Distinct verified accounts behind that score. */
  accounts: number;
  publishedAt: string;
};
export type WeeklyPlace = { solutionId: string; scope: string; rank: number; score: number };

/** Places for the general ranking ('all') and each category, ties broken deterministically. */
export function rankWeekly(rows: readonly WeeklyRow[], categories: readonly string[]) {
  const eligible = rows
    .filter(row => row.score > 0 && row.accounts >= weeklyMinAccounts)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.accounts - a.accounts ||
        a.publishedAt.localeCompare(b.publishedAt) ||
        a.solutionId.localeCompare(b.solutionId),
    );
  const places: WeeklyPlace[] = [];
  for (const scope of ['all', ...categories]) {
    const pool =
      scope === 'all' ? eligible : eligible.filter(row => row.categories.includes(scope));
    pool
      .slice(0, weeklyPlaces(pool.length))
      .forEach((row, index) =>
        places.push({ solutionId: row.solutionId, scope, rank: index + 1, score: row.score }),
      );
  }
  return { competitors: eligible.length, places };
}

/** Calendar date (YYYY-MM-DD) of `now` in the recognition time zone. */
export function localDate(now: Date, timeZone = recognitionTimeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The Monday that starts the last week that has fully ended, in Mexico City time. */
export function lastCompletedWeek(now: Date) {
  const today = localDate(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const thisMonday = addDays(today, -((weekday + 6) % 7));
  const start = addDays(thisMonday, -7);
  return { start, end: addDays(start, 6) };
}

// ── Public shape ──────────────────────────────────────────────────────────────────

export type Award = {
  id: string;
  kind: 'weekly' | 'editorial';
  scope: string;
  rank: number | null;
  periodStart: string;
  periodEnd: string;
  note: string | null;
};
export type Recognition = {
  verifiedAt: string | null;
  awards: Award[];
  /** The team verified another host: the listing moved since. Shown to its owner only. */
  movedAway?: boolean;
};

/** Most notable first: editorial picks, then better ranks, then the general ranking, then newer. */
export function sortAwards<T extends Award>(awards: readonly T[]) {
  return [...awards].sort(
    (a, b) =>
      (a.kind === 'editorial' ? 0 : 1) - (b.kind === 'editorial' ? 0 : 1) ||
      (a.rank ?? 0) - (b.rank ?? 0) ||
      (a.scope === 'all' ? 0 : 1) - (b.scope === 'all' ? 0 : 1) ||
      b.periodStart.localeCompare(a.periodStart),
  );
}
