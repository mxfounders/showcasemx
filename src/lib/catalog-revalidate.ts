import { timingSafeEqual } from 'node:crypto';
// Dedicated secret, not CRON_SECRET: this endpoint is called from a different
// app's server (ops/, a separate Vercel project), so it gets its own
// credential instead of widening what a leak of the mail/monitor cron secret
// could reach. Same constant-time comparison pattern as authorizedCron().
export function authorizedCatalogRevalidate(value: string | null) {
  const expected = process.env.CATALOG_REVALIDATE_SECRET;
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(value), b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
