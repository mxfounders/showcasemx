import { NextRequest, NextResponse } from 'next/server';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
import { authorizedOpsMedia } from '@/lib/ops-media';
import { getObject } from '@/lib/storage/blob';
export const runtime = 'nodejs';

/**
 * Screenshot bytes for the ops backoffice review drawer. Server-to-server:
 * Bearer OPS_MEDIA_SECRET, no browser Origin. This route — not ops — owns the
 * §16 reviewer-visibility rule: the asset must belong to this solution, the
 * solution must not be a draft, and the asset must be referenced in `data` or
 * `published_data`. An unselected upload stays invisible to reviewers.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ solutionId: string; assetId: string }> }) {
  if (!authorizedOpsMedia(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { solutionId, assetId } = await props.params;
  if (!isSolutionId(solutionId) || !isSolutionId(assetId)) return failure('Captura no disponible.', 404);
  try {
    const sql = solutionsSql();
    const ref = JSON.stringify([{ id: assetId }]);
    const [asset] = await sql`SELECT m.storage_key FROM solution_media m JOIN founder_solutions s ON s.id = m.solution_id
      WHERE m.id = ${assetId} AND s.id = ${solutionId} AND s.status <> 'draft' AND m.storage_key IS NOT NULL
        AND (COALESCE(s.data->'screenshots','[]'::jsonb) @> ${ref}::jsonb
          OR COALESCE(s.published_data->'screenshots','[]'::jsonb) @> ${ref}::jsonb)`;
    if (!asset) return failure('Captura no disponible.', 404);
    const obj = await getObject(String(asset.storage_key));
    if (obj === null || obj === 'not-modified') return failure('Captura no disponible.', 404);
    const bytes = obj.bytes;
    return new NextResponse(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return failure('No pudimos cargar la captura.', 503);
  }
}
