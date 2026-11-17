import { localizedIndustries } from '@/lib/taxonomy';
import { ogCard, ogContentType, ogSize } from '@/lib/og-card';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'shwcs';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const info = localizedIndustries(locale).find(item => item.slug === slug);
  return ogCard({
    eyebrow: locale === 'en' ? 'Industry' : 'Industria',
    title: info?.title ?? 'shwcs',
    subtitle: info?.description,
    tone: info?.tone,
  });
}
