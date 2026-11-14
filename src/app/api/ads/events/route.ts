import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { recordAdEvent, recordContactIntent, type AdEventKind } from '@/lib/ads/server';
import { solutionsSql } from '@/lib/solutions/server';

const done = () => new NextResponse(null, { status: 204 });

const kinds: readonly string[] = ['impression', 'click', 'visit', 'site', 'contact'];

/**
 * Counts what a sponsored slot did, with the same privacy rules as the listing metrics
 * (/api/metrics): Do Not Track and Global Privacy Control are honoured, the advertiser's
 * own visits are not counted, and only daily totals are stored.
 *
 * - `impression`, `click`: the card on the home or category page.
 * - `visit`, `site`: the listing opened from the card, and a click from it to the
 *   project's site (they carry the listing, `solutionId`).
 * - `contact`: a signed-in buyer opened that listing's contact form from the card, so the
 *   request they send can be counted for the booking (src/lib/ads/server.ts).
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
    const solutionId = body?.solutionId;
    if (typeof bookingId !== 'string' || !isSolutionId(bookingId)) {
      return failure('Invalid event', 400);
    }
    if (typeof kind !== 'string' || !kinds.includes(kind)) return failure('Invalid event', 400);
    const onListing = kind === 'visit' || kind === 'site' || kind === 'contact';
    if (onListing && (typeof solutionId !== 'string' || !isSolutionId(solutionId))) {
      return failure('Invalid event', 400);
    }

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
    if (kind === 'contact') {
      // Only an account can send a contact request; without one there is nothing to link.
      if (account) await recordContactIntent(account.id, bookingId, String(solutionId));
      return done();
    }
    await recordAdEvent(bookingId, kind as AdEventKind, onListing ? String(solutionId) : null);
    return done();
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
