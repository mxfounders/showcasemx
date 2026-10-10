import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
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
import { encryptSecret, decryptSecret, hashBackupCode } from '@/lib/crypto';
import { generateTotpSecret, generateBackupCodes, otpauthUri, verifyTotp } from '@/lib/totp';
import { clientIp } from '@/lib/net';
import { deviceLabel, readUserAgent } from '@/lib/device';
import { afterLogin } from '@/lib/login';

export const runtime = 'nodejs';

const EXPIRED = 'Sesión de acceso expirada. Inicia sesión de nuevo.';
const NO_STORE = { 'Cache-Control': 'no-store' };

async function loadChallenge(sql: ReturnType<typeof getDb>, tokenHash: string) {
  const rows = await sql`
    SELECT c.account_id, c.password_hash_at_issue,
      a.email, a.password_hash, a.suspended_at, r.disabled_at,
      r.totp_secret, r.totp_confirmed_at,
      (r.enroll_by IS NOT NULL AND r.enroll_by < now()) AS enroll_expired
    FROM ops_login_challenges c
    JOIN auth_accounts a ON a.id = c.account_id
    JOIN solution_reviewers r ON r.account_id = c.account_id
    WHERE c.token_hash = ${tokenHash} AND c.expires_at > now()
    LIMIT 1
  `;
  if (!rows.length) return null;
  const row = rows[0];
  if (row.suspended_at || row.disabled_at) return null;
  if (String(row.password_hash) !== String(row.password_hash_at_issue)) return null;
  return row;
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  const challengeToken = req.cookies.get(OPS_CHALLENGE_COOKIE)?.value;
  if (!challengeToken || !/^[a-f0-9]{64}$/.test(challengeToken)) return failure(EXPIRED, 401);

  const body = await opsBody(req);
  const step = typeof body?.step === 'string' ? body.step : '';
  if (!['start', 'confirm'].includes(step)) return failure('Paso inválido.', 400);

  if (!(await opsLimit('enroll', requestIdentity(req.headers), 20, 100).catch(() => false)))
    return failure('Demasiados intentos. Espera unos minutos.', 429);

  const ip = clientIp(req.headers);
  const userAgent = readUserAgent(req.headers);
  const device = deviceLabel(userAgent);

  try {
    const sql = getDb();
    const challengeHash = hashToken(challengeToken);
    const challenge = await loadChallenge(sql, challengeHash);
    if (!challenge) return failure(EXPIRED, 401);

    const accountId = String(challenge.account_id);
    const email = String(challenge.email);

    if (challenge.totp_confirmed_at)
      return failure(
        'Ya tienes un autenticador configurado. Pide a un admin que lo reinicie.',
        409,
      );
    if (challenge.enroll_expired)
      return failure(
        'Tu invitación para configurar el autenticador venció. Pide a un administrador que la renueve.',
        403,
      );

    if (step === 'start') {
      const secret = generateTotpSecret();
      const backupCodes = generateBackupCodes(10);
      const stored = await sql`
        UPDATE solution_reviewers
        SET totp_secret = ${encryptSecret(secret)}, backup_codes = ${backupCodes.map(hashBackupCode)},
          totp_last_step = NULL
        WHERE account_id = ${accountId} AND totp_confirmed_at IS NULL
        RETURNING account_id
      `;
      if (!stored.length) return failure('Ya tienes un autenticador configurado.', 409);

      const uri = otpauthUri(secret, email);
      const qrDataUri = await QRCode.toDataURL(uri, {
        margin: 1,
        width: 280,
        errorCorrectionLevel: 'M',
        color: { dark: '#1c1917', light: '#ffffff' },
      });
      return NextResponse.json(
        { ok: true, secret, otpauthUri: uri, qrDataUri, backupCodes, email },
        { headers: NO_STORE },
      );
    }

    // step === 'confirm'
    if (!challenge.totp_secret) return failure('Genera un código QR primero.', 400);
    const code = typeof body?.code === 'string' ? body.code.replace(/[\s-]/g, '') : '';
    if (!/^\d{6}$/.test(code)) return failure('Código inválido.', 400);

    const cipher = String(challenge.totp_secret);
    const accepted = verifyTotp(decryptSecret(cipher), code, null);
    if (accepted === null) {
      await audit({
        actorId: null,
        actorEmail: email,
        action: 'enroll_code_failed',
        subjectType: 'account',
        subjectId: accountId,
        metadata: { device },
        ip,
      });
      return failure('Código incorrecto. Revisa la hora de tu teléfono e intenta de nuevo.', 401);
    }

    // Confirms exactly the secret that was verified: if another tab restarted the
    // enrollment in between, totp_secret no longer matches and nothing happens.
    const sessionToken = generateToken();
    const opened = await sql`
      WITH ch AS (
        DELETE FROM ops_login_challenges
        WHERE token_hash = ${challengeHash} AND expires_at > now()
        RETURNING account_id
      ), enrolled AS (
        UPDATE solution_reviewers r
        SET totp_confirmed_at = now(), totp_last_step = ${accepted.toString()}, enroll_by = NULL
        FROM ch
        WHERE r.account_id = ch.account_id AND r.totp_confirmed_at IS NULL AND r.totp_secret = ${cipher}
        RETURNING r.account_id
      ), sess AS (
        INSERT INTO ops_sessions (token_hash, account_id, expires_at, ip, user_agent)
        SELECT ${hashToken(sessionToken)}, account_id, now() + ${OPS_SESSION_SECONDS} * interval '1 second', ${ip}, ${userAgent}
        FROM enrolled RETURNING account_id
      )
      SELECT account_id FROM sess
    `;
    if (!opened.length) return failure('La configuración cambió. Inicia sesión de nuevo.', 409);

    await audit({
      actorId: accountId,
      actorEmail: email,
      action: 'totp_enrolled',
      subjectType: 'account',
      subjectId: accountId,
      metadata: { device },
      ip,
    });

    afterLogin({
      accountId,
      email,
      device,
      ip,
      alert: {
        subject: 'Configuraste un autenticador',
        summary:
          'Se vinculó una app autenticadora a tu cuenta de ops. Desde ahora cada acceso la pedirá.',
      },
    });

    const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
    res.cookies.set({ ...sessionCookieOptions(OPS_SESSION_SECONDS), value: sessionToken });
    res.cookies.set({ ...challengeCookieOptions(0), value: '' });
    return res;
  } catch (err) {
    console.error('[ops/auth/enroll]', err);
    return failure('Error interno.', 503);
  }
}
