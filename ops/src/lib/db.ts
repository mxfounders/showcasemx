import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url =
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.shwcs_POSTGRES_URL?.trim();
  if (!url) throw new Error('NO_DATABASE_URL');
  return neon(url, { fetchOptions: { cache: 'no-store' } });
}
