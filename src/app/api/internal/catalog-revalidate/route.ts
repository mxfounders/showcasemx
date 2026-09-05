import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authorizedCatalogRevalidate } from '@/lib/catalog-revalidate';

// Closes the Fase 1 gap (CLAUDE.md §52): ops is a separate Next.js deployment
// with its own cache, so a publish/withdraw decided there doesn't invalidate
// the product's cached catalog on its own — without this, that only happened
// on the next like/save/comment or after the 300s TTL. Bearer-secret auth
// only, like /api/internal/mail's cron secret: this is a server-to-server
// call, so there is no browser Origin header to check.
export async function POST(request: NextRequest) {
  if (!authorizedCatalogRevalidate(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  revalidateTag('catalog');
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
