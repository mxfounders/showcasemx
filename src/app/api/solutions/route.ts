import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { createDraft } from '@/lib/solutions/writes';
import { isSolutionId, safeSolutionUrl } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useShwcsForm, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signInToApply, 401);
    if (!(await securityLimit('solution-create', account.id, 20)))
      return failure(t.tooManyDrafts, 429);
    const body = await solutionBody(request);
    if (typeof body?.id !== 'string' || !isSolutionId(body.id))
      return failure(t.invalidRequest, 400);
    // The flow starts from the project's link (/account/solutions/new). It is optional
    // here so an older client can still create an empty draft, and never trusted beyond
    // being a plain http(s) URL: the editor reads the site later, on the owner's request.
    const website =
      typeof body.website === 'string' && body.website.length <= 500
        ? (safeSolutionUrl(body.website.trim()) ?? '')
        : '';
    if (body.website !== undefined && !website) return failure(t.invalidWebsite, 400);
    // The same insert the assistant's MCP tool uses (src/lib/solutions/writes.ts).
    const id = await createDraft({
      id: body.id,
      ownerId: account.id,
      email: account.email,
      website,
    });
    if (!id) return failure(t.requestUnavailable, 409);
    captureServerEvent(request, account.id, 'solution_created');
    return NextResponse.json({ ok: true, id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.createFailed, 503);
  }
}
