import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { hashToken } from '@/lib/auth/password';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
export const runtime = 'nodejs';

/**
 * Closes other sessions of the signed-in account. The current session is never
 * revoked from here: signing yourself out is what the logout button is for, and
 * silently dropping your own cookie mid-action reads like a failure.
 *
 * A session is addressed by the SHA-256 of its token, which is what the database
 * already stores. The client only ever sees that hash, never a usable token.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure('Usa el formulario de tu cuenta.', 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure('Vuelve a iniciar sesión.', 401);
    const body = await solutionBody(request);
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!['revoke', 'revoke-others'].includes(action)) return failure('Acción no válida.', 400);
    if (!await securityLimit('account-sessions', account.id, 40)) return failure('Demasiados cambios. Intenta más tarde.', 429);

    const current = hashToken(request.cookies.get(sessionCookie)?.value ?? '');
    const sql = authSql();

    if (action === 'revoke-others') {
      const rows = await sql`DELETE FROM auth_sessions WHERE account_id = ${account.id} AND token_hash <> ${current} RETURNING token_hash`;
      return NextResponse.json({ ok: true, closed: rows.length }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const target = typeof body?.tokenHash === 'string' ? body.tokenHash : '';
    if (!/^[a-f0-9]{64}$/.test(target)) return failure('Sesión no encontrada.', 400);
    if (target === current) return failure('Esta es tu sesión actual. Usa cerrar sesión.', 400);
    const rows = await sql`DELETE FROM auth_sessions WHERE account_id = ${account.id} AND token_hash = ${target} RETURNING token_hash`;
    if (!rows.length) return failure('Esa sesión ya no está activa. Recarga la página.', 404);
    return NextResponse.json({ ok: true, closed: 1 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure('No pudimos cerrar la sesión. Intenta de nuevo.', 503);
  }
}
