import type { Metadata } from 'next';
import { BlogIndex } from '@/components/blog/blog-index';
import { getDictionary } from '@/i18n/get-dictionary';
import { getPostSummaries } from '@/lib/blog';
import { localeAlternates } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: 'Blog | shwcs',
    description: dict.blog.metaDescription,
    alternates: localeAlternates(locale, '/blog'),
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return <BlogIndex dict={dict.blog} locale={locale} posts={getPostSummaries(locale)} />;
}
