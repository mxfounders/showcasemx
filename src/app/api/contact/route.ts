import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { validateContactInquiry } from '@/lib/contact-inquiry';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { sendEmail } from '@/lib/notifications/server';
import { recoveryConfig } from '@/lib/auth/recovery';
import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';

async function readBody(request: NextRequest) {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12_000) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * The notification goes to the shwcs team inbox, never to the visitor, so it is always
 * written in Spanish (like ops), whatever language the form was filled in.
 */
const staffEmail = {
  heading: 'Nueva conversación desde shwcs.site',
  subject: 'Contacto shwcs',
  reason: 'Motivo',
  name: 'Nombre',
  email: 'Correo',
  organization: 'Empresa o proyecto',
  role: 'Rol',
  website: 'Sitio',
  urgency: 'Momento',
  missing: 'No indicado',
  message: 'Mensaje:',
} as const;

export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).contactForm.apiErrors;
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.origin, 403);
  const body = await readBody(request);
  const inquiry = validateContactInquiry(body);
  if (!inquiry) return fail(t.invalid, 400);
  // Option labels come from the Spanish form dictionary, the same text the form shows.
  const options = (await getDictionary('es')).contactForm;
  try {
    if (
      !(await securityLimit(
        'public-contact',
        `${requestIdentity(request.headers)}:${inquiry.email}`,
        5,
        240,
      ))
    )
      return fail(t.rateLimited, 429);
    const sql = authSql();
    const id = randomUUID();
    await sql`INSERT INTO contact_inquiries(id,reason,name,email,organization,role,website,message,urgency)
      VALUES(${id},${inquiry.reason},${inquiry.name},${inquiry.email},${inquiry.organization},${inquiry.role || null},${inquiry.website || null},${inquiry.message},${inquiry.urgency})`;
    const reason = options.reasons[inquiry.reason].label;
    const urgency = options.urgencies[inquiry.urgency];
    const fields: [string, string][] = [
      [staffEmail.reason, reason],
      [staffEmail.name, inquiry.name],
      [staffEmail.email, inquiry.email],
      [staffEmail.organization, inquiry.organization],
      [staffEmail.role, inquiry.role || staffEmail.missing],
      [staffEmail.website, inquiry.website || staffEmail.missing],
      [staffEmail.urgency, urgency],
    ];
    const content = [
      staffEmail.heading,
      '',
      ...fields.map(([label, value]) => `${label}: ${value}`),
      '',
      staffEmail.message,
      inquiry.message,
    ].join('\n');
    try {
      const config = recoveryConfig();
      const html = config
        ? renderEmailHtml({
            origin: config.origin,
            preheader: `${staffEmail.subject} · ${reason}`,
            heading: staffEmail.heading,
            paragraphs: [
              fields
                .map(
                  ([label, value]) => `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`,
                )
                .join('<br>'),
              `<strong>${staffEmail.message}</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, '<br>')}`,
            ],
          })
        : undefined;
      const provider = await sendEmail({
        to: process.env.CONTACT_EMAIL_TO?.trim() || 'contacto@shwcs.site',
        subject: `${staffEmail.subject} · ${reason}`,
        text: content,
        html,
        idempotencyKey: id,
        replyTo: inquiry.email,
      });
      await sql`UPDATE contact_inquiries SET email_state='sent',provider_id=${provider} WHERE id=${id}`;
    } catch {
      const state =
        process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM && process.env.AUTH_APP_ORIGIN
          ? 'failed'
          : 'unavailable';
      await sql`UPDATE contact_inquiries SET email_state=${state} WHERE id=${id}`;
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(t.unavailable, 503);
  }
}
