/** Server-only configuration; never expose the returned connection string. */
export function getDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  return env.NEON_DATABASE_URL?.trim() || env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim();
}
