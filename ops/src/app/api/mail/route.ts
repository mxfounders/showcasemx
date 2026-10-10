import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf } from '@/lib/http';
import { MAIL_FILTERS, mailOverview } from '@/lib/data/mail';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const data = await mailOverview(
    oneOf(url.searchParams.get('filter'), MAIL_FILTERS, 'problems'),
    intParam(url, 'page', 1, 1, 10000),
  );
  return ok(data);
});

// Retrying re-queues the notice for the product's worker; ops never sends the
// product's emails itself, so nothing here can double-send outside the worker's
// own idempotency.
export const POST = opsRoute(
  {
    admin: body => body.action === 'retry_all_failed',
    elevated: body => body.action === 'retry_all_failed',
    limit: ['mail-retry', 120, 600],
  },
  async ({ body, user, sql, ip }) => {
    if (body.action === 'retry_all_failed') {
      const rows = await sql`
        WITH changed AS (
          UPDATE account_notifications SET attempts = 0, next_attempt_at = now(), email_state = 'pending', locked_at = NULL
          WHERE email_state = 'failed' AND created_at > now() - interval '23 hours'
          RETURNING id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'mail_retry', 'notification', 'bulk', '',
            jsonb_build_object('count', count(*)), ${ip} FROM changed HAVING count(*) > 0
        )
        SELECT count(*)::int AS n FROM changed
      `;
      return ok({
        message: `${rows[0]?.n ?? 0} avisos volvieron a la cola (solo los de las últimas 23 h).`,
      });
    }
    if (body.action !== 'retry' || !isUuid(body.id)) return failure('Solicitud inválida.', 400);
    const rows = await sql`
      WITH changed AS (
        UPDATE account_notifications SET attempts = 0, next_attempt_at = now(), email_state = 'pending', locked_at = NULL
        WHERE id = ${body.id} AND email_state IN ('failed', 'pending')
        RETURNING id
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'mail_retry', 'notification', id::text, '', '{}'::jsonb, ${ip} FROM changed
      )
      SELECT id FROM changed
    `;
    if (!rows.length) return failure('No se pudo reintentar este aviso.', 409);
    return ok({});
  },
);
