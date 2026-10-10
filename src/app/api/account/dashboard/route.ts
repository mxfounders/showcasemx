import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isDashboardMode } from '@/lib/dashboard/model';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useAccount, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || !isDashboardMode(body.mode)) return failure(t.dashboardInvalid, 400);
    if (!(await securityLimit('dashboard-mode', account.id, 100)))
      return failure(t.tooManyChanges, 429);
    const sql = solutionsSql();
    await sql`UPDATE auth_accounts SET dashboard_mode=${body.mode} WHERE id=${account.id}`;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.dashboardUnavailable, 503);
  }
}
