import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, requireAdmin, isUuid, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';

const ADMIN_ACTIONS = new Set(['verify_email', 'suspend', 'reactivate', 'unpublish_all']);

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!isUuid(id)) return failure('ID inválido.', 400);
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  const body = await opsBody(req);
  const action = typeof body?.action === 'string' ? body.action : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  const isAdminAction = ADMIN_ACTIONS.has(action);
  const user = isAdminAction ? await requireAdmin() : await requireOpsApi();
  if (user instanceof Response) return user;

  if (!(await opsLimit('account-action', requestIdentity(req.headers), 40, 300))) return failure('Demasiados cambios. Intenta más tarde.', 429);
  if (reason.length < 10 || reason.length > 1000) return failure('Explica el motivo (mínimo 10 caracteres).', 400);
  if (id === user.id && ['suspend', 'revoke_sessions'].includes(action)) {
    return failure('No puedes aplicarte esta acción a ti mismo.', 422);
  }

  try {
    const sql = getDb();

    if (action === 'revoke_sessions') {
      const [productSessions, opsSessions] = await sql.transaction([
        sql`DELETE FROM auth_sessions WHERE account_id = ${id} RETURNING token_hash`,
        sql`DELETE FROM ops_sessions WHERE account_id = ${id} RETURNING token_hash`,
      ]);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'revoke_sessions', subjectType: 'account', subjectId: id, reason, metadata: { productSessions: productSessions.length, opsSessions: opsSessions.length }, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true, revokedCount: productSessions.length + opsSessions.length }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'verify_email') {
      const rows = await sql`UPDATE auth_accounts SET email_verified_at = now() WHERE id = ${id} AND email_verified_at IS NULL RETURNING id`;
      if (!rows.length) return failure('Ya estaba verificado.', 409);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'verify_email', subjectType: 'account', subjectId: id, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'suspend') {
      const result = await sql.transaction([
        sql`UPDATE auth_accounts SET suspended_at = now(), suspended_reason = ${reason}, suspended_by = ${user.id} WHERE id = ${id} AND suspended_at IS NULL RETURNING id`,
        sql`DELETE FROM auth_sessions WHERE account_id = ${id}`,
        sql`DELETE FROM ops_sessions WHERE account_id = ${id}`,
      ]);
      if (!result[0].length) return failure('Ya estaba suspendida.', 409);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'suspend', subjectType: 'account', subjectId: id, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'reactivate') {
      const rows = await sql`UPDATE auth_accounts SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL WHERE id = ${id} AND suspended_at IS NOT NULL RETURNING id`;
      if (!rows.length) return failure('No estaba suspendida.', 409);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'reactivate', subjectType: 'account', subjectId: id, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'unpublish_all') {
      const result = await sql.transaction([
        sql`WITH changed AS (
          UPDATE founder_solutions SET published_data = NULL, published_at = NULL, status = 'changes_requested', version = version + 1, updated_at = now()
          WHERE owner_id = ${id} AND published_data IS NOT NULL
          RETURNING id
        ), event AS (
          INSERT INTO solution_events (solution_id, status, message, actor_id)
          SELECT id, 'changes_requested', ${'Publicación retirada por operaciones. ' + reason}, ${user.id} FROM changed
        )
        SELECT * FROM changed`,
        sql`UPDATE buyer_lists SET visibility = 'private', updated_at = now() WHERE owner_id = ${id} AND visibility = 'public' RETURNING id`,
      ]);
      await audit({ actorId: user.id, actorEmail: user.email, action: 'unpublish_all', subjectType: 'account', subjectId: id, reason, metadata: { solutions: result[0].length, lists: result[1].length }, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true, solutionsUnpublished: result[0].length, listsHidden: result[1].length }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return failure('Acción inválida.', 400);
  } catch (err) {
    console.error('[ops/account-actions]', err);
    return failure('Error interno.', 503);
  }
}
