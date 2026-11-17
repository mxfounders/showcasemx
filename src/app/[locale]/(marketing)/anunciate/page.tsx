import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates, pageOpenGraph } from '@/lib/seo';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import { localizedCategories } from '@/lib/taxonomy';
import { formatDay } from '@/lib/ads/format';
import { adCurrencies, type AdPlacement } from '@/lib/ads/model';
import {
  accountProfiles,
  audienceMinimum,
  mediaKitData,
  type MediaKit,
  type MediaKitPlacement,
} from '@/lib/ads/media-kit';
import { ArrowRightIcon } from '@/components/icons/gota';
import type { Dictionary } from '@/i18n/dictionary';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const { mediaKit, meta } = await getDictionary(locale);
  const title = `${mediaKit.meta.title} | shwcs`;
  return {
    title,
    description: mediaKit.meta.description,
    alternates: localeAlternates(locale, '/anunciate'),
    openGraph: pageOpenGraph({
      locale,
      path: '/anunciate',
      title,
      description: mediaKit.meta.description,
      ogLocale: meta.site.ogLocale,
    }),
  };
}

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

const tones: Record<AdPlacement, keyof typeof brandColors> = {
  home: 'blue',
  category: 'sage',
  newsletter: 'lavender',
};

/** The sponsored card as buyers see it, drawn with a placeholder name. */
function SlotExample({ label, name, tone }: { label: string; name: string; tone: string }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="size-6 rounded-md" style={{ backgroundColor: tone }} />
          <span className="text-sm font-semibold text-stone-800">{name}</span>
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
          {label}
        </span>
      </div>
      <span className="mt-3 block h-2 w-full rounded-full bg-stone-100" />
      <span className="mt-2 block h-2 w-2/3 rounded-full bg-stone-100" />
    </div>
  );
}

