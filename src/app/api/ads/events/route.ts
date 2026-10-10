import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { recordAdEvent } from '@/lib/ads/server';
import { solutionsSql } from '@/lib/solutions/server';

const done = () => new NextResponse(null, { status: 204 });

/**
 * Counts an impression or click of a sponsored slot, with the same privacy rules as the
 * listing metrics (/api/metrics): Do Not Track and Global Privacy Control are honoured,
 * the advertiser's own visits are not counted, and only daily totals are stored.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return failure('Origin rejected', 403);
  }
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1') return done();

  try {
    const body = await solutionBody(request);
    const bookingId = body?.bookingId;
    const kind = body?.kind;
    if (typeof bookingId !== 'string' || !isSolutionId(bookingId)) {
      return failure('Invalid event', 400);
    }
    if (kind !== 'impression' && kind !== 'click') return failure('Invalid event', 400);

    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (account) {
      const [own] = await solutionsSql()`SELECT 1 FROM ad_campaigns
        WHERE id = ${bookingId} AND owner_id = ${account.id}`;
      if (own) return done();
    }
    const visitor = `${requestIdentity(request.headers)}:${bookingId}`;
    if (!(await securityLimit('ad-event', visitor, 600, 6000))) {
      return new NextResponse(null, { status: 429 });
    }
    await recordAdEvent(bookingId, kind);
    return done();
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
