import { opsRoute } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';

export const runtime = 'nodejs';

const ALLOWED_FROM: Record<string, string[]> = {
  publish: ['pending', 'changes_requested'],
  reject: ['pending', 'changes_requested'],
  changes_requested: ['pending'],
  withdraw: ['published'],
};

const NEW_STATUS: Record<string, string> = {
  publish: 'published',
  reject: 'rejected',
  changes_requested: 'changes_requested',
  withdraw: 'changes_requested',
};

// Self-review is deliberately allowed (CLAUDE.md §51): only the account holder
// decides what happens to their own listing, and the sole ops admin owns Cord.
// Every decision is still attributed by actor_id in solution_events and written
// to the audit log in the same statement as the change itself.
export const POST = opsRoute({ limit: ['review', 120, 600] }, async ({ body, user, sql, ip }) => {
  const { solutionId, action, message, version } = body;
  if (!isUuid(solutionId)) return failure('ID inválido.', 400);
  if (typeof action !== 'string' || !(action in ALLOWED_FROM))
    return failure('Acción inválida.', 400);
  if (typeof message !== 'string' || message.trim().length < 5 || message.length > 2000)
    return failure('El mensaje debe tener 5-2000 caracteres.', 400);
  if (typeof version !== 'number' || !Number.isSafeInteger(version))
    return failure('Versión requerida.', 400);

  const text = message.trim();
  const isPublishing = action === 'publish';
  const isWithdrawing = action === 'withdraw';

  const rows = await sql`
    WITH changed AS (
      UPDATE founder_solutions SET
        status = ${NEW_STATUS[action]},
        version = version + 1,
        updated_at = now(),
        published_at = CASE WHEN ${isPublishing} THEN now() WHEN ${isWithdrawing} THEN NULL ELSE published_at END,
        published_data = CASE WHEN ${isPublishing} THEN data WHEN ${isWithdrawing} THEN NULL ELSE published_data END
      WHERE id = ${solutionId} AND version = ${version} AND status = ANY(${ALLOWED_FROM[action]}::text[])
      RETURNING id, status, version
    ), event AS (
      INSERT INTO solution_events (solution_id, status, message, actor_id)
      SELECT id, status, ${text}, ${user.id} FROM changed
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, ${'solution_' + action}, 'solution', id::text, left(${text}, 1000),
        jsonb_build_object('fromVersion', ${version}::int, 'toStatus', status), ${ip}
      FROM changed
    )
    SELECT * FROM changed
  `;
  if (!rows.length)
    return failure(
      'La postulación cambió o no admite esta acción. Recarga e intenta de nuevo.',
      409,
    );

  // Only publish/withdraw change what the catalog reads.
  if (isPublishing || isWithdrawing) await triggerCatalogRevalidate();

  return ok({ newStatus: String(rows[0].status), version: Number(rows[0].version) });
});
