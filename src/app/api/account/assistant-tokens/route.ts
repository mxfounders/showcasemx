import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, readUserAgent, sessionCookie } from '@/lib/auth/session';
import { securityNotice } from '@/lib/auth/security-notices';
import { authSql, securityLimit } from '@/lib/auth/security';
import { verifyPassword } from '@/lib/auth/password';
import { readSecondFactorCode, spendSecondFactor } from '@/lib/auth/second-factor';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { createToken, readLifetime, readTokenName, revokeToken } from '@/lib/assistant/tokens';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

/**
 * Creates or revokes a personal token for the founder's AI assistant (SHCWS-152).
 *
 * Both re-ask for the password, like linking Google: a session cookie alone can't mint a
 * credential or take one away. Creating also spends a second-factor code when the account
 * has one, so a stolen password alone can't hand someone a token (SHCWS-173). The secret
 * is in the response once and never again; a security notice tells the owner right away.
 */
export async function POST(request: NextRequest) {
  const locale = requestLocale(request);
  const t = (await getDictionary(locale)).assistant.card.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useAccount, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    const action = body?.action;
    if (action !== 'create' && action !== 'revoke') return failure(t.unavailable, 400);
    if (typeof body?.password !== 'string' || !body.password || body.password.length > 4096)
      return failure(t.password, 400);
    const name = action === 'create' ? readTokenName(body.name) : null;
    const days = action === 'create' ? readLifetime(body.days) : null;
    if (action === 'create' && !name) return failure(t.name, 400);
    if (action === 'create' && !days) return failure(t.lifetime, 400);
    const tokenId = typeof body.id === 'string' ? body.id : '';
    if (action === 'revoke' && !isSolutionId(tokenId)) return failure(t.notFound, 404);
    if (!(await securityLimit('assistant-tokens', account.id, 20))) return failure(t.tooMany, 429);
    const sql = authSql();
    const [row] =
      await sql`SELECT password_hash, totp_confirmed_at FROM auth_accounts WHERE id = ${account.id}`;
    if (!row) return failure(t.signIn, 401);
    if (!(await verifyPassword(body.password, String(row.password_hash))))
      return failure(t.passwordWrong, 400);

    if (action === 'revoke') {
      if (!(await revokeToken(account.id, tokenId))) return failure(t.notFound, 404);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (row.totp_confirmed_at) {
      const code = readSecondFactorCode(body.code);
      if (!code) return failure(t.code, 400);
      if (!(await spendSecondFactor(account.id, code))) return failure(t.codeWrong, 400);
    }
    const created = await createToken({
      accountId: account.id,
      passwordHash: String(row.password_hash),
      name: name!,
      days: days!,
      locale: locale === 'en' ? 'en' : 'es',
    });
    if (created === 'limit') return failure(t.limit, 409);
    if (created === 'changed') return failure(t.changed, 409);
    after(() =>
      securityNotice(account.id, 'assistant-token', readUserAgent(request.headers)).catch(
        () => undefined,
      ),
    );
    return NextResponse.json(
      { ok: true, id: created.id, token: created.token },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.unavailable, 503);
  }
}
