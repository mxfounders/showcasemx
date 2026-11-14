import { randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import {
  clearGoogleCookies,
  googleConfig,
  googleCookie,
  googleIdentity,
  legacyGoogleCookie,
} from '@/lib/auth/google';
import { authSql } from '@/lib/auth/security';
import { hashPassword, hashToken } from '@/lib/auth/password';
import {
  challengeCookie,
  challengeCookieOptions,
  cookieOptions,
  getSession,
  readUserAgent,
  sessionCookie,
  sessionSeconds,
} from '@/lib/auth/session';
import { issueLoginChallenge } from '@/lib/auth/challenge';
import { securityNotice, signInNotice } from '@/lib/auth/security-notices';
import { authReturnTo } from '@/lib/auth/return-to';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function GET(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).auth.errors;
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: t.googleNotConfigured }, { status: 503 });
  if (request.nextUrl.origin !== config.origin)
    return NextResponse.json({ error: t.googleInvalidOrigin }, { status: 403 });
  const fail = (link = false) => {
    const response = NextResponse.redirect(
      config.origin +
        (link ? '/account/settings/connections?google=error' : '/sign-in?google=error'),
    );
    clearGoogleCookies(response.cookies);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  let linking = false;
  try {
    const state = request.nextUrl.searchParams.get('state') ?? '',
      cookie =
        request.cookies.get(googleCookie)?.value ??
        request.cookies.get(legacyGoogleCookie)?.value ??
        '',
      code = request.nextUrl.searchParams.get('code');
    if (
      !/^[a-f0-9]{64}$/.test(state) ||
      !/^[a-f0-9]{64}$/.test(cookie) ||
      !code ||
      code.length > 4096
    )
      return fail();
    const sql = authSql();
    const [flow] =
      await sql`DELETE FROM auth_google_states WHERE state_hash=${hashToken(state)} AND cookie_hash=${hashToken(cookie)} AND expires_at>now() RETURNING *`;
    if (!flow) return fail();
    linking = !!flow.account_id;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
        code_verifier: String(flow.verifier),
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) return fail(linking);
    const tokens = await tokenResponse.json();
    if (typeof tokens.id_token !== 'string') return fail(linking);
    const identity = await googleIdentity(tokens.id_token, String(flow.nonce), config.clientId);
    let accountId: string;
    if (linking) {
      const session = request.cookies.get(sessionCookie)?.value ?? '',
        account = await getSession(session);
      if (!account || account.id !== flow.account_id || hashToken(session) !== flow.session_hash)
        return fail(true);
      const result = await sql.transaction([
        sql`SELECT id FROM auth_accounts WHERE id=${account.id} FOR UPDATE`,
        sql`INSERT INTO auth_google_identities(subject,account_id,email) SELECT ${identity.subject},id,${identity.email} FROM auth_accounts WHERE id=${account.id} AND password_hash=${flow.password_hash_at_issue} AND email_verified_at IS NOT NULL ON CONFLICT DO NOTHING RETURNING account_id`,
        sql`SELECT g.account_id FROM auth_google_identities g JOIN auth_accounts a ON a.id=g.account_id WHERE g.subject=${identity.subject} AND g.account_id=${account.id} AND a.password_hash=${flow.password_hash_at_issue} AND EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash=${flow.session_hash} AND account_id=a.id AND expires_at>now())`,
      ]);
      if (!result[2].length) return fail(true);
      accountId = account.id;
      // A Google identity can verify only the same mailbox, never a different linked email.
      await sql`UPDATE auth_accounts SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=${accountId} AND email=${identity.email}`;
    } else {
      const [existing] =
        await sql`SELECT account_id FROM auth_google_identities WHERE subject=${identity.subject}`;
      if (existing) accountId = String(existing.account_id);
      else {
        const newId = randomUUID(),
          passwordHash = await hashPassword(randomBytes(48).toString('hex'));
        const result = await sql.transaction([
          sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at) VALUES(${newId},${identity.email},${passwordHash},${identity.name},now()) ON CONFLICT(email) DO NOTHING RETURNING id`,
          sql`INSERT INTO auth_google_identities(subject,account_id,email) SELECT ${identity.subject},id,${identity.email} FROM auth_accounts WHERE id=${newId} ON CONFLICT DO NOTHING`,
          sql`SELECT account_id FROM auth_google_identities WHERE subject=${identity.subject}`,
        ]);
        if (!result[2].length) return fail();
        accountId = String(result[2][0].account_id);
      }
    }
    const userAgent = readUserAgent(request.headers);
    if (linking) {
      const linked = accountId;
      after(() => securityNotice(linked, 'google-linked', userAgent).catch(() => undefined));
      const response = NextResponse.redirect(config.origin + '/account/settings/connections');
      clearGoogleCookies(response.cookies);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    const returnTo = authReturnTo(String(flow.return_to));
    const [account] =
      await sql`SELECT password_hash, suspended_at, totp_confirmed_at FROM auth_accounts WHERE id=${accountId}`;
    if (!account || account.suspended_at) return fail();
    // Two-step verification applies to Google too (SHCWS-172): Google stands in for the
    // password, and the same five-minute challenge then asks for the code.
    if (account.totp_confirmed_at) {
      const challenge = await issueLoginChallenge(accountId, String(account.password_hash));
      const response = NextResponse.redirect(
        `${config.origin}/sign-in?step=totp&next=${encodeURIComponent(returnTo)}`,
      );
      response.cookies.set(challengeCookie, challenge, challengeCookieOptions);
      clearGoogleCookies(response.cookies);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    // Same shape as a password sign-in (SHCWS-174): the session records its device and
    // replaces this browser's previous one.
    const session = randomBytes(32).toString('hex');
    const previous = request.cookies.get(sessionCookie)?.value ?? '';
    const result = await sql.transaction([
      sql`SELECT id FROM auth_accounts WHERE id=${accountId} FOR UPDATE`,
      sql`DELETE FROM auth_sessions WHERE token_hash=${hashToken(previous)} OR (account_id=${accountId} AND expires_at<=now())`,
      sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at,user_agent) SELECT ${hashToken(session)},g.account_id,now()+${sessionSeconds}*interval '1 second',${userAgent} FROM auth_google_identities g JOIN auth_accounts a ON a.id=g.account_id WHERE g.subject=${identity.subject} AND g.account_id=${accountId} AND a.suspended_at IS NULL AND a.totp_confirmed_at IS NULL RETURNING account_id`,
    ]);
    if (!result[2].length) return fail();
    const signedIn = accountId;
    after(() => signInNotice(signedIn, userAgent).catch(() => undefined));
    const response = NextResponse.redirect(config.origin + returnTo);
    response.cookies.set(sessionCookie, session, cookieOptions);
    clearGoogleCookies(response.cookies);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return fail(linking);
  }
}
