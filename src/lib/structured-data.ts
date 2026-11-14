import type { BlogPost } from '@/lib/blog';
import { siteOrigin } from '@/lib/seo';
import { getSolutionCategories, safeSolutionUrl, type SolutionData } from '@/lib/solutions/model';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';

/**
 * schema.org objects for <JsonLd> (SHCWS-100). Built only from what a visitor already
 * sees: published data, public reviews (verified accounts, never the owner) and dates.
 * Never sponsored placements, never the private contact email, and nothing about
 * verification badges until that feature settles.
 */

const organization = {
  '@type': 'Organization',
  name: 'shwcs',
  url: siteOrigin,
  logo: `${siteOrigin}/icon.png`,
} as const;

export function siteJsonLd(locale: string) {
  return {
    '@graph': [
      { ...organization, '@id': `${siteOrigin}/#organization` },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: 'shwcs',
        url: `${siteOrigin}/${locale}`,
        inLanguage: locale,
        publisher: { '@id': `${siteOrigin}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteOrigin}/${locale}/buscar?q={query}`,
          },
          'query-input': 'required name=query',
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteOrigin}${item.path}`,
    })),
  };
}

/**
 * A listing: SoftwareApplication (also typed Product, so a rating can show as a review
 * snippet without inventing a price) or Service for agencies and services. The rating
 * is the public one; with no public reviews there is no rating at all.
 */
export function solutionJsonLd({
  id,
  locale,
  data,
  publishedAt,
  reviews,
}: {
  id: string;
  locale: string;
  data: Omit<SolutionData, 'contactEmail'>;
  publishedAt: string | null;
  reviews: { count: number; average: number | null };
}) {
  const url = `${siteOrigin}/${locale}/soluciones/${id}`;
  const categories = getSolutionCategories(data).map(category =>
    localizedCategoryDisplayLabel(category, locale),
  );
  const website = safeSolutionUrl(data.website);
  const software = data.kind === 'Software';
  return {
    '@type': software ? ['SoftwareApplication', 'Product'] : 'Service',
    '@id': url,
    name: data.name,
    description: data.problem,
    url,
    ...(software
      ? { applicationCategory: 'BusinessApplication', category: categories.join(', ') }
      : { serviceType: categories.join(', ') }),
    ...(website ? { sameAs: [website] } : {}),
    ...(publishedAt ? { dateModified: new Date(publishedAt).toISOString() } : {}),
    ...(reviews.count > 0 && reviews.average != null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(reviews.average.toFixed(2)),
            reviewCount: reviews.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/**
 * The listing's answered public questions (SHCWS-57) as FAQPage: each question as its
 * author wrote it and the vendor's answer, only what the page already shows to anyone.
 * Nothing with no answer, nothing hidden by moderation. Google limits FAQ rich results to
 * a few authoritative sites; the markup is for assistants and other readers of the page.
 */
export function solutionQuestionsJsonLd(
  id: string,
  locale: string,
  questions: readonly { body: string; answer: { body: string } | null; hiddenReason?: string }[],
) {
  const answered = questions.flatMap(question =>
    question.answer && !question.hiddenReason
      ? [{ question: question.body, answer: question.answer.body }]
      : [],
  );
  if (!answered.length) return null;
  return {
    ...faqJsonLd(answered),
    '@id': `${siteOrigin}/${locale}/soluciones/${id}#preguntas`,
    url: `${siteOrigin}/${locale}/soluciones/${id}`,
    inLanguage: locale,
  };
}

export function articleJsonLd(post: BlogPost, locale: string) {
  const url = `${siteOrigin}/${locale}/blog/${post.slug}`;
  return {
    '@type': 'Article',
    '@id': url,
    headline: post.title,
    description: post.excerpt,
    url,
    inLanguage: locale,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    articleSection: post.categoryLabel,
    author: organization,
    publisher: organization,
    mainEntityOfPage: url,
  };
}

/** FAQPage from question/answer pairs; answers may carry inline HTML from the dictionary. */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer.replace(/<[^>]+>/g, '') },
    })),
  };
}
