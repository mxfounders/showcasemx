import { getDb } from '../db';
import { iso } from '../http';
import { deviceLabel } from '../device';
import { SECURITY_ACTIONS } from '../labels';

export async function mySecurity(userId: string, email: string, currentSessionId: string) {
  const sql = getDb();
  const [sessions, factor, logins] = await sql.transaction(
    [
      sql`
        SELECT token_hash, created_at, last_seen_at, expires_at, ip, user_agent, elevated_until
        FROM ops_sessions WHERE account_id = ${userId} AND expires_at > now()
        ORDER BY last_seen_at DESC
      `,
      sql`
        SELECT totp_confirmed_at, COALESCE(cardinality(backup_codes), 0) AS backup_codes_left, level, created_at
        FROM solution_reviewers WHERE account_id = ${userId}
      `,
      sql`
        SELECT id, action, metadata, ip, created_at FROM ops_audit_log
        WHERE (actor_id = ${userId} AND action IN ('login_success', 'logout', 'totp_enrolled', 'elevation_granted', 'elevation_failed', 'backup_codes_regenerated', 'sessions_revoked_others', 'session_revoked'))
           OR (subject_id IN (${userId}, ${email}) AND action IN ('login_failed', 'login_totp_failed', 'login_throttled', 'login_totp_replay', 'session_binding_mismatch'))
        ORDER BY id DESC LIMIT 25
      `,
    ],
    { readOnly: true },
  );
  return {
    sessions: sessions.map(s => ({
      id: String(s.token_hash),
      current: String(s.token_hash) === currentSessionId,
      device: deviceLabel(s.user_agent as string | null),
      ip: s.ip ? String(s.ip) : null,
      createdAt: iso(s.created_at),
      lastSeenAt: iso(s.last_seen_at),
      expiresAt: iso(s.expires_at),
      elevated: s.elevated_until
        ? new Date(s.elevated_until as string).getTime() > Date.now()
        : false,
    })),
    totpConfirmedAt: iso(factor[0]?.totp_confirmed_at),
    backupCodesLeft: Number(factor[0]?.backup_codes_left ?? 0),
    memberSince: iso(factor[0]?.created_at),
    events: logins.map(e => ({
      id: String(e.id),
      action: String(e.action),
      device: (e.metadata as Record<string, unknown> | null)?.device
        ? String((e.metadata as Record<string, unknown>).device)
        : null,
      ip: e.ip ? String(e.ip) : null,
      createdAt: iso(e.created_at),
    })),
  };
}

