import { getSolutionCategories, isSolutionId, type SolutionData } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { solutionCategoryTones } from '@/lib/brand-colors';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { ogCard, ogContentType, ogSize } from '@/lib/og-card';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'shwcs';

// A published listing's card: name, problem, categories and its public rating (reviews
// from verified accounts, never the owner's, as in public.ts). Never the private email.
export default async function Image({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const en = locale === 'en';
  const [row] = isSolutionId(id)
    ? await solutionsSql()`SELECT s.published_data - 'contactEmail' AS data,
        (SELECT count(*)::int FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id
          WHERE r.solution_id=s.id AND r.status='published' AND a.email_verified_at IS NOT NULL AND r.author_id<>s.owner_id) AS reviews,
        (SELECT avg(r.rating)::float FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id
          WHERE r.solution_id=s.id AND r.status='published' AND a.email_verified_at IS NOT NULL AND r.author_id<>s.owner_id) AS rating
        FROM founder_solutions s WHERE s.id=${id} AND s.published_data IS NOT NULL`.catch(() => [])
    : [];
  if (!row) return ogCard({ eyebrow: 'shwcs', title: 'shwcs' });
  const data = row.data as SolutionData;
  const categories = getSolutionCategories(data);
  const reviews = Number(row.reviews ?? 0);
  return ogCard({
    eyebrow: categories
      .map(category => localizedCategoryDisplayLabel(category, locale))
      .join(' · '),
    title: data.name,
    subtitle: data.problem,
    footer:
      reviews > 0 && row.rating != null
        ? en
          ? `${Number(row.rating).toFixed(1)} of 5 · ${reviews} ${reviews === 1 ? 'review' : 'reviews'}`
          : `${Number(row.rating).toFixed(1)} de 5 · ${reviews} ${reviews === 1 ? 'reseña' : 'reseñas'}`
        : undefined,
    tone: solutionCategoryTones[categories[0] as keyof typeof solutionCategoryTones],
  });
}
