import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { inquiryReasons, inquiryUrgencies, validateContactInquiry } from '@/lib/contact-inquiry';
import { sendEmail } from '@/lib/notifications/server';

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
    if (size > 12_000) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export async function POST(request: NextRequest) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail('Envía el mensaje desde shwcs.', 403);
  const body = await readBody(request);
  const inquiry = validateContactInquiry(body);
  if (!inquiry) return fail('Revisa los campos del formulario y vuelve a intentarlo.', 400);
  try {
    if (!(await securityLimit('public-contact', `${requestIdentity(request.headers)}:${inquiry.email}`, 5, 240))) return fail('Recibimos varios mensajes. Espera un poco antes de enviar otro.', 429);
    const sql = authSql();
    const id = randomUUID();
    await sql`INSERT INTO contact_inquiries(id,reason,name,email,organization,role,website,message,urgency)
      VALUES(${id},${inquiry.reason},${inquiry.name},${inquiry.email},${inquiry.organization},${inquiry.role || null},${inquiry.website || null},${inquiry.message},${inquiry.urgency})`;
    const reason = inquiryReasons.find(item => item.value === inquiry.reason)?.label ?? inquiry.reason;
    const urgency = inquiryUrgencies.find(item => item.value === inquiry.urgency)?.label ?? inquiry.urgency;
    const content = [
      `Nueva conversación desde shwcs.site`, '',
      `Motivo: ${reason}`, `Nombre: ${inquiry.name}`, `Correo: ${inquiry.email}`,
      `Empresa o proyecto: ${inquiry.organization}`, `Rol: ${inquiry.role || 'No indicado'}`,
      `Sitio: ${inquiry.website || 'No indicado'}`, `Momento: ${urgency}`, '',
      'Mensaje:', inquiry.message,
    ].join('\n');
    try {
      const provider = await sendEmail(process.env.CONTACT_EMAIL_TO?.trim() || 'contacto@shwcs.site', `Contacto shwcs · ${reason}`, content, id, inquiry.email);
      await sql`UPDATE contact_inquiries SET email_state='sent',provider_id=${provider} WHERE id=${id}`;
    } catch {
      const state = process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM && process.env.AUTH_APP_ORIGIN ? 'failed' : 'unavailable';
      await sql`UPDATE contact_inquiries SET email_state=${state} WHERE id=${id}`;
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('No pudimos guardar tu mensaje. Tus datos siguen en el formulario para que puedas reintentar.', 503);
  }
}
