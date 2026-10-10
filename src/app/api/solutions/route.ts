import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { emptySolution, isSolutionId } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
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
    const sql = solutionsSql();
    await sql`INSERT INTO founder_solutions(id,owner_id,data) VALUES(${body.id},${account.id},${JSON.stringify({ ...emptySolution, contactEmail: account.email })}::jsonb) ON CONFLICT(id) DO NOTHING`;
    const rows =
      await sql`SELECT id FROM founder_solutions WHERE id=${body.id} AND owner_id=${account.id}`;
    if (!rows.length) return failure(t.requestUnavailable, 409);
    return NextResponse.json(
      { ok: true, id: rows[0].id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.createFailed, 503);
  }
}
