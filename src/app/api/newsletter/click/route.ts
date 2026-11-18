import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { campaignLinks, readCampaignContent } from '@/lib/newsletter/content';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Counted link of a newsletter campaign (SHCWS-124). `c` is the campaign, `l` the position of
 * the link in campaignLinks(): the destination is read from the campaign stored in the
 * database, never from the query, so this can't be used to redirect anywhere else. Adds one to
 * that link's total (never who clicked), only while the campaign is sending or sent; `p=1`
 * (test sends and previews) redirects without counting. No open pixel exists.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const campaign = params.get('c') ?? '';
  const link = Number.parseInt(params.get('l') ?? '', 10);
  const preview = params.get('p') === '1';
  let target = `${request.nextUrl.origin}/es`;
  if (uuid.test(campaign) && Number.isInteger(link) && link >= 0 && link < 1000) {
    try {
      const sql = authSql();
      const [row] =
        await sql`SELECT status, content FROM newsletter_campaigns WHERE id = ${campaign}::uuid`;
      const content = row ? readCampaignContent(row.content) : null;
      const destination = content ? campaignLinks(content)[link] : undefined;
      if (destination) {
        target = new URL(destination, request.nextUrl.origin).href;
        if (
          !preview &&
          (row.status === 'sending' || row.status === 'sent') &&
          (await securityLimit('newsletter-click', requestIdentity(request.headers), 120, 1200))
        )
          await sql`INSERT INTO newsletter_link_clicks (campaign_id, link, url, clicks)
            VALUES (${campaign}::uuid, ${link}, ${destination}, 1)
            ON CONFLICT (campaign_id, link) DO UPDATE SET clicks = newsletter_link_clicks.clicks + 1`;
      }
    } catch {
      // Counting never blocks the way in.
    }
  }
  return NextResponse.redirect(target, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
