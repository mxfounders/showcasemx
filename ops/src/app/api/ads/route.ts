import { opsRoute, readReason, type OpsContext } from '@/lib/api';
import { audit } from '@/lib/audit';
import { failure, isUuid, ok } from '@/lib/http';
import {
  AD_TIME_ZONE,
  OPS_PAUSE_REASON,
  REMOVAL_ERROR,
  REMOVAL_REASONS,
  isCurrency,
  isPlacement,
  parseRate,
  planRemoval,
  type RemovalReason,
} from '@/lib/ads';
import { StripeRefundError, createRefund, stripeConfigured } from '@/lib/stripe';
import { fmtMoney } from '@/lib/format';

export const runtime = 'nodejs';

const REMOVAL_CODES = REMOVAL_REASONS as readonly string[];

/**
 * Sponsored placements from ops (SHCWS-69): pause/resume a booking, withdraw it with
 * the reason that decides the refund, retry a refund Stripe did not confirm, change
 * daily rates and open or close placements. Money moves here, so every action is
 * admin + modo seguro, carries a reason and writes its audit entry in the same SQL
 * statement as the change. The founder's notices come from the ad_campaigns trigger
 * in the product's database (paused_at, canceled_at, refunded_amount), not from here.
 */
export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['ads-ops', 60, 300] },
  async ctx => {
    const reason = readReason(ctx.body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    switch (ctx.body.action) {
      case 'pause':
        return pause(ctx, reason);
      case 'resume':
        return resume(ctx, reason);
      case 'withdraw':
        return withdraw(ctx, reason);
      case 'retry_refund':
        return retryRefund(ctx, reason);
      case 'set_rate':
        return setRate(ctx, reason);
      case 'set_placement':
        return setPlacement(ctx, reason);
      default:
        return failure('Acción inválida.', 400);
    }
  },
);

type Ctx = OpsContext<Record<string, string>>;

async function pause({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isUuid(body.bookingId)) return failure('ID inválido.', 400);
  // Paused days still hold their inventory: resuming must find the slot free.
  const rows = await sql`
    WITH changed AS (
      UPDATE ad_campaigns SET paused_at = now(), pause_reason = ${OPS_PAUSE_REASON},
        updated_at = now(), version = version + 1
      WHERE id = ${body.bookingId} AND status = 'paid' AND paused_at IS NULL
        AND dispute_status IS DISTINCT FROM 'open'
        AND (now() AT TIME ZONE ${AD_TIME_ZONE})::date < coalesce(served_until, ends_on)
      RETURNING id, solution_name
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'ad_pause', 'ad_campaign', id::text, ${reason},
        jsonb_build_object('solution', solution_name), ${ip} FROM changed
    )
    SELECT id FROM changed
  `;
  if (!rows.length) return failure(await whyNot(sql, body.bookingId, 'pause'), 409);
  return ok({ message: 'Deja de mostrarse en cuanto caduque la caché del producto (≤ 5 min).' });
}

async function resume({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isUuid(body.bookingId)) return failure('ID inválido.', 400);
  const rows = await sql`
    WITH changed AS (
      UPDATE ad_campaigns SET paused_at = NULL, pause_reason = NULL,
        updated_at = now(), version = version + 1
      WHERE id = ${body.bookingId} AND status = 'paid' AND paused_at IS NOT NULL
        AND pause_reason = ${OPS_PAUSE_REASON} AND dispute_status IS DISTINCT FROM 'open'
      RETURNING id, solution_name
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'ad_resume', 'ad_campaign', id::text, ${reason},
        jsonb_build_object('solution', solution_name), ${ip} FROM changed
    )
    SELECT id FROM changed
  `;
  if (!rows.length) return failure(await whyNot(sql, body.bookingId, 'resume'), 409);
  return ok({});
}

