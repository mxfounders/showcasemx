// Phase 3 of the object-storage migration. NOT a schema migration: one row at a
// time, no transaction wrapper. Copies base64 image bytes into Vercel Blob and
// records storage_key/bytes/checksum. content_base64 is NEVER cleared here — the
// phase 5 DROP COLUMN is the only thing that removes it, which is what keeps
// phases 1-4 reversible.
//
//   node scripts/backfill-media-blob.cjs [--dry-run] [--limit N] [--verify]
//
// Resumable by construction: the selection predicate (storage_key IS NULL AND
// content_base64 IS NOT NULL) is also the completion predicate, so re-running
// after completion is a no-op. --verify re-reads every migrated blob and
// compares sha256 against the base64 column; run it over all rows before phase 5.
const fs = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { neon } = require('@neondatabase/serverless');
const { put, get } = require('@vercel/blob');
require('dotenv').config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY = args.includes('--verify');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const BATCH = 20;

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) { console.error('Missing database'); process.exit(1); }
if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
  console.error('Missing blob credentials (BLOB_READ_WRITE_TOKEN, or VERCEL_OIDC_TOKEN + BLOB_STORE_ID)');
  process.exit(1);
}
const sql = neon(url);

const mediaKey = (s, a) => `solutions/${s}/media/${a}.webp`;
const siteImageKey = (s, f) => `solutions/${s}/site/${f}.webp`;
const avatarKey = (acc, u) => `accounts/${acc}/avatar/${u}.webp`;
const dataUriBytes = (v) => { const s = String(v); const c = s.indexOf(','); return Buffer.from(c >= 0 ? s.slice(c + 1) : s, 'base64'); };

let migrated = 0, failed = 0, done = 0;

async function verifyKey(key, expectSha) {
  const obj = await get(key, { access: 'private' });
  if (!obj || obj.statusCode !== 200) return false;
  const buf = Buffer.from(await new Response(obj.stream).arrayBuffer());
  return createHash('sha256').update(buf).digest('hex') === expectSha;
}

async function backfill(kind, select, keyFor, bytesFrom, update) {
  for (;;) {
    if (done >= LIMIT) return;
    const rows = await select(Math.min(BATCH, LIMIT - done));
    if (!rows.length) return;
    for (const row of rows) {
      done++;
      const bytes = bytesFrom(row);
      const sum = createHash('sha256').update(bytes).digest('hex');
      const key = keyFor(row);
      if (DRY_RUN) { console.log(`[dry-run] ${kind} ${row.id ?? row.solution_id} -> ${key} (${bytes.length}B)`); continue; }
      try {
        await put(key, bytes, { access: 'private', addRandomSuffix: false, contentType: 'image/webp', cacheControlMaxAge: 31_536_000 });
        const updated = await update(row, key, bytes.length, sum);
        if (!updated.length) {
          // Concurrently backfilled or the row was deleted mid-flight.
          await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
          continue;
        }
        if (VERIFY && !(await verifyKey(key, sum))) { failed++; console.error(`[verify-fail] ${kind} ${key}`); continue; }
        migrated++;
      } catch (err) {
        failed++;
        console.error(`[error] ${kind} ${row.id ?? row.solution_id}: ${err && err.message ? err.message.slice(0, 120) : 'unknown'}`);
      }
    }
  }
}

async function main() {
  await backfill('media',
    (n) => sql`SELECT id, solution_id, content_base64 FROM solution_media WHERE storage_key IS NULL AND content_base64 IS NOT NULL ORDER BY created_at LIMIT ${n}`,
    (r) => mediaKey(r.solution_id, r.id),
    (r) => Buffer.from(String(r.content_base64), 'base64'),
    (r, key, n, sum) => sql`UPDATE solution_media SET storage_key=${key}, bytes=${n}, checksum=${sum} WHERE id=${r.id} AND storage_key IS NULL RETURNING id`);

  await backfill('site-image',
    (n) => sql`SELECT solution_id, content_base64 FROM solution_site_images WHERE storage_key IS NULL AND content_base64 IS NOT NULL ORDER BY fetched_at LIMIT ${n}`,
    (r) => siteImageKey(r.solution_id, randomUUID()),
    (r) => Buffer.from(String(r.content_base64), 'base64'),
    (r, key, n, sum) => sql`UPDATE solution_site_images SET storage_key=${key}, bytes=${n}, checksum=${sum} WHERE solution_id=${r.solution_id} AND storage_key IS NULL RETURNING solution_id`);

  await backfill('avatar',
    (n) => sql`SELECT id, avatar_data FROM auth_accounts WHERE avatar_key IS NULL AND avatar_data IS NOT NULL ORDER BY id LIMIT ${n}`,
    (r) => avatarKey(r.id, randomUUID()),
    (r) => dataUriBytes(r.avatar_data),
    (r, key, n, sum) => sql`UPDATE auth_accounts SET avatar_key=${key}, avatar_checksum=${sum} WHERE id=${r.id} AND avatar_key IS NULL RETURNING id`);

  const [pending] = await sql`SELECT
    (SELECT count(*)::int FROM solution_media       WHERE storage_key IS NULL AND content_base64 IS NOT NULL) AS media,
    (SELECT count(*)::int FROM solution_site_images WHERE storage_key IS NULL AND content_base64 IS NOT NULL) AS site,
    (SELECT count(*)::int FROM auth_accounts        WHERE avatar_key  IS NULL AND avatar_data     IS NOT NULL) AS avatar,
    (SELECT count(*)::int FROM storage_orphans) AS orphans`;
  console.log(`migrated=${migrated} failed=${failed}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`pending: media=${pending.media} site=${pending.site} avatar=${pending.avatar} | storage_orphans=${pending.orphans}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(() => { console.error('Backfill failed; inspect access/schema without sharing secrets.'); process.exitCode = 1; });
