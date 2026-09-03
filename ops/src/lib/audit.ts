import { getDb } from './db';

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

/** Best-effort, append-only. A logging failure must never block the action it describes. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      VALUES (
        ${entry.actorId}, ${entry.actorEmail}, ${entry.action}, ${entry.subjectType}, ${entry.subjectId},
        ${entry.reason ?? ''}, ${JSON.stringify(entry.metadata ?? {})}, ${entry.ip ?? null}
      )
    `;
  } catch (err) {
    console.error('[ops/audit] failed to write audit entry', err);
  }
}

export function requestIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim().slice(0, 128) || null;
  return headers.get('x-real-ip')?.slice(0, 128) || null;
}
