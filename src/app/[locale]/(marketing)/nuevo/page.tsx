import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { publicProducts } from '@/lib/solutions/public';
import { splitNewListings } from '@/lib/solutions/new-this-week';
import { compactPeriod } from '@/lib/recognition/format';
import { getAccentStyle, actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates, pageOpenGraph } from '@/lib/seo';
import { CatalogCard } from '@/components/catalog/catalog-card';
import type { PreviewProduct } from '@/lib/catalog-preview';
import type { Dictionary } from '@/i18n/dictionary';

// «Now» decides which week each listing belongs to: render per request.
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const { catalog, meta } = await getDictionary(locale);
  const title = `${catalog.newThisWeek.metaTitle} | shwcs`;
  return {
    title,
    description: catalog.newThisWeek.metaDescription,
    alternates: localeAlternates(locale, '/nuevo'),
    openGraph: pageOpenGraph({
      locale,
      path: '/nuevo',
      title,
      description: catalog.newThisWeek.metaDescription,
      ogLocale: meta.site.ogLocale,
    }),
  };
}

function approvedOn(product: PreviewProduct, locale: string, template: string) {
  if (!product.firstPublishedAt) return null;
  return template.replace(
    '{date}',
    new Date(product.firstPublishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Mexico_City',
    }),
  );
}

function Grid({
  items,
  locale,
  dict,
}: {
  items: PreviewProduct[];
  locale: string;
  dict: Dictionary['catalog'];
}) {
  const palette = getAccentStyle('/nuevo');
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((product, index) => (
        <div key={product.detailUrl ?? product.name}>
          <CatalogCard
            product={product}
            index={index}
            palette={palette}
            locale={locale}
            dict={dict}
          />
          <p className="mt-2 px-1 text-[11px] text-stone-500">
            {approvedOn(product, locale, dict.newThisWeek.approvedOn)}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * «Nuevo esta semana» (SHCWS-125): every listing approved in the last seven days, by
 * first approval date, then the weekly archive. No votes, no ranking.
 */
export default async function NewThisWeekPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const [products, dictionary] = await Promise.all([publicProducts(), getDictionary(locale)]);
  const dict = dictionary.catalog;
  const text = dict.newThisWeek;
  const { current, archive } = splitNewListings(products);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12">
        <h1 className="shrink-0 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:max-w-md md:text-[42px]">
          {text.title}
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-stone-500 md:pt-2">
          {text.description}
        </p>
      </div>

      {current.length > 0 ? (
        <Grid items={current} locale={locale} dict={dict} />
      ) : (
        <div className="rounded-[24px] border border-dashed border-stone-300 px-6 py-16 text-center sm:py-24">
          <h2 className="text-lg font-medium text-stone-900">{text.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
            {text.emptyDesc}
          </p>
          <Link
            href="/#catalogo"
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            {text.exploreCta}
            <span className="button-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      )}

      {archive.length > 0 && (
        <section className="mt-20" aria-labelledby="new-archive">
          <h2 id="new-archive" className="text-2xl font-semibold tracking-tight text-stone-900">
            {text.archiveTitle}
          </h2>
          <div className="mt-8 space-y-14">
            {archive.map(week => (
              <section
                key={week.start}
                id={`semana-${week.start}`}
                aria-labelledby={`week-${week.start}`}
                className="scroll-mt-24"
              >
                <h3
                  id={`week-${week.start}`}
                  className="mb-5 text-sm font-medium uppercase tracking-[0.12em] text-stone-500"
                >
                  {text.weekHeading.replace(
                    '{period}',
                    compactPeriod(week.start, week.end, locale),
                  )}
                </h3>
                <Grid items={week.items} locale={locale} dict={dict} />
              </section>
            ))}
          </div>
        </section>
      )}

      <div className="mt-20 flex flex-col gap-4 border-t border-stone-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-stone-600">{text.founderNote}</p>
        <Link
          href="/aplicar"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#365DC4]"
        >
          {text.founderCta}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
