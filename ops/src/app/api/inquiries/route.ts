import { opsRoute } from '@/lib/api';
import { failure, intParam, isUuid, ok, oneOf, textParam } from '@/lib/http';
import { INQUIRY_FILTERS, listInquiries } from '@/lib/data/inquiries';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const filter =
    url.searchParams.get('pending') === '1'
      ? 'pending'
      : oneOf(url.searchParams.get('filter'), INQUIRY_FILTERS, 'all');
  const data = await listInquiries({
    filter,
    q: textParam(url, 'q'),
    reason: textParam(url, 'reason', 20),
    page: intParam(url, 'page', 1, 1, 10000),
  });
  return ok(data);
});

export const POST = opsRoute(
  { limit: ['inquiries', 200, 600] },
  async ({ body, user, sql, ip }) => {
    if (!isUuid(body.id)) return failure('ID inválido.', 400);
    const reopen = body.action === 'reopen';
    const rows = reopen
      ? await sql`
        WITH changed AS (
          UPDATE contact_inquiries SET handled_at = NULL, handled_by = NULL WHERE id = ${body.id} AND handled_at IS NOT NULL RETURNING id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'inquiry_reopened', 'inquiry', id::text, '', '{}'::jsonb, ${ip} FROM changed
        )
        SELECT id FROM changed
      `
      : await sql`
        WITH changed AS (
          UPDATE contact_inquiries SET handled_at = now(), handled_by = ${user.id} WHERE id = ${body.id} AND handled_at IS NULL RETURNING id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'inquiry_handled', 'inquiry', id::text, '', '{}'::jsonb, ${ip} FROM changed
        )
        SELECT id FROM changed
      `;
    if (!rows.length)
      return failure(reopen ? 'Ya estaba pendiente.' : 'Ya estaba marcado como atendido.', 409);
    return ok({});
  },
);
