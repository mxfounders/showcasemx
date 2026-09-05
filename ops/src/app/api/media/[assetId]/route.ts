import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

// Screenshot bytes for the review drawer. ops holds no blob token and no copy of
// the §16 reviewer-visibility predicate: it resolves the solution id, then
// proxies to the product's /api/internal/media route, which owns that rule and
// the storage. Keeps the phase-5 content_base64 drop a product-only change.
export async function GET(_req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const { assetId } = await props.params;
  if (!isUuid(assetId)) return failure('Captura no disponible.', 404);

  const origin = process.env.PRODUCT_APP_ORIGIN;
  const secret = process.env.OPS_MEDIA_SECRET;
  if (!origin || !secret) return failure('Backoffice mal configurado.', 503);

  try {
    const sql = getDb();
    const rows = await sql`SELECT solution_id FROM solution_media WHERE id = ${assetId} LIMIT 1`;
    if (!rows.length) return failure('Captura no disponible.', 404);

    const upstream = await fetch(`${origin}/api/internal/media/${String(rows[0].solution_id)}/${assetId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!upstream.ok) return failure('Captura no disponible.', upstream.status === 404 ? 404 : 503);

    return new NextResponse(new Uint8Array(await upstream.arrayBuffer()), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (err) {
    console.error('[ops/media]', err);
    return failure('No pudimos cargar la captura.', 503);
  }
}
