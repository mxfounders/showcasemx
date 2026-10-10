import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import {
  complianceResult,
  deleteTaxIdentity,
  readTaxIdentity,
  saveTaxIdentity,
} from '@/lib/compliance/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * The owner declares or removes the fiscal identity of their listing (docs/compliance.md).
 * The identity is never returned to a visitor; the response carries only the public
 * registry result so the owner sees what buyers will see.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const t = (await getDictionary(requestLocale(request))).compliance.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  const { id } = await props.params;
  if (!isSolutionId(id)) return failure(t.invalidRequest, 400);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || (body.action !== 'save' && body.action !== 'delete'))
      return failure(t.invalidRequest, 400);
    if (!(await securityLimit('tax-identity', account.id, 20))) return failure(t.rateLimited, 429);

    if (body.action === 'delete') {
      if (!(await deleteTaxIdentity(id, account.id))) return failure(t.notOwner, 403);
      revalidateTag('catalog');
      return NextResponse.json(
        { ok: true, result: null },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const parsed = readTaxIdentity(body);
    if (!parsed.ok)
      return NextResponse.json(
        { error: t[parsed.error], field: parsed.error === 'country' ? 'country' : 'taxId' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    if (!(await saveTaxIdentity(id, account.id, parsed.identity))) return failure(t.notOwner, 403);
    revalidateTag('catalog');
    return NextResponse.json(
      { ok: true, identity: parsed.identity, result: await complianceResult(id) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.saveFailed, 503);
  }
}
