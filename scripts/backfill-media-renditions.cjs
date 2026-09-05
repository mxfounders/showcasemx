// Fase B backfill: generate the 400/800 renditions for solution_media rows that
// predate db/media-renditions.sql. Not a schema migration — one row at a time.
//
//   node scripts/backfill-media-renditions.cjs [--dry-run] [--limit N]
//
// Resumable: selects solution_media rows missing a full pair of solution_media_files.
// Re-running after completion is a no-op. Never touches the full image.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const { neon } = require('@neondatabase/serverless');
const { put, get } = require('@vercel/blob');
require('dotenv').config({ path: '.env.local', quiet: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const WIDTHS = [400, 800];

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) { console.error('Missing database'); process.exit(1); }
if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
  console.error('Missing blob credentials'); process.exit(1);
}
const sql = neon(url);
const renditionKey = (sid, aid, w) => `solutions/${sid}/media/${aid}-${w}.webp`;

let made = 0, failed = 0, done = 0;

async function main() {
  for (;;) {
    if (done >= LIMIT) break;
    const rows = await sql`SELECT m.id, m.solution_id, m.storage_key
      FROM solution_media m
      WHERE (SELECT count(*) FROM solution_media_files f WHERE f.media_id = m.id) < 2
      ORDER BY m.created_at LIMIT ${Math.min(20, LIMIT - done)}`;
    if (!rows.length) break;
    for (const row of rows) {
      done++;
      try {
        const src = await get(String(row.storage_key), { access: 'private' });
        if (!src || src.statusCode !== 200) { failed++; console.error(`[error] ${row.id}: full blob missing`); continue; }
        const full = Buffer.from(await new Response(src.stream).arrayBuffer());
        for (const w of WIDTHS) {
          const have = await sql`SELECT 1 FROM solution_media_files WHERE media_id = ${row.id} AND width = ${w}`;
          if (have.length) continue;
          const out = await sharp(full).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
          const key = renditionKey(row.solution_id, row.id, w), sum = createHash('sha256').update(out).digest('hex');
          if (DRY_RUN) { console.log(`[dry-run] ${row.id} w=${w} -> ${key} (${out.length}B)`); continue; }
          await put(key, out, { access: 'private', addRandomSuffix: false, contentType: 'image/webp', cacheControlMaxAge: 31_536_000 });
          const ins = await sql`INSERT INTO solution_media_files(storage_key, media_id, width, bytes, checksum)
            SELECT ${key}, ${row.id}, ${w}, ${out.length}, ${sum}
            WHERE EXISTS(SELECT 1 FROM solution_media WHERE id = ${row.id}) ON CONFLICT DO NOTHING RETURNING storage_key`;
          if (!ins.length) { await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`; continue; }
          made++;
        }
      } catch (err) {
        failed++;
        console.error(`[error] ${row.id}: ${err && err.message ? err.message.slice(0, 120) : 'unknown'}`);
      }
    }
  }
  const [p] = await sql`SELECT count(*)::int n FROM solution_media m WHERE (SELECT count(*) FROM solution_media_files f WHERE f.media_id = m.id) < 2`;
  console.log(`renditions made=${made} failed=${failed}${DRY_RUN ? ' (dry-run)' : ''} | assets still pending=${p.n}`);
  if (failed > 0) process.exitCode = 1;
}
main().catch(() => { console.error('Rendition backfill failed; inspect access/schema without sharing secrets.'); process.exitCode = 1; });
