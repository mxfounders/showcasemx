import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { handleProblem, normalizeHandle } from '@/lib/profiles/handle';
import { readProfileInput } from '@/lib/profiles/model';
import { deleteProfile, handleAvailable, saveProfile } from '@/lib/profiles/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * The account's own public profile (SHCWS-120, db/public-profiles.sql).
 *
 * - `save` creates (version 0) or updates it, including turning it on or off and the
 *   handle. Errors carry the field so the form can point at it.
 * - `check-handle` says whether a handle is free for this account, as it types.
 * - `delete` removes the profile, its previous handles and who followed it.
 *
 * Identity comes from the session only. Nothing here answers with another account's data:
 * a taken handle is just «taken».
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).profiles.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.action !== 'string') return failure(t.invalid, 400);

    if (body.action === 'check-handle') {
      if (!(await securityLimit('profile-handle-check', account.id, 240, 600)))
        return failure(t.rateLimited, 429);
      const handle = normalizeHandle(typeof body.handle === 'string' ? body.handle : '');
      const problem = handleProblem(handle);
      return ok({
        handle,
        problem,
        available: problem ? false : await handleAvailable(account.id, handle),
      });
    }

    if (!(await securityLimit('public-profile', account.id, 60)))
      return failure(t.rateLimited, 429);

    if (body.action === 'delete') {
      await deleteProfile(account.id);
      return ok();
    }

    if (body.action !== 'save') return failure(t.invalid, 400);
    const input = readProfileInput(body);
    if (!input.ok)
      return NextResponse.json(
        { error: t.invalid, field: input.error.field, problem: input.error.problem },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    const saved = await saveProfile(account.id, input.value);
    if (!saved.ok)
      return saved.reason === 'taken'
        ? NextResponse.json(
            { error: t.taken, field: 'handle', problem: 'taken' },
            { status: 409, headers: { 'Cache-Control': 'no-store' } },
          )
        : failure(saved.reason === 'conflict' ? t.conflict : t.tooManyChanges, 409);
    return ok({ version: saved.version, handle: input.value.handle });
  } catch {
    return failure(t.unavailable, 503);
  }
}
