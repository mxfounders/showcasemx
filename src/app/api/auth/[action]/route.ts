import { randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse, after } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import {
  dummyHash,
  hashPassword,
  hashToken,
  validateCredentials,
  verifyPassword,
} from '@/lib/auth/password';
import {
  challengeCookie,
  challengeCookieOptions,
  cookieOptions,
  readUserAgent,
  sessionCookie,
  sessionSeconds,
} from '@/lib/auth/session';
import { requestIdentity, securityLimit, withinLimit } from '@/lib/auth/security';
import { decryptSecret, hashBackupCode, verifyTotp } from '@/lib/auth/totp';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';
import { requestVerification } from '@/lib/auth/verification';
import { passwordLeaked } from '@/lib/auth/pwned';
import { rememberDevice, securityNotice, signInNotice } from '@/lib/auth/security-notices';
import { existingAccountNotice } from '@/lib/auth/existing-account';
import { recoveryConfig } from '@/lib/auth/recovery';
import { issueLoginChallenge } from '@/lib/auth/challenge';
export const runtime = 'nodejs';

const MAX_CHALLENGE_ATTEMPTS = 5;
// Wrong codes per account and hour, across every challenge and network (SHCWS-159).
const MAX_ACCOUNT_TOTP_FAILURES = 10;

