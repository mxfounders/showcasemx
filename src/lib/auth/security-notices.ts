import { randomUUID } from 'node:crypto';
import { authSql } from './security';
import { deviceLabel } from './session';
import { getDictionary } from '@/i18n/get-dictionary';
import { deliverNotifications } from '@/lib/notifications/server';

/**
 * Security notices (SHCWS-154): always on, never subject to Preferencias de avisos, sent
 * right away and kept in the account's bell. Titles are stored in Spanish like every other
 * notice (CLAUDE.md §63) and name the device by its coarse label, never an IP.
 */
export type SecurityEvent =
  | 'password-changed'
  | 'password-reset'
  | 'totp-on'
  | 'totp-off'
  | 'backup-code'
  | 'google-linked'
  | 'google-unlinked'
  | 'new-device'
  | 'totp-failures';

const titles: Record<SecurityEvent, (device: string) => string> = {
  'password-changed': device => `Se cambió la contraseña de tu cuenta (${device})`,
  'password-reset': device => `Se restableció la contraseña de tu cuenta (${device})`,
  'totp-on': device => `Se activó la verificación en dos pasos (${device})`,
  'totp-off': device => `Se desactivó la verificación en dos pasos (${device})`,
  'backup-code': device => `Se usó un código de respaldo para entrar (${device})`,
  'google-linked': device => `Se vinculó una cuenta de Google (${device})`,
  'google-unlinked': device => `Se desvinculó la cuenta de Google (${device})`,
  'new-device': device => `Nuevo acceso a tu cuenta desde ${device}`,
  // Only reachable after a correct password (or Google): «No fui yo» is the right advice.
  'totp-failures': device =>
    `Diez códigos incorrectos en una hora al entrar a tu cuenta (${device})`,
};

export function securityTitle(event: SecurityEvent, device: string) {
  return titles[event](device);
}

async function device(userAgent: string | null) {
  return deviceLabel(userAgent, (await getDictionary('es')).settings.security.device).slice(0, 120);
}

export async function securityNotice(
  accountId: string,
  event: SecurityEvent,
  userAgent: string | null,
) {
  const sql = authSql();
  const [row] =
    await sql`INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state)
    VALUES (${accountId},'security',${`security:${event}:${randomUUID()}`},${securityTitle(event, await device(userAgent))},'/account/settings/security','pending')
    RETURNING id::text`;
  if (row) await deliverNotifications({ ids: [String(row.id)] });
}

/**
 * Records a successful sign-in's device and says whether to warn: the label wasn't seen in
 * the last 90 days and the account already had another recent one (an account's first
 * device is not news).
 */
export async function rememberDevice(accountId: string, userAgent: string | null) {
  const sql = authSql(),
    label = await device(userAgent);
  const [row] = await sql`WITH known AS (
      SELECT count(*) FILTER (WHERE last_seen_at>now()-interval '90 days')::int AS recent,
        COALESCE(bool_or(device_label=${label} AND last_seen_at>now()-interval '90 days'),false) AS seen
      FROM auth_known_devices WHERE account_id=${accountId}
    ), saved AS (
      INSERT INTO auth_known_devices(account_id,device_label,last_seen_at) VALUES (${accountId},${label},now())
      ON CONFLICT (account_id,device_label) DO UPDATE SET last_seen_at=now()
    ) SELECT recent,seen FROM known`;
  return Number(row?.recent ?? 0) > 0 && !row?.seen;
}

/** After any successful sign-in: remember the device and warn if it's a new one. */
export async function signInNotice(accountId: string, userAgent: string | null) {
  if (await rememberDevice(accountId, userAgent))
    await securityNotice(accountId, 'new-device', userAgent);
}