export async function securityOverview() {
  const sql = getDb();
  const [counts, series, events, team, buckets, product] = await sql.transaction(
    [
      sql`
        SELECT action,
          count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS d1,
          count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS d7
        FROM ops_audit_log
        WHERE created_at > now() - interval '7 days'
          AND action IN ('login_success', 'login_failed', 'login_totp_failed', 'login_throttled', 'login_totp_replay',
                         'session_binding_mismatch', 'elevation_failed', 'elevation_granted', 'session_revoked_failed_elevation')
        GROUP BY action
      `,
      sql`
        WITH days AS (SELECT generate_series(current_date - 13, current_date, interval '1 day')::date AS day)
        SELECT d.day::text AS day,
          count(l.id) FILTER (WHERE l.action = 'login_success')::int AS success,
          count(l.id) FILTER (WHERE l.action IN ('login_failed', 'login_totp_failed', 'login_totp_replay', 'login_throttled'))::int AS failed
        FROM days d LEFT JOIN ops_audit_log l
          ON l.created_at::date = d.day
         AND l.action IN ('login_success', 'login_failed', 'login_totp_failed', 'login_totp_replay', 'login_throttled')
        GROUP BY d.day ORDER BY d.day
      `,
      sql`
        SELECT id, actor_email, action, subject_type, subject_id, metadata, ip, created_at
        FROM ops_audit_log WHERE action = ANY(${SECURITY_ACTIONS}::text[])
        ORDER BY id DESC LIMIT 40
      `,
      sql`
        SELECT count(*)::int AS members,
          count(*) FILTER (WHERE disabled_at IS NULL)::int AS active,
          count(*) FILTER (WHERE disabled_at IS NULL AND totp_confirmed_at IS NOT NULL)::int AS enrolled,
          count(*) FILTER (WHERE disabled_at IS NULL AND totp_confirmed_at IS NULL)::int AS pending_enrollment,
          count(*) FILTER (WHERE disabled_at IS NULL AND level = 'admin')::int AS admins,
          count(*) FILTER (WHERE disabled_at IS NULL AND totp_confirmed_at IS NOT NULL AND cardinality(backup_codes) <= 2)::int AS low_backup,
          (SELECT count(*)::int FROM ops_sessions WHERE expires_at > now()) AS ops_sessions,
          (SELECT count(*)::int FROM ops_sessions WHERE elevated_until > now()) AS elevated_sessions
        FROM solution_reviewers
      `,
      sql`
        SELECT
          CASE WHEN key LIKE 'ops:%' THEN 'ops · ' || split_part(key, ':', 2) ELSE 'producto · ' || split_part(key, ':', 1) END AS scope,
          count(*)::int AS identities, max(attempts)::int AS max_attempts, max(window_start) AS last_window
        FROM auth_rate_limits
        WHERE key NOT LIKE '%:global' AND window_start > now() - interval '1 hour'
        GROUP BY 1 ORDER BY max(attempts) DESC LIMIT 20
      `,
      sql`
        SELECT
          (SELECT count(*)::int FROM auth_accounts WHERE totp_confirmed_at IS NOT NULL) AS product_2fa,
          (SELECT count(*)::int FROM auth_accounts) AS product_accounts,
          (SELECT count(*)::int FROM auth_sessions WHERE expires_at > now()) AS product_sessions,
          (SELECT count(*)::int FROM auth_accounts WHERE suspended_at IS NOT NULL) AS suspended,
          (SELECT count(*)::int FROM auth_accounts WHERE email_verified_at IS NULL) AS unverified
      `,
    ],
    { readOnly: true },
  );
  const byAction: Record<string, { d1: number; d7: number }> = {};
  for (const row of counts)
    byAction[String(row.action)] = { d1: Number(row.d1), d7: Number(row.d7) };
  const t = team[0] ?? {};
  const p = product[0] ?? {};
  return {
    byAction,
    series: series.map(r => ({
      day: String(r.day),
      success: Number(r.success),
      failed: Number(r.failed),
    })),
    events: events.map(e => ({
      id: String(e.id),
      actorEmail: String(e.actor_email),
      action: String(e.action),
      subjectType: String(e.subject_type),
      subjectId: String(e.subject_id),
      metadata: (e.metadata ?? {}) as Record<string, unknown>,
      ip: e.ip ? String(e.ip) : null,
      createdAt: iso(e.created_at),
    })),
    team: {
      members: Number(t.members ?? 0),
      active: Number(t.active ?? 0),
      enrolled: Number(t.enrolled ?? 0),
      pendingEnrollment: Number(t.pending_enrollment ?? 0),
      admins: Number(t.admins ?? 0),
      lowBackup: Number(t.low_backup ?? 0),
      opsSessions: Number(t.ops_sessions ?? 0),
      elevatedSessions: Number(t.elevated_sessions ?? 0),
    },
    buckets: buckets.map(b => ({
      scope: String(b.scope),
      identities: Number(b.identities),
      maxAttempts: Number(b.max_attempts),
      lastWindow: iso(b.last_window),
    })),
    product: {
      twoFactor: Number(p.product_2fa ?? 0),
      accounts: Number(p.product_accounts ?? 0),
      sessions: Number(p.product_sessions ?? 0),
      suspended: Number(p.suspended ?? 0),
      unverified: Number(p.unverified ?? 0),
    },
  };
}
