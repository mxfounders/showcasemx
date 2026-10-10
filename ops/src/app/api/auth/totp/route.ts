import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  hashToken,
  generateToken,
  sessionCookieOptions,
  challengeCookieOptions,
  OPS_SESSION_SECONDS,
  OPS_CHALLENGE_COOKIE,
  opsLimit,
  requestIdentity,
} from '@/lib/auth';
import { audit } from '@/lib/audit';
import { failure, opsBody, sameOrigin } from '@/lib/http';
import { decryptSecret, hashBackupCode } from '@/lib/crypto';
import { verifyTotp } from '@/lib/totp';
import { clientIp } from '@/lib/net';
import { deviceLabel, readUserAgent } from '@/lib/device';
import { afterLogin, knownDevice } from '@/lib/login';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;
const EXPIRED = 'Sesión de acceso expirada. Inicia sesión de nuevo.';
const NO_STORE = { 'Cache-Control': 'no-store' };

function clearChallenge(res: NextResponse) {
  res.cookies.set({ ...challengeCookieOptions(0), value: '' });
  return res;
}

function fail(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  const challengeToken = req.cookies.get(OPS_CHALLENGE_COOKIE)?.value;
  if (!challengeToken || !/^[a-f0-9]{64}$/.test(challengeToken)) return failure(EXPIRED, 401);

  const body = await opsBody(req);
  const code = typeof body?.code === 'string' ? body.code.replace(/[\s-]/g, '') : '';
  if (!/^\d{6}$/.test(code) && !/^\d{8}$/.test(code)) return failure('Código inválido.', 400);

  if (!(await opsLimit('totp', requestIdentity(req.headers), 30, 300).catch(() => false)))
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': '300' } },
    );

  const ip = clientIp(req.headers);
  const userAgent = readUserAgent(req.headers);
  const device = deviceLabel(userAgent);

  try {
    const sql = getDb();
    const challengeHash = hashToken(challengeToken);

    const rows = await sql`
      SELECT c.account_id, c.password_hash_at_issue, c.attempts,
        a.email, a.password_hash, a.suspended_at, r.disabled_at,
        r.totp_secret, r.totp_confirmed_at, r.totp_last_step, r.backup_codes
      FROM ops_login_challenges c
      JOIN auth_accounts a ON a.id = c.account_id
      JOIN solution_reviewers r ON r.account_id = c.account_id
      WHERE c.token_hash = ${challengeHash} AND c.expires_at > now()
      LIMIT 1
    `;
    if (!rows.length) return clearChallenge(fail(EXPIRED, 401));
    const row = rows[0];
    const accountId = String(row.account_id);
    const email = String(row.email);

    if (row.suspended_at || row.disabled_at) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return clearChallenge(fail('Esta cuenta no tiene acceso a ops.', 403));
    }
    if (String(row.password_hash) !== String(row.password_hash_at_issue)) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return clearChallenge(fail('Tu contraseña cambió. Inicia sesión de nuevo.', 401));
    }
    if (!row.totp_confirmed_at || !row.totp_secret)
      return failure('Configura tu autenticador antes de continuar.', 409);
    if (Number(row.attempts) >= MAX_ATTEMPTS) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return clearChallenge(fail('Demasiados intentos. Inicia sesión de nuevo.', 429));
    }

    const usingBackup = code.length === 8;
    let acceptedStep: bigint | null = null;
    let backupHash: string | null = null;
    let reused = false;
    if (usingBackup) {
      const candidate = hashBackupCode(code);
      const codes: string[] = Array.isArray(row.backup_codes) ? row.backup_codes : [];
      if (codes.includes(candidate)) backupHash = candidate;
    } else {
      const lastStep = row.totp_last_step !== null ? BigInt(String(row.totp_last_step)) : null;
      const secret = decryptSecret(String(row.totp_secret));
      acceptedStep = verifyTotp(secret, code, lastStep);
      reused = acceptedStep === null && verifyTotp(secret, code, null) !== null;
    }

    if (acceptedStep === null && backupHash === null) {
      const counted = await sql`
        UPDATE ops_login_challenges SET attempts = attempts + 1
        WHERE token_hash = ${challengeHash} RETURNING attempts
      `;
      const attempts = Number(counted[0]?.attempts ?? MAX_ATTEMPTS);
      await audit({
        actorId: null,
        actorEmail: email,
        action: 'login_totp_failed',
        subjectType: 'account',
        subjectId: accountId,
        metadata: {
          attempt: attempts,
          method: usingBackup ? 'backup_code' : 'totp',
          reused,
          device,
        },
        ip,
      });
      if (attempts >= MAX_ATTEMPTS) {
        await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
        return clearChallenge(fail('Demasiados intentos. Inicia sesión de nuevo.', 429));
      }
      return fail(
        reused ? 'Ese código ya se usó. Espera el siguiente de tu app.' : 'Código incorrecto.',
        401,
        {
          remaining: MAX_ATTEMPTS - attempts,
        },
      );
    }

    const wasKnown = await knownDevice(accountId, device);

    // One statement: burn the challenge, consume the factor, open the session.
    // Data-modifying CTEs all run; if the factor was already consumed by a
    // concurrent request (same TOTP step or backup code), `factor` is empty, no
    // session is created and the challenge is burned all the same.
    const sessionToken = generateToken();
    const sessionHash = hashToken(sessionToken);
    const opened = usingBackup
      ? await sql`
          WITH ch AS (
            DELETE FROM ops_login_challenges
            WHERE token_hash = ${challengeHash} AND expires_at > now() AND attempts < ${MAX_ATTEMPTS}
            RETURNING account_id
          ), factor AS (
            UPDATE solution_reviewers r SET backup_codes = array_remove(r.backup_codes, ${backupHash})
            FROM ch WHERE r.account_id = ch.account_id AND ${backupHash} = ANY(r.backup_codes)
            RETURNING r.account_id, cardinality(r.backup_codes) AS remaining
          ), sess AS (
            INSERT INTO ops_sessions (token_hash, account_id, expires_at, ip, user_agent)
            SELECT ${sessionHash}, account_id, now() + ${OPS_SESSION_SECONDS} * interval '1 second', ${ip}, ${userAgent}
            FROM factor RETURNING account_id
          )
          SELECT sess.account_id, factor.remaining FROM sess JOIN factor USING (account_id)
        `
      : await sql`
          WITH ch AS (
            DELETE FROM ops_login_challenges
            WHERE token_hash = ${challengeHash} AND expires_at > now() AND attempts < ${MAX_ATTEMPTS}
            RETURNING account_id
          ), factor AS (
            UPDATE solution_reviewers r SET totp_last_step = ${acceptedStep!.toString()}
            FROM ch WHERE r.account_id = ch.account_id
              AND (r.totp_last_step IS NULL OR r.totp_last_step < ${acceptedStep!.toString()})
            RETURNING r.account_id, cardinality(r.backup_codes) AS remaining
          ), sess AS (
            INSERT INTO ops_sessions (token_hash, account_id, expires_at, ip, user_agent)
            SELECT ${sessionHash}, account_id, now() + ${OPS_SESSION_SECONDS} * interval '1 second', ${ip}, ${userAgent}
            FROM factor RETURNING account_id
          )
          SELECT sess.account_id, factor.remaining FROM sess JOIN factor USING (account_id)
        `;

    if (!opened.length) {
      await audit({
        actorId: null,
        actorEmail: email,
        action: 'login_totp_replay',
        subjectType: 'account',
        subjectId: accountId,
        metadata: { method: usingBackup ? 'backup_code' : 'totp', device },
        ip,
      });
      return clearChallenge(fail('Ese código ya se usó. Inicia sesión de nuevo.', 401));
    }

    const remaining = Number(opened[0].remaining ?? 0);
    await audit({
      actorId: accountId,
      actorEmail: email,
      action: 'login_success',
      subjectType: 'account',
      subjectId: accountId,
      metadata: {
        method: usingBackup ? 'backup_code' : 'totp',
        device,
        newDevice: !wasKnown,
        ...(usingBackup ? { backupCodesLeft: remaining } : {}),
      },
      ip,
    });

    afterLogin({
      accountId,
      email,
      device,
      ip,
      alert: usingBackup
        ? {
            subject: 'Se usó un código de respaldo',
            summary: `Alguien entró a ops con uno de tus códigos de respaldo. Te quedan ${remaining}.`,
          }
        : !wasKnown
          ? {
              subject: 'Nuevo acceso desde un dispositivo nuevo',
              summary: 'Tu cuenta de ops inició sesión desde un dispositivo que no habíamos visto.',
            }
          : null,
    });

    const res = NextResponse.json(
      { ok: true, backupCodesLeft: usingBackup ? remaining : undefined },
      { headers: NO_STORE },
    );
    res.cookies.set({ ...sessionCookieOptions(OPS_SESSION_SECONDS), value: sessionToken });
    return clearChallenge(res);
  } catch (err) {
    console.error('[ops/auth/totp]', err);
    return failure('Error interno.', 503);
  }
}
