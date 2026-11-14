import { getDb } from '../db';
import { iso } from '../http';

// Reads for «Verificado por shwcs», the tax identity the team records, and recognitions
// (db/solution-recognition.sql, db/compliance.sql). Kept apart from solutionDetail so a
// missing migration hides only these cards, never the listing page.

export interface VerificationState {
  verification: {
    host: string;
    checks: string[];
    note: string;
    verifiedAt: string | null;
    verifiedByEmail: string | null;
  } | null;
  taxIdentity: {
    country: string;
    taxId: string;
    updatedAt: string | null;
    /** clear | pending | presunto | definitivo | desvirtuado | sentencia_favorable; null outside MX. */
    situation: string | null;
    sourceDate: string | null;
  } | null;
  awards: Array<{
    id: string;
    kind: 'weekly' | 'editorial';
    scope: string;
    rank: number | null;
    periodStart: string;
    periodEnd: string;
    note: string | null;
  }>;
}

export async function verificationState(solutionId: string): Promise<VerificationState> {
  const sql = getDb();
  const [verification, tax, awards] = await sql.transaction(
    [
      sql`
        SELECT v.host, v.checks, v.note, v.verified_at, a.email AS verified_by_email
        FROM solution_verifications v LEFT JOIN auth_accounts a ON a.id = v.verified_by
        WHERE v.solution_id = ${solutionId}
      `,
      sql`
        SELECT t.country, t.tax_id, t.updated_at, l.situation, i.source_date::text AS source_date,
          i.imported_at IS NOT NULL AS imported
        FROM solution_tax_identities t
        LEFT JOIN sat_69b_list l ON t.country = 'MX' AND l.rfc = t.tax_id
        LEFT JOIN registry_imports i ON i.source = 'sat_69b'
        WHERE t.solution_id = ${solutionId}
      `,
      sql`
        SELECT id, kind, scope, rank, period_start::text AS period_start, period_end::text AS period_end, note
        FROM solution_awards
        WHERE solution_id = ${solutionId} AND revoked_at IS NULL
        ORDER BY period_start DESC, rank ASC NULLS FIRST LIMIT 20
      `,
    ],
    { readOnly: true },
  );
  const v = verification[0];
  const t = tax[0];
  return {
    verification: v
      ? {
          host: String(v.host),
          checks: Array.isArray(v.checks) ? v.checks.map(String) : [],
          note: String(v.note ?? ''),
          verifiedAt: iso(v.verified_at),
          verifiedByEmail: v.verified_by_email ? String(v.verified_by_email) : null,
        }
      : null,
    taxIdentity: t
      ? {
          country: String(t.country),
          taxId: String(t.tax_id),
          updatedAt: iso(t.updated_at),
          situation:
            String(t.country) !== 'MX'
              ? null
              : !t.imported
                ? 'pending'
                : t.situation
                  ? String(t.situation)
                  : 'clear',
          sourceDate: t.source_date ? String(t.source_date) : null,
        }
      : null,
    awards: awards.map(a => ({
      id: String(a.id),
      kind: String(a.kind) === 'editorial' ? 'editorial' : 'weekly',
      scope: String(a.scope),
      rank: a.rank !== null ? Number(a.rank) : null,
      periodStart: String(a.period_start),
      periodEnd: String(a.period_end),
      note: a.note ? String(a.note) : null,
    })),
  };
}

export interface AwardRow {
  id: string;
  kind: 'weekly' | 'editorial';
  scope: string;
  rank: number | null;
  periodStart: string;
  periodEnd: string;
  score: number | null;
  note: string | null;
  awardedAt: string | null;
  awardedByEmail: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  solutionId: string;
  solutionName: string;
  solutionPublished: boolean;
}

export interface AwardRun {
  periodStart: string;
  computedAt: string | null;
  competitors: number;
  awarded: number;
}

/** Recent recognitions of both kinds and the weekly runs, newest first. */
export async function listRecognitions() {
  const sql = getDb();
  const [awards, runs, verified] = await sql.transaction(
    [
      sql`
        SELECT w.id, w.kind, w.scope, w.rank, w.period_start::text AS period_start,
          w.period_end::text AS period_end, w.score, w.note, w.awarded_at, w.revoked_at, w.revoked_reason,
          a.email AS awarded_by_email, fs.id AS solution_id,
          COALESCE(NULLIF(fs.published_data->>'name', ''), fs.data->>'name', '(sin nombre)') AS solution_name,
          fs.published_data IS NOT NULL AS solution_published
        FROM solution_awards w
        JOIN founder_solutions fs ON fs.id = w.solution_id
        LEFT JOIN auth_accounts a ON a.id = w.awarded_by
        ORDER BY w.period_start DESC, w.kind, w.scope, w.rank NULLS FIRST, w.awarded_at DESC
        LIMIT 300
      `,
      sql`
        SELECT period_start::text AS period_start, computed_at, competitors, awarded
        FROM solution_award_runs ORDER BY period_start DESC LIMIT 26
      `,
      sql`SELECT count(*)::int AS n FROM solution_verifications`,
    ],
    { readOnly: true },
  );
  return {
    awards: awards.map((r): AwardRow => ({
      id: String(r.id),
      kind: String(r.kind) === 'editorial' ? 'editorial' : 'weekly',
      scope: String(r.scope),
      rank: r.rank !== null ? Number(r.rank) : null,
      periodStart: String(r.period_start),
      periodEnd: String(r.period_end),
      score: r.score !== null ? Number(r.score) : null,
      note: r.note ? String(r.note) : null,
      awardedAt: iso(r.awarded_at),
      awardedByEmail: r.awarded_by_email ? String(r.awarded_by_email) : null,
      revokedAt: iso(r.revoked_at),
      revokedReason: r.revoked_reason ? String(r.revoked_reason) : null,
      solutionId: String(r.solution_id),
      solutionName: String(r.solution_name),
      solutionPublished: Boolean(r.solution_published),
    })),
    runs: runs.map((r): AwardRun => ({
      periodStart: String(r.period_start),
      computedAt: iso(r.computed_at),
      competitors: Number(r.competitors ?? 0),
      awarded: Number(r.awarded ?? 0),
    })),
    verifiedCount: Number(verified[0]?.n ?? 0),
  };
}

/** Published listings for the editorial pick selector, the actor's own marked as not eligible. */
export async function editorialCandidates(actorId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT fs.id, COALESCE(NULLIF(fs.published_data->>'name', ''), '(sin nombre)') AS name,
      fs.owner_id = ${actorId}::uuid AS own
    FROM founder_solutions fs
    WHERE fs.published_data IS NOT NULL
    ORDER BY lower(fs.published_data->>'name') ASC, fs.id
    LIMIT 500
  `;
  return rows.map(r => ({ id: String(r.id), name: String(r.name), own: Boolean(r.own) }));
}
