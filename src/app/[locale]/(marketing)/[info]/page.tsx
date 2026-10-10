import { notFound } from 'next/navigation';
import { ChangelogStory } from '@/components/editorial/changelog-story';
import { ProjectStory } from '@/components/editorial/project-story';
import { FaqStory } from '@/components/editorial/faq-story';
import { LegalStory, type LegalPageId } from '@/components/editorial/legal-story';
import { ProcesoStory } from '@/components/editorial/proceso-story';
import { CriteriosStory } from '@/components/editorial/criterios-story';
import { AplicarStory } from '@/components/editorial/aplicar-story';
import type { Dictionary } from '@/i18n/dictionary';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n } from '@/i18n/config';

// Editorial pages render their own story component; legal pages share LegalStory.
// All copy, including each page's <title>, comes from the locale's dictionary.
const storyPages = ['aplicar', 'criterios', 'proceso', 'faq', 'el-proyecto', 'changelog'] as const;
const legalPages = ['privacidad', 'terminos', 'cookies'] as const satisfies readonly LegalPageId[];

type InfoSlug = (typeof storyPages)[number] | (typeof legalPages)[number];

const infoSlugs: readonly InfoSlug[] = [...storyPages, ...legalPages];

function isInfoSlug(value: string): value is InfoSlug {
  return (infoSlugs as readonly string[]).includes(value);
}

function pageTitle(dict: Dictionary, info: InfoSlug) {
  switch (info) {
    case 'aplicar':
      return dict.apply.metaTitle;
    case 'criterios':
      return dict.criteria.metaTitle;
    case 'proceso':
      return dict.publicationProcess.metaTitle;
    case 'faq':
      return dict.faq.metaTitle;
    case 'el-proyecto':
      return dict.project.metaTitle;
    case 'changelog':
      return dict.changelog.metaTitle;
    default:
      return dict.legal.pages[info].title;
  }
}

// {locale,info} pairs over the closed set of pages above: same reasoning as
// explorar/[slug] and blog/[slug]. An unknown `info` value must 404 at the
// routing layer — a runtime notFound() here would render correctly but keep
// HTTP 200, because this segment inherits (marketing)/loading.tsx's Suspense
// boundary (see CLAUDE.md §53/§56, https://github.com/vercel/next.js/issues/75543).
export function generateStaticParams() {
  return i18n.locales.flatMap(locale => infoSlugs.map(info => ({ locale, info })));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string; locale: string }>;
}) {
  const { info, locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: isInfoSlug(info) ? `${pageTitle(dict, info)} | shwcs` : 'shwcs',
    robots: ['privacidad', 'terminos'].includes(info) ? { index: false, follow: true } : undefined,
  };
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ info: string; locale: string }>;
}) {
  const { info, locale } = await params;
  if (!isInfoSlug(info)) notFound();
  const dict = await getDictionary(locale);

  switch (info) {
    case 'el-proyecto':
      return <ProjectStory dict={dict.project} />;
    case 'changelog':
      return <ChangelogStory dict={dict.changelog} />;
    case 'faq':
      return <FaqStory dict={dict.faq} />;
    case 'proceso':
      return <ProcesoStory dict={dict.publicationProcess} />;
    case 'criterios':
      return <CriteriosStory dict={dict.criteria} />;
    case 'aplicar':
      return <AplicarStory dict={dict.apply} />;
    default:
      return <LegalStory dict={dict.legal} page={info} />;
  }
}
