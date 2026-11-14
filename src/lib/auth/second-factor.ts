import { authSql } from './security';
import { decryptSecret, hashBackupCode, verifyTotp } from './totp';

/** A 6-digit code from the app or an 8-digit backup code, spaces removed. */
export function readSecondFactorCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim().replace(/\s/g, '') : '';
  return /^\d{6}$/.test(code) || /^\d{8}$/.test(code) ? code : null;
}

/**
 * Spends one code of the account's second factor, for actions that already checked the
 * password but must not rest on it alone (SHCWS-173: turning it off, new backup codes,
 * deleting the account). An app code records its step, a backup code is removed, each in
 * one conditional statement, so a code works once even across parallel requests.
 */
export async function spendSecondFactor(accountId: string, code: string): Promise<boolean> {
  const sql = authSql();
  const [row] =
    await sql`SELECT totp_secret, totp_last_step FROM auth_accounts WHERE id = ${accountId} AND totp_confirmed_at IS NOT NULL`;
  if (!row?.totp_secret) return false;
  if (code.length === 8) {
    const spent =
      await sql`UPDATE auth_accounts SET backup_codes = array_remove(backup_codes, ${hashBackupCode(code)})
      WHERE id = ${accountId} AND totp_confirmed_at IS NOT NULL AND ${hashBackupCode(code)} = ANY(backup_codes)
      RETURNING id`;
    return spent.length > 0;
  }
  const lastStep =
    row.totp_last_step === null || row.totp_last_step === undefined
      ? null
      : BigInt(String(row.totp_last_step));
  const step = verifyTotp(decryptSecret(String(row.totp_secret)), code, lastStep);
  if (step === null) return false;
  const spent = await sql`UPDATE auth_accounts SET totp_last_step = ${step.toString()}
    WHERE id = ${accountId} AND totp_confirmed_at IS NOT NULL
      AND (totp_last_step IS NULL OR totp_last_step < ${step.toString()})
    RETURNING id`;
  return spent.length > 0;
}
