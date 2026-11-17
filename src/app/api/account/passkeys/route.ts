import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, readUserAgent, sessionCookie } from '@/lib/auth/session';
import { hashToken, verifyPassword } from '@/lib/auth/password';
import { readSecondFactorCode, spendSecondFactor } from '@/lib/auth/second-factor';
import { authSql, securityLimit } from '@/lib/auth/security';
import { securityNotice } from '@/lib/auth/security-notices';
import {
  finishRegistration,
  passkeyName,
  registrationOptions,
  relyingParty,
  removePasskey,
  userHandle,
  validPasskeyName,
} from '@/lib/auth/passkeys';
import { isSolutionId } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * The account's passkeys (SHCWS-158), from Configuración › Seguridad.
 *
 * - options { password, code? }: starts a new passkey. A session alone is not enough to add a
 *   way in: the password is asked again and, when two-step verification is on, a code too,
 *   because a passkey signs in without either. It also needs a confirmed email, for the
 *   same reason as two-step verification (SHCWS-173): whoever registered someone else's
 *   address first must not keep a way in after the real owner recovers the account.
 * - register { credential, name? }: the browser's new passkey, for the challenge `options`
 *   issued to this same session.
 * - delete { id, password }: removes one and closes the sessions opened with it. The password
 *   always stays, so the last passkey can go too.
 *
 * Adding or removing one emails a security notice, always on (SHCWS-154).
 */
export async function POST(request: NextRequest) {
  const locale = requestLocale(request);
  const dictionary = await getDictionary(locale);
  const t = dictionary.settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.useAccountForm, 403);
  try {
    const sessionToken = request.cookies.get(sessionCookie)?.value;
    const account = await getSession(sessionToken);
    if (!account) return failure(t.signInAgain, 401);
    const body = await solutionBody(request);
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!['options', 'register', 'delete'].includes(action)) return failure(t.invalidAction, 400);
    const party = relyingParty(request.nextUrl.origin);
    if (!party) return failure(t.passkeyUnavailable, 503);
    if (!(await securityLimit('account-passkeys', account.id, 20)))
      return failure(t.tooManyAttempts, 429);

    const sql = authSql();
    const [row] =
      await sql`SELECT name, password_hash, email_verified_at, totp_confirmed_at FROM auth_accounts WHERE id = ${account.id}`;
    if (!row) return failure(t.signInAgain, 401);
    const passwordChecks = async () =>
      typeof body?.password === 'string' &&
      body.password.length <= 4096 &&
      verifyPassword(body.password, String(row.password_hash));
    const sessionHash = hashToken(sessionToken ?? '');
    const userAgent = readUserAgent(request.headers);

    if (action === 'options') {
      if (!row.email_verified_at) return failure(t.passkeyEmailFirst, 409);
      if (!(await passwordChecks())) return failure(t.wrongPassword, 400);
      if (row.totp_confirmed_at) {
        const code = readSecondFactorCode(body?.code);
        if (!code) return failure(t.secondFactorMissing, 400);
        if (!(await spendSecondFactor(account.id, code))) return failure(t.secondFactorWrong, 400);
      }
      const result = await registrationOptions({
        party,
        account: { id: account.id, email: account.email, name: row.name ? String(row.name) : null },
        sessionHash,
      });
      if (result.status === 'limit') return failure(t.passkeyLimit, 409);
      return ok({ options: result.options });
    }

    if (action === 'register') {
      if (!validPasskeyName(body?.name)) return failure(t.passkeyName, 400);
      const result = await finishRegistration({
        party,
        accountId: account.id,
        sessionHash,
        credential: body?.credential,
        name: aaguid =>
          passkeyName({
            typed: body?.name,
            aaguid,
            userAgent,
            locale,
            device: dictionary.settings.security.device,
          }),
      });
      if (result.status === 'expired') return failure(t.passkeyExpired, 409);
      if (result.status === 'duplicate') return failure(t.passkeyDuplicate, 409);
      if (result.status === 'limit') return failure(t.passkeyLimit, 409);
      if (result.status !== 'ok') return failure(t.passkeyFailed, 400);
      const name = result.name;
      after(() =>
        securityNotice(account.id, 'passkey-added', userAgent, name).catch(() => undefined),
      );
      return ok({ passkey: { id: result.id, name } });
    }

    // delete
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!isSolutionId(id)) return failure(t.passkeyGone, 404);
    if (!(await passwordChecks())) return failure(t.wrongPassword, 400);
    const removed = await removePasskey({
      accountId: account.id,
      passkeyId: id,
      currentSessionHash: sessionHash,
    });
    if (!removed) return failure(t.passkeyGone, 404);
    after(() =>
      securityNotice(account.id, 'passkey-removed', userAgent, removed.name).catch(() => undefined),
    );
    // Tells the browser which of this account's passkeys still work here, so a password
    // manager that supports it can stop offering the removed one.
    return ok({
      signal: {
        rpID: party.rpID,
        userID: Buffer.from(userHandle(account.id)).toString('base64url'),
        allAcceptedCredentialIDs: removed.remaining,
      },
    });
  } catch {
    return failure(t.passkeyUnavailableNow, 503);
  }
}
