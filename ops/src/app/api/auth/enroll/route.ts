import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getDb } from '@/lib/db';
import {
  hashToken, generateToken, sessionCookieOptions, challengeCookieOptions,
  OPS_SESSION_SECONDS, OPS_CHALLENGE_COOKIE, opsLimit, requestIdentity, audit, requestIp,
} from '@/lib/auth';
import { failure, opsBody, sameOrigin } from '@/lib/http';
import { encryptSecret, decryptSecret, hashBackupCode } from '@/lib/crypto';
import { generateTotpSecret, generateBackupCodes, otpauthUri, verifyTotp } from '@/lib/totp';

export const runtime = 'nodejs';

async function loadChallenge(sql: ReturnType<typeof getDb>, token: string) {
  const rows = await sql`
    SELECT c.account_id, c.password_hash_at_issue,
      a.email, a.password_hash, a.suspended_at,
      r.totp_secret, r.totp_confirmed_at
    FROM ops_login_challenges c
    JOIN auth_accounts a ON a.id = c.account_id
    JOIN solution_reviewers r ON r.account_id = c.account_id
    WHERE c.token_hash = ${hashToken(token)} AND c.expires_at > now()
    LIMIT 1
  `;
  if (!rows.length) return null;
  const row = rows[0];
  if (row.suspended_at) return null;
  if (String(row.password_hash) !== String(row.password_hash_at_issue)) return null;
  return row;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  const challengeToken = req.cookies.get(OPS_CHALLENGE_COOKIE)?.value;
  if (!challengeToken || !/^[a-f0-9]{64}$/.test(challengeToken)) {
    return failure('Sesión de acceso expirada. Inicia sesión de nuevo.', 401);
  }

  const body = await opsBody(req);
  const step = typeof body?.step === 'string' ? body.step : '';
  if (!['start', 'confirm'].includes(step)) return failure('Paso inválido.', 400);

  const identity = requestIdentity(req.headers);
  if (!(await opsLimit('enroll', identity, 20, 100))) return failure('Demasiados intentos. Espera unos minutos.', 429);

  try {
    const sql = getDb();
    const challenge = await loadChallenge(sql, challengeToken);
    if (!challenge) return failure('Sesión de acceso expirada. Inicia sesión de nuevo.', 401);

    const accountId = String(challenge.account_id);

    if (step === 'start') {
      if (challenge.totp_confirmed_at) {
        return failure('Ya tienes un autenticador configurado. Pide a un admin que lo reinicie.', 409);
      }
      const secret = generateTotpSecret();
      const backupCodes = generateBackupCodes(10);
      const backupHashes = backupCodes.map(hashBackupCode);

      await sql`
        UPDATE solution_reviewers
        SET totp_secret = ${encryptSecret(secret)}, backup_codes = ${backupHashes}, totp_last_step = NULL
        WHERE account_id = ${accountId} AND totp_confirmed_at IS NULL
      `;

      const uri = otpauthUri(secret, String(challenge.email));
      const qrDataUri = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

      return NextResponse.json(
        { ok: true, secret, otpauthUri: uri, qrDataUri, backupCodes },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // step === 'confirm'
    if (challenge.totp_confirmed_at) return failure('Ya tienes un autenticador configurado.', 409);
    if (!challenge.totp_secret) return failure('Genera un código QR primero.', 400);

    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) return failure('Código inválido.', 400);

    const secret = decryptSecret(String(challenge.totp_secret));
    const step0 = verifyTotp(secret, code, null);
    if (step0 === null) return failure('Código incorrecto.', 401);

    const sessionToken = generateToken();
    await sql.transaction([
      sql`UPDATE solution_reviewers SET totp_confirmed_at = now(), totp_last_step = ${step0.toString()} WHERE account_id = ${accountId}`,
      sql`DELETE FROM ops_login_challenges WHERE account_id = ${accountId}`,
      sql`INSERT INTO ops_sessions (token_hash, account_id, expires_at, ip, user_agent)
          VALUES (${hashToken(sessionToken)}, ${accountId}, now() + ${OPS_SESSION_SECONDS} * interval '1 second',
            ${requestIp(req.headers)}, ${req.headers.get('user-agent')?.slice(0, 300) ?? null})`,
    ]);

    await audit({
      actorId: accountId,
      actorEmail: String(challenge.email),
      action: 'totp_enrolled',
      subjectType: 'account',
      subjectId: accountId,
      ip: requestIp(req.headers),
    });

    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set({ ...sessionCookieOptions(OPS_SESSION_SECONDS), value: sessionToken });
    res.cookies.set({ ...challengeCookieOptions(0), value: '' });
    return res;
  } catch (err) {
    console.error('[ops/auth/enroll]', err);
    return failure('Error interno.', 503);
  }
}
