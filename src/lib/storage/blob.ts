// The ONLY file in the product that imports @vercel/blob. Swapping to another
// object store (R2, S3) is a change confined here. ops/ does not import this — it
// proxies through the product (src/app/api/internal/media/...).
//
// Auth resolution: on the Vercel runtime (prod/preview) VERCEL_OIDC_TOKEN +
// BLOB_STORE_ID are injected and the SDK uses OIDC. Locally and in scripts OIDC
// is not available for the "development" environment, so a static
// BLOB_READ_WRITE_TOKEN is required (see .env.local / docs/env.md).
import { put, get, del, BlobNotFoundError } from '@vercel/blob';

const ACCESS = 'private' as const;
// Screenshots never change once published (no replace endpoint) so a long TTL is
// safe; the serve route still sets its own Cache-Control per publication state.
const MAX_AGE_SECONDS = 31_536_000;

/**
 * True when object storage can be reached from this process. When false the
 * caller keeps the base64 path — no silent success, an explicit fallback.
 */
export function storageEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

/** Uploads WebP bytes at an exact key. Never addRandomSuffix, never allowOverwrite:
 *  keys are minted fresh per write, so a collision would be our bug and must throw. */
export async function putObject(
  key: string,
  bytes: Buffer,
  contentType = 'image/webp',
): Promise<{ key: string; bytes: number }> {
  await put(key, bytes, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType,
    cacheControlMaxAge: MAX_AGE_SECONDS,
  });
  return { key, bytes: bytes.length };
}

export type GetObjectResult =
  | { bytes: Buffer; etag: string }
  | 'not-modified'
  | null;

/**
 * Reads an object BUFFERED — never streamed through to the client. A mid-stream
 * failure after 200 + `immutable` headers were sent would poison the edge with a
 * truncated image for an hour; the 400 KiB cap makes buffering free.
 * Returns 'not-modified' on an ifNoneMatch ETag hit, null when the key is absent.
 */
export async function getObject(
  key: string,
  ifNoneMatch?: string,
): Promise<GetObjectResult> {
  let res;
  try {
    res = await get(key, {
      access: ACCESS,
      ...(ifNoneMatch ? { ifNoneMatch } : {}),
    });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
  if (res === null) return null;
  if (res.statusCode === 304) return 'not-modified';
  const bytes = Buffer.from(await new Response(res.stream).arrayBuffer());
  return { bytes, etag: res.blob.etag };
}

/** Deletes keys best-effort. `del` does not throw on a missing key, so
 *  re-sweeping an already-gone blob is free. An optional signal bounds the call
 *  (the sweeper passes one so a slow store cannot stall the cron). */
export async function deleteObjects(keys: string[], signal?: AbortSignal): Promise<void> {
  if (keys.length === 0) return;
  await del(keys, signal ? { abortSignal: signal } : undefined);
}

/**
 * The single dual-read seam. Deleted whole in phase 5 once content_base64 is
 * dropped. Prefers the blob; falls back to the legacy base64 column.
 * Callers that need conditional requests (the serve routes) use getObject()
 * directly with an ETag; this is for everything else.
 */
export async function readImageBytes(row: {
  storage_key: string | null;
  content_base64: string | null;
}): Promise<Buffer | null> {
  if (row.storage_key) {
    const result = await getObject(row.storage_key);
    return result && result !== 'not-modified' ? result.bytes : null;
  }
  if (row.content_base64) return Buffer.from(row.content_base64, 'base64');
  return null;
}
