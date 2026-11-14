import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { isAdPlacement } from '@/lib/ads/model';
import { setWaitlist } from '@/lib/ads/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * Joins or leaves the waitlist of a closed placement (SHCWS-72). When the placement opens,
 * a database trigger leaves a notice for everyone waiting, emailed like other listing
 * notices (db/ad-self-serve.sql).
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).ads.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);

  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    const placement = body?.placement;
    const join = body?.join;
    const solutionId =
      typeof body?.solutionId === 'string' && isSolutionId(body.solutionId)
        ? body.solutionId
        : null;
    if (!isAdPlacement(placement) || typeof join !== 'boolean') return failure(t.invalid, 400);
    if (!(await securityLimit('ad-waitlist', account.id, 30))) return failure(t.tooMany, 429);
    if (!(await setWaitlist(account.id, placement, join, solutionId))) {
      return failure(t.alreadyOpen, 409);
    }
    return NextResponse.json({ joined: join }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.unavailable, 503);
  }
}
