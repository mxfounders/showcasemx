import { NextRequest, NextResponse, after } from 'next/server';
import { securityLimit } from '@/lib/auth/security';
import { consumeReset } from '@/lib/auth/recovery';
import { securityNotice } from '@/lib/auth/security-notices';
import { readUserAgent } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { passwordLeaked } from '@/lib/auth/pwned';
import { credentialErrors } from '@/lib/auth/validation';
import { cookieOptions, sessionCookie } from '@/lib/auth/session';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).auth.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useForm, 403);
  try {
    const body = await solutionBody(request);
    if (!body || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token))
      return failure(t.resetLinkInvalid, 400);
    if (
      typeof body.password !== 'string' ||
      credentialErrors('valid@example.com', body.password).password ||
      body.confirm !== body.password
    )
      return failure(t.resetPasswordInvalid, 400);
    if (!(await securityLimit('reset', body.token))) return failure(t.resetTooMany, 429);
    if ((await passwordLeaked(body.password)) === true) return failure(t.passwordLeaked, 400);
    const resetAccount = await consumeReset(body.token, await hashPassword(body.password));
    if (!resetAccount) return failure(t.resetLinkUsed, 400);
    after(() =>
      securityNotice(resetAccount, 'password-reset', readUserAgent(request.headers)).catch(
        () => undefined,
      ),
    );
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return failure(t.resetUnavailable, 503);
  }
}
