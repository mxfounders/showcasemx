import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readContact, ContactError, consentVersion, isContactStatus } from '@/lib/contacts/model';
import { createContact, updateContact } from '@/lib/contacts/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).contacts.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.id !== 'string' || !isSolutionId(body.id))
      return failure(t.invalidRequest, 400);
    let id: string;
    if (body.action === 'create') {
      if (process.env.AUTH_REQUIRE_VERIFIED_EMAIL === 'true') {
        const sql = authSql();
        const [verified] =
          await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
        if (!verified?.email_verified_at) return failure(t.verifyEmail, 403);
      }
      const details = readContact(body);
      if (
        !details ||
        typeof body.solutionId !== 'string' ||
        !isSolutionId(body.solutionId) ||
        typeof body.recipientId !== 'string' ||
        !isSolutionId(body.recipientId) ||
        body.consent !== true ||
        body.consentVersion !== consentVersion
      )
        return failure(t.incomplete, 400);
      if (!(await securityLimit('contact-create', account.id, 20)))
        return failure(t.createLimit, 429);
      id = await createContact(
        { id: body.id, solutionId: body.solutionId, recipientId: body.recipientId, details },
        account,
      );
    } else if (body.action === 'update') {
      if (
        !isContactStatus(body.status) ||
        !Number.isSafeInteger(body.version) ||
        Number(body.version) < 0 ||
        Number(body.version) > 2147483646 ||
        typeof body.message !== 'string' ||
        body.message.length > 2000
      )
        return failure(t.updateInvalid, 400);
      if (!(await securityLimit('contact-update', account.id, 100)))
        return failure(t.updateLimit, 429);
      id = await updateContact(
        body.id,
        account.id,
        body.status,
        Number(body.version),
        body.message,
      );
    } else return failure(t.invalidAction, 400);
    return NextResponse.json({ ok: true, id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ContactError) return failure(t[error.code], error.status);
    console.error(
      JSON.stringify({ event: 'contact_request_failed', requestId: crypto.randomUUID() }),
    );
    return failure(t.unavailable, 503);
  }
}
