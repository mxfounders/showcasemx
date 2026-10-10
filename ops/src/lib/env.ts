import { parseAllowlist } from './net';

/**
 * Presence-only view of the ops configuration for the Sistema/Seguridad pages.
 * Never returns a value — only whether each piece is set and well formed.
 */
export function configStatus() {
  const totpKey = process.env.OPS_TOTP_KEY ?? '';
  const allowlist = parseAllowlist(process.env.OPS_IP_ALLOWLIST);
  const database = Boolean(
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.shwcs_POSTGRES_URL?.trim(),
  );
  return {
    database,
    totpKey: /^[0-9a-f]{64}$/i.test(totpKey),
    productOrigin: Boolean(process.env.PRODUCT_APP_ORIGIN?.trim()),
    catalogRevalidate: Boolean(process.env.CATALOG_REVALIDATE_SECRET?.trim()),
    mediaProxy: Boolean(process.env.OPS_MEDIA_SECRET?.trim() && process.env.PRODUCT_APP_ORIGIN),
    securityAlerts: Boolean(
      process.env.RESEND_API_KEY?.trim() &&
      (process.env.OPS_ALERT_FROM?.trim() || process.env.AUTH_EMAIL_FROM?.trim()),
    ),
    ipAllowlist: allowlist.length,
    production: process.env.NODE_ENV === 'production',
  };
}

export type ConfigStatus = ReturnType<typeof configStatus>;
