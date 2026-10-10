import { after } from 'next/server';
import { getDb } from './db';
import { audit } from './audit';
import { OPS_IDLE_SECONDS } from './auth';
import { sendSecurityAlert } from './mail';

/** Most concurrent live ops sessions one account may hold; older ones are closed. */
export const MAX_SESSIONS_PER_ACCOUNT = 5;

/**
 * Whether this device label already completed a sign-in for the account. Used
 * only to decide if a "new device" alert is worth sending.
 */
export async function knownDevice(accountId: string, device: string): Promise<boolean> {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT 1 FROM ops_audit_log
      WHERE actor_id = ${accountId}
        AND action IN ('login_success', 'totp_enrolled')
        AND metadata->>'device' = ${device}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return true; // never alert on a lookup failure
  }
}

/**
 * Post-login work that must not delay the response: prune dead and excess
 * sessions, and send the security alert when one applies.
 */
export function afterLogin(options: {
  accountId: string;
  email: string;
  device: string;
  ip: string | null;
  alert: { subject: string; summary: string } | null;
}) {
  after(async () => {
    try {
      const sql = getDb();
      await sql`
        DELETE FROM ops_sessions
        WHERE account_id = ${options.accountId}
          AND (expires_at <= now() OR last_seen_at < now() - ${OPS_IDLE_SECONDS} * interval '1 second'
            OR token_hash IN (
              SELECT token_hash FROM ops_sessions WHERE account_id = ${options.accountId}
              ORDER BY created_at DESC OFFSET ${MAX_SESSIONS_PER_ACCOUNT}
            ))
      `;
    } catch (err) {
      console.error('[ops/login] session pruning failed', err);
    }
    if (options.alert) {
      const sent = await sendSecurityAlert(
        options.email,
        options.alert.subject,
        options.alert.summary,
        {
          device: options.device,
          ip: options.ip,
        },
      );
      if (sent)
        await audit({
          actorId: options.accountId,
          actorEmail: options.email,
          action: 'security_alert_sent',
          subjectType: 'account',
          subjectId: options.accountId,
          metadata: { subject: options.alert.subject },
        });
    }
  });
}