function PlacementCard({
  item,
  dict,
  ads,
}: {
  item: MediaKitPlacement;
  dict: Dictionary['mediaKit'];
  ads: Dictionary['ads'];
}) {
  const color = brandColors[tones[item.placement]];
  const copy = ads.placements[item.placement];
  const rates = adCurrencies.filter(currency => item.rates[currency]);
  return (
    <article className="flex flex-col rounded-3xl border border-stone-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-stone-900">{copy.label}</h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
          style={
            item.enabled
              ? { backgroundColor: color.soft, color: color.solid }
              : { backgroundColor: '#f5f5f4', color: '#78716c' }
          }
        >
          {item.enabled ? dict.placements.open : dict.placements.closed}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{copy.detail}</p>
      <dl className="mt-5 space-y-2 text-sm">
        {item.placement !== 'newsletter' && (
          <div className="flex justify-between gap-4">
            <dt className="sr-only">{dict.audience.title}</dt>
            <dd className="text-stone-500">
              {item.views === null || item.views === 0
                ? dict.audience.none
                : fill(dict.audience.views, { n: item.views.toLocaleString(ads.numberLocale) }) +
                  (item.since
                    ? ` · ${fill(dict.audience.since, { date: formatDay(item.since, ads.dateLocale) })}`
                    : '')}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="sr-only">{dict.placements.title}</dt>
          <dd className="text-stone-500">
            {item.slots === 1
              ? dict.placements.slotsOne
              : fill(dict.placements.slots, { n: item.slots })}
          </dd>
        </div>
        <div>
          <dt className="sr-only">{dict.placements.perDay}</dt>
          <dd className="font-medium text-stone-900">
            {rates.length
              ? rates
                  .map(currency =>
                    fill(dict.placements.perDay, {
                      // With the code: «$349.00» next to dollars would be ambiguous.
                      rate: new Intl.NumberFormat(ads.numberLocale, {
                        style: 'currency',
                        currency: currency.toUpperCase(),
                        currencyDisplay: 'code',
                      }).format(Number(item.rates[currency]) / 100),
                    }),
                  )
                  .join(' · ')
              : dict.placements.noRate}
          </dd>
        </div>
      </dl>
      <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
        {dict.placements.example}
      </p>
      <SlotExample label={ads.slot.label} name={dict.placements.exampleName} tone={color.solid} />
    </article>
  );
}

function People({
  data,
  numberLocale,
  dict,
}: {
  data: MediaKit;
  numberLocale: string;
  dict: Dictionary['mediaKit'];
}) {
  const fewer = fill(dict.people.fewer, { n: audienceMinimum });
  const percent = new Intl.NumberFormat(numberLocale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">{dict.people.accounts}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
          {data.accounts.total === null ? fewer : data.accounts.total.toLocaleString(numberLocale)}
        </p>
        {data.accounts.profiles ? (
          <ul className="mt-5 space-y-2 text-sm">
            {[...accountProfiles, 'unknown' as const].map(profile => (
              <li key={profile} className="flex justify-between gap-4 text-stone-600">
                <span>{dict.people.profiles[profile]}</span>
                <span className="font-medium text-stone-900">
                  {percent.format(data.accounts.profiles?.[profile] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-stone-500">
            {fill(dict.people.threshold, { n: audienceMinimum })}
          </p>
        )}
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">{dict.people.subscribers}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
          {data.subscribers === null ? fewer : data.subscribers.toLocaleString(numberLocale)}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-stone-500">
          {dict.audience.newsletterSoon}
        </p>
      </div>
    </div>
  );
}

export default async function MediaKitPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const [{ mediaKit: dict, ads }, data] = await Promise.all([
    getDictionary(locale),
    mediaKitData().catch(() => null),
  ]);
  const categoryTitles = new Map(localizedCategories(locale).map(item => [item.slug, item.title]));
  const order: AdPlacement[] = ['home', 'category', 'newsletter'];
  const placements = [...(data?.placements ?? [])].sort(
    (a, b) => order.indexOf(a.placement) - order.indexOf(b.placement),
  );
  const actions = (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/account/solutions"
        style={actionButtonStyle}
        className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
      >
        {dict.hero.primary}
        <ArrowRightIcon className="button-arrow size-4" aria-hidden="true" />
      </Link>
      <Link
        href="/contacto?motivo=partnership"
        className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-medium text-stone-800 shadow-sm transition hover:shadow-md"
      >
        {dict.hero.secondary}
      </Link>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-stone-900 sm:text-6xl">
          {dict.hero.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-stone-600">{dict.hero.lead}</p>
        <div className="mt-8">{actions}</div>
      </header>

      {data && (
        <>
          <section aria-labelledby="mk-audience" className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="mk-audience" className="text-2xl font-semibold tracking-tight text-stone-900">
                {dict.audience.title}
              </h2>
              <p className="text-sm text-stone-500">
                {fill(dict.audience.window, {
                  from: formatDay(data.from, ads.dateLocale),
                  to: formatDay(data.to, ads.dateLocale),
                })}
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {placements.map(item => (
                <PlacementCard key={item.placement} item={item} dict={dict} ads={ads} />
              ))}
            </div>
            {data.categories.length > 0 && (
              <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
                <h3 className="text-sm font-medium text-stone-500">
                  {dict.audience.topCategories}
                </h3>
                <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  {data.categories.slice(0, 8).map(item => (
                    <li key={item.slug} className="flex justify-between gap-4 text-stone-600">
                      <span>{categoryTitles.get(item.slug) ?? item.slug}</span>
                      <span className="font-medium text-stone-900">
                        {item.views.toLocaleString(ads.numberLocale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 max-w-3xl text-xs leading-relaxed text-stone-500">
              {dict.audience.note} {dict.placements.taxes}
            </p>
          </section>

          <section aria-labelledby="mk-people" className="mt-20">
            <h2
              id="mk-people"
              className="mb-6 text-2xl font-semibold tracking-tight text-stone-900"
            >
              {dict.people.title}
            </h2>
            <People data={data} numberLocale={ads.numberLocale} dict={dict} />
          </section>
        </>
      )}

      <section aria-labelledby="mk-rules" className="mt-20">
        <h2 id="mk-rules" className="text-2xl font-semibold tracking-tight text-stone-900">
          {dict.rules.title}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {dict.rules.items.map(rule => (
            <li
              key={rule}
              className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm leading-relaxed text-stone-700"
            >
              {rule}
            </li>
          ))}
        </ul>
        <Link
          href="/terminos#publicidad"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]"
        >
          {dict.rules.terms}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </section>

      <section
        aria-labelledby="mk-cta"
        className="mt-20 rounded-[2rem] px-6 py-10 sm:px-10"
        style={{ backgroundColor: brandColors.blue.soft }}
      >
        <h2
          id="mk-cta"
          className="text-2xl font-semibold tracking-tight"
          style={{ color: brandColors.blue.solid }}
        >
          {dict.cta.title}
        </h2>
        <p className="mb-6 mt-2 text-stone-700">{dict.cta.body}</p>
        {actions}
      </section>

      {data && (
        <p className="mt-8 text-xs text-stone-400">
          {fill(dict.updated, {
            date: new Date(data.readAt).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'America/Mexico_City',
            }),
          })}
        </p>
      )}
    </div>
  );
}
