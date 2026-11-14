import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import {
  readContact,
  readOutcome,
  ContactError,
  consentVersion,
  isContactStatus,
} from '@/lib/contacts/model';
import {
  createContact,
  markContactRead,
  setContactOutcome,
  updateContact,
} from '@/lib/contacts/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';
import { deliverNotifications } from '@/lib/notifications/server';
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
      // Closing may carry what came of it (SHCWS-22); anything sent but unreadable is
      // refused rather than silently dropped.
      const result =
        body.outcome === undefined || body.outcome === null
          ? null
          : readOutcome(body.outcome, body.outcomeValue);
      if (body.outcome !== undefined && body.outcome !== null && !result)
        return failure(t.outcomeInvalid, 400);
      if (!(await securityLimit('contact-update', account.id, 100)))
        return failure(t.updateLimit, 429);
      id = await updateContact(
        body.id,
        account.id,
        body.status,
        Number(body.version),
        body.message,
        result,
      );
    } else if (body.action === 'outcome') {
      const result = readOutcome(body.outcome, body.outcomeValue);
      if (
        !result ||
        !Number.isSafeInteger(body.version) ||
        Number(body.version) < 0 ||
        Number(body.version) > 2147483646
      )
        return failure(t.outcomeInvalid, 400);
      if (!(await securityLimit('contact-update', account.id, 100)))
        return failure(t.updateLimit, 429);
      await setContactOutcome(body.id, account.id, Number(body.version), result);
      // Private to the founder: nobody else is told, so nothing to deliver or count.
      return NextResponse.json(
        { ok: true, id: body.id },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } else if (body.action === 'read') {
      if (!(await securityLimit('contact-read', account.id, 600, 600)))
        return failure(t.updateLimit, 429);
      await markContactRead(body.id, account.id);
      return NextResponse.json(
        { ok: true, id: body.id },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } else return failure(t.invalidAction, 400);
    // The other side hears now, not at the next daily cron (SHCWS-13). Only this
    // conversation's pending alerts; the cron still retries whatever fails here.
    const conversation = id;
    after(() => deliverNotifications({ contactRequestId: conversation }).catch(() => undefined));
    captureServerEvent(
      request,
      account.id,
      body.action === 'create' ? 'contact_created' : 'contact_updated',
      body.action === 'update' ? { status: body.status as string } : {},
    );
    return NextResponse.json({ ok: true, id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ContactError) return failure(t[error.code], error.status);
    console.error(
      JSON.stringify({ event: 'contact_request_failed', requestId: crypto.randomUUID() }),
    );
    return failure(t.unavailable, 503);
  }
}
