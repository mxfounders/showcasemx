import { isSolutionId, type SolutionData } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { publicProducts } from '@/lib/solutions/public';
import { verificationDomain } from '@/lib/trust/domain';
import { solutionMarkdown } from '@/lib/machine-readable';

/**
 * /soluciones/<id>.md: the published listing as Markdown for assistants (SHCWS-106).
 * Lives outside [locale] because the middleware skips paths with a dot, and a path
 * without `.md` never gets here: the middleware sends it to /<locale>/soluciones/<id>.
 * Same projection as the public page: published_data minus the private email.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = file.endsWith('.md') ? file.slice(0, -3) : '';
  const notFound = () =>
    new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  if (!isSolutionId(id)) return notFound();
  try {
    const sql = solutionsSql();
    const [row] =
      await sql`SELECT published_data - 'contactEmail' AS published_data,published_at::text FROM founder_solutions WHERE id=${id} AND published_data IS NOT NULL`;
    if (!row) return notFound();
    const data = row.published_data as SolutionData;
    const [[proof], catalog] = await Promise.all([
      sql`SELECT 1 FROM solution_domain_proofs p JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id WHERE p.solution_id=${id} AND p.domain=${verificationDomain(data.website)} AND p.verified_at IS NOT NULL AND p.expires_at>now()`,
      publicProducts(),
    ]);
    const product = catalog.find(item => item.detailUrl === `/soluciones/${id}`);
    const body = solutionMarkdown({
      id,
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
