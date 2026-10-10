import { getDb } from '../db';
import { iso, likePattern } from '../http';
import { AUDIT_ACTIONS, type AuditGroup } from '../labels';

export interface AuditFilters {
  actor?: string;
  action?: string;
  group?: AuditGroup | '';
  subjectType?: string;
  subjectId?: string;
  q?: string;
  from?: string;
  to?: string;
  cursor?: number | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function listAudit(filters: AuditFilters, pageSize = 50) {
  const sql = getDb();
  const actions = filters.group
    ? Object.entries(AUDIT_ACTIONS)
        .filter(([, value]) => value.group === filters.group)
        .map(([key]) => key)
    : null;
  const like = likePattern(filters.q ?? '');
  const from = filters.from && DATE_RE.test(filters.from) ? filters.from : null;
  const to = filters.to && DATE_RE.test(filters.to) ? filters.to : null;
  const rows = await sql`
    SELECT id, chain_seq, actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip, created_at, row_hash
    FROM ops_audit_log
    WHERE (${filters.actor || null}::text IS NULL OR actor_email = ${filters.actor || null})
      AND (${filters.action || null}::text IS NULL OR action = ${filters.action || null})
      AND (${actions}::text[] IS NULL OR action = ANY(${actions}::text[]))
      AND (${filters.subjectType || null}::text IS NULL OR subject_type = ${filters.subjectType || null})
      AND (${filters.subjectId || null}::text IS NULL OR subject_id = ${filters.subjectId || null})
      AND (${like}::text IS NULL OR lower(reason) LIKE ${like} OR lower(subject_id) LIKE ${like}
        OR lower(actor_email) LIKE ${like} OR lower(COALESCE(ip, '')) LIKE ${like})
      AND (${from}::date IS NULL OR created_at >= ${from}::date)
      AND (${to}::date IS NULL OR created_at < ${to}::date + 1)
      AND (${filters.cursor ?? null}::bigint IS NULL OR id < ${filters.cursor ?? null}::bigint)
    ORDER BY id DESC
    LIMIT ${pageSize + 1}
  `;
  const items = rows.slice(0, pageSize).map(r => ({
    id: String(r.id),
    seq: r.chain_seq !== null ? Number(r.chain_seq) : null,
    actorId: r.actor_id ? String(r.actor_id) : null,
    actorEmail: String(r.actor_email),
    action: String(r.action),
    subjectType: String(r.subject_type),
    subjectId: String(r.subject_id),
    reason: String(r.reason ?? ''),
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    ip: r.ip ? String(r.ip) : null,
    createdAt: iso(r.created_at),
    rowHash: r.row_hash ? String(r.row_hash) : null,
  }));
  return {
    items,
    hasMore: rows.length > pageSize,
    nextCursor: rows.length > pageSize ? items[items.length - 1].id : null,
  };
}

export async function auditFacets() {
  const sql = getDb();
  const [actors, actions, types] = await sql.transaction(
    [
      sql`SELECT actor_email AS value, count(*)::int AS n FROM ops_audit_log GROUP BY 1 ORDER BY 2 DESC LIMIT 50`,
      sql`SELECT action AS value, count(*)::int AS n FROM ops_audit_log GROUP BY 1 ORDER BY 1`,
      sql`SELECT subject_type AS value, count(*)::int AS n FROM ops_audit_log GROUP BY 1 ORDER BY 1`,
    ],
    { readOnly: true },
  );
  const map = (rows: Record<string, unknown>[]) =>
    rows.map(r => ({ value: String(r.value), n: Number(r.n) }));
  return { actors: map(actors), actions: map(actions), types: map(types) };
}

export interface ChainStatus {
  available: boolean;
  total: number;
  firstBrokenSeq: number | null;
  headSeq: number | null;
  headHash: string | null;
  verifiedAt: string;
}

/**
 * Recomputes every row hash in the database and checks each link and that the
 * sequence has no gaps. Any edit or deletion made by bypassing the triggers shows
 * up as the first broken sequence number.
 */
export async function verifyAuditChain(): Promise<ChainStatus> {
  const sql = getDb();
  try {
    const [row] = await sql`
      WITH c AS (
        SELECT chain_seq, prev_hash, row_hash,
          ops_audit_row_hash(id, created_at, actor_email, action, subject_type, subject_id, reason, metadata, ip, prev_hash) AS recomputed,
          COALESCE(lag(row_hash) OVER (ORDER BY chain_seq), repeat('0', 64)) AS expected_prev,
          lag(chain_seq) OVER (ORDER BY chain_seq) AS prev_seq
        FROM ops_audit_log
      )
      SELECT count(*)::int AS total,
        min(chain_seq) FILTER (WHERE chain_seq IS NULL OR row_hash IS DISTINCT FROM recomputed
          OR prev_hash IS DISTINCT FROM expected_prev
          OR (prev_seq IS NULL AND chain_seq <> 1)
          OR (prev_seq IS NOT NULL AND chain_seq <> prev_seq + 1)) AS first_broken,
        bool_or(chain_seq IS NULL) AS has_unchained,
        max(chain_seq) AS head_seq,
        (SELECT row_hash FROM ops_audit_log ORDER BY chain_seq DESC NULLS LAST LIMIT 1) AS head_hash
      FROM c
    `;
    const total = Number(row?.total ?? 0);
    const broken =
      row?.first_broken !== null && row?.first_broken !== undefined
        ? Number(row.first_broken)
        : row?.has_unchained
          ? 0
          : null;
    return {
      available: true,
      total,
      firstBrokenSeq: broken,
      headSeq: row?.head_seq !== null && row?.head_seq !== undefined ? Number(row.head_seq) : null,
      headHash: row?.head_hash ? String(row.head_hash) : null,
      verifiedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[ops/audit-chain]', err);
    return {
      available: false,
      total: 0,
      firstBrokenSeq: null,
      headSeq: null,
      headHash: null,
      verifiedAt: new Date().toISOString(),
    };
  }
}
