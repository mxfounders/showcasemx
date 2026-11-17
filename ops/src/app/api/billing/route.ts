import { opsRoute, readReason, type OpsContext } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { RECEPTOR_ERROR, readCfdiReceptor } from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * Fiscal documents from ops (SHCWS-96). The product's billing worker issues them; ops
 * only puts a document back in its queue, optionally with corrected receptor data, and
 * tells the advertiser when their data blocks the CFDI. Admin + modo seguro + reason,
 * with the audit entry in the same SQL statement as the change.
 */
export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['billing-ops', 60, 300] },
  async ctx => {
    const reason = readReason(ctx.body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    if (!isUuid(ctx.body.documentId)) return failure('ID inválido.', 400);
    switch (ctx.body.action) {
      case 'retry':
        return retry(ctx, reason);
      case 'reissue':
        return reissue(ctx, reason);
      case 'notify':
        return notify(ctx, reason);
      default:
        return failure('Acción inválida.', 400);
    }
  },
);

type Ctx = OpsContext<Record<string, string>>;

const QUEUED =
  'Vuelve a la cola: el producto lo intenta en su siguiente pasada (al pagar o reembolsar algo, o en el cron diario).';

async function retry({ body, sql, user, ip }: Ctx, reason: string) {
  const rows = await sql`
    WITH changed AS (
      UPDATE billing_documents SET status = 'pending', attempts = 0, next_attempt_at = now(),
        locked_until = NULL, updated_at = now()
      WHERE id = ${body.documentId} AND status IN ('failed', 'pending')
        AND (locked_until IS NULL OR locked_until < now())
      RETURNING id, kind, last_error, campaign_id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'billing_retry', 'billing_document', id::text, ${reason},
        jsonb_build_object('kind', kind, 'previousError', last_error, 'campaignId', campaign_id::text), ${ip}
      FROM changed
    )
    SELECT id FROM changed
  `;
  if (!rows.length) return failure(await whyNot({ body, sql }), 409);
  return ok({ message: QUEUED });
}

async function reissue({ body, sql, user, ip }: Ctx, reason: string) {
  const read = readCfdiReceptor(body.receptor);
  if (!read.ok) return failure(RECEPTOR_ERROR[read.error], 400);
  const receptor = read.receptor;
  // provider_document_id goes back to NULL so the worker refreshes the buyer's client in
  // Cord with these data before it drafts and stamps again. The account's billing
  // profile is corrected too (its version moves, which is what makes the worker update
  // the client), and the advertiser is told their fiscal data changed.
  const rows = await sql`
    WITH doc AS (
      SELECT d.id, d.receptor, d.last_error, c.owner_id
      FROM billing_documents d JOIN ad_campaigns c ON c.id = d.campaign_id
      WHERE d.id = ${body.documentId} AND d.kind = 'invoice' AND d.status IN ('failed', 'pending')
        AND (d.locked_until IS NULL OR d.locked_until < now())
      FOR UPDATE OF d
    ), changed AS (
      UPDATE billing_documents b SET receptor = b.receptor || ${JSON.stringify(receptor)}::jsonb,
        status = 'pending', attempts = 0, next_attempt_at = now(), provider_document_id = NULL,
        last_error = NULL, locked_until = NULL, updated_at = now()
      FROM doc WHERE b.id = doc.id
      RETURNING b.id, doc.owner_id, doc.receptor AS previous, doc.last_error AS previous_error
    ), profile AS (
      UPDATE billing_profiles p SET legal_name = ${receptor.legal_name}, tax_id = ${receptor.tax_id},
        tax_regime = ${receptor.tax_regime}, postal_code = ${receptor.postal_code},
        cfdi_use = ${receptor.cfdi_use}, invoice_email = ${receptor.invoice_email},
        version = p.version + 1, updated_at = now()
      FROM changed WHERE p.account_id = changed.owner_id AND p.country_code = 'MX'
      RETURNING p.account_id
    ), noticed AS (
      INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
      SELECT owner_id, 'account', 'billing-fixed:' || id::text || ':' || gen_random_uuid()::text,
        'Corregimos tus datos fiscales para emitir la factura de tu espacio patrocinado',
        '/account/settings/billing', 'pending'
      FROM changed WHERE owner_id IS NOT NULL
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'billing_reissue', 'billing_document', id::text, ${reason},
        jsonb_build_object(
          'previousError', previous_error,
          'from', jsonb_build_object('legal_name', previous->'legal_name', 'tax_id', previous->'tax_id',
            'tax_regime', previous->'tax_regime', 'postal_code', previous->'postal_code',
            'cfdi_use', previous->'cfdi_use', 'invoice_email', previous->'invoice_email'),
          'to', ${JSON.stringify(receptor)}::jsonb,
          'profileUpdated', EXISTS (SELECT 1 FROM profile)), ${ip}
      FROM changed
    )
    SELECT id, (SELECT count(*) FROM profile)::int AS profiles FROM changed
  `;
  if (!rows.length) {
    const [doc] = await sql`SELECT kind FROM billing_documents WHERE id = ${body.documentId}`;
    if (doc && doc.kind !== 'invoice')
      return failure(
        'Una nota de crédito toma el receptor de su factura: corrige y reemite la factura.',
        409,
      );
    return failure(await whyNot({ body, sql }), 409);
  }
  return ok({
    message: rows[0].profiles
      ? `${QUEUED} También se corrigieron sus datos de facturación.`
      : `${QUEUED} La cuenta no tiene datos de facturación de México que corregir.`,
  });
}