export async function POST(request: NextRequest, props: { params: Promise<{ action: string }> }) {
  const t = (await getDictionary(requestLocale(request))).auth.errors;
  const params = await props.params;
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  const action = params.action;
  if (!['login', 'register', 'logout', 'totp'].includes(action))
    return fail(t.routeUnavailable, 404);
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.useForm, 403);
  const url = getDatabaseUrl();
  if (!url) return fail(t.accessDisabled, 503);
  try {
    const sql = neon(url);
    if (action === 'logout') {
      const token = request.cookies.get(sessionCookie)?.value;
      if (token) await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
      const response = NextResponse.json(
        { ok: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (!request.headers.get('content-type')?.includes('application/json'))
      return fail(t.invalidFormat, 415);
    const reader = request.body?.getReader();
    if (!reader) return fail(t.missingData, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    let body: unknown;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) {
          await reader.cancel();
          return fail(t.dataTooLong, 413);
        }
        chunks.push(value);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return fail(t.checkForm, 400);
    }

    // Issues the real session. Shared by a one-step login and by the second factor,
    // so both paths record the device and drop the previous cookie the same way.
    const openSession = async (accountId: string, verifiedHash: string) => {
      const token = randomBytes(32).toString('hex');
      const oldToken = request.cookies.get(sessionCookie)?.value ?? '';
      const result = await sql.transaction([
        sql`SELECT id FROM auth_accounts WHERE id=${accountId} FOR UPDATE`,
        sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(oldToken)} OR (account_id = ${accountId} AND expires_at <= now())`,
        sql`INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent) SELECT ${hashToken(token)}, id, now() + ${sessionSeconds} * interval '1 second', ${readUserAgent(request.headers)} FROM auth_accounts WHERE id=${accountId} AND password_hash=${verifiedHash} RETURNING account_id`,
      ]);
      return result[2].length ? token : null;
    };

    if (action === 'totp') {
      // The challenge cookie proves a password was verified minutes ago; it is not
      // an identity and grants nothing until the code checks out.
      const challengeToken = request.cookies.get(challengeCookie)?.value ?? '';
      if (!/^[a-f0-9]{64}$/.test(challengeToken)) return fail(t.challengeExpired, 401);
      const code =
        typeof (body as { code?: unknown })?.code === 'string'
          ? (body as { code: string }).code.trim().replace(/\s/g, '')
          : '';
      if (!/^\d{6}$/.test(code) && !/^\d{8}$/.test(code)) return fail(t.totpFormat, 400);
      const challengeHash = hashToken(challengeToken);

      // Claim one attempt before looking at the code (SHCWS-159). The increment is the
      // guard, so parallel requests can't share a slot: five codes per verified password.
      const [challenge] = await sql`UPDATE auth_login_challenges c SET attempts = c.attempts + 1
        FROM auth_accounts a
        WHERE c.token_hash = ${challengeHash} AND c.expires_at > now()
          AND c.attempts < ${MAX_CHALLENGE_ATTEMPTS} AND a.id = c.account_id
        RETURNING c.account_id, c.password_hash_at_issue, a.password_hash, a.suspended_at,
          a.totp_secret, a.totp_confirmed_at, a.totp_last_step, a.backup_codes`;
      if (!challenge) {
        const [spent] =
          await sql`DELETE FROM auth_login_challenges WHERE token_hash = ${challengeHash} AND expires_at > now() RETURNING attempts`;
        return fail(spent ? t.totpTooManyWrong : t.challengeExpired, 401);
      }
      if (challenge.suspended_at || !challenge.totp_confirmed_at || !challenge.totp_secret)
        return fail(t.challengeExpired, 401);
      if (String(challenge.password_hash) !== String(challenge.password_hash_at_issue))
        return fail(t.accessChanged, 401);
      // Only a live challenge (a correct password) reaches the shared ceilings, so an
      // invented cookie can't use up the second step for everyone else.
      if (!(await securityLimit('auth-totp', requestIdentity(request.headers), 20, 200)))
        return fail(t.totpTooMany, 429);
      const accountId = String(challenge.account_id);
      // Per account, whatever the network: whoever holds the password gets a few wrong
      // codes an hour, not a fresh five per login. Taken before checking, refunded on success.
      const accountKey = `auth-totp-fail:${hashToken(accountId)}`;
      const [slot] = await sql`INSERT INTO auth_rate_limits (key, window_start, attempts)
        VALUES (${accountKey}, date_trunc('hour', now()), 1)
        ON CONFLICT (key) DO UPDATE SET
          attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start THEN auth_rate_limits.attempts + 1 ELSE 1 END,
          window_start = EXCLUDED.window_start RETURNING attempts`;
      if (Number(slot?.attempts) > MAX_ACCOUNT_TOTP_FAILURES) return fail(t.totpTooMany, 429);

      const lastStep =
        challenge.totp_last_step === null || challenge.totp_last_step === undefined
          ? null
          : BigInt(String(challenge.totp_last_step));
      let acceptedStep: bigint | null = null;
      let usedBackup = false;
      if (code.length === 6) {
        acceptedStep = verifyTotp(decryptSecret(String(challenge.totp_secret)), code, lastStep);
      } else {
        const stored = (challenge.backup_codes as string[] | null) ?? [];
        usedBackup = stored.includes(hashBackupCode(code));
      }
      if (acceptedStep === null && !usedBackup) {
        // The tenth wrong code of the hour means someone has the password (SHCWS-173). The
        // counter takes each value once, so the owner hears it once per hour, right away.
        if (Number(slot?.attempts) === MAX_ACCOUNT_TOTP_FAILURES) {
          const userAgent = readUserAgent(request.headers);
          after(() => securityNotice(accountId, 'totp-failures', userAgent).catch(() => undefined));
        }
        return fail(t.totpWrong, 401);
      }

      // The code is spent in the same statement that opens the session: a second request
      // with the same code (or the same backup code) finds nothing left to consume.
      const verifiedHash = String(challenge.password_hash);
      const token = randomBytes(32).toString('hex');
      const oldToken = request.cookies.get(sessionCookie)?.value ?? '';
      const userAgent = readUserAgent(request.headers);
      const opened =
        acceptedStep !== null
          ? await sql`WITH consumed AS (
              UPDATE auth_accounts SET totp_last_step = ${acceptedStep.toString()}
              WHERE id = ${accountId} AND password_hash = ${verifiedHash} AND suspended_at IS NULL
                AND totp_confirmed_at IS NOT NULL
                AND (totp_last_step IS NULL OR totp_last_step < ${acceptedStep.toString()})
              RETURNING id
            ), claimed AS (
              DELETE FROM auth_login_challenges WHERE token_hash = ${challengeHash} AND expires_at > now()
                AND account_id IN (SELECT id FROM consumed) RETURNING account_id
            ), others AS (
              DELETE FROM auth_login_challenges WHERE token_hash <> ${challengeHash}
                AND account_id IN (SELECT account_id FROM claimed)
            ), previous AS (
              DELETE FROM auth_sessions WHERE EXISTS (SELECT 1 FROM claimed)
                AND (token_hash = ${hashToken(oldToken)} OR (account_id = ${accountId} AND expires_at <= now()))
            ) INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent)
              SELECT ${hashToken(token)}, account_id, now() + ${sessionSeconds} * interval '1 second', ${userAgent}
              FROM claimed RETURNING account_id`
          : await sql`WITH consumed AS (
              UPDATE auth_accounts SET backup_codes = array_remove(backup_codes, ${hashBackupCode(code)})
              WHERE id = ${accountId} AND password_hash = ${verifiedHash} AND suspended_at IS NULL
                AND totp_confirmed_at IS NOT NULL AND ${hashBackupCode(code)} = ANY(backup_codes)
              RETURNING id
            ), claimed AS (
              DELETE FROM auth_login_challenges WHERE token_hash = ${challengeHash} AND expires_at > now()
                AND account_id IN (SELECT id FROM consumed) RETURNING account_id
            ), others AS (
              DELETE FROM auth_login_challenges WHERE token_hash <> ${challengeHash}
                AND account_id IN (SELECT account_id FROM claimed)
            ), previous AS (
              DELETE FROM auth_sessions WHERE EXISTS (SELECT 1 FROM claimed)
                AND (token_hash = ${hashToken(oldToken)} OR (account_id = ${accountId} AND expires_at <= now()))
            ) INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent)
              SELECT ${hashToken(token)}, account_id, now() + ${sessionSeconds} * interval '1 second', ${userAgent}
              FROM claimed RETURNING account_id`;
      // Someone else spent this code or this challenge first: same answer as a wrong code.
      if (!opened.length) return fail(t.totpWrong, 401);
      await sql`UPDATE auth_rate_limits SET attempts = greatest(attempts - 1, 0)
        WHERE key = ${accountKey} AND window_start = date_trunc('hour', now())`;
      captureServerEvent(request, accountId, 'signed_in', {
        method: usedBackup ? 'backup_code' : 'totp',
      });
      after(async () => {
        await signInNotice(accountId, userAgent).catch(() => undefined);
        if (usedBackup)
          await securityNotice(accountId, 'backup-code', userAgent).catch(() => undefined);
      });
      const response = NextResponse.json(
        { ok: true, usedBackupCode: usedBackup },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(sessionCookie, token, cookieOptions);
      response.cookies.set(challengeCookie, '', { ...challengeCookieOptions, maxAge: 0 });
      return response;
    }

    const credentials = validateCredentials(body);
    if (!credentials) return fail(t.credentialsInvalid, 400);
    // Atomic database counters work across serverless instances; no in-memory limiter.
    // Every attempt counts against its network (an IPv6 /64) and a shared counter that
    // bounds the expensive password work: above 120 a minute, only networks that already
    // made a quarter of their 30 attempts are refused, never everyone (SHCWS-171).
    // Guessing an account is limited by FAILED logins only, per email+address and, higher,
    // per email: someone who knows your email can lock out their own network, not you on
    // yours (SHCWS-157). Windows are fixed 15-minute buckets.
    const identity = requestIdentity(request.headers);
    const addressKey = `auth:address:${hashToken(identity)}`;
    const globalKey = 'auth:global';
    const failPairKey = `auth:fail:${hashToken(`${credentials.email}|${identity}`)}`;
    const failEmailKey = `auth:fail-email:${hashToken(credentials.email)}`;
    const tooMany = () => {
      const seconds = 900 - (Math.floor(Date.now() / 1000) % 900);
      const response = fail(
        t.loginTooMany.replace('{minutes}', String(Math.max(1, Math.ceil(seconds / 60)))),
        429,
      );
      response.headers.set('Retry-After', String(seconds));
      return response;
    };
    const limits = await sql`INSERT INTO auth_rate_limits (key, window_start, attempts)
      VALUES (${addressKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1),
             (${globalKey}, date_trunc('minute', now()), 1)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start THEN auth_rate_limits.attempts + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start RETURNING key, attempts`;
    const counted = (name: string) => Number(limits.find(row => row.key === name)?.attempts ?? 0);
    if (!withinLimit(counted(addressKey), counted(globalKey), 30, 120)) return tooMany();
    const { email, password } = credentials;
    if (action === 'register') {
      // Known-breached passwords are refused (SHCWS-156); an unreachable service never blocks.
      if ((await passwordLeaked(password)) === true) return fail(t.passwordLeaked, 400);
      const hash = await hashPassword(password);
      const [created] =
        await sql`INSERT INTO auth_accounts (id, email, password_hash) VALUES (${randomUUID()}, ${email}, ${hash}) ON CONFLICT (email) DO NOTHING RETURNING id`;
      if (created) {
        const accountId = String(created.id);
        captureServerEvent(request, accountId, 'account_registered');
        // The confirmation link goes out with the new account (SHCWS-27), after the
        // response. Best-effort: Ajustes › Seguridad and Inicio can always send it again.
        if (recoveryConfig())
          after(() => requestVerification({ id: accountId, email }).catch(() => undefined));
        // A brand-new account is signed in right away, so the person continues to what
        // they came for (SHCWS-26). This device is its first one: no «new device» notice.
        const token = await openSession(accountId, hash);
        const response = NextResponse.json(
          { ok: true, registered: true, signedIn: !!token },
          { headers: { 'Cache-Control': 'no-store' } },
        );
        if (token) {
          const userAgent = readUserAgent(request.headers);
          after(() => rememberDevice(accountId, userAgent).catch(() => undefined));
          response.cookies.set(sessionCookie, token, cookieOptions);
        }
        return response;
      }
      // An existing account is never signed in from here, whatever the password. Its owner
      // gets an email instead (SHCWS-155). The session cookie above does tell a new account
      // apart from an existing one: the trade-off chosen in SHCWS-26, bounded by the
      // per-address limit and visible to the owner through that email.
      if (recoveryConfig()) after(() => existingAccountNotice(email).catch(() => undefined));
      return NextResponse.json(
        { ok: true, registered: true, signedIn: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const failures = await sql`SELECT key, attempts FROM auth_rate_limits
      WHERE key IN (${failPairKey}, ${failEmailKey})
        AND window_start = date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes'`;
    if (failures.some(row => Number(row.attempts) >= (row.key === failPairKey ? 10 : 50)))
      return tooMany();
    const rows =
      await sql`SELECT id, password_hash, suspended_at, totp_confirmed_at FROM auth_accounts WHERE email = ${email} LIMIT 1`;
    const valid = await verifyPassword(
      password,
      rows.length ? String(rows[0].password_hash) : dummyHash,
    );
    if (!rows.length || !valid || rows[0].suspended_at) {
      await sql`INSERT INTO auth_rate_limits (key, window_start, attempts)
        VALUES (${failPairKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1),
               (${failEmailKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1)
        ON CONFLICT (key) DO UPDATE SET
          attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start THEN auth_rate_limits.attempts + 1 ELSE 1 END,
          window_start = EXCLUDED.window_start`;
      return fail(t.loginFailed, 401);
    }
    const accountId = String(rows[0].id);
    const verifiedHash = String(rows[0].password_hash);
    // Existing accounts keep their password, but one found in breaches leaves a notice in
    // the account (once a month), checked after the response so signing in stays fast.
    after(async () => {
      if ((await passwordLeaked(password)) !== true) return;
      const month = new Date().toISOString().slice(0, 7);
      await sql`INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
        VALUES (${accountId},'security',${`security:leaked:${accountId}:${month}`},'Tu contraseña apareció en filtraciones de otros sitios: cámbiala','/account/settings/security','disabled')
        ON CONFLICT (source_key) DO NOTHING`.catch(() => undefined);
    });

    if (rows[0].totp_confirmed_at) {
      // Password alone stops here. No session exists until the second factor passes.
      const challengeToken = await issueLoginChallenge(accountId, verifiedHash);
      const response = NextResponse.json(
        { ok: true, step: 'totp' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      response.cookies.set(challengeCookie, challengeToken, challengeCookieOptions);
      return response;
    }

    const token = await openSession(accountId, verifiedHash);
    if (!token) return fail(t.accessChanged, 401);
    captureServerEvent(request, accountId, 'signed_in', { method: 'password' });
    const userAgent = readUserAgent(request.headers);
    after(() => signInNotice(accountId, userAgent).catch(() => undefined));
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, token, cookieOptions);
    return response;
  } catch {
    return fail(t.unavailable, 503);
  }
}
