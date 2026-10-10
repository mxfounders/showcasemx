import { NextRequest, NextResponse } from 'next/server';
import { buildCsp, clientIp, ipAllowed, parseAllowlist } from './lib/net';

const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-ops-session' : 'ops-session';
const TOKEN_RE = /^[a-f0-9]{64}$/;

// Parsed once per isolate. Empty/unset = no allowlist (every network may reach
// the login page, which is still protected by password + TOTP).
const allowlist = parseAllowlist(process.env.OPS_IP_ALLOWLIST);

/**
 * Defense in depth in front of the real checks (every page and route validates
 * the session against the database itself):
 *  1. Optional network allowlist — anything else gets an indistinguishable 404.
 *  2. No session cookie at all → never reach a panel page or a data API.
 *  3. A fresh CSP nonce per document request.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!ipAllowed(clientIp(req.headers), allowlist))
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const hasSession = TOKEN_RE.test(req.cookies.get(SESSION_COOKIE)?.value ?? '');

  if (pathname.startsWith('/api/')) {
    if (!pathname.startsWith('/api/auth/') && !hasSession)
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    return NextResponse.next();
  }

  if (pathname.startsWith('/panel') && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('content-security-policy', csp);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|icon|apple-icon).*)'],
};
