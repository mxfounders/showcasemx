import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const { assetId } = await props.params;
  if (!isUuid(assetId)) return failure('Captura no disponible.', 404);

  try {
    const sql = getDb();
    const rows = await sql`SELECT content_base64 FROM solution_media WHERE id = ${assetId} LIMIT 1`;
    if (!rows.length) return failure('Captura no disponible.', 404);

    return new NextResponse(new Uint8Array(Buffer.from(String(rows[0].content_base64), 'base64')), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (err) {
    console.error('[ops/media]', err);
    return failure('No pudimos cargar la captura.', 503);
  }
}