async function notify({ body, sql, user, ip }: Ctx, reason: string) {
  // One notice per document per day at most: the advertiser should fix the data once.
  const rows = await sql`
    WITH doc AS (
      SELECT d.id, c.owner_id, c.solution_name
      FROM billing_documents d JOIN ad_campaigns c ON c.id = d.campaign_id
      WHERE d.id = ${body.documentId} AND d.status IN ('failed', 'pending', 'processing')
        AND c.owner_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM account_notifications n
          WHERE n.source_key LIKE 'billing-data:' || d.id::text || ':%'
            AND n.created_at > now() - interval '1 day')
    ), noticed AS (
      INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
      SELECT owner_id, 'account', 'billing-data:' || id::text || ':' || gen_random_uuid()::text,
        left('No pudimos emitir la factura de tu espacio patrocinado para ' || solution_name
          || ': revisa tus datos fiscales', 180),
        '/account/settings/billing', 'pending'
      FROM doc RETURNING id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'billing_notify', 'billing_document', id::text, ${reason},
        '{}'::jsonb, ${ip}
      FROM doc
    )
    SELECT id FROM doc
  `;
  if (rows.length) return ok({ message: 'Le llega en su cuenta y por correo.' });
  const [doc] = await sql`
    SELECT d.status, c.owner_id,
      EXISTS (SELECT 1 FROM account_notifications n
        WHERE n.source_key LIKE 'billing-data:' || d.id::text || ':%'
          AND n.created_at > now() - interval '1 day') AS recent
    FROM billing_documents d JOIN ad_campaigns c ON c.id = d.campaign_id
    WHERE d.id = ${body.documentId}
  `;
  if (!doc) return failure('El documento no existe.', 404);
  if (!doc.owner_id) return failure('La cuenta del anunciante ya no existe.', 409);
  if (doc.recent) return failure('Ya se le avisó en las últimas 24 horas.', 409);
  return failure('Este documento ya no está pendiente.', 409);
}

/** Explains why a retry or reissue did not apply. */
async function whyNot({ body, sql }: Pick<Ctx, 'body' | 'sql'>) {
  const [doc] = await sql`
    SELECT status, (locked_until IS NOT NULL AND locked_until > now()) AS locked
    FROM billing_documents WHERE id = ${body.documentId}
  `;
  if (!doc) return 'El documento no existe.';
  if (doc.status === 'issued') return 'Ya se emitió.';
  if (doc.status === 'skipped') return 'No lleva CFDI: el receptor no es de México.';
  if (doc.locked) return 'El producto lo está procesando ahora mismo. Espera unos minutos.';
  return 'El documento cambió. Recarga la página.';
}
