import { opsRoute, readReason } from '@/lib/api';
import { failure, isUuid, ok } from '@/lib/http';
import { triggerCatalogRevalidate } from '@/lib/catalog';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

const ADMIN_ACTIONS = new Set(['verify_email', 'suspend', 'reactivate', 'unpublish_all']);
const ACTIONS = new Set([...ADMIN_ACTIONS, 'revoke_sessions']);

// Every account action changes someone else's access or visibility, so all of
// them require modo seguro on top of the role check.
export const POST = opsRoute<{ id: string }>(
  {
    admin: body => ADMIN_ACTIONS.has(String(body.action)),
    elevated: true,
    limit: ['account-action', 60, 300],
  },
  async ({ params, body, user, sql, ip }) => {
    const id = params.id;
    if (!isUuid(id)) return failure('ID inválido.', 400);
    const action = typeof body.action === 'string' ? body.action : '';
    if (!ACTIONS.has(action)) return failure('Acción inválida.', 400);
    const reason = readReason(body);
    if (!reason) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
    if (id === user.id && ['suspend', 'revoke_sessions', 'unpublish_all'].includes(action))
      return failure('No puedes aplicarte esta acción a ti mismo.', 422);

    const [target] = await sql`
      SELECT a.id, a.email, (r.account_id IS NOT NULL AND r.disabled_at IS NULL) AS is_ops
      FROM auth_accounts a LEFT JOIN solution_reviewers r ON r.account_id = a.id WHERE a.id = ${id}
    `;
    if (!target) return failure('Cuenta no encontrada.', 404);

    if (action === 'revoke_sessions') {
      if (target.is_ops && user.level !== 'admin')
        return failure('Solo un administrador puede cerrar sesiones de un miembro de ops.', 403);
      const [productSessions, opsSessions] = await sql.transaction([
        sql`DELETE FROM auth_sessions WHERE account_id = ${id} RETURNING token_hash`,
        sql`DELETE FROM ops_sessions WHERE account_id = ${id} RETURNING token_hash`,
        sql`
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          VALUES (${user.id}, ${user.email}, 'revoke_sessions', 'account', ${id}, ${reason}, '{}'::jsonb, ${ip})
        `,
      ]);
      return ok({
        revokedCount: productSessions.length + opsSessions.length,
        message: `Se cerraron ${productSessions.length + opsSessions.length} sesiones.`,
      });
    }

    if (action === 'verify_email') {
      const rows = await sql`
        WITH changed AS (
          UPDATE auth_accounts SET email_verified_at = now() WHERE id = ${id} AND email_verified_at IS NULL RETURNING id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'verify_email', 'account', id::text, ${reason}, '{}'::jsonb, ${ip} FROM changed
        )
        SELECT id FROM changed
      `;
      if (!rows.length) return failure('Ya estaba verificado.', 409);
      return ok({});
    }

    if (action === 'suspend') {
      const [changed] = await sql.transaction([
        sql`
          WITH changed AS (
            UPDATE auth_accounts SET suspended_at = now(), suspended_reason = left(${reason}, 500), suspended_by = ${user.id}
            WHERE id = ${id} AND suspended_at IS NULL RETURNING id
          ), logged AS (
            INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
            SELECT ${user.id}, ${user.email}, 'suspend', 'account', id::text, ${reason}, '{}'::jsonb, ${ip} FROM changed
          )
          SELECT id FROM changed
        `,
        sql`DELETE FROM auth_sessions WHERE account_id = ${id}`,
        sql`DELETE FROM ops_sessions WHERE account_id = ${id}`,
      ]);
      if (!changed.length) return failure('Ya estaba suspendida.', 409);
      return ok({ message: 'La cuenta no podrá entrar y sus sesiones se cerraron.' });
    }

    if (action === 'reactivate') {
      const rows = await sql`
        WITH changed AS (
          UPDATE auth_accounts SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL
          WHERE id = ${id} AND suspended_at IS NOT NULL RETURNING id
        ), logged AS (
          INSERT INTO ops_audit_log (actor_id, actor_email, action, subject_type, subject_id, reason, metadata, ip)
          SELECT ${user.id}, ${user.email}, 'reactivate', 'account', id::text, ${reason}, '{}'::jsonb, ${ip} FROM changed
        )
        SELECT id FROM changed
      `;
      if (!rows.length) return failure('No estaba suspendida.', 409);
      return ok({});
    }

    // unpublish_all
    const [solutions, lists] = await sql.transaction([
      sql`
        WITH changed AS (
          UPDATE founder_solutions SET published_data = NULL, published_at = NULL, status = 'changes_requested',
            version = version + 1, updated_at = now()
          WHERE owner_id = ${id} AND published_data IS NOT NULL
          RETURNING id
        ), event AS (
          INSERT INTO solution_events (solution_id, status, message, actor_id)
          SELECT id, 'changes_requested', ${'Publicación retirada por operaciones. ' + reason}, ${user.id} FROM changed
        )
        SELECT id FROM changed
      `,
      sql`UPDATE buyer_lists SET visibility = 'private', updated_at = now() WHERE owner_id = ${id} AND visibility = 'public' RETURNING id`,
    ]);
    const logged = await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'unpublish_all',
      subjectType: 'account',
      subjectId: id,
      reason,
      metadata: { solutions: solutions.length, lists: lists.length },
      ip,
    });
    if (solutions.length) await triggerCatalogRevalidate();
    return ok({
      solutionsUnpublished: solutions.length,
      listsHidden: lists.length,
      message: `${solutions.length} fichas retiradas y ${lists.length} listas ocultas.${logged ? '' : ' No se pudo registrar en la bitácora.'}`,
    });
  },
);
