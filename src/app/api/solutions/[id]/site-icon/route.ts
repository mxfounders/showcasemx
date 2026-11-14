import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getObject } from '@/lib/storage/blob';
export const runtime = 'nodejs';

/**
 * Serves the logo taken from the project's own website (SHCWS-177), with the cover's
 * rules: public once the solution is published, owner-only while it is a draft, and an
 * empty 404 otherwise so a UUID confirms nothing. Written by the cover's POST
 * (../site-image/route.ts), which reads both from the same page.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const missing = () =>
    new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  if (!isSolutionId(params.id)) return missing();
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    const [row] = await solutionsSql()`SELECT i.storage_key, i.checksum,
        s.published_data IS NOT NULL AS is_public
      FROM solution_site_icons i JOIN founder_solutions s ON s.id = i.solution_id
      WHERE i.solution_id = ${params.id}
        AND (s.published_data IS NOT NULL OR s.owner_id = ${account?.id ?? null}::uuid)`;
    if (!row) return missing();
    // The owner can re-read the site at any time, so the bytes behind this URL can
    // change: short browser cache, longer shared cache, no `immutable`.
    const cacheControl = row.is_public
      ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
      : 'private, no-store';
    const etag = `"${String(row.checksum)}"`;
    if (request.headers.get('if-none-match') === etag)
      return new NextResponse(null, {
        status: 304,
        headers: { 'Cache-Control': cacheControl, ETag: etag },
      });
    const object = await getObject(String(row.storage_key));
    if (object === null || object === 'not-modified') return missing();
    return new NextResponse(new Uint8Array(object.bytes), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
        ETag: etag,
      },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
