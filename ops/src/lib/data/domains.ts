import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const DOMAIN_FILTERS = ['all', 'verified', 'pending', 'expired', 'stale'] as const;
export type DomainFilter = (typeof DOMAIN_FILTERS)[number];

/** TXT proofs. "stale" = verified more than 90 days ago (CLAUDE.md §18 asks to revalidate). */
export async function listDomains(filter: DomainFilter, q = '') {
  const sql = getDb();
  const like = likePattern(q);
  const rows = await sql`
    SELECT p.solution_id, p.domain, p.expires_at, p.verified_at,
      COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name, s.status AS solution_status,
      a.id AS owner_id, a.email AS owner_email,
      CASE
        WHEN p.verified_at IS NOT NULL AND p.verified_at < now() - interval '90 days' THEN 'stale'
        WHEN p.verified_at IS NOT NULL THEN 'verified'
        WHEN p.expires_at <= now() THEN 'expired'
        ELSE 'pending' END AS state
    FROM solution_domain_proofs p
    JOIN founder_solutions s ON s.id = p.solution_id
    JOIN auth_accounts a ON a.id = p.owner_id
    WHERE (${like}::text IS NULL OR lower(p.domain) LIKE ${like} OR lower(a.email) LIKE ${like}
      OR lower(COALESCE(s.data->>'name', '')) LIKE ${like})
    ORDER BY p.verified_at IS NULL DESC, p.expires_at DESC
    LIMIT 300
  `;
  const all = rows.map(r => ({
    solutionId: String(r.solution_id),
    domain: String(r.domain),
    expiresAt: iso(r.expires_at),
    verifiedAt: iso(r.verified_at),
    solutionName: r.solution_name ? String(r.solution_name) : '(sin nombre)',
    solutionStatus: String(r.solution_status),
    ownerId: String(r.owner_id),
    ownerEmail: String(r.owner_email),
    state: String(r.state) as Exclude<DomainFilter, 'all'>,
  }));
  const counts: Record<string, number> = {
    all: all.length,
    verified: 0,
    pending: 0,
    expired: 0,
    stale: 0,
  };
  for (const item of all) counts[item.state] += 1;
  return { counts, items: filter === 'all' ? all : all.filter(item => item.state === filter) };
}
