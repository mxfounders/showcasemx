import { opsRoute, readReason, type OpsContext } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import { isSignalCode } from '@/lib/fraud';

export const runtime = 'nodejs';

const MAX_BATCH = 100;

/**
 * Marks accounts as suspicious, or clears the mark (SHCWS-141). A marked account keeps
 * everything it did, visible as before, but its likes, saves, comments and reviews stop
 * counting in the catalogue order, the weekly award and «Populares» (account_flagged(),
 * db/account-flags.sql). It changes how someone else's work ranks, so it is admin + modo
 * seguro with a reason, and each account's audit entry is written in the same statement.
 */
export const POST = opsRoute(
  { admin: true, elevated: true, limit: ['account-flag', 60, 300] },
  async ctx => {
    const reason = readReason(ctx.body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    const [table] = await ctx.sql`SELECT to_regclass('account_flags') IS NOT NULL AS ok`;
    if (!table?.ok)
      return failure('Falta aplicar db/account-flags.sql en esta base de datos.', 503);
    switch (ctx.body.action) {
      case 'flag':
        return flag(ctx, reason);
      case 'unflag':
        return unflag(ctx, reason);
      default:
        return failure('Acción inválida.', 400);
    }
  },
);

type Ctx = OpsContext<Record<string, string>>;

async function flag({ body, sql, user, ip }: Ctx, reason: string) {
  const raw = Array.isArray(body.accountIds) ? body.accountIds : [];
  const ids = [...new Set(raw)];
  if (!ids.length || ids.length > MAX_BATCH || !ids.every(isUuid))
    return failure(`Elige entre 1 y ${MAX_BATCH} cuentas válidas.`, 400);
  if (ids.includes(user.id)) return failure('No puedes marcar tu propia cuenta.', 422);
  const signals = Array.isArray(body.signals)
    ? [...new Set(body.signals.filter(isSignalCode))]
    : [];
  const targetType =
    body.targetType === 'solution' || body.targetType === 'list' ? body.targetType : null;
  const targetId = targetType && isUuid(body.targetId) ? body.targetId : null;
  if (targetType && !targetId) return failure('Contexto inválido.', 400);

  const rows = await sql`
    WITH inserted AS (
      INSERT INTO account_flags (account_id, reason, signals, target_type, target_id, flagged_by)
      SELECT a.id, ${reason}, ${signals}::text[], ${targetType}::text, ${targetId}::uuid, ${user.id}
      FROM auth_accounts a WHERE a.id = ANY(${ids}::uuid[])
      ON CONFLICT (account_id) WHERE cleared_at IS NULL DO NOTHING
      RETURNING id, account_id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'account_flag', 'account', account_id::text, ${reason},
        jsonb_build_object('flag', id, 'signals', to_jsonb(${signals}::text[]),
          'targetType', ${targetType}::text, 'targetId', ${targetId}::text, 'batch', ${ids.length}::int),
        ${ip}
      FROM inserted
    )
    SELECT account_id FROM inserted
  `;
  if (!rows.length) return failure('Ninguna cuenta cambió: ya estaban marcadas o no existen.', 409);
  await triggerCatalogRevalidate();
  const skipped = ids.length - rows.length;
  return ok({
    flagged: rows.length,
    message:
      `${rows.length === 1 ? 'Su actividad deja' : `La actividad de ${rows.length} cuentas deja`} de contar en el orden (el catálogo se actualiza en ≤ 5 min).` +
      (skipped ? ` ${skipped} ya estaban marcadas.` : ''),
  });
}

async function unflag({ body, sql, user, ip }: Ctx, reason: string) {
  if (!isUuid(body.accountId)) return failure('ID inválido.', 400);
  const rows = await sql`
    WITH changed AS (
      UPDATE account_flags SET cleared_at = now(), cleared_by = ${user.id}, cleared_reason = ${reason}
      WHERE account_id = ${body.accountId} AND cleared_at IS NULL
      RETURNING id, account_id
    ), logged AS (
      INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
      SELECT ${user.id}, ${user.email}, 'account_unflag', 'account', account_id::text, ${reason},
        jsonb_build_object('flag', id), ${ip}
      FROM changed
    )
    SELECT account_id FROM changed
  `;
  if (!rows.length) return failure('La cuenta no estaba marcada.', 409);
  await triggerCatalogRevalidate();
  return ok({ message: 'Su actividad vuelve a contar en el orden (≤ 5 min en el catálogo).' });
}
