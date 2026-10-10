import { getDb } from '../db';
import { iso } from '../http';

const WATCHED_TABLES = [
  'auth_accounts',
  'auth_sessions',
  'founder_solutions',
  'solution_events',
  'solution_media',
  'solution_media_files',
  'solution_site_images',
  'solution_daily_metrics',
  'solution_view_visitors',
  'contact_requests',
  'contact_events',
  'contact_inquiries',
  'account_notifications',
  'buyer_lists',
  'buyer_list_items',
  'buyer_saved_projects',
  'community_list_comments',
  'solution_comments',
  'newsletter_subscribers',
  'auth_rate_limits',
  'storage_orphans',
  'ops_audit_log',
  'ops_sessions',
];

export async function systemOverview() {
  const sql = getDb();
  const pingStarted = Date.now();
  await sql`SELECT 1`;
  const pingMs = Date.now() - pingStarted;

  const [db, tables, storage, hygiene, queues] = await sql.transaction(
    [
      sql`
        SELECT current_setting('server_version') AS version, current_database() AS name,
          pg_database_size(current_database())::bigint AS bytes,
          (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS connections,
          now() AS server_time
      `,
      sql`
        SELECT relname AS name, n_live_tup::bigint AS rows, pg_total_relation_size(relid)::bigint AS bytes,
          last_autovacuum, last_autoanalyze
        FROM pg_stat_user_tables WHERE relname = ANY(${WATCHED_TABLES})
        ORDER BY pg_total_relation_size(relid) DESC
      `,
      sql`
        SELECT
          (SELECT count(*)::int FROM solution_media) AS media,
          (SELECT COALESCE(sum(bytes), 0)::bigint FROM solution_media) AS media_bytes,
          (SELECT count(*)::int FROM solution_media_files) AS renditions,
          (SELECT COALESCE(sum(bytes), 0)::bigint FROM solution_media_files) AS rendition_bytes,
          (SELECT count(*)::int FROM solution_site_images WHERE storage_key IS NOT NULL) AS site_ok,
          (SELECT count(*)::int FROM solution_site_images WHERE failure IS NOT NULL AND storage_key IS NULL) AS site_failed,
          (SELECT COALESCE(sum(bytes), 0)::bigint FROM solution_site_images) AS site_bytes,
          (SELECT count(*)::int FROM auth_accounts WHERE avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS avatars,
          (SELECT count(*)::int FROM storage_orphans WHERE attempts < 5) AS orphans_queued,
          (SELECT count(*)::int FROM storage_orphans WHERE attempts >= 5) AS orphans_dead,
          (SELECT min(deleted_at) FROM storage_orphans) AS oldest_orphan
      `,
      sql`
        SELECT
          (SELECT count(*)::int FROM auth_sessions WHERE expires_at <= now()) AS expired_sessions,
          (SELECT count(*)::int FROM ops_sessions WHERE expires_at <= now()) AS expired_ops_sessions,
          (SELECT count(*)::int FROM auth_password_resets WHERE expires_at <= now()) AS expired_resets,
          (SELECT count(*)::int FROM auth_email_verifications WHERE expires_at <= now()) AS expired_verifications,
          (SELECT count(*)::int FROM auth_login_challenges WHERE expires_at <= now()) AS expired_challenges,
          (SELECT count(*)::int FROM ops_login_challenges WHERE expires_at <= now()) AS expired_ops_challenges,
          (SELECT count(*)::int FROM auth_google_states WHERE expires_at <= now()) AS expired_google_states,
          (SELECT count(*)::int FROM auth_rate_limits WHERE window_start < now() - interval '1 day') AS stale_rate_limits,
          (SELECT count(*)::int FROM solution_view_visitors WHERE day < current_date - 3) AS stale_visitors
      `,
      sql`
        SELECT email_state, count(*)::int AS n, min(created_at) AS oldest
        FROM account_notifications WHERE email_state IN ('pending', 'sending', 'failed') GROUP BY email_state
      `,
    ],
    { readOnly: true },
  );

  const d = db[0] ?? {};
  const s = storage[0] ?? {};
  const h = hygiene[0] ?? {};
  return {
    pingMs,
    database: {
      version: String(d.version ?? ''),
      name: String(d.name ?? ''),
      bytes: Number(d.bytes ?? 0),
      connections: Number(d.connections ?? 0),
      serverTime: iso(d.server_time),
    },
    tables: tables.map(t => ({
      name: String(t.name),
      rows: Number(t.rows ?? 0),
      bytes: Number(t.bytes ?? 0),
      lastVacuum: iso(t.last_autovacuum),
      lastAnalyze: iso(t.last_autoanalyze),
    })),
    storage: {
      media: Number(s.media ?? 0),
      mediaBytes: Number(s.media_bytes ?? 0),
      renditions: Number(s.renditions ?? 0),
      renditionBytes: Number(s.rendition_bytes ?? 0),
      siteOk: Number(s.site_ok ?? 0),
      siteFailed: Number(s.site_failed ?? 0),
      siteBytes: Number(s.site_bytes ?? 0),
      avatars: Number(s.avatars ?? 0),
      orphansQueued: Number(s.orphans_queued ?? 0),
      orphansDead: Number(s.orphans_dead ?? 0),
      oldestOrphan: iso(s.oldest_orphan),
    },
    hygiene: Object.fromEntries(
      Object.entries(h).map(([key, value]) => [key, Number(value ?? 0)]),
    ) as Record<string, number>,
    queues: queues.map(q => ({
      state: String(q.email_state),
      n: Number(q.n),
      oldest: iso(q.oldest),
    })),
  };
}

export async function probeProduct(): Promise<{
  configured: boolean;
  ok: boolean;
  status: number | null;
  ms: number | null;
  error?: string;
}> {
  const origin = process.env.PRODUCT_APP_ORIGIN?.trim();
  if (!origin) return { configured: false, ok: false, status: null, ms: null };
  const started = Date.now();
  try {
    const response = await fetch(`${origin}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return { configured: true, ok: response.ok, status: response.status, ms: Date.now() - started };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      status: null,
      ms: Date.now() - started,
      error:
        err instanceof Error && err.name === 'TimeoutError'
          ? 'Sin respuesta en 4 s'
          : 'No se pudo conectar',
    };
  }
}
