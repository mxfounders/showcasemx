import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { getDatabaseUrl } from "@/lib/database-url";
import { readNewsletterUnsubscribeToken } from "@/lib/newsletter-unsubscribe";
import { requestIdentity, securityLimit } from "@/lib/auth/security";

export async function POST(request: NextRequest) {
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== request.nextUrl.origin) return fail("Abre el enlace desde shwcs.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Formato no válido.", 415);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1024) return fail("Solicitud demasiado larga.", 413);
    body = JSON.parse(text);
  } catch {
    return fail("No pudimos leer la solicitud.", 400);
  }
  const token = body && typeof body === "object" ? (body as Record<string, unknown>).token : null;
  const email = readNewsletterUnsubscribeToken(token);
  if (!email) return fail("El enlace de baja no es válido.", 400);
  const url = getDatabaseUrl();
  if (!url) return fail("La baja no está disponible en este momento.", 503);

  try {
    if (!(await securityLimit("newsletter-unsubscribe", requestIdentity(request.headers), 30, 300))) {
      return fail("Demasiados intentos. Espera un momento.", 429);
    }
    const sql = neon(url);
    await sql`UPDATE newsletter_subscribers SET unsubscribed_at=COALESCE(unsubscribed_at,now()) WHERE email=${email}`;
    // Identical response for known and unknown addresses prevents membership discovery.
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("No pudimos registrar la baja. Inténtalo de nuevo.", 503);
  }
}

