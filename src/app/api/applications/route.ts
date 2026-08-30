import { getDatabaseUrl } from "@/lib/database-url";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { validateApplication } from "@/lib/applications";

export async function POST(request: NextRequest) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (request.headers.get("origin") !== request.nextUrl.origin) return fail("El envío debe hacerse desde este sitio.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Formato no válido.", 415);
  // Bound the stream before parsing, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return fail("Faltan los datos.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12000) { await reader.cancel(); return fail("La postulación es demasiado larga.", 413); }
    chunks.push(value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return fail("Datos no válidos.", 400); }
  const application = validateApplication(body);
  if (!application || body.company || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) return fail("Revisa los campos de la postulación.", 400);
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return fail("La recepción de postulaciones todavía no está habilitada. Tus datos siguen en el formulario; inténtalo más tarde.", 503);
  try {
    const sql = neon(databaseUrl);
    const { name, website, email, kind, problem } = application;
    await sql`INSERT INTO solution_applications (id, name, website, email, kind, problem) VALUES (${body.id}, ${name}, ${website}, ${email.toLowerCase()}, ${kind}, ${problem}) ON CONFLICT (id) DO NOTHING`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return fail("No pudimos guardar tu postulación. Tus datos siguen aquí; vuelve a intentarlo.", 503);
  }
}
