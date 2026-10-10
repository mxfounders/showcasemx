import { NextResponse } from 'next/server';
import { opsRoute } from '@/lib/api';
import { failure, isUuid } from '@/lib/http';

export const runtime = 'nodejs';

// Screenshot bytes for the review page. ops holds no blob token and no copy of
// the §16 reviewer-visibility predicate: it resolves the solution id, then
// proxies to the product's /api/internal/media route, which owns that rule and
// the storage.
export const GET = opsRoute<{ assetId: string }>({}, async ({ params, sql }) => {
  if (!isUuid(params.assetId)) return failure('Captura no disponible.', 404);
  const origin = process.env.PRODUCT_APP_ORIGIN;
  const secret = process.env.OPS_MEDIA_SECRET;
  if (!origin || !secret) return failure('Backoffice mal configurado.', 503);

  const rows =
    await sql`SELECT solution_id FROM solution_media WHERE id = ${params.assetId} LIMIT 1`;
  if (!rows.length) return failure('Captura no disponible.', 404);

  const upstream = await fetch(
    `${origin}/api/internal/media/${String(rows[0].solution_id)}/${params.assetId}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    },
  );
  if (!upstream.ok) return failure('Captura no disponible.', upstream.status === 404 ? 404 : 503);
  // Only ever relay an image; anything else from upstream is treated as an error.
  if (upstream.headers.get('content-type')?.split(';')[0].trim() !== 'image/webp')
    return failure('Captura no disponible.', 502);

  return new NextResponse(new Uint8Array(await upstream.arrayBuffer()), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
});
