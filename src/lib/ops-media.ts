import { timingSafeEqual } from 'node:crypto';
// Dedicated secret, not CRON_SECRET or CATALOG_REVALIDATE_SECRET: the ops
// backoffice (a separate Vercel project) reads screenshot bytes through
// /api/internal/media/[solutionId]/[assetId] instead of holding its own blob
// token and its own copy of the §16 reviewer-visibility predicate. Same
// constant-time comparison as authorizedCron()/authorizedCatalogRevalidate().
export function authorizedOpsMedia(value: string | null) {
  const expected = process.env.OPS_MEDIA_SECRET;
  if (!expected || expected.length < 32 || !value) return false;
  const a = Buffer.from(value), b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
