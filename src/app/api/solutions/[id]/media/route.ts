import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
import { storageEnabled } from '@/lib/storage/blob';
import {
  SCREENSHOT_FILE_LIMIT,
  SCREENSHOT_INPUT_LIMIT,
  prepareScreenshot,
  screenshotCount,
  storeScreenshot,
} from '@/lib/solutions/screenshots';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (!isSolutionId(params.id)) return failure(t.solutionUnavailable, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const sql = solutionsSql();
    const [solution] =
      await sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id}`;
    if (!solution) return failure(t.solutionUnavailable, 404);
    const assets =
      await sql`SELECT m.id,m.width,m.height,(COALESCE(s.data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text)) OR COALESCE(s.published_data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text))) AS in_use FROM solution_media m JOIN founder_solutions s ON s.id=m.solution_id WHERE m.solution_id=${params.id} ORDER BY m.created_at DESC`;
    return NextResponse.json({ assets }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.mediaListFailed, 503);
  }
}
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.useAccountToUpload, 403);
  if (!isSolutionId(params.id)) return failure(t.solutionUnavailable, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const sql = solutionsSql();
    const [solution] =
      await sql`SELECT id,status FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id}`;
    if (!solution) return failure(t.solutionUnavailable, 404);
    if (solution.status === 'pending') return failure(t.waitForReview, 409);
    if (!(await securityLimit('solution-media', account.id, 30)))
      return failure(t.tooManyUploads, 429);
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(request.headers.get('content-type') ?? '')
    )
      return failure(t.unsupportedType, 415);
    if (!storageEnabled()) return failure(t.storageUnavailable, 503);
    // Advisory fail-fast so a founder already at 12 files does not burn a blob
    // write per attempt. The transaction re-checks the quota under the lock.
    if ((await screenshotCount(params.id)) >= SCREENSHOT_FILE_LIMIT)
      return failure(t.fileLimit, 409);
    const reader = request.body?.getReader();
    if (!reader) return failure(t.selectScreenshot, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SCREENSHOT_INPUT_LIMIT) {
        await reader.cancel();
        return failure(t.screenshotTooLarge, 413);
      }
      chunks.push(value);
    }
    // The same processing and storage the assistant's MCP tool uses
    // (src/lib/solutions/screenshots.ts).
    const input = Buffer.concat(chunks);
    const prepared = await prepareScreenshot(input);
    if (prepared === 'staticImageOnly') return failure(t.staticImageOnly, 400);
    if (prepared === 'imageTooDetailed') return failure(t.imageTooDetailed, 413);
    if (prepared === 'unreadable') return failure(t.unreadableImage, 400);
    const stored = await storeScreenshot({
      solutionId: params.id,
      ownerId: account.id,
      input,
      prepared,
    });
    if (stored === 'uploadUnconfirmed') return failure(t.uploadUnconfirmed, 503);
    if (stored === 'uploadConflict') return failure(t.uploadConflict, 409);
    return NextResponse.json(
      { asset: { ...stored, in_use: false } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.uploadUnconfirmed, 503);
  }
}
