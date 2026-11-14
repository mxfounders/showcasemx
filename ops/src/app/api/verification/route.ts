import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import {
  REQUIRED_CHECK_IDS,
  VERIFICATION_CHECK_IDS,
  readTaxIdentity,
  recognitionHost,
} from '@/lib/recognition';

export const runtime = 'nodejs';

const ACTIONS = ['verify', 'revoke', 'tax-save', 'tax-delete'] as const;
type Action = (typeof ACTIONS)[number];

/**
 * «Verificado por shwcs» and the listing's tax identity, decided by the team
 * (docs/recognition.md). Founders never type an RFC: the team checks it here.
 *
 * Every mutation writes its ops_audit_log entry in the same statement as the change.
 * The tax id itself never goes into the audit reason or metadata, only the country.
 * Revoking follows withdraw (POST /api/review): any reviewer may do it, with a reason.
 */
export const POST = opsRoute(
  { limit: ['verification', 120, 600] },
  async ({ body, user, sql, ip }) => {
    const { solutionId } = body;
    const action = body.action as Action;
    if (!isUuid(solutionId)) return failure('ID inválido.', 400);
    if (!ACTIONS.includes(action)) return failure('Acción inválida.', 400);

    if (action === 'verify') {
      const checks = Array.isArray(body.checks)
        ? Array.from(new Set(body.checks.filter((c): c is string => typeof c === 'string')))
        : [];
      if (!checks.length || checks.some(c => !VERIFICATION_CHECK_IDS.includes(c)))
        return failure('Comprobaciones inválidas.', 400);
      if (REQUIRED_CHECK_IDS.some(c => !checks.includes(c)))
        return failure('Confirma el sitio, el producto y quién representa al proyecto.', 400);
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length < 10 || note.length > 1000)
        return failure('La nota interna debe tener 10–1000 caracteres.', 400);

      const [row] = await sql`
        SELECT status, published_data IS NOT NULL AS published,
          COALESCE(published_data->>'website', data->>'website') AS website
        FROM founder_solutions WHERE id = ${solutionId}`;
      if (!row) return failure('No existe esa ficha.', 404);
      if (!row.published && !['pending', 'changes_requested'].includes(String(row.status)))
        return failure('Solo se verifican fichas publicadas o enviadas a revisión.', 409);
      const website = row.website ? String(row.website) : '';
      const host = recognitionHost(website);
      if (!host) return failure('La ficha no tiene un sitio válido que verificar.', 409);

      // The website is re-checked inside the statement: if the founder changed it after
      // this page loaded, nothing is written and the reviewer reloads.
      const rows = await sql`
        WITH target AS (
          SELECT id FROM founder_solutions
          WHERE id = ${solutionId}
            AND COALESCE(published_data->>'website', data->>'website') = ${website}
            AND (published_data IS NOT NULL OR status IN ('pending', 'changes_requested'))
        ), changed AS (
          INSERT INTO solution_verifications (solution_id, host, checks, note, verified_by, verified_at)
          SELECT id, ${host}, ${checks}::text[], ${note}, ${user.id}, now() FROM target
          ON CONFLICT (solution_id) DO UPDATE SET host = EXCLUDED.host, checks = EXCLUDED.checks,
            note = EXCLUDED.note, verified_by = EXCLUDED.verified_by, verified_at = now()
          RETURNING solution_id, host
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'solution_verify', 'solution', solution_id::text, left(${note}, 1000),
            jsonb_build_object('host', host, 'checks', to_jsonb(${checks}::text[])), ${ip}
          FROM changed
        )
        SELECT * FROM changed`;
      if (!rows.length)
        return failure('La ficha cambió mientras la revisabas. Recarga e intenta de nuevo.', 409);
      await triggerCatalogRevalidate();
      return ok({ host });
    }

    if (action === 'revoke') {
      const reason = readReason(body);
      if (!reason) return failure('Escribe un motivo de al menos 10 caracteres.', 400);
      const rows = await sql`
        WITH removed AS (
          DELETE FROM solution_verifications WHERE solution_id = ${solutionId}
          RETURNING solution_id, host
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'solution_unverify', 'solution', solution_id::text, ${reason},
            jsonb_build_object('host', host), ${ip}
          FROM removed
        )
        SELECT * FROM removed`;
      if (!rows.length) return failure('La ficha ya no estaba verificada.', 409);
      await triggerCatalogRevalidate();
      return ok({});
    }

    // Tax identity: internal only. Feeds the 69-B lookup and the «Compra comprobada»
    // review level; it is never published and never written to the audit log.
    const reason = readReason(body);
    if (!reason) return failure('Escribe un motivo de al menos 10 caracteres.', 400);

    if (action === 'tax-save') {
      const identity = readTaxIdentity(body.country, body.taxId);
      if (!identity.ok) return failure(identity.error, 400);
      const rows = await sql`
        WITH target AS (SELECT id FROM founder_solutions WHERE id = ${solutionId}),
        changed AS (
          INSERT INTO solution_tax_identities (solution_id, country, tax_id)
          SELECT id, ${identity.country}, ${identity.taxId} FROM target
          ON CONFLICT (solution_id) DO UPDATE
            SET country = EXCLUDED.country, tax_id = EXCLUDED.tax_id, updated_at = now()
          RETURNING solution_id, country
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'tax_identity_save', 'solution', solution_id::text, ${reason},
            jsonb_build_object('country', country), ${ip}
          FROM changed
        )
        SELECT * FROM changed`;
      if (!rows.length) return failure('No existe esa ficha.', 404);
      return ok({ country: identity.country, taxId: identity.taxId });
    }

    const rows = await sql`
      WITH removed AS (
        DELETE FROM solution_tax_identities WHERE solution_id = ${solutionId}
        RETURNING solution_id, country
      ), logged AS (
        INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
        SELECT ${user.id}, ${user.email}, 'tax_identity_delete', 'solution', solution_id::text, ${reason},
          jsonb_build_object('country', country), ${ip}
        FROM removed
      )
      SELECT * FROM removed`;
    if (!rows.length) return failure('La ficha no tenía identidad fiscal.', 409);
    return ok({});
  },
);
