import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, sameOrigin, opsLimit, requestIdentity, audit, requestIp } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure, opsBody } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireAdmin();
  if (user instanceof Response) return user;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.email, r.level, r.created_at, r.disabled_at, r.totp_confirmed_at,
        (SELECT max(last_seen_at) FROM ops_sessions s WHERE s.account_id = a.id) AS last_seen_at,
        granter.email AS granted_by_email
      FROM solution_reviewers r
      JOIN auth_accounts a ON a.id = r.account_id
      LEFT JOIN auth_accounts granter ON granter.id = r.granted_by
      ORDER BY r.created_at ASC
    `;
    return NextResponse.json({
      ok: true,
      items: rows.map(r => ({
        id: String(r.id), email: String(r.email), level: r.level === 'admin' ? 'admin' : 'reviewer',
        createdAt: String(r.created_at), disabledAt: r.disabled_at ? String(r.disabled_at) : null,
        totpConfirmed: Boolean(r.totp_confirmed_at), lastSeenAt: r.last_seen_at ? String(r.last_seen_at) : null,
        grantedByEmail: r.granted_by_email ?? null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/team]', err);
    return failure('Error interno.', 503);
  }
}

async function activeAdminCount(sql: ReturnType<typeof getDb>): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS n FROM solution_reviewers WHERE level = 'admin' AND disabled_at IS NULL`;
  return Number(rows[0]?.n ?? 0);
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);
  if (!(await opsLimit('team', requestIdentity(req.headers), 30, 200))) return failure('Demasiados cambios. Intenta más tarde.', 429);

  const body = await opsBody(req);
  const action = body?.action;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 1000) return failure('Explica el motivo (mínimo 10 caracteres).', 400);

  try {
    const sql = getDb();

    if (action === 'add') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email) return failure('Correo requerido.', 400);
      const targets = await sql`SELECT id FROM auth_accounts WHERE email = ${email} LIMIT 1`;
      if (!targets.length) return failure('No existe cuenta con ese correo.', 404);
      const targetId = String(targets[0].id);
      await sql`INSERT INTO solution_reviewers (account_id, level, granted_by) VALUES (${targetId}, 'reviewer', ${user.id}) ON CONFLICT (account_id) DO UPDATE SET disabled_at = NULL`;
      await audit({ actorId: user.id, actorEmail: user.email, action: 'team_add', subjectType: 'account', subjectId: targetId, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true, message: `${email} ahora tiene acceso a ops. Debe configurar su autenticador en el primer inicio de sesión.` }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const targetId = typeof body?.accountId === 'string' ? body.accountId : '';
    if (!targetId) return failure('Cuenta requerida.', 400);

    if (action === 'remove' || action === 'disable') {
      const target = await sql`SELECT level FROM solution_reviewers WHERE account_id = ${targetId} LIMIT 1`;
      if (!target.length) return failure('No encontrado.', 404);
      if (target[0].level === 'admin' && (await activeAdminCount(sql)) <= 1) {
        return failure('No puedes quitar al último administrador.', 422);
      }
      if (action === 'remove') {
        await sql`DELETE FROM solution_reviewers WHERE account_id = ${targetId}`;
      } else {
        await sql`UPDATE solution_reviewers SET disabled_at = now() WHERE account_id = ${targetId}`;
      }
      await sql`DELETE FROM ops_sessions WHERE account_id = ${targetId}`;
      await audit({ actorId: user.id, actorEmail: user.email, action: `team_${action}`, subjectType: 'account', subjectId: targetId, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'enable') {
      await sql`UPDATE solution_reviewers SET disabled_at = NULL WHERE account_id = ${targetId}`;
      await audit({ actorId: user.id, actorEmail: user.email, action: 'team_enable', subjectType: 'account', subjectId: targetId, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'set_level') {
      const level = body?.level === 'admin' ? 'admin' : body?.level === 'reviewer' ? 'reviewer' : null;
      if (!level) return failure('Nivel inválido.', 400);
      const target = await sql`SELECT level FROM solution_reviewers WHERE account_id = ${targetId} LIMIT 1`;
      if (!target.length) return failure('No encontrado.', 404);
      if (target[0].level === 'admin' && level === 'reviewer' && (await activeAdminCount(sql)) <= 1) {
        return failure('No puedes quitar al último administrador.', 422);
      }
      await sql`UPDATE solution_reviewers SET level = ${level} WHERE account_id = ${targetId}`;
      await audit({ actorId: user.id, actorEmail: user.email, action: 'team_set_level', subjectType: 'account', subjectId: targetId, reason, metadata: { level }, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'reset_totp') {
      await sql`UPDATE solution_reviewers SET totp_secret = NULL, totp_confirmed_at = NULL, totp_last_step = NULL, backup_codes = '{}' WHERE account_id = ${targetId}`;
      await sql`DELETE FROM ops_sessions WHERE account_id = ${targetId}`;
      await audit({ actorId: user.id, actorEmail: user.email, action: 'team_reset_totp', subjectType: 'account', subjectId: targetId, reason, ip: requestIp(req.headers) });
      return NextResponse.json({ ok: true, message: 'Deberá configurar su autenticador de nuevo en el próximo inicio de sesión.' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return failure('Acción inválida.', 400);
  } catch (err) {
    console.error('[ops/team]', err);
    return failure('Error interno.', 503);
  }
}
