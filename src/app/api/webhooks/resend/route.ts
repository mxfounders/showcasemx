import { applyResendEvent, readResendEvent, verifySvixSignature } from '@/lib/newsletter/webhook';

const respond = (status: number) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Resend webhook (SHCWS-124): delivered, bounced, suppressed and complained. The Svix
 * signature is checked over the raw body with RESEND_WEBHOOK_SECRET; without it the endpoint
 * answers 503 and nothing is processed. Each svix-id is applied once. A 5xx makes Resend retry.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return respond(503);
  const body = await request.text();
  if (body.length > 65_536) return respond(413);
  const header = (name: string) =>
    request.headers.get(`svix-${name}`) ?? request.headers.get(`webhook-${name}`);
  const id = header('id');
  if (
    !id ||
    id.length > 100 ||
    !verifySvixSignature({
      secret,
      id,
      timestamp: header('timestamp'),
      signature: header('signature'),
      body,
    })
  )
    return respond(400);
  let event;
  try {
    event = readResendEvent(JSON.parse(body));
  } catch {
    return respond(400);
  }
  if (!event) return respond(400);
  try {
    await applyResendEvent(id, event);
    return respond(200);
  } catch {
    console.error('resend.webhook', event.type);
    return respond(500);
  }
}