async function withdraw({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isUuid(body.bookingId)) return failure('ID inválido.', 400);
  const kind = body.kind;
  if (typeof kind !== 'string' || !REMOVAL_CODES.includes(kind))
    return failure('Elige por qué se retira.', 400);
  const [row] = await sql`
    SELECT id, version, status, starts_on::text AS starts_on, ends_on::text AS ends_on,
      served_until::text AS served_until, total_amount, refund_requested_amount, currency,
      pause_reason, dispute_status, stripe_payment_intent_id, solution_name
    FROM ad_campaigns WHERE id = ${body.bookingId}
  `;
  if (!row) return failure('La reserva no existe.', 404);
  // The dialog shows a refund computed for one version of the booking; if the booking
  // changed since, the operator must look again instead of refunding another amount.
  if (typeof body.version === 'number' && body.version !== Number(row.version))
    return failure('La reserva cambió mientras la revisabas. Recarga la página.', 409);
  const plan = planRemoval(
    {
      status: String(row.status),
      startsOn: String(row.starts_on),
      endsOn: String(row.ends_on),
      servedUntil: row.served_until ? String(row.served_until) : null,
      totalAmount: row.total_amount === null ? null : Number(row.total_amount),
      refundRequested: Number(row.refund_requested_amount),
      pauseReason: row.pause_reason ? String(row.pause_reason) : null,
      disputeStatus: row.dispute_status ? String(row.dispute_status) : null,
    },
    kind as RemovalReason,
  );
  if (!plan.ok) return failure(REMOVAL_ERROR[plan.error], 409);
  const paymentIntent = row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null;
  if (plan.refund > 0 && (!paymentIntent || !stripeConfigured()))
    return failure(
      paymentIntent
        ? 'Stripe no está configurado en ops: no se retira para no dejar un reembolso sin emitir.'
        : 'La reserva no tiene un pago de Stripe al que reembolsar.',
      503,
    );

  // Record the stop and the refund it is owed before calling Stripe, so a retry
  // reissues exactly the same idempotent refund (same rule as the product).
  const [stopped] = await sql`
    WITH changed AS (
      UPDATE ad_campaigns SET paused_at = coalesce(paused_at, now()), pause_reason = ${kind},
        served_until = ${plan.servedUntil}::date,
        refund_requested_amount = refund_requested_amount + ${plan.refund},
        updated_at = now(), version = version + 1
      WHERE id = ${body.bookingId} AND version = ${Number(row.version)} AND status = 'paid'
        AND dispute_status IS DISTINCT FROM 'open'
        AND (pause_reason IS NULL OR pause_reason <> ALL(${REMOVAL_CODES as string[]}::text[]))
      RETURNING id, refund_requested_amount, refunded_amount
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email},
        ${kind === 'policyRemoval' ? 'ad_withdraw_policy' : 'ad_withdraw_platform'},
        'ad_campaign', id::text, ${reason},
        jsonb_build_object('solution', ${String(row.solution_name)}::text, 'refund', ${plan.refund}::int,
          'currency', ${String(row.currency)}::text, 'servedUntil', ${plan.servedUntil}::text), ${ip}
      FROM changed
    )
    SELECT refund_requested_amount FROM changed
  `;
  if (!stopped) return failure('La reserva cambió mientras la revisabas. Recarga la página.', 409);
  if (plan.refund === 0) return ok({ message: 'No quedaba nada por reembolsar.' });

  const amount = fmtMoney(plan.refund, String(row.currency));
  try {
    const refundId = await createRefund({
      bookingId: body.bookingId,
      paymentIntent: paymentIntent as string,
      amount: plan.refund,
      requestedTotal: Number(stopped.refund_requested_amount),
    });
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'ad_refund_issued',
      subjectType: 'ad_campaign',
      subjectId: body.bookingId,
      metadata: { refund: plan.refund, currency: String(row.currency), stripeRefund: refundId },
      ip,
    });
    return ok({ message: `Reembolso de ${amount} enviado a Stripe.` });
  } catch (err) {
    return refundFailed(err, body.bookingId, amount, user, ip);
  }
}

async function retryRefund({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isUuid(body.bookingId)) return failure('ID inválido.', 400);
  if (!stripeConfigured()) return failure('Stripe no está configurado en ops.', 503);
  const [row] = await sql`
    WITH pending AS (
      SELECT id, solution_name, currency, stripe_payment_intent_id, pause_reason,
        refund_requested_amount, refunded_amount
      FROM ad_campaigns
      WHERE id = ${body.bookingId} AND status = 'paid' AND stripe_payment_intent_id IS NOT NULL
        AND refund_requested_amount > refunded_amount AND dispute_status IS DISTINCT FROM 'open'
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'ad_refund_retry', 'ad_campaign', id::text, ${reason},
        jsonb_build_object('solution', solution_name, 'amount', refund_requested_amount - refunded_amount,
          'currency', currency), ${ip}
      FROM pending
    )
    SELECT * FROM pending
  `;
  if (!row) return failure('No hay un reembolso pendiente de confirmar en esta reserva.', 409);
  const pending = Number(row.refund_requested_amount) - Number(row.refunded_amount);
  const amount = fmtMoney(pending, String(row.currency));
  try {
    const refundId = await createRefund({
      bookingId: body.bookingId,
      paymentIntent: String(row.stripe_payment_intent_id),
      amount: pending,
      requestedTotal: Number(row.refund_requested_amount),
      // An advertiser's own cancellation was first sent with that reason; repeat it.
      customerRequested: !REMOVAL_CODES.includes(String(row.pause_reason ?? '')),
    });
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'ad_refund_issued',
      subjectType: 'ad_campaign',
      subjectId: body.bookingId,
      metadata: { refund: pending, currency: String(row.currency), stripeRefund: refundId },
      ip,
    });
    return ok({ message: `Reembolso de ${amount} enviado a Stripe.` });
  } catch (err) {
    return refundFailed(err, body.bookingId, amount, user, ip);
  }
}

