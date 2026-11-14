import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import { EDITORIAL_PER_MONTH, monthBounds } from '@/lib/recognition';

export const runtime = 'nodejs';

/**
 * Recognitions (docs/recognition.md, db/solution-recognition.sql).
 *
 * create-editorial: «Selección shwcs» for a month. Admin only. The actor can never pick
 *   a listing they own (conflict of interest), at most three picks stand per month and a
 *   listing is picked once per month. The note is public: why the team chose it.
 * revoke: any award, weekly or editorial, with a reason. The row and its slot stay; nobody
 *   inherits a revoked place.
 *
 * Both write ops_audit_log in the same statement, on the solution's subject so they also
 * show in that listing's history.
 */
export const POST = opsRoute(
  { admin: true, limit: ['awards', 60, 300] },
  async ({ body, user, sql, ip }) => {
    const action = body.action;

    if (action === 'create-editorial') {
      const { solutionId } = body;
      if (!isUuid(solutionId)) return failure('Elige una ficha publicada.', 400);
      const month = monthBounds(body.month);
      if (!month) return failure('Mes inválido.', 400);
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length < 10 || note.length > 280)
        return failure('El motivo público debe tener 10–280 caracteres.', 400);
      const reason = readReason(body);
      if (!reason) return failure('Escribe un motivo interno de al menos 10 caracteres.', 400);

      // The advisory lock serializes picks for the same month, so two admins at once can
      // never both pass the three-per-month check.
      const [, created] = await sql.transaction([
        sql`SELECT pg_advisory_xact_lock(hashtext(${'editorial:' + month.start}))`,
        sql`
          WITH target AS (
            SELECT id FROM founder_solutions
            WHERE id = ${solutionId} AND published_data IS NOT NULL AND owner_id <> ${user.id}
          ), capacity AS (
            SELECT count(*)::int AS n FROM solution_awards
            WHERE kind = 'editorial' AND period_start = ${month.start} AND revoked_at IS NULL
          ), created AS (
            INSERT INTO solution_awards (solution_id, kind, scope, period_start, period_end, note, awarded_by)
            SELECT target.id, 'editorial', 'all', ${month.start}, ${month.end}, ${note}, ${user.id}
            FROM target, capacity WHERE capacity.n < ${EDITORIAL_PER_MONTH}
            ON CONFLICT DO NOTHING
            RETURNING id, solution_id, period_start
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'award_editorial_create', 'solution', solution_id::text, ${reason},
              jsonb_build_object('awardId', id, 'month', period_start::text, 'note', ${note}::text), ${ip}
            FROM created
          )
          SELECT * FROM created`,
      ]);
      if (created.length) {
        await triggerCatalogRevalidate();
        return ok({ id: String(created[0].id) });
      }

      // Nothing written: say which guard stopped it.
      const [why] = await sql`
        SELECT
          (SELECT published_data IS NOT NULL FROM founder_solutions WHERE id = ${solutionId}) AS published,
          (SELECT owner_id = ${user.id}::uuid FROM founder_solutions WHERE id = ${solutionId}) AS own,
          (SELECT count(*)::int FROM solution_awards WHERE kind = 'editorial'
            AND period_start = ${month.start} AND revoked_at IS NULL) AS taken,
          EXISTS (SELECT 1 FROM solution_awards WHERE kind = 'editorial' AND solution_id = ${solutionId}
            AND period_start = ${month.start} AND revoked_at IS NULL) AS already`;
      if (!why?.published) return failure('Solo se eligen fichas publicadas.', 409);
      if (why.own)
        return failure(
          'No puedes elegir una ficha de tu propia cuenta: sería un conflicto de interés.',
          409,
        );
      if (why.already) return failure('Esta ficha ya es Selección shwcs de ese mes.', 409);
      if (Number(why.taken) >= EDITORIAL_PER_MONTH)
        return failure(`Ya hay ${EDITORIAL_PER_MONTH} selecciones ese mes.`, 409);
      return failure('No se pudo crear la selección. Recarga e intenta de nuevo.', 409);
    }

    if (action === 'revoke') {
      const { awardId } = body;
      if (!isUuid(awardId)) return failure('ID inválido.', 400);
      const reason = readReason(body, 10, 500);
      if (!reason) return failure('Escribe un motivo de 10–500 caracteres.', 400);
      const rows = await sql`
        WITH changed AS (
          UPDATE solution_awards SET revoked_at = now(), revoked_reason = ${reason}
          WHERE id = ${awardId} AND revoked_at IS NULL
          RETURNING id, solution_id, kind, scope, rank, period_start
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'award_revoke', 'solution', solution_id::text, ${reason},
            jsonb_build_object('awardId', id, 'kind', kind, 'scope', scope, 'rank', rank,
              'periodStart', period_start::text), ${ip}
          FROM changed
        )
        SELECT * FROM changed`;
      if (!rows.length) return failure('Ese reconocimiento ya estaba revocado o no existe.', 409);
      await triggerCatalogRevalidate();
      return ok({});
    }

    return failure('Acción inválida.', 400);
  },
);
