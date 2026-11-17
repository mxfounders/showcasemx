import { NextRequest, NextResponse } from 'next/server';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { categories } from '@/lib/taxonomy';
import { recordPlacementView } from '@/lib/ads/server';

const done = () => new NextResponse(null, { status: 204 });

/**
 * Counts one view of a page that carries a sponsored slot (the home page or a category
 * page), for the reach estimate founders see before buying (SHCWS-72). Same rules as the
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
    const valid =
      (placement === 'home' && scope === '') ||
      (placement === 'category' && categories.some(entry => entry.slug === scope));
    if (!valid) return failure('Invalid view', 400);
    const visitor = `${requestIdentity(request.headers)}:${placement}:${scope}`;
    if (!(await securityLimit('ad-reach', visitor, 60, 6000))) {
      return new NextResponse(null, { status: 429 });
    }
    await recordPlacementView(placement, scope);
    return done();
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
