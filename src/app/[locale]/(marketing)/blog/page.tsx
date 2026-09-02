import type { Metadata } from 'next';
import { BlogIndex } from '@/components/blog/blog-index';

export const metadata: Metadata = { title: 'Blog | shwcs', description: 'Ideas de shwcs para elegir, construir y operar mejores productos y servicios.' };

import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export default async function BlogPage({params}:{params:Promise<{locale:string}>}) {
  const {locale} = await params;
  const dict = await getDictionary(locale as Locale);
  return <BlogIndex dict={dict.blog} />;
}
