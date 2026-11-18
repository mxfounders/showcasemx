import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { audit } from '@/lib/audit';
import { segmentReach } from '@/lib/data/newsletter';
import { EMPTY_COPY, callProduct, problemLabel, readEdit, readListings } from '@/lib/newsletter';

export const runtime = 'nodejs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const highImpact = (body: Record<string, unknown>) =>
  body.action === 'send' || body.action === 'cancel';

function unreachable(status: number) {
  return status === 0
    ? 'No se pudo contactar al producto. Revisa PRODUCT_APP_ORIGIN y OPS_NEWSLETTER_SECRET.'
    : status === 401
      ? 'El producto rechazó OPS_NEWSLETTER_SECRET: debe ser el mismo valor en los dos proyectos.'
      : 'El producto no pudo completar la solicitud.';
}

/**
 * Newsletter campaigns (SHCWS-124/125). Everything is admin-only; sending and cancelling also
 * need modo seguro and a reason. Each change writes its audit entry in the same statement.
 * A campaign goes out only if its last test send was of the exact version being sent
 * (tested_version = version): any edit bumps the version and asks for a new test.
 */
export const POST = opsRoute(
  { admin: true, elevated: highImpact, limit: ['newsletter-campaigns', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const id = isUuid(body.id) ? body.id : null;
    const version = Number(body.version);

    switch (body.action) {
      case 'create': {
        const content = { es: EMPTY_COPY, en: null, listings: [] };
        const [row] = await sql`
          WITH created AS (
            INSERT INTO newsletter_campaigns (kind, content, created_by)
            VALUES ('manual', ${JSON.stringify(content)}::jsonb, ${user.id}) RETURNING id
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'newsletter_campaign_create', 'newsletter_campaign', id::text, '', '{}'::jsonb, ${ip} FROM created
          )
          SELECT id::text FROM created
        `;
        return ok({ id: String(row.id) });
      }

      case 'update': {
        if (!id || !Number.isInteger(version)) return failure('Solicitud inválida.', 400);
        const [stored] = await sql`SELECT content FROM newsletter_campaigns WHERE id = ${id}`;
        if (!stored) return failure('No existe esa campaña.', 404);
        const edit = readEdit(body, readListings(stored.content));
        if (!edit)
          return failure('Revisa los campos: alguno es demasiado largo o no es texto.', 400);
        const rows = await sql`
          WITH changed AS (
            UPDATE newsletter_campaigns SET content = ${JSON.stringify(edit.content)}::jsonb,
              segment = ${JSON.stringify(edit.segment)}::jsonb, version = version + 1, updated_at = now()
            WHERE id = ${id} AND status = 'draft' AND version = ${version}
            RETURNING id, version
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'newsletter_campaign_update', 'newsletter_campaign', id::text, '',
              jsonb_build_object('version', version), ${ip} FROM changed
          )
          SELECT version FROM changed
        `;
        if (!rows.length)
          return failure(
            'La campaña cambió mientras la editabas (o ya no es un borrador). Recarga la página.',
            409,
          );
        return ok({ version: Number(rows[0].version), reach: await segmentReach(edit.segment) });
      }

      case 'test': {
        const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
        if (!id || !Number.isInteger(version)) return failure('Solicitud inválida.', 400);
        if (!emailPattern.test(to) || to.length > 254)
          return failure('Correo de prueba no válido.', 400);
        const reply = await callProduct({ action: 'test', campaignId: id, version, to });
        if (reply.status === 409) {
          const problems = Array.isArray(reply.data.problems)
            ? reply.data.problems.map(String)
            : [];
          const messages: Record<string, string> = {
            version: 'La campaña cambió: recarga antes de probar.',
            'not-draft': 'Solo un borrador se prueba.',
            'email-unavailable': 'El producto no tiene el correo configurado (Resend).',
            problems: `No se puede probar todavía: ${problems.map(problemLabel).join('; ')}.`,
          };
          return failure(messages[String(reply.data.error)] ?? 'No se pudo enviar la prueba.', 409);
        }
        if (reply.status !== 200) return failure(unreachable(reply.status), 502);
        const rows = await sql`
          WITH changed AS (
            UPDATE newsletter_campaigns SET tested_version = ${version}, tested_at = now(), tested_by = ${user.id}, updated_at = now()
            WHERE id = ${id} AND status = 'draft' AND version = ${version} RETURNING id
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'newsletter_campaign_test', 'newsletter_campaign', id::text, '',
              jsonb_build_object('version', ${version}::int, 'to', ${to}::text), ${ip} FROM changed
          )
          SELECT id FROM changed
        `;
        if (!rows.length)
          return failure(
            'La prueba salió, pero la campaña cambió entretanto: prueba de nuevo.',
            409,
          );
        return ok({ message: `Prueba de la versión ${version} enviada a ${to}.` });
      }

      case 'send': {
        const reason = readReason(body);
        if (!id || !Number.isInteger(version)) return failure('Solicitud inválida.', 400);
        if (!reason) return failure('Escribe el motivo (10 caracteres o más).', 400);
        const [current] = await sql`SELECT segment FROM newsletter_campaigns WHERE id = ${id}`;
        if (!current) return failure('No existe esa campaña.', 404);
        const reach = await segmentReach(
          current.segment && typeof current.segment === 'object'
            ? (current.segment as { profiles: string[]; roles: string[] })
            : { profiles: [], roles: [] },
        );
        const rows = await sql`
          WITH changed AS (
            UPDATE newsletter_campaigns SET status = 'queued', queued_at = now(), queued_by = ${user.id}, updated_at = now()
            WHERE id = ${id} AND status = 'draft' AND version = ${version} AND tested_version = version
            RETURNING id
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'newsletter_campaign_send', 'newsletter_campaign', id::text, ${reason},
              jsonb_build_object('version', ${version}::int, 'reach', ${reach}::int), ${ip} FROM changed
          )
          SELECT id FROM changed
        `;
        if (!rows.length)
          return failure(
            'Solo se envía un borrador cuya última prueba sea de esta misma versión. Envía una prueba primero.',
            409,
          );
        const reply = await callProduct({ action: 'run', campaignId: id }, 8000);
        return ok({
          message:
            reply.status === 202
              ? `En cola para ${reach} ${reach === 1 ? 'suscriptor confirmado' : 'suscriptores confirmados'}. El envío ya empezó.`
              : 'En cola. El producto no respondió: el envío empieza con el siguiente ciclo diario o con «Continuar envío».',
        });
      }

      case 'resume': {
        if (!id) return failure('Solicitud inválida.', 400);
        const [row] = await sql`SELECT status FROM newsletter_campaigns WHERE id = ${id}`;
        if (!row || !['queued', 'sending'].includes(String(row.status)))
          return failure('Esa campaña no tiene envíos pendientes.', 409);
        const reply = await callProduct({ action: 'run', campaignId: id }, 8000);
        if (reply.status !== 202) return failure(unreachable(reply.status), 502);
        await audit({
          actorId: user.id,
          actorEmail: user.email,
          action: 'newsletter_campaign_resume',
          subjectType: 'newsletter_campaign',
          subjectId: id,
          ip,
        });
        return ok({ message: 'El producto retomó el envío.' });
      }

      case 'cancel': {
        const reason = readReason(body);
        if (!id) return failure('Solicitud inválida.', 400);
        if (!reason) return failure('Escribe el motivo (10 caracteres o más).', 400);
        const rows = await sql`
          WITH changed AS (
            UPDATE newsletter_campaigns SET status = 'cancelled', cancelled_at = now(), updated_at = now()
            WHERE id = ${id} AND status IN ('draft', 'queued', 'sending') RETURNING id, status
          ), skipped AS (
            UPDATE newsletter_deliveries SET state = 'skipped'
            WHERE campaign_id IN (SELECT id FROM changed) AND state = 'pending'
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'newsletter_campaign_cancel', 'newsletter_campaign', id::text, ${reason}, '{}'::jsonb, ${ip}
            FROM changed
          )
          SELECT id FROM changed
        `;
        if (!rows.length) return failure('Esa campaña ya no se puede cancelar.', 409);
        return ok({ message: 'Campaña cancelada. Lo ya enviado no se puede recuperar.' });
      }

      case 'weekly':
      case 'refresh': {
        if (body.action === 'refresh' && (!id || !Number.isInteger(version)))
          return failure('Solicitud inválida.', 400);
        const reply = await callProduct({
          action: 'weekly-draft',
          ...(body.action === 'refresh' ? { campaignId: id } : {}),
        });
        if (reply.status !== 200) return failure(unreachable(reply.status), 502);
        const created = typeof reply.data.id === 'string' ? reply.data.id : null;
        const listings = Number(reply.data.listings ?? 0);
        if (!created)
          return failure(
            listings
              ? body.action === 'refresh'
                ? 'Esa campaña ya no es un borrador semanal.'
                : 'Ya existe el borrador de esta semana.'
              : 'No hay fichas aprobadas en los últimos siete días.',
            409,
          );
        await audit({
          actorId: user.id,
          actorEmail: user.email,
          action:
            body.action === 'refresh' ? 'newsletter_weekly_refresh' : 'newsletter_weekly_draft',
          subjectType: 'newsletter_campaign',
          subjectId: created,
          metadata: { listings },
          ip,
        });
        return ok({
          id: created,
          message: `${listings} ${listings === 1 ? 'ficha' : 'fichas'} en el borrador.`,
        });
      }

      default:
        return failure('Solicitud inválida.', 400);
    }
  },
);
