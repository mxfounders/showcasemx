import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId, safeSolutionUrl, type SolutionData } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
import { fetchSiteImage } from '@/lib/solutions/site-image';
import type { SiteIcon } from '@/lib/solutions/site-icon';
import { storageEnabled, putObject, getObject } from '@/lib/storage/blob';
import { siteIconKey, siteImageKey } from '@/lib/storage/keys';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

/**
 * Serves the cover taken from the project's own website.
 *
 * Public only once the solution is published; while it is a draft the image
 * answers to its owner alone, so a stranger holding a UUID cannot confirm that a
 * draft exists there. The bytes are ours (re-encoded WebP), not a remote link.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (!isSolutionId(params.id)) return failure(t.coverUnavailable, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    const sql = solutionsSql();
    const [row] =
      await sql`SELECT i.storage_key, i.checksum, s.published_data IS NOT NULL AS is_public FROM solution_site_images i JOIN founder_solutions s ON s.id = i.solution_id
      WHERE i.solution_id = ${params.id} AND i.storage_key IS NOT NULL
        AND (s.published_data IS NOT NULL OR s.owner_id = ${account?.id ?? null}::uuid)`;
    if (!row) return failure(t.coverUnavailable, 404);
    // Unlike a screenshot, the owner can re-fetch this at any time (even while
    // published), so the bytes behind this URL can change — no `immutable`.
    const cacheControl = row.is_public
      ? 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400'
      : 'private, no-store';
    const etag = row.checksum ? `"${String(row.checksum)}"` : null;
    if (etag && request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { 'Cache-Control': cacheControl, ETag: etag },
      });
    }
    const obj = await getObject(String(row.storage_key));
    if (obj === null || obj === 'not-modified') return failure(t.coverUnavailable, 404);
    return new NextResponse(new Uint8Array(obj.bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
        ...(etag ? { ETag: etag } : {}),
      },
    });
  } catch {
    return failure(t.coverLoadFailed, 503);
  }
}

/**
 * The owner asks us to read (or re-read) the og:image of their declared site. The same
 * request returns what the page says about itself (name, description) so the editor can
 * prefill an empty draft; nothing of that is saved here.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useAccount, 403);
  if (!isSolutionId(params.id)) return failure(t.solutionUnavailable, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const sql = solutionsSql();
    const [solution] =
      await sql`SELECT data FROM founder_solutions WHERE id = ${params.id} AND owner_id = ${account.id}`;
    if (!solution) return failure(t.solutionUnavailable, 404);
    // Outbound requests on someone else's behalf: keep them scarce.
    if (!(await securityLimit('solution-site-image', account.id, 20)))
      return failure(t.tooManyCoverLookups, 429);
    if (!storageEnabled()) return failure(t.storageUnavailable, 503);

    const website = safeSolutionUrl((solution.data as SolutionData)?.website ?? '');
    if (!website) return failure(t.addWebsiteFirst, 400);

    const result = await fetchSiteImage(website);
    const icon = await storeIcon(sql, params.id, website, result.icon);
    if (!result.ok) {
      // The failure branch never touches storage_key: the AFTER UPDATE OF
      // storage_key trigger does not fire, so a working cover is not orphaned
      // by a transient site error. Do not "improve" this to null out storage_key.
      await sql`INSERT INTO solution_site_images (solution_id, source_url, image_url, width, height, failure, fetched_at)
        VALUES (${params.id}, ${website}, NULL, NULL, NULL, ${result.failure}, now())
        ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, failure = EXCLUDED.failure, fetched_at = now()`;
      return NextResponse.json(
        { ok: false, failure: result.failure, meta: result.meta ?? null, icon },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { imageUrl, buffer, width, height } = result.image;
    // Fresh key per re-fetch. The UPSERT changes storage_key, the trigger
    // orphans the previous one — a deterministic key would be deleted out from
    // under the live row a sweep cycle after a re-fetch.
    const key = siteImageKey(params.id, randomUUID());
    const checksum = createHash('sha256').update(buffer).digest('hex');
    await putObject(key, buffer);
    try {
      await sql`INSERT INTO solution_site_images (solution_id, source_url, image_url, storage_key, bytes, checksum, width, height, failure, fetched_at)
        VALUES (${params.id}, ${website}, ${imageUrl}, ${key}, ${buffer.length}, ${checksum}, ${width}, ${height}, NULL, now())
        ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, image_url = EXCLUDED.image_url,
          storage_key = EXCLUDED.storage_key, bytes = EXCLUDED.bytes, checksum = EXCLUDED.checksum,
          width = EXCLUDED.width, height = EXCLUDED.height, failure = NULL, fetched_at = now()`;
    } catch {
      try {
        await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
      } catch {}
      return failure(t.coverSaveFailed, 503);
    }
    return NextResponse.json(
      { ok: true, imageUrl, width, height, meta: result.meta, icon },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.coverReadFailed, 503);
  }
}

/**
 * Keeps the site's logo next to its cover (SHCWS-177) and says whether the listing has
 * one now. Best-effort: nothing here fails the read. A read that finds no logo keeps
 * the previous one, unless the listing now points at another site, whose logo it is not.
 */
async function storeIcon(
  sql: ReturnType<typeof solutionsSql>,
  solutionId: string,
  website: string,
  icon: SiteIcon | null | undefined,
): Promise<boolean> {
  try {
    if (!icon) {
      await sql`DELETE FROM solution_site_icons WHERE solution_id = ${solutionId} AND source_url <> ${website}`;
      const [kept] = await sql`SELECT 1 FROM solution_site_icons WHERE solution_id = ${solutionId}`;
      return Boolean(kept);
    }
    // A fresh key per read: the UPSERT changes storage_key and the trigger orphans the
    // previous blob (same rule as the cover above).
    const key = siteIconKey(solutionId, randomUUID());
    const checksum = createHash('sha256').update(icon.buffer).digest('hex');
    await putObject(key, icon.buffer);
    try {
      await sql`INSERT INTO solution_site_icons (solution_id, source_url, icon_url, storage_key, bytes, checksum, size, fetched_at)
        VALUES (${solutionId}, ${website}, ${icon.iconUrl}, ${key}, ${icon.buffer.length}, ${checksum}, ${icon.size}, now())
        ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, icon_url = EXCLUDED.icon_url,
          storage_key = EXCLUDED.storage_key, bytes = EXCLUDED.bytes, checksum = EXCLUDED.checksum,
          size = EXCLUDED.size, fetched_at = now()`;
      return true;
    } catch {
      try {
        await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;
      } catch {}
      return false;
    }
  } catch {
    return false;
  }
}
