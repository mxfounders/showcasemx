import { opsRoute, readReason, type OpsContext } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { briefsAvailable, triggerBriefNotices } from '@/lib/data/briefs';

export const runtime = 'nodejs';

/**
 * Attending buyer briefs (SHCWS-60, db/buyer-briefs.sql). `hide`/`unhide` take a brief
 * off founders' lists (the buyer sees the reason); `shortlist` sends the buyer up to
 * three published listings and a note, once per brief. Every change writes its audit
 * entry in the same statement. Reviewers and admins alike: it is the same kind of
 * editorial work as deciding a report.
 */
export const POST = opsRoute({ limit: ['brief-ops', 120, 600] }, async ctx => {
  if (!(await briefsAvailable()))
    return failure('Falta aplicar db/buyer-briefs.sql en esta base de datos.', 503);
  switch (ctx.body.action) {
    case 'hide':
      return hide(ctx);
    case 'unhide':
      return unhide(ctx);
    case 'shortlist':
      return shortlist(ctx);
    default:
      return failure('Acción inválida.', 400);
  }
});

type Ctx = OpsContext<Record<string, string>>;

async function hide({ body, sql, user, ip }: Ctx) {
  const reason = readReason(body);
  if (!reason)
    return failure('Explica el motivo (mínimo 10 caracteres). Lo verá el comprador.', 400);
  if (!isUuid(body.id)) return failure('Necesidad inválida.', 400);
  const rows = await sql`
    WITH changed AS (
      UPDATE buyer_briefs SET hidden_at = now(), hidden_reason = ${reason}, hidden_by = ${user.id}
      WHERE id = ${body.id} AND hidden_at IS NULL
      RETURNING id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'brief_hide', 'brief', id::text, ${reason}, '{}'::jsonb, ${ip} FROM changed
    )
    SELECT id FROM changed`;
  if (!rows.length) return failure('La necesidad ya estaba oculta o no existe.', 409);
  return ok({ message: 'Necesidad oculta. Los fundadores ya no la ven.' });
}

async function unhide({ body, sql, user, ip }: Ctx) {
  const reason = readReason(body);
  if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
  if (!isUuid(body.id)) return failure('Necesidad inválida.', 400);
  const rows = await sql`
    WITH changed AS (
      UPDATE buyer_briefs SET hidden_at = NULL, hidden_reason = NULL, hidden_by = NULL
      WHERE id = ${body.id} AND hidden_at IS NOT NULL
      RETURNING id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'brief_unhide', 'brief', id::text, ${reason}, '{}'::jsonb, ${ip} FROM changed
    )
    SELECT id FROM changed`;
  if (!rows.length) return failure('La necesidad no estaba oculta.', 409);
  return ok({ message: 'Necesidad visible otra vez para los fundadores que encajan.' });
}

async function shortlist({ body, sql, user, ip }: Ctx) {
  if (!isUuid(body.id) || !isUuid(body.briefId)) return failure('Solicitud inválida.', 400);
  const raw = Array.isArray(body.solutionIds) ? body.solutionIds : [];
  const solutions = [...new Set(raw)];
  if (
    !solutions.length ||
    solutions.length > 3 ||
    solutions.length !== raw.length ||
    !solutions.every(isUuid)
  )
    return failure('Elige de una a tres fichas distintas.', 400);
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length < 10 || note.length > 2000)
    return failure('Escribe una nota para el comprador (10 a 2000 caracteres).', 400);
  // One statement: the brief must be open to the team (not hidden or closed by the buyer)
  // and every listing published and not the buyer's own; then the buyer's notice and the
  // audit entry. A retried send with the same id changes nothing.
  const rows = await sql`
    WITH brief AS (
      SELECT b.id, b.buyer_id FROM buyer_briefs b
      WHERE b.id = ${body.briefId} AND b.hidden_at IS NULL AND b.closed_at IS NULL
    ), listings AS (
      SELECT s.id FROM founder_solutions s, brief
      WHERE s.id = ANY(${solutions}::uuid[]) AND s.published_data IS NOT NULL AND s.owner_id <> brief.buyer_id
    ), inserted AS (
      INSERT INTO buyer_brief_shortlists (id, brief_id, solution_ids, note, created_by)
      SELECT ${body.id}, brief.id, ${solutions}::uuid[], ${note}, ${user.id} FROM brief
      WHERE (SELECT count(*) FROM listings) = ${solutions.length}
      ON CONFLICT DO NOTHING
      RETURNING id, brief_id
    ), noticed AS (
      INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
      SELECT b.buyer_id, 'brief', 'brief-shortlist:' || i.id::text,
        'El equipo de shwcs te armó una lista corta', '/account/briefs/' || i.brief_id::text,
        CASE WHEN a.email_verified_at IS NOT NULL AND COALESCE(p.brief_email, true) THEN 'pending' ELSE 'disabled' END
      FROM inserted i JOIN buyer_briefs b ON b.id = i.brief_id JOIN auth_accounts a ON a.id = b.buyer_id
      LEFT JOIN notification_preferences p ON p.owner_id = b.buyer_id
      ON CONFLICT (source_key) DO NOTHING
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'brief_shortlist', 'brief', brief_id::text, '',
        jsonb_build_object('solutions', ${solutions}::text[]), ${ip} FROM inserted
    )
    SELECT id FROM inserted`;
  if (!rows.length) {
    const [existing] =
      await sql`SELECT id::text FROM buyer_brief_shortlists WHERE brief_id = ${body.briefId}`;
    if (existing?.id === body.id) return ok({ message: 'La lista corta ya estaba enviada.' });
    if (existing) return failure('Esta necesidad ya tiene una lista corta.', 409);
    return failure(
      'No se pudo enviar: la necesidad está oculta o cerrada, o alguna ficha ya no está publicada.',
      409,
    );
  }
  const sent = await triggerBriefNotices();
  return ok({
    message: sent
      ? 'Lista corta enviada. El comprador la ve en su cuenta y recibe un correo.'
      : 'Lista corta guardada. El correo sale con el envío diario.',
  });
}
