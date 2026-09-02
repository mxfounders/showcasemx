import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.shwcs_POSTGRES_URL;
  if (!url) throw new Error('NO_DATABASE_URL');
  return neon(url);
}
