import { NextRequest, NextResponse, after } from 'next/server';
import { deliverNotifications } from '@/lib/notifications/server';
import { matchSearchAlerts } from '@/lib/alerts/server';
import { matchBriefs } from '@/lib/briefs/server';
import { revalidateTag } from 'next/cache';
import { authorizedCatalogRevalidate } from '@/lib/catalog-revalidate';
import { refreshSiteIcons } from '@/lib/solutions/site-icon-store';

// Closes the Fase 1 gap (CLAUDE.md §52): ops is a separate Next.js deployment
// with its own cache, so a publish/withdraw decided there doesn't invalidate
// the product's cached catalog on its own — without this, that only happened
// on the next like/save/comment or after the 300s TTL. Bearer-secret auth
// only, like /api/internal/mail's cron secret: this is a server-to-server
// call, so there is no browser Origin header to check.
export async function POST(request: NextRequest) {
  if (!authorizedCatalogRevalidate(request.headers.get('authorization'))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  revalidateTag('catalog');
  // Ops calls this right after a publish/withdraw decision: send the founder's notice
  // (and the launch kit, SHCWS-18) now instead of waiting for the daily cron, and tell
  // buyers whose saved search the listing now matches (SHCWS-47).
  after(async () => {
    await matchSearchAlerts().catch(() => console.error('Search alerts failed.'));
    // Open briefs reach a listing published after them (SHCWS-58).
    await matchBriefs().catch(() => console.error('Brief matching failed.'));
    await deliverNotifications({ categories: ['solution', 'alert', 'brief'] }).catch(
      () => undefined,
    ); // A listing just published shows its site's current logo right away; one already read
    // in the last hour is left alone, so a burst of decisions does not re-read every site.
    await refreshSiteIcons({ limit: 10, staleHours: 1, budgetMs: 45_000 })
      .then(result => result.changed && revalidateTag('catalog'))
      .catch(() => undefined);
  });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
