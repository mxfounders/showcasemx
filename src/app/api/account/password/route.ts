import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie, cookieOptions } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { credentialErrors } from '@/lib/auth/validation';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.useAccountForm, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signInAgain, 401);
    const body = await solutionBody(request);
    if (
      !body ||
      typeof body.currentPassword !== 'string' ||
      body.currentPassword.length > 4096 ||
      typeof body.password !== 'string' ||
      credentialErrors(account.email, body.password).password ||
      body.confirm !== body.password
    )
      return failure(t.passwordInvalid, 400);
    if (!(await securityLimit('change-password', account.id)))
      return failure(t.tooManyAttempts, 429);
    const sql = authSql();
    const rows = await sql`SELECT password_hash FROM auth_accounts WHERE id=${account.id}`;
    if (
      !rows.length ||
      !(await verifyPassword(body.currentPassword, String(rows[0].password_hash)))
    )
      return failure(t.currentPasswordWrong, 400);
    if (body.currentPassword === body.password) return failure(t.passwordUnchanged, 400);
    const hash = await hashPassword(body.password);
    const changed =
      await sql`WITH changed AS (UPDATE auth_accounts SET password_hash=${hash} WHERE id=${account.id} AND password_hash=${rows[0].password_hash} RETURNING id), sessions AS (DELETE FROM auth_sessions WHERE account_id IN(SELECT id FROM changed)), tokens AS (DELETE FROM auth_password_resets WHERE account_id IN(SELECT id FROM changed)) SELECT id FROM changed`;
    if (!changed.length) return failure(t.accessChanged, 409);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return failure(t.passwordUnavailable, 503);
  }
}
