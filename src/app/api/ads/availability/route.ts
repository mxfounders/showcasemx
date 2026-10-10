import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { failure } from '@/lib/solutions/http';
import { categories } from '@/lib/taxonomy';
import { isAdPlacement } from '@/lib/ads/model';
import { adAvailability } from '@/lib/ads/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/** Days with no free sponsored slot for a placement, so the booking form can warn early. */
export async function GET(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).ads.errors;
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const placement = request.nextUrl.searchParams.get('placement');
    const scope = request.nextUrl.searchParams.get('scope') ?? '';
    if (!isAdPlacement(placement)) return failure(t.codes.placement, 400);
    const scopeValid =
      placement === 'category' ? categories.some(entry => entry.slug === scope) : scope === '';
    if (!scopeValid) return failure(t.codes.scope, 400);
    return NextResponse.json(await adAvailability(placement, scope), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return failure(t.unavailable, 503);
  }
}
