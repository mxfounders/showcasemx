import { isSolutionId, type SolutionData } from '@/lib/solutions/model';
import { isSolutionSlug, solutionPath } from '@/lib/solutions/slug';
import { solutionsSql } from '@/lib/solutions/server';
import { publicProducts } from '@/lib/solutions/public';
import { verificationDomain } from '@/lib/trust/domain';
import { solutionMarkdown } from '@/lib/machine-readable';

/**
 * /soluciones/<slug>.md: the published listing as Markdown for assistants (SHCWS-106).
 * Lives outside [locale] because the middleware skips paths with a dot, and a path
 * without `.md` never gets here: the middleware sends it to /<locale>/soluciones/<slug>.
 * Same projection as the public page: published_data minus the private email.
 * By UUID or by a slug the listing used before, it answers a 301 to the current slug
 * (SHCWS-101), like the page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const ref = file.endsWith('.md') ? file.slice(0, -3) : '';
  const notFound = () =>
    new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  if (!isSolutionId(ref) && !isSolutionSlug(ref)) return notFound();
  try {
    const sql = solutionsSql();
    const [row] =
      await sql`SELECT id::text AS id,slug,published_data - 'contactEmail' AS published_data,published_at::text FROM founder_solutions
        WHERE published_data IS NOT NULL AND (id=${isSolutionId(ref) ? ref : null}::uuid OR slug=${ref}
          OR id=(SELECT h.solution_id FROM solution_slug_history h WHERE h.slug=${ref}))`;
    if (!row) return notFound();
    const id = String(row.id);
    const path = solutionPath({ id, slug: row.slug as string | null });
    if (path !== `/soluciones/${ref}`)
      return new Response(null, {
        status: 301,
        headers: { Location: new URL(`${path}.md`, request.url).href },
      });
    const data = row.published_data as SolutionData;
    const [[proof], catalog] = await Promise.all([
      sql`SELECT 1 FROM solution_domain_proofs p JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id WHERE p.solution_id=${id} AND p.domain=${verificationDomain(data.website)} AND p.verified_at IS NOT NULL AND p.expires_at>now()`,
      publicProducts(),
    ]);
    const product = catalog.find(item => item.solutionId === id);
    const body = solutionMarkdown({
      path,
      data,
      publishedAt: row.published_at ? String(row.published_at) : null,
      domainVerified: Boolean(proof),
      reviews: product
        ? { count: product.reviews ?? 0, rating: product.rating ?? null }
        : undefined,
      generatedAt: new Date(),
    });
    return new Response(body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        // Short and never stale: a withdrawn listing must stop being served within minutes.
        'Cache-Control': 'public, max-age=0, s-maxage=300',
      },
    });
  } catch {
    return new Response('Unavailable\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '60' },
    });
  }
}