async function refundFailed(
  err: unknown,
  bookingId: string,
  amount: string,
  user: Ctx['user'],
  ip: string | null,
) {
  const code = err instanceof StripeRefundError ? (err.code ?? 'unknown') : 'unknown';
  if (!(err instanceof StripeRefundError)) console.error('[ops/ads] refund failed', err);
  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'ad_refund_failed',
    subjectType: 'ad_campaign',
    subjectId: bookingId,
    metadata: { code },
    ip,
  });
  return failure(
    `La reserva quedó registrada, pero Stripe no confirmó el reembolso de ${amount} (${code}). Usa «Reintentar reembolso».`,
    502,
    { code: 'refund_failed' },
  );
}

async function setRate({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isPlacement(body.placement) || !isCurrency(body.currency))
    return failure('Espacio o moneda inválidos.', 400);
  const minor = parseRate(body.amount);
  if (minor === null) return failure('Escribe una tarifa diaria válida, por ejemplo 25.00.', 400);
  // A rate change applies to new bookings only: each booking keeps the rate it was sold at.
  const rows = await sql`
    WITH prev AS (
      SELECT daily_amount FROM ad_rates WHERE placement = ${body.placement} AND currency = ${body.currency}
    ), saved AS (
      INSERT INTO ad_rates (placement, currency, daily_amount)
      VALUES (${body.placement}, ${body.currency}, ${minor})
      ON CONFLICT (placement, currency) DO UPDATE SET daily_amount = EXCLUDED.daily_amount, updated_at = now()
      RETURNING placement, currency, daily_amount
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'ad_rate_set', 'ad_placement', placement, ${reason},
        jsonb_build_object('currency', currency, 'from', (SELECT daily_amount FROM prev), 'to', daily_amount), ${ip}
      FROM saved
    )
    SELECT placement FROM saved
  `;
  if (!rows.length) return failure('No se pudo guardar la tarifa.', 409);
  return ok({ message: 'Aplica a las reservas nuevas; las pagadas conservan su tarifa.' });
}

async function setPlacement({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isPlacement(body.placement) || typeof body.enabled !== 'boolean')
    return failure('Espacio inválido.', 400);
  // Selling a newsletter mention before issues go out would charge for nothing.
  if (body.enabled && body.placement === 'newsletter' && body.newsletterIsSending !== true)
    return failure('Confirma que el newsletter ya envía campañas antes de venderlo.', 400);
  const rows = await sql`
    WITH changed AS (
      UPDATE ad_placements SET enabled = ${body.enabled}, updated_at = now()
      WHERE id = ${body.placement} AND enabled IS DISTINCT FROM ${body.enabled}
        AND (${!body.enabled} OR EXISTS (SELECT 1 FROM ad_rates WHERE placement = ${body.placement}))
      RETURNING id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, ${body.enabled ? 'ad_placement_open' : 'ad_placement_close'},
        'ad_placement', id, ${reason}, '{}'::jsonb, ${ip} FROM changed
    )
    SELECT id FROM changed
  `;
  if (rows.length) return ok({});
  const [current] = await sql`SELECT enabled,
      EXISTS (SELECT 1 FROM ad_rates WHERE placement = ${body.placement}) AS has_rate
    FROM ad_placements WHERE id = ${body.placement}`;
  if (!current) return failure('Ese espacio no existe en esta base.', 404);
  if (Boolean(current.enabled) === body.enabled)
    return failure(
      body.enabled ? 'El espacio ya está abierto.' : 'El espacio ya está cerrado.',
      409,
    );
  return failure('Pon una tarifa antes de abrirlo.', 409);
}

/** Explains a refused pause or resume with the booking's current state. */
async function whyNot(sql: Ctx['sql'], id: string, action: 'pause' | 'resume') {
  const [row] = await sql`
    SELECT status, paused_at, pause_reason, dispute_status,
      (now() AT TIME ZONE ${AD_TIME_ZONE})::date >= coalesce(served_until, ends_on) AS ended
    FROM ad_campaigns WHERE id = ${id}
  `;
  if (!row) return 'La reserva no existe.';
  if (row.status !== 'paid') return 'La reserva no está pagada.';
  if (row.dispute_status === 'open') return 'Hay una disputa abierta: sigue pausada por Stripe.';
  if (action === 'pause') {
    if (row.paused_at) return 'La reserva ya está pausada.';
    if (row.ended) return 'La reserva ya no tiene días por servir.';
  } else {
    if (!row.paused_at) return 'La reserva no está pausada.';
    if (REMOVAL_CODES.includes(String(row.pause_reason)))
      return 'shwcs retiró esta reserva: un retiro no se reanuda.';
    if (row.pause_reason !== OPS_PAUSE_REASON)
      return 'Esta pausa no la puso ops y no se reanuda desde aquí.';
  }
  return 'La reserva cambió. Recarga la página.';
}
