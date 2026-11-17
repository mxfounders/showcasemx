import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { readBatch } from '@/lib/contacts/batch';
import { BatchError, createContactBatch } from '@/lib/contacts/batch-server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';
import { deliverNotifications } from '@/lib/notifications/server';

/**
 * One form, one contact request per project (SHCWS-62). Answers 200 with a result per
 * project whenever it got as far as sending, including partial failures, so the page can
 * say exactly which projects received the request; never a blanket success.
 */
export async function POST(request: NextRequest) {
  const dictionary = await getDictionary(requestLocale(request));
  const t = dictionary.contacts.errors,
    b = dictionary.contactBatch.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body) return failure(t.invalidRequest, 400);
    if (process.env.AUTH_REQUIRE_VERIFIED_EMAIL === 'true') {
      const sql = authSql();
      const [verified] =
        await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
      if (!verified?.email_verified_at) return failure(t.verifyEmail, 403);
    }
    const input = readBatch(body);
    if (!input) return failure(b.incomplete, 400);
    // Each request this batch tries to create is one attempt of the single form's limit
    // (20 an hour per buyer): three projects count as three.
    const outcome = await createContactBatch(input, account, () =>
      securityLimit('contact-create', account.id, 20),
    );
    const sent = outcome.results.filter(result => result.outcome === 'sent');
    // Each recipient hears now, like a single request (SHCWS-13); the cron retries the rest.
    if (sent.length)
      after(async () => {
        for (const result of sent)
          await deliverNotifications({ contactRequestId: result.requestId }).catch(() => undefined);
      });
    captureServerEvent(request, account.id, 'contact_batch_created', {
      sent: sent.length,
      existing: outcome.results.filter(result => result.outcome === 'existing').length,
      failed: outcome.results.filter(result => result.outcome === 'failed').length,
    });
    return NextResponse.json(
      {
        ok: true,
        batchId: outcome.grouped ? input.id : null,
        results: outcome.results.map(result => ({
          solutionId: result.solutionId,
          outcome: result.outcome,
          requestId: result.requestId,
          error: result.error
            ? result.error === 'unavailable'
              ? b.itemUnconfirmed
              : t[result.error]
            : undefined,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof BatchError) return failure(b[error.code], error.status);
    console.error(
      JSON.stringify({ event: 'contact_batch_failed', requestId: crypto.randomUUID() }),
    );
    return failure(t.unavailable, 503);
  }
}
