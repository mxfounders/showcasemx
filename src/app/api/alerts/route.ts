import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readAlertCriteria } from '@/lib/alerts/model';
import { createAlert, deleteAlert } from '@/lib/alerts/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * Saved-search alerts (SHCWS-47): `create` from a search or catalog page, `delete` from
 * /account/alerts. Same origin and a session, like every account mutation; the owner is
 * always the session, never something the page sends.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).alerts.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.action !== 'string') return failure(t.invalid, 400);
    if (!(await securityLimit('search-alerts', account.id, 60))) return failure(t.rateLimited, 429);
    if (body.action === 'create') {
      const criteria = readAlertCriteria(body.criteria);
      if (!criteria) return failure(t.invalid, 400);
      const result = await createAlert(account.id, criteria);
      if (result.status === 'limit') return failure(t.limit, 409);
      return NextResponse.json(
        { ok: true, id: result.id, created: result.status === 'created' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (body.action === 'delete') {
      if (typeof body.id !== 'string' || !isSolutionId(body.id)) return failure(t.invalid, 400);
      if (!(await deleteAlert(account.id, body.id))) return failure(t.notFound, 404);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return failure(t.invalid, 400);
  } catch {
    return failure(t.unavailable, 503);
  }
}
