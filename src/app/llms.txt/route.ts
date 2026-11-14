import { llmsText } from '@/lib/machine-readable';
import { publicProducts } from '@/lib/solutions/public';

// Rebuilt hourly, like the sitemap. publicProducts() returns [] if the database is down.
export const revalidate = 3600;

export async function GET() {
  // detailUrl is the listing's public path by slug (/soluciones/cord): its Markdown twin
  // is the same path plus .md.
  const solutions = (await publicProducts()).flatMap(product =>
    product.detailUrl
      ? [{ path: product.detailUrl, name: product.name, problem: product.description }]
      : [],
  );
  return new Response(llmsText({ solutions, generatedAt: new Date() }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
