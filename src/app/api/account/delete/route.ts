import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie, cookieOptions } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
export const runtime = 'nodejs';

// Next only allows its own fields as route exports, so this stays module-local.
// The client copy lives in components/settings/data-controls.tsx.
const DELETE_CONFIRMATION = 'ELIMINAR';

/**
 * Permanent account deletion (right to erasure).
 *
 * Guarded by the current password plus a typed confirmation, because the effect
 * reaches beyond this account: every foreign key to `auth_accounts` cascades, so
 * published fichas disappear from the catalogue and contact conversations are
 * removed for the other participant too. The interface states that before asking.
 *
 * There is no soft delete and no recovery window. If a retention policy is ever
 * decided, it has to be built here rather than assumed.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure('Usa el formulario de tu cuenta.', 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure('Vuelve a iniciar sesión.', 401);
    const body = await solutionBody(request);
    if (typeof body?.password !== 'string' || body.password.length > 4096) return failure('Escribe tu contraseña para confirmar.', 400);
    if (body.confirm !== DELETE_CONFIRMATION) return failure(`Escribe ${DELETE_CONFIRMATION} para confirmar.`, 400);
    if (!await securityLimit('account-delete', account.id, 5)) return failure('Demasiados intentos. Intenta más tarde.', 429);

    const sql = authSql();
    const [row] = await sql`SELECT password_hash FROM auth_accounts WHERE id = ${account.id}`;
    if (!row) return failure('Vuelve a iniciar sesión.', 401);
    if (!await verifyPassword(body.password, String(row.password_hash))) return failure('La contraseña no es correcta.', 400);

    // Matching the hash again makes a concurrent password change abort the delete.
    const deleted = await sql`DELETE FROM auth_accounts WHERE id = ${account.id} AND password_hash = ${row.password_hash} RETURNING id`;
    if (!deleted.length) return failure('Tu acceso cambió. Vuelve a iniciar sesión.', 409);

    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return failure('No pudimos eliminar la cuenta. Intenta de nuevo.', 503);
  }
}
