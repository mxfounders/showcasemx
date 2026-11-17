import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readMessage } from '@/lib/contacts/thread';
import { sendContactMessage } from '@/lib/contacts/messages';
import { deliverNotifications } from '@/lib/notifications/server';
import { captureServerEvent } from '@/lib/analytics/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * A message in a contact request's conversation (SHCWS-168). Only its two participants,
 * only while it is new or in conversation. The other side is told right away, through
 * the same notifications and email as any other contact event.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const t = (await getDictionary(requestLocale(request))).contactThread.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  if (!isSolutionId(id)) return failure(t.unavailable, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    const message = readMessage(body?.message);
    if (!message) return failure(t.invalid, 400);
    if (!(await securityLimit('contact-message', account.id, 60))) return failure(t.limit, 429);
    const result = await sendContactMessage(id, account.id, message);
    if (!result.ok)
      return failure(
        result.reason === 'closed' ? t.closed : t.unavailable,
        result.reason === 'closed' ? 409 : 404,
      );
    after(() => deliverNotifications({ contactRequestId: id }).catch(() => undefined));
    captureServerEvent(request, account.id, 'contact_message_sent');
    return NextResponse.json(
      { ok: true, version: result.version, status: result.status },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    console.error(
      JSON.stringify({ event: 'contact_message_failed', requestId: crypto.randomUUID() }),
    );
    return failure(t.failed, 503);
  }
}
