import { getBlogPost } from '@/lib/blog';
import type { BrandTone } from '@/lib/brand-colors';
import { ogCard, ogContentType, ogSize } from '@/lib/og-card';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'shwcs';

// The blog's own tones mapped onto the brand palette (green is sage there).
const tones: Record<string, BrandTone> = {
  blue: 'blue',
  green: 'sage',
  lavender: 'lavender',
  terracotta: 'terracotta',
  amber: 'amber',
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const post = getBlogPost(slug, locale);
  return ogCard({
    eyebrow: post ? `Blog · ${post.categoryLabel}` : 'Blog',
    title: post?.title ?? 'shwcs',
    subtitle: post?.excerpt,
    footer: post ? `${post.readingMinutes} min` : undefined,
    tone: post ? tones[post.tone] : undefined,
  });
}
