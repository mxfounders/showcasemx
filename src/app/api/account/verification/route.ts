import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit, authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import {
  requestVerification,
  consumeVerification,
  validVerificationToken,
} from '@/lib/auth/verification';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useShwcs, 403);
  try {
    const body = await solutionBody(request);
    if (!body) return failure(t.invalidRequest, 400);
    if (body.action === 'confirm') {
      if (!validVerificationToken(body.token)) return failure(t.verificationLinkInvalid, 400);
      if (!(await securityLimit('verify-token', body.token, 5)))
        return failure(t.tooManyAttemptsShort, 429);
      if (!(await consumeVerification(body.token))) return failure(t.verificationLinkUsed, 400);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    if (body.action !== 'send') return failure(t.invalidActionAlt, 400);
    const sql = authSql();
    const [row] = await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
    if (row?.email_verified_at) return NextResponse.json({ ok: true, verified: true });
    if (!recoveryConfig()) return failure(t.emailNotEnabled, 503);
    if (!(await securityLimit('verify-email', account.id, 3)))
      return failure(t.verificationWait, 429);
    await requestVerification(account);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.verificationUnavailable, 503);
  }
}
