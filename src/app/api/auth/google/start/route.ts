import { NextRequest, NextResponse } from 'next/server';
import { beginGoogle, googleCookie, googleConfig, googleCookieOptions } from '@/lib/auth/google';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function GET(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).auth.errors;
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: t.googleNotConfiguredYet }, { status: 503 });
  if (request.nextUrl.origin !== config.origin)
    return NextResponse.json({ error: t.googleUseMainDomain }, { status: 403 });
  try {
    // Per network, not one key for the whole site (SHCWS-171).
    if (!(await securityLimit('google-start', requestIdentity(request.headers), 30)))
      return NextResponse.json({ error: t.googleTryLater }, { status: 429 });
    const result = await beginGoogle(request.nextUrl.searchParams.get('next'));
    const response = NextResponse.redirect(result.url);
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(googleCookie, result.cookie, googleCookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: t.googleStartUnavailable }, { status: 503 });
  }
}
