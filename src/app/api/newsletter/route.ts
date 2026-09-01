import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { validateNewsletter } from '@/lib/newsletter';
import { requestIdentity, securityLimit } from '@/lib/auth/security';

export async function POST(request: NextRequest) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail('Suscríbete desde el formulario de shwcs.', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return fail('Formato no válido.', 415);
  const reader = request.body?.getReader();
  if (!reader) return fail('Falta tu correo.', 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  let body: unknown;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return fail('El formulario es demasiado largo.', 413); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return fail('No pudimos leer el formulario. Inténtalo de nuevo.', 400); }
  const subscription = validateNewsletter(body);
  if (!subscription) return fail('Revisa tu perfil, rol y correo, y acepta recibir novedades.', 400);
  const url = getDatabaseUrl();
  if (!url) return fail('Las suscripciones todavía no están habilitadas. Tu correo no se ha guardado; inténtalo más tarde.', 503);
  try {
    if (!await securityLimit('newsletter', `${requestIdentity(request.headers)}:${subscription.email}`, 5, 240)) return fail('Recibimos varios intentos. Espera antes de volver a suscribirte.', 429);
    const sql = neon(url);
    // Unique email makes retries safe. Never overwrite an existing opt-out.
    await sql`INSERT INTO newsletter_subscribers (email, profile, role, consent_version) VALUES (${subscription.email}, ${subscription.profile}, ${subscription.role}, 'newsletter-v2') ON CONFLICT (email) DO NOTHING`;
    // Same response for new/existing addresses; does not expose membership.
    return NextResponse.json({ ok: true });
  } catch {
    return fail('No pudimos registrar tu suscripción. Conservamos el correo en el formulario para que puedas reintentar.', 503);
  }
}
