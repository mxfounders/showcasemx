import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId, safeSolutionUrl, type SolutionData } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
import { fetchSiteImage } from '@/lib/solutions/site-image';
export const runtime = 'nodejs';

/**
 * Serves the cover taken from the project's own website.
 *
 * Public only once the solution is published; while it is a draft the image
 * answers to its owner alone, so a stranger holding a UUID cannot confirm that a
 * draft exists there. The bytes are ours (re-encoded WebP), not a remote link.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!isSolutionId(params.id)) return failure('Portada no disponible.', 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    const sql = solutionsSql();
    const [row] = await sql`SELECT i.content_base64 FROM solution_site_images i JOIN founder_solutions s ON s.id = i.solution_id
      WHERE i.solution_id = ${params.id} AND i.content_base64 IS NOT NULL
        AND (s.published_data IS NOT NULL OR s.owner_id = ${account?.id ?? null}::uuid)`;
    if (!row) return failure('Portada no disponible.', 404);
    return new NextResponse(new Uint8Array(Buffer.from(String(row.content_base64), 'base64')), {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch { return failure('No pudimos cargar la portada.', 503); }
}

/** The owner asks us to read (or re-read) the og:image of their declared site. */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure('Usa tu cuenta.', 403);
  if (!isSolutionId(params.id)) return failure('Solución no disponible.', 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure('Inicia sesión.', 401);
    const sql = solutionsSql();
    const [solution] = await sql`SELECT data FROM founder_solutions WHERE id = ${params.id} AND owner_id = ${account.id}`;
    if (!solution) return failure('Solución no disponible.', 404);
    // Outbound requests on someone else's behalf: keep them scarce.
    if (!await securityLimit('solution-site-image', account.id, 20)) return failure('Demasiadas búsquedas de portada. Intenta más tarde.', 429);

    const website = safeSolutionUrl((solution.data as SolutionData)?.website ?? '');
    if (!website) return failure('Añade primero el sitio de tu proyecto.', 400);

    const result = await fetchSiteImage(website);
    if (!result.ok) {
      await sql`INSERT INTO solution_site_images (solution_id, source_url, image_url, content_base64, width, height, failure, fetched_at)
        VALUES (${params.id}, ${website}, NULL, NULL, NULL, NULL, ${result.failure}, now())
        ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, failure = EXCLUDED.failure, fetched_at = now()`;
      return NextResponse.json({ ok: false, failure: result.failure }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const { imageUrl, buffer, width, height } = result.image;
    await sql`INSERT INTO solution_site_images (solution_id, source_url, image_url, content_base64, width, height, failure, fetched_at)
      VALUES (${params.id}, ${website}, ${imageUrl}, ${buffer.toString('base64')}, ${width}, ${height}, NULL, now())
      ON CONFLICT (solution_id) DO UPDATE SET source_url = EXCLUDED.source_url, image_url = EXCLUDED.image_url,
        content_base64 = EXCLUDED.content_base64, width = EXCLUDED.width, height = EXCLUDED.height, failure = NULL, fetched_at = now()`;
    return NextResponse.json({ ok: true, imageUrl, width, height }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return failure('No pudimos leer la portada del sitio.', 503); }
}
