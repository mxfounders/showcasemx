import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { decryptSecret, encryptSecret, generateBackupCodes, generateTotpSecret, hashBackupCode, otpauthUri, totpConfigured, verifyTotp } from '@/lib/auth/totp';
export const runtime = 'nodejs';

/**
 * Optional two-step verification for a product account.
 *
 * `start` and `disable` re-ask for the password: holding a session cookie is not
 * enough to add or remove a second factor. The secret is only marked confirmed
 * once a code generated from it is accepted, so a half-finished enrolment never
 * locks anybody out.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure('Usa el formulario de tu cuenta.', 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure('Vuelve a iniciar sesión.', 401);
    const body = await solutionBody(request);
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!['start', 'confirm', 'disable', 'regenerate'].includes(action)) return failure('Acción no válida.', 400);
    if (!totpConfigured()) return failure('La verificación en dos pasos no está habilitada en este entorno. Falta configurar AUTH_TOTP_KEY.', 503);
    if (!await securityLimit('account-totp', account.id, 20)) return failure('Demasiados intentos. Intenta más tarde.', 429);

    const sql = authSql();
    const [row] = await sql`SELECT password_hash, totp_secret, totp_confirmed_at, totp_last_step FROM auth_accounts WHERE id = ${account.id}`;
    if (!row) return failure('Vuelve a iniciar sesión.', 401);
    const enabled = Boolean(row.totp_confirmed_at);

    const passwordChecks = async () => {
      if (typeof body?.password !== 'string' || body.password.length > 4096) return false;
      return verifyPassword(body.password, String(row.password_hash));
    };

    if (action === 'start') {
      if (enabled) return failure('Ya tienes la verificación en dos pasos activa. Desactívala antes de generar otro código.', 409);
      if (!await passwordChecks()) return failure('La contraseña no es correcta.', 400);
      const secret = generateTotpSecret();
      const backupCodes = generateBackupCodes(10);
      // Stored unconfirmed: login keeps working normally until `confirm` succeeds.
      await sql`UPDATE auth_accounts SET totp_secret = ${encryptSecret(secret)}, backup_codes = ${backupCodes.map(hashBackupCode)}, totp_last_step = NULL WHERE id = ${account.id} AND totp_confirmed_at IS NULL`;
      const uri = otpauthUri(secret, account.email);
      return NextResponse.json({ ok: true, secret, otpauthUri: uri, qrDataUri: await QRCode.toDataURL(uri, { margin: 1, width: 240 }), backupCodes }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'confirm') {
      if (enabled) return failure('La verificación en dos pasos ya está activa.', 409);
      if (!row.totp_secret) return failure('Genera primero un código QR.', 400);
      const code = typeof body?.code === 'string' ? body.code.trim().replace(/\s/g, '') : '';
      if (!/^\d{6}$/.test(code)) return failure('Escribe el código de 6 dígitos de tu aplicación.', 400);
      if (verifyTotp(decryptSecret(String(row.totp_secret)), code, null) === null) return failure('El código no coincide. Revisa la hora de tu teléfono e inténtalo de nuevo.', 400);
      const confirmed = await sql`UPDATE auth_accounts SET totp_confirmed_at = now() WHERE id = ${account.id} AND totp_confirmed_at IS NULL RETURNING id`;
      if (!confirmed.length) return failure('La verificación en dos pasos ya estaba activa.', 409);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'regenerate') {
      if (!enabled) return failure('Activa primero la verificación en dos pasos.', 409);
      if (!await passwordChecks()) return failure('La contraseña no es correcta.', 400);
      const backupCodes = generateBackupCodes(10);
      // Replacing the list invalidates every previous code, including unused ones.
      await sql`UPDATE auth_accounts SET backup_codes = ${backupCodes.map(hashBackupCode)} WHERE id = ${account.id}`;
      return NextResponse.json({ ok: true, backupCodes }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // disable
    if (!enabled) return failure('La verificación en dos pasos no está activa.', 409);
    if (!await passwordChecks()) return failure('La contraseña no es correcta.', 400);
    const cleared = await sql`WITH cleared AS (UPDATE auth_accounts SET totp_secret = NULL, totp_confirmed_at = NULL, totp_last_step = NULL, backup_codes = NULL WHERE id = ${account.id} AND totp_confirmed_at IS NOT NULL RETURNING id), challenges AS (DELETE FROM auth_login_challenges WHERE account_id IN (SELECT id FROM cleared)) SELECT id FROM cleared`;
    if (!cleared.length) return failure('La verificación en dos pasos ya estaba desactivada.', 409);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_TOTP_KEY_MISSING') return failure('La verificación en dos pasos no está habilitada en este entorno.', 503);
    return failure('No pudimos completar el cambio. Intenta de nuevo.', 503);
  }
}
