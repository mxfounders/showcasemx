import { NextRequest, NextResponse, after } from 'next/server';
import { authorizedCatalogRevalidate } from '@/lib/catalog-revalidate';
import { deliverNotifications } from '@/lib/notifications/server';

/**
 * Ops just sent a buyer a short list (SHCWS-60): send that notice's email now instead of
 * at the next daily cron, which stays as the retry. Ops never sends the product's emails
 * itself. Server to server with the ops→product credential (CATALOG_REVALIDATE_SECRET).
 */
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!authorizedCatalogRevalidate(request.headers.get('authorization')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  after(() => deliverNotifications({ categories: ['brief'] }).catch(() => undefined));
  return NextResponse.json({ ok: true }, { headers });
}
