import { opsRoute, readReason } from '@/lib/api';
import { failure, intParam, ok, oneOf, textParam } from '@/lib/http';
import { NEWSLETTER_FILTERS, newsletterOverview } from '@/lib/data/newsletter';
import { audit } from '@/lib/audit';
import { callProduct } from '@/lib/newsletter';

export const runtime = 'nodejs';

export const GET = opsRoute({}, async ({ url }) => {
  const filter =
    url.searchParams.get('all') === '1'
      ? 'all'
      : oneOf(url.searchParams.get('filter'), NEWSLETTER_FILTERS, 'confirmed');
  const data = await newsletterOverview({
    filter,
    q: textParam(url, 'q'),
    page: intParam(url, 'page', 1, 1, 10000),
  });
  return ok(data);
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscriber actions (SHCWS-124), admin + modo seguro:
 * - unsubscribe: a removal asked for by email (Privacidad promises 48 business hours).
 * - reconfirm: asks every subscriber from before double opt-in to confirm, once. The product
 *   sends it; outside production only @resend.dev addresses receive it.
 */
export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['newsletter-subscribers', 60, 300] },
  async ({ body, user, sql, ip }) => {
    if (body.action === 'unsubscribe') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const reason = readReason(body);
      if (!emailPattern.test(email) || email.length > 254) return failure('Correo no válido.', 400);
      if (!reason) return failure('Escribe el motivo (10 caracteres o más).', 400);
      const rows = await sql`
        WITH changed AS (
          UPDATE newsletter_subscribers SET unsubscribed_at = now(), unsubscribe_reason = 'request'
          WHERE email = ${email} AND unsubscribed_at IS NULL RETURNING email
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'newsletter_unsubscribe', 'newsletter_subscriber', email, ${reason}, '{}'::jsonb, ${ip}
          FROM changed
        )
        SELECT email FROM changed
      `;
      if (!rows.length) return failure('Esa dirección no tiene una suscripción activa.', 409);
      return ok({ message: 'La dirección ya no recibirá campañas.' });
    }
    if (body.action === 'reconfirm') {
      const [count] = await sql`
        SELECT count(*)::int AS n FROM newsletter_subscribers
        WHERE confirmed_at IS NULL AND unsubscribed_at IS NULL AND confirm_sent_at IS NULL
      `;
      const pending = Number(count?.n ?? 0);
      if (!pending)
        return failure('No hay suscripciones sin confirmar a las que no se haya escrito.', 409);
      const reply = await callProduct({ action: 'reconfirm' });
      if (reply.status !== 202)
        return failure(
          reply.status === 0
            ? 'No se pudo contactar al producto. Revisa PRODUCT_APP_ORIGIN y OPS_NEWSLETTER_SECRET.'
            : 'El producto no aceptó la solicitud.',
          502,
        );
      const logged = await audit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'newsletter_reconfirm',
        subjectType: 'newsletter',
        subjectId: 'bulk',
        metadata: { pending },
        ip,
      });
      return ok({
        message: `El producto está escribiendo a ${pending} ${pending === 1 ? 'dirección' : 'direcciones'} (máximo 200 por vez).${logged ? '' : ' No se pudo registrar en la bitácora.'}`,
      });
    }
    return failure('Solicitud inválida.', 400);
  },
);
