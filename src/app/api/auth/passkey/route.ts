import { NextRequest, NextResponse, after } from 'next/server';
import {
  challengeCookie,
  challengeCookieOptions,
  cookieOptions,
  readUserAgent,
  sessionCookie,
} from '@/lib/auth/session';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { relyingParty, signInOptions, signInWithPasskey } from '@/lib/auth/passkeys';
import { signInNotice } from '@/lib/auth/security-notices';
import { captureServerEvent } from '@/lib/analytics/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDatabaseUrl } from '@/lib/database-url';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

/**
 * Sign-in with a passkey (SHCWS-158; rules in src/lib/auth/passkeys.ts).
 *
 * - options: a single-use challenge for a discoverable passkey. Also what the sign-in page's
 *   email field asks for to offer passkeys as autofill suggestions.
 * - verify { credential }: the signed response. Opens the same session a password sign-in
 *   does, with no second factor on top: the passkey already needed the device's fingerprint,
 *   face or PIN. Suspended accounts get the same answer as a wrong signature.
 *
 * Every failure after the challenge is claimed reads the same to the browser, except an
 * unknown passkey: the page tells the browser so it can stop offering one that was removed.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).auth.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useForm, 403);
  if (!getDatabaseUrl()) return failure(t.accessDisabled, 503);
  const party = relyingParty(request.nextUrl.origin);
  if (!party) return failure(t.passkeyUnavailable, 503);
  try {
    const body = await solutionBody(request);
    if (!body) return failure(t.checkForm, 400);
    const network = requestIdentity(request.headers);

    if (body.action === 'options') {
      // The sign-in page asks once per visit (and every few minutes while it stays open).
      if (!(await securityLimit('passkey-options', network, 60, 600)))
        return failure(t.passkeyTooMany, 429);
      const options = await signInOptions(party);
      return NextResponse.json({ ok: true, options }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (body.action === 'verify') {
      if (!(await securityLimit('passkey-sign-in', network, 30, 300)))
        return failure(t.passkeyTooMany, 429);
      const userAgent = readUserAgent(request.headers);
      const result = await signInWithPasskey({
        party,
        credential: body.credential,
        previousSessionToken: request.cookies.get(sessionCookie)?.value ?? '',
        userAgent,
      });
      if (result.status === 'expired') return failure(t.passkeyExpired, 401);
      if (result.status === 'unknown')
        return NextResponse.json(
          { error: t.passkeyUnknown, unknownCredential: true, rpID: party.rpID },
          { status: 401, headers: { 'Cache-Control': 'no-store' } },
        );
      if (result.status !== 'ok') return failure(t.passkeyFailed, 401);
      const accountId = result.accountId;
      captureServerEvent(request, accountId, 'signed_in', { method: 'passkey' });
      after(() => signInNotice(accountId, userAgent).catch(() => undefined));
      const response = NextResponse.json(
        { ok: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(sessionCookie, result.token, cookieOptions);
      // A half-finished password sign-in in this browser has nothing left to finish.
      response.cookies.set(challengeCookie, '', { ...challengeCookieOptions, maxAge: 0 });
      return response;
    }

    return failure(t.checkForm, 400);
  } catch {
    console.error('Passkey sign-in failed.');
    return failure(t.unavailable, 503);
  }
}
