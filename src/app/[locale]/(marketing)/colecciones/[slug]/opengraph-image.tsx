import { localizedCollections } from '@/lib/taxonomy';
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
  const info = localizedCollections(locale).find(item => item.slug === slug);
  return ogCard({
    eyebrow: locale === 'en' ? 'Collection' : 'Colección',
    title: info?.title ?? 'shwcs',
    subtitle: info?.description,
  });
}
