import { getDb } from '../db';
import { iso } from '../http';

export async function teamMembers() {
  const sql = getDb();
  const rows = await sql`
    SELECT a.id, a.email, a.name, a.suspended_at, r.level, r.created_at, r.disabled_at, r.totp_confirmed_at, r.enroll_by,
      COALESCE(cardinality(r.backup_codes), 0) AS backup_codes_left, granter.email AS granted_by_email,
      (SELECT max(last_seen_at) FROM ops_sessions s WHERE s.account_id = a.id) AS last_seen_at,
      (SELECT count(*)::int FROM ops_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS active_sessions,
      (SELECT max(created_at) FROM ops_audit_log l WHERE l.actor_id = a.id AND l.action = 'login_success') AS last_login_at,
      (SELECT count(*)::int FROM ops_audit_log l WHERE l.actor_id = a.id
        AND l.created_at > now() - interval '30 days' AND l.action NOT IN ('login_success', 'logout', 'elevation_granted', 'security_alert_sent')) AS actions_30d
    FROM solution_reviewers r
    JOIN auth_accounts a ON a.id = r.account_id
    LEFT JOIN auth_accounts granter ON granter.id = r.granted_by
    ORDER BY r.disabled_at IS NOT NULL, r.level = 'admin' DESC, r.created_at ASC
  `;
  return rows.map(r => ({
    id: String(r.id),
    email: String(r.email),
    name: r.name ? String(r.name) : null,
    level: r.level === 'admin' ? ('admin' as const) : ('reviewer' as const),
    createdAt: iso(r.created_at),
    disabledAt: iso(r.disabled_at),
    suspendedAt: iso(r.suspended_at),
    totpConfirmed: Boolean(r.totp_confirmed_at),
    totpConfirmedAt: iso(r.totp_confirmed_at),
    enrollBy: iso(r.enroll_by),
    backupCodesLeft: Number(r.backup_codes_left ?? 0),
    grantedByEmail: r.granted_by_email ? String(r.granted_by_email) : null,
    lastSeenAt: iso(r.last_seen_at),
    activeSessions: Number(r.active_sessions ?? 0),
    lastLoginAt: iso(r.last_login_at),
    actions30d: Number(r.actions_30d ?? 0),
  }));
}

export type TeamMember = Awaited<ReturnType<typeof teamMembers>>[number];
