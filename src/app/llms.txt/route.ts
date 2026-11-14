import { llmsText } from '@/lib/machine-readable';
import { publicProducts } from '@/lib/solutions/public';

// Rebuilt hourly, like the sitemap. publicProducts() returns [] if the database is down.
export const revalidate = 3600;

export async function GET() {
  const solutions = (await publicProducts()).flatMap(product => {
    const id = product.detailUrl?.split('/').pop();
    return id ? [{ id, name: product.name, problem: product.description }] : [];
  });
  return new Response(llmsText({ solutions, generatedAt: new Date() }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
