import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, readUserAgent, sessionCookie } from '@/lib/auth/session';
import { securityNotice } from '@/lib/auth/security-notices';
import { authSql, securityLimit } from '@/lib/auth/security';
import { verifyPassword, hashToken } from '@/lib/auth/password';
import { googleCookie, googleConfig, beginGoogle, googleCookieOptions } from '@/lib/auth/google';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useAccount, 403);
  try {
    const session = request.cookies.get(sessionCookie)?.value ?? '',
      account = await getSession(session);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (
      !['link', 'unlink'].includes(String(body?.action)) ||
      typeof body?.password !== 'string' ||
      body.password.length > 4096
    )
      return failure(t.googlePasswordMissing, 400);
    if (!(await securityLimit('google-account', account.id, 5)))
      return failure(t.tooManyAttemptsShort, 429);
    const sql = authSql();
    const [row] =
      await sql`SELECT password_hash, email_verified_at FROM auth_accounts WHERE id=${account.id}`;
    if (!(await verifyPassword(body.password, String(row.password_hash))))
      return failure(t.googlePasswordWrong, 400);
    if (body.action === 'unlink') {
      const result = await sql.transaction([
        sql`SELECT id FROM auth_accounts WHERE id=${account.id} FOR UPDATE`,
        sql`WITH changed AS (DELETE FROM auth_google_identities g USING auth_accounts a WHERE g.account_id=a.id AND a.id=${account.id} AND a.password_hash=${row.password_hash} RETURNING g.account_id), sessions AS (DELETE FROM auth_sessions WHERE account_id IN(SELECT account_id FROM changed)) SELECT * FROM changed`,
      ]);
      if (!result[1].length) return failure(t.googleChanged, 409);
      after(() =>
        securityNotice(account.id, 'google-unlinked', readUserAgent(request.headers)).catch(
          () => undefined,
        ),
      );
      return NextResponse.json(
        { ok: true, logout: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    // Only an owner who proved the inbox may attach a Google identity (SHCWS-159). Otherwise
    // whoever registered someone else's address first could link their own Google and keep
    // signing in after the real owner recovers the account by email.
    if (!row.email_verified_at) return failure(t.googleVerifyFirst, 409);
    const config = googleConfig();
    if (!config) return failure(t.googleNotConfigured, 503);
    if (config.origin !== request.nextUrl.origin) return failure(t.googleUseMainDomain, 403);
    const result = await beginGoogle(undefined, {
      accountId: account.id,
      sessionHash: hashToken(session),
      passwordHash: String(row.password_hash),
    });
    const response = NextResponse.json(
      { ok: true, url: result.url },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(googleCookie, result.cookie, googleCookieOptions);
    return response;
  } catch {
    return failure(t.googleUnavailable, 503);
  }
}
