import { getDb } from '../db';
import { iso, likePattern } from '../http';

/**
 * Buyer briefs for the Necesidades board (SHCWS-60, db/buyer-briefs.sql). Ops reads the
 * brief because the buyer sent it to be attended (consent brief-v1). Proposals are a
 * founder writing to a buyer: like contact requests (§44), ops sees who proposed and
 * when, never the message, price or timeline. contact_requests.details and conversation
 * messages stay out of every query here.
 */
export const BRIEF_FILTERS = ['pending', 'open', 'hidden', 'all'] as const;
export type BriefFilter = (typeof BRIEF_FILTERS)[number];

/** After this long without a proposal or a short list, a brief is late (SHCWS-60). */
export const BRIEF_ALERT_HOURS = 24;

const filterSql: Record<BriefFilter, string> = {
  // Open and nobody has done anything with it yet: no proposal, no short list.
  pending: `b.hidden_at IS NULL AND b.closed_at IS NULL AND b.expires_at > now()
    AND NOT EXISTS (SELECT 1 FROM buyer_brief_proposals p WHERE p.brief_id = b.id)
    AND NOT EXISTS (SELECT 1 FROM buyer_brief_shortlists l WHERE l.brief_id = b.id)`,
  open: `b.hidden_at IS NULL AND b.closed_at IS NULL AND b.expires_at > now()`,
  hidden: `b.hidden_at IS NOT NULL`,
  all: `true`,
};

export interface BriefListRow {
  id: string;
  problem: string;
  categories: string[];
  companySize: string;
  country: string | null;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  hiddenAt: string | null;
  buyerId: string;
  buyerEmail: string;
  matches: number;
  proposals: number;
  shortlisted: boolean;
  ageHours: number;
}

export async function briefsAvailable() {
  const sql = getDb();
  const [row] = await sql`SELECT to_regclass('buyer_briefs') IS NOT NULL AS ok`;
  return Boolean(row?.ok);
}

export async function listBriefs({ filter, page }: { filter: BriefFilter; page: number }) {
  const sql = getDb();
  const size = 25;
  const [rows, counts] = await Promise.all([
    sql(
      `SELECT b.id::text, left(b.problem, 240) AS problem, b.categories, b.company_size, b.country,
        b.created_at, b.expires_at, b.closed_at, b.hidden_at, b.buyer_id::text, a.email AS buyer_email,
        (SELECT count(*)::int FROM buyer_brief_matches m WHERE m.brief_id = b.id) AS matches,
        (SELECT count(*)::int FROM buyer_brief_proposals p WHERE p.brief_id = b.id) AS proposals,
        EXISTS (SELECT 1 FROM buyer_brief_shortlists l WHERE l.brief_id = b.id) AS shortlisted,
        floor(extract(epoch FROM now() - b.created_at) / 3600)::int AS age_hours
      FROM buyer_briefs b JOIN auth_accounts a ON a.id = b.buyer_id
      WHERE ${filterSql[filter]}
      ORDER BY b.created_at ${filter === 'pending' ? 'ASC' : 'DESC'}, b.id
      LIMIT ${size + 1} OFFSET $1`,
      [(page - 1) * size],
    ),
    sql(
      `SELECT ${BRIEF_FILTERS.map(key => `count(*) FILTER (WHERE ${filterSql[key]})::int AS ${key}`).join(', ')},
        count(*) FILTER (WHERE ${filterSql.pending} AND b.created_at < now() - interval '${BRIEF_ALERT_HOURS} hours')::int AS late
      FROM buyer_briefs b`,
    ),
  ]);
  return {
    hasMore: rows.length > size,
    rows: rows.slice(0, size).map((row): BriefListRow => ({
      id: String(row.id),
      problem: String(row.problem),
      categories: (row.categories as string[]) ?? [],
      companySize: String(row.company_size),
      country: row.country ? String(row.country) : null,
      createdAt: iso(row.created_at) ?? '',
      expiresAt: iso(row.expires_at) ?? '',
      closedAt: iso(row.closed_at),
      hiddenAt: iso(row.hidden_at),
      buyerId: String(row.buyer_id),
      buyerEmail: String(row.buyer_email),
      matches: Number(row.matches),
      proposals: Number(row.proposals),
      shortlisted: Boolean(row.shortlisted),
      ageHours: Number(row.age_hours),
    })),
    counts: Object.fromEntries(
      [...BRIEF_FILTERS, 'late'].map(key => [key, Number(counts[0]?.[key] ?? 0)]),
    ) as Record<BriefFilter | 'late', number>,
  };
}

