import { createHmac } from 'node:crypto';

// Deduplicates a view to one per visitor per solution per day without ever
// storing the visitor's IP. VIEW_HASH_SECRET is the HMAC key ("sal de
// servidor"): without it the hash would be a plain SHA-256 of a small,
// enumerable IPv4 space, trivially reversible offline. The day is folded
// into the HMAC input (not just the table's separate `day` column) so the
// same visitor's hash on two different days cannot be correlated either.
export function visitorHash(ip: string, day: string) {
  const secret = process.env.VIEW_HASH_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${ip}:${day}`).digest('hex');
}
