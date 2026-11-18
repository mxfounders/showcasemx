import sharp from 'sharp';
import { randomUUID, createHash } from 'node:crypto';
import { solutionsSql } from './server';
import { putObject } from '@/lib/storage/blob';
import { mediaKey, renditionKey, RENDITION_WIDTHS } from '@/lib/storage/keys';

/**
 * A founder's screenshot, from bytes to a stored file. Shared by the editor's upload
 * (POST /api/solutions/[id]/media) and the assistant's `subir_captura` MCP tool, so both
 * apply the same limits (docs/media-dashboard.md): JPG, PNG or WebP of at most 2 MiB and
 * 16 megapixels in, a static WebP of at most 1600×1200 and 400 KiB out, 12 files per
 * listing, never while it waits for review.
 */
export const SCREENSHOT_INPUT_LIMIT = 2 * 1024 * 1024;
export const SCREENSHOT_FILE_LIMIT = 12;

export type PreparedScreenshot = { buffer: Buffer; width: number; height: number };

/** Decodes, re-encodes and strips metadata; never trusts the declared type. */
export async function prepareScreenshot(
  input: Buffer,
): Promise<PreparedScreenshot | 'staticImageOnly' | 'imageTooDetailed' | 'unreadable'> {
  try {
    const image = sharp(input, { limitInputPixels: 16000000, failOn: 'warning' }),
      meta = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1)
      return 'staticImageOnly';
    const result = await image
      .rotate()
      .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > 400 * 1024) return 'imageTooDetailed';
    return { buffer: result.data, width: result.info.width, height: result.info.height };
  } catch {
    return 'unreadable';
  }
}

/** Files already stored for a listing; an advisory check, re-done under the lock. */
export async function screenshotCount(solutionId: string) {
  const [{ count }] =
    await solutionsSql()`SELECT count(*)::int AS count FROM solution_media WHERE solution_id=${solutionId}`;
  return Number(count);
}

export type StoredScreenshot = { id: string; width: number; height: number };

/**
 * Blob first, then the FOR UPDATE transaction. If the row does not land (quota race,
 * ownership, status) the just-uploaded blob is orphaned into the sweep queue — never a
 * row pointing at a missing blob. Renditions (400/800) are best-effort afterwards.
 */
export async function storeScreenshot(options: {
  solutionId: string;
  ownerId: string;
  input: Buffer;
  prepared: PreparedScreenshot;
}): Promise<StoredScreenshot | 'uploadConflict' | 'uploadUnconfirmed'> {
  const { solutionId, ownerId, input, prepared } = options;
  const sql = solutionsSql();
  const id = randomUUID(),
    key = mediaKey(solutionId, id),
    checksum = createHash('sha256').update(prepared.buffer).digest('hex');
  await putObject(key, prepared.buffer);
  let results;
  try {
    results = await sql.transaction([
      sql`SELECT id FROM founder_solutions WHERE id=${solutionId} AND owner_id=${ownerId} FOR UPDATE`,
      sql`INSERT INTO solution_media(id,solution_id,storage_key,bytes,checksum,width,height) SELECT ${id},id,${key},${prepared.buffer.length},${checksum},${prepared.width},${prepared.height} FROM founder_solutions WHERE id=${solutionId} AND owner_id=${ownerId} AND status<>'pending' AND (SELECT count(*) FROM solution_media WHERE solution_id=${solutionId})<${SCREENSHOT_FILE_LIMIT} RETURNING id,width,height`,
    ]);
  } catch {
    try {
      await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
    } catch {}
    return 'uploadUnconfirmed';
  }
  if (!results[1].length) {
    try {
      await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
    } catch {}
    return 'uploadConflict';
  }
  // A rendition blob whose row never lands is orphaned into the sweep queue. If any
  // fails, the full image still serves and the loader falls back to it.
  for (const w of RENDITION_WIDTHS) {
    try {
      const out = await sharp(input)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const rkey = renditionKey(solutionId, id, w),
        rsum = createHash('sha256').update(out).digest('hex');
      await putObject(rkey, out);
      const ins =
        await sql`INSERT INTO solution_media_files(storage_key,media_id,width,bytes,checksum) SELECT ${rkey},${id},${w},${out.length},${rsum} WHERE EXISTS(SELECT 1 FROM solution_media WHERE id=${id}) ON CONFLICT DO NOTHING RETURNING storage_key`;
      if (!ins.length)
        await sql`INSERT INTO storage_orphans(key) VALUES(${rkey}) ON CONFLICT(key) DO NOTHING`;
    } catch {
      /* full image is enough */
    }
  }
  const row = results[1][0];
  return { id: String(row.id), width: Number(row.width), height: Number(row.height) };
}