/** Open briefs nobody has attended for more than a day: the sidebar badge. */
export async function lateBriefCount() {
  try {
    if (!(await briefsAvailable())) return 0;
    const sql = getDb();
    const [row] = await sql(
      `SELECT count(*)::int AS n FROM buyer_briefs b
       WHERE ${filterSql.pending} AND b.created_at < now() - interval '${BRIEF_ALERT_HOURS} hours'`,
    );
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export interface BriefDetail {
  id: string;
  problem: string;
  budget: string;
  timeline: string;
  companySize: string;
  industry: string | null;
  country: string | null;
  categories: string[];
  capabilities: string[];
  consentVersion: string;
  consentAt: string;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  hiddenBy: string | null;
  buyer: { id: string; email: string; name: string | null; verified: boolean };
  matches: { solutionId: string; name: string | null; slug: string | null; matchedAt: string }[];
  /** Who proposed and when; the content is the founder's message to the buyer. */
  proposals: {
    solutionId: string;
    name: string | null;
    createdAt: string;
    chosenAt: string | null;
  }[];
  shortlist: {
    note: string;
    createdAt: string;
    createdBy: string | null;
    listings: { id: string; name: string | null }[];
  } | null;
}

export async function getBrief(id: string): Promise<BriefDetail | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT b.id::text, b.problem, b.budget, b.timeline, b.company_size, b.industry, b.country,
      b.categories, b.capabilities, b.consent_version, b.consent_at, b.created_at, b.expires_at,
      b.closed_at, b.hidden_at, b.hidden_reason, h.email AS hidden_by,
      a.id::text AS buyer_id, a.email AS buyer_email, a.name AS buyer_name,
      a.email_verified_at IS NOT NULL AS buyer_verified
    FROM buyer_briefs b JOIN auth_accounts a ON a.id = b.buyer_id
    LEFT JOIN auth_accounts h ON h.id = b.hidden_by
    WHERE b.id = ${id}`;
  if (!row) return null;
  const [matches, proposals, shortlists] = await Promise.all([
    sql`SELECT m.solution_id::text, s.published_data->>'name' AS name, s.slug, m.matched_at
      FROM buyer_brief_matches m JOIN founder_solutions s ON s.id = m.solution_id
      WHERE m.brief_id = ${id} ORDER BY m.matched_at, 2`,
    sql`SELECT p.solution_id::text, COALESCE(s.published_data->>'name', s.data->>'name') AS name,
        p.created_at, p.chosen_at
      FROM buyer_brief_proposals p LEFT JOIN founder_solutions s ON s.id = p.solution_id
      WHERE p.brief_id = ${id} ORDER BY p.created_at`,
    sql`SELECT l.note, l.created_at, u.email AS created_by, l.solution_ids::text[] AS solution_ids
      FROM buyer_brief_shortlists l LEFT JOIN auth_accounts u ON u.id = l.created_by
      WHERE l.brief_id = ${id}`,
  ]);
  let shortlist: BriefDetail['shortlist'] = null;
  if (shortlists[0]) {
    const ids = (shortlists[0].solution_ids as string[]) ?? [];
    const names =
      await sql`SELECT id::text, COALESCE(published_data->>'name', data->>'name') AS name FROM founder_solutions WHERE id = ANY(${ids}::uuid[])`;
    shortlist = {
      note: String(shortlists[0].note),
      createdAt: iso(shortlists[0].created_at) ?? '',
      createdBy: shortlists[0].created_by ? String(shortlists[0].created_by) : null,
      listings: ids.map(item => ({
        id: item,
        name: (names.find(name => name.id === item)?.name as string | undefined) ?? null,
      })),
    };
  }
  return {
    id: String(row.id),
    problem: String(row.problem),
    budget: String(row.budget ?? ''),
    timeline: String(row.timeline),
    companySize: String(row.company_size),
    industry: row.industry ? String(row.industry) : null,
    country: row.country ? String(row.country) : null,
    categories: (row.categories as string[]) ?? [],
    capabilities: (row.capabilities as string[]) ?? [],
    consentVersion: String(row.consent_version),
    consentAt: iso(row.consent_at) ?? '',
    createdAt: iso(row.created_at) ?? '',
    expiresAt: iso(row.expires_at) ?? '',
    closedAt: iso(row.closed_at),
    hiddenAt: iso(row.hidden_at),
    hiddenReason: row.hidden_reason ? String(row.hidden_reason) : null,
    hiddenBy: row.hidden_by ? String(row.hidden_by) : null,
    buyer: {
      id: String(row.buyer_id),
      email: String(row.buyer_email),
      name: row.buyer_name ? String(row.buyer_name) : null,
      verified: Boolean(row.buyer_verified),
    },
    matches: matches.map(item => ({
      solutionId: String(item.solution_id),
      name: item.name ? String(item.name) : null,
      slug: item.slug ? String(item.slug) : null,
      matchedAt: iso(item.matched_at) ?? '',
    })),
    proposals: proposals.map(item => ({
      solutionId: String(item.solution_id),
      name: item.name ? String(item.name) : null,
      createdAt: iso(item.created_at) ?? '',
      chosenAt: iso(item.chosen_at),
    })),
    shortlist,
  };
}

export interface ListingOption {
  id: string;
  name: string;
  categories: string[];
  matched: boolean;
}

/**
 * Published listings to build a short list from: the brief's own matches first, then the
 * rest of the catalogue, optionally filtered by name. Never the buyer's own listings.
 */
export async function shortlistCandidates(briefId: string, buyerId: string, query = '') {
  const sql = getDb();
  const pattern = likePattern(query);
  const rows = await sql`
    SELECT s.id::text, s.published_data->>'name' AS name,
      COALESCE(s.published_data->'categories', jsonb_build_array(s.published_data->>'category')) AS categories,
      EXISTS (SELECT 1 FROM buyer_brief_matches m WHERE m.brief_id = ${briefId} AND m.solution_id = s.id) AS matched
    FROM founder_solutions s
    WHERE s.published_data IS NOT NULL AND s.owner_id <> ${buyerId}
      AND (${pattern}::text IS NULL OR s.published_data->>'name' ILIKE ${pattern})
    ORDER BY matched DESC, lower(s.published_data->>'name')
    LIMIT 40`;
  return rows.map((row): ListingOption => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    categories: Array.isArray(row.categories) ? (row.categories as string[]).filter(Boolean) : [],
    matched: Boolean(row.matched),
  }));
}

export interface DemandTopic {
  kind: 'category' | 'industry' | 'none';
  value: string;
  title: string;
  empty: number;
  searches: number;
  queries: { query: string; searches: number; empty: number }[];
}

/**
 * Last week's searches that found nothing, grouped by catalogue topic. The grouping uses
 * the catalogue's vocabulary, which lives in the product app, so ops asks it
 * (GET /api/internal/demand-topics) with the ops→product credential. Unreachable or not
 * configured: the board says so and the flat list stays in /panel/demanda.
 */
export async function unmetDemandTopics(): Promise<
  { status: 'ok'; topics: DemandTopic[] } | { status: 'unconfigured' | 'unavailable' | 'missing' }
> {
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  const origin = process.env.PRODUCT_APP_ORIGIN;
  if (!secret || !origin) return { status: 'unconfigured' };
  try {
    const response = await fetch(`${origin}/api/internal/demand-topics`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { status: 'unavailable' };
    const data = (await response.json()) as { available?: boolean; topics?: DemandTopic[] };
    if (!data.available) return { status: 'missing' };
    return { status: 'ok', topics: Array.isArray(data.topics) ? data.topics : [] };
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * Asks the product to send the short list's email now instead of at the next daily cron
 * (which stays as the retry). Best-effort and never throws: the short list is saved.
 */
export async function triggerBriefNotices() {
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  const origin = process.env.PRODUCT_APP_ORIGIN;
  if (!secret || !origin) return false;
  try {
    const response = await fetch(`${origin}/api/internal/brief-notices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
