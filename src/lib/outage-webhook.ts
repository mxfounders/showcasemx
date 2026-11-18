import { timingSafeEqual } from 'node:crypto';

// Dedicated secret, not CRON_SECRET: it is handed to a service outside shwcs (an uptime
// monitor, a GitHub Actions secret), and whoever holds it can report outages that refund
// sponsored days (SHCWS-179). It is rotated on its own. Same comparison as authorizedCron.
export function authorizedOutageReport(value: string | null) {
  const expected = process.env.OUTAGE_WEBHOOK_SECRET;
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(value),
    b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
