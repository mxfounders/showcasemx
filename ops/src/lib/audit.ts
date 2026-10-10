import { getDb } from './db';
import { clientIp } from './net';

export interface AuditEntry {
  actorId: string | null;
  actorEmail: string;
  action: string;
  subjectType: string;
  subjectId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Append-only and hash-chained in the database (db/ops-hardening.sql). Best-effort
 * here: a logging failure must never block the action it describes, so it returns
 * false and the caller can tell the operator the entry is missing. Mutations that
 * matter write their entry inside the same SQL statement instead (see the routes).
 */
export async function audit(entry: AuditEntry): Promise<boolean> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      VALUES (
        ${entry.actorId}, ${entry.actorEmail}, ${entry.action}, ${entry.subjectType}, ${entry.subjectId},
        ${(entry.reason ?? '').slice(0, 1000)}, ${JSON.stringify(entry.metadata ?? {})}::jsonb, ${entry.ip ?? null}
      )
    `;
    return true;
  } catch (err) {
    console.error('[ops/audit] failed to write audit entry', entry.action, err);
    return false;
  }
}

/** @deprecated use clientIp from ./net — kept for older imports. */
export function requestIp(headers: Headers): string | null {
  return clientIp(headers);
}
