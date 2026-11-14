import { notFound } from 'next/navigation';
import { ChangelogStory } from '@/components/editorial/changelog-story';
import { ProjectStory } from '@/components/editorial/project-story';
import { FaqStory } from '@/components/editorial/faq-story';
import { LegalStory } from '@/components/editorial/legal-story';
import { ProcesoStory } from '@/components/editorial/proceso-story';
import { CriteriosStory } from '@/components/editorial/criterios-story';
import { RecognitionCriteria } from '@/components/editorial/recognition-criteria';
import { AplicarStory } from '@/components/editorial/aplicar-story';
import type { Dictionary } from '@/i18n/dictionary';
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n } from '@/i18n/config';
import { infoSlugs, isInfoSlug, noindexInfoSlugs, type InfoSlug } from '@/lib/info-pages';
import { JsonLd } from '@/components/json-ld';
import { faqJsonLd } from '@/lib/structured-data';

// Editorial pages render their own story component; legal pages share LegalStory.
// All copy, including each page's <title>, comes from the locale's dictionary.
// The slug list lives in lib/info-pages so navigation tests can read it; the
// LegalStory call below type-checks the legal slugs against the dictionary.

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
    robots: (noindexInfoSlugs as readonly string[]).includes(info)
      ? { index: false, follow: true }
      : undefined,
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
      return (
        <>
          <JsonLd data={faqJsonLd(Object.values(dict.faq.groups).flatMap(group => group.items))} />
          <FaqStory dict={dict.faq} />
        </>
      );
    case 'proceso':
      return <ProcesoStory dict={dict.publicationProcess} />;
    case 'criterios':
      return (
        <CriteriosStory
          dict={dict.criteria}
          after={<RecognitionCriteria dict={dict.recognition} locale={locale} />}
        />
      );
    case 'aplicar':
      return <AplicarStory dict={dict.apply} />;
    default:
      return <LegalStory dict={dict.legal} page={info} />;
  }
}
