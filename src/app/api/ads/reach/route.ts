import { NextRequest, NextResponse } from 'next/server';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { adToday, isAdPlacement, isPlacementScope } from '@/lib/ads/model';
import { visitorHash } from '@/lib/solutions/view-visitor';
import { recordPlacementView } from '@/lib/ads/server';

const done = () => new NextResponse(null, { status: 204 });

/**
 * Counts one view of a page that carries a sponsored slot (the home page, a category,
 * industry or collection page, or a search results page), for the reach estimate founders see before buying (SHCWS-72). Same rules as the
 * listing metrics: Do Not Track and Global Privacy Control are honoured, no visitor
 * identifier is stored and only daily totals exist.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return failure('Origin rejected', 403);
  }
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') return done();

  try {
    const body = await solutionBody(request);
    const placement = body?.placement;
    const scope = typeof body?.scope === 'string' ? body.scope : '';
    // Pages that carry a slot: home, a category, an industry, a collection, or a search
    // pointing at a category (SHCWS-79). The newsletter has no page to count.
    if (
      !isAdPlacement(placement) ||
      placement === 'newsletter' ||
      !isPlacementScope(placement, scope)
    )
      return failure('Invalid view', 400);
    const visitor = `${requestIdentity(request.headers)}:${placement}:${scope}`;
    if (!(await securityLimit('ad-reach', visitor, 60, 6000))) {
      return new NextResponse(null, { status: 429 });
    }
    // One view per visitor, page and day when VIEW_HASH_SECRET is set (SHCWS-112); the
    // hash is an HMAC of the address and the day, never the address itself.
    const day = adToday();
    const hash = visitorHash(requestIdentity(request.headers), day);
    await recordPlacementView(placement, scope, hash ? { hash, day } : null);
    return done();
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
