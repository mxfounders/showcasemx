import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/icons/gota';
import { getSolution, requireFounder } from '@/lib/solutions/server';
import { getSolutionCategories, isSolutionId } from '@/lib/solutions/model';
import { publicProducts } from '@/lib/solutions/public';
import { categories, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { adToday, maxCampaignDays, maxLeadDays } from '@/lib/ads/model';
import {
  adPlacementStatus,
  ownedBookings,
  placementReach,
  waitlistedPlacements,
} from '@/lib/ads/server';
import { settleReturn } from '@/lib/ads/settle';
import { publishableKey, stripeClient } from '@/lib/ads/stripe';
import { billingCountries } from '@/lib/billing/model';
import { getBillingProfile } from '@/lib/billing/server';
import { PromoteForm } from '@/components/ads/promote-form';
import { BookingList } from '@/components/ads/booking-list';
import type { SponsoredCardContent } from '@/components/ads/sponsored-slots';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return { title: `${dictionary.ads.meta.title} | shwcs`, robots: { index: false, follow: false } };
}

type Notice = 'success' | 'pending' | 'canceled' | null;

export default async function PromotePage(props: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const [{ id, locale }, query] = await Promise.all([props.params, props.searchParams]);
  const dictionary = await getDictionary(locale);
  const t = dictionary.ads;
  const account = await requireFounder();
  if (!isSolutionId(id)) notFound();
  const solution = await getSolution(id, account.id);
  if (!solution) notFound();

  // Back from Stripe Checkout: settle from Stripe's own record, so the list below is
  // current even if the webhook has not arrived yet.
  let notice: Notice = query.checkout === 'canceled' ? 'canceled' : null;
  const stripe = stripeClient();
  if (query.checkout === 'success' && query.session_id && stripe) {
    notice =
      (await settleReturn(stripe, query.session_id, account.id).catch(() => null)) ?? 'pending';
  }

  const published = solution.published_data;
  const declared = published
    ? categories
        .filter(entry => getSolutionCategories(published).includes(entry.label))
        .map(entry => ({
          slug: entry.slug,
          label: localizedCategoryDisplayLabel(entry.label, locale),
        }))
    : [];
  const categoryLabel = (slug: string) =>
    localizedCategoryDisplayLabel(
      categories.find(entry => entry.slug === slug)?.label ?? slug,
      locale,
    );
  // Price and reach first (SHCWS-72): none of this needs billing details.
  const [placements, reach, bookings, billingProfile, waitlisted, products] = await Promise.all([
    published ? adPlacementStatus() : Promise.resolve([]),
    published ? placementReach().catch(() => ({})) : Promise.resolve({}),
    ownedBookings(account.id, solution.id),
    getBillingProfile(account.id),
    published ? waitlistedPlacements(account.id).catch(() => []) : Promise.resolve([]),
    published ? publicProducts().catch(() => []) : Promise.resolve([]),
  ]);
  const today = adToday();
  const name = published?.name || solution.data.name;
  // The card exactly as the catalogue serves it; right after approval the cached
  // catalogue may lag a few minutes, so the approved text stands in meanwhile.
  const listed = products.find(item => item.detailUrl === `/soluciones/${solution.id}`);
  const card: SponsoredCardContent = listed
    ? {
        name: listed.name,
        description: listed.description,
        favicon: listed.favicon,
        ogImage: listed.ogImage,
      }
    : { name, description: published?.problem ?? '' };
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });

  return (
    <section className="account-page">
      <Link
        href={`/account/solutions/${solution.id}`}
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t.page.back}
      </Link>
      <header className="mb-10 max-w-2xl">
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.page.title.replace('{name}', () => name)}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-stone-600">{t.page.intro}</p>
      </header>

      {notice && (
        <p
          role="status"
          className="mb-8 max-w-2xl rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-700"
        >
          {t.returns[notice]}
        </p>
      )}

      {!published ? (
        <p className="max-w-2xl text-sm text-stone-600">{t.page.notPublished}</p>
      ) : (
        <PromoteForm
          solutionId={solution.id}
          placements={placements}
          categories={declared}
          reach={reach}
          product={card}
          today={today}
          maxLeadDays={maxLeadDays}
          maxDays={maxCampaignDays}
          locale={locale}
          stripeReady={Boolean(stripe)}
          publishableKey={publishableKey()}
          waitlisted={waitlisted}
          billing={{
            country: billingProfile?.countryCode ?? null,
            complete: Boolean(billingProfile),
            version: billingProfile?.version ?? 0,
            countries: billingCountries.map(code => ({
              code,
              name: regionName.of(code) ?? code,
            })),
            dict: dictionary.billing,
          }}
          dict={t}
        />
      )}

      <BookingList
        solutionId={solution.id}
        bookings={bookings}
        today={today}
        categoryLabel={categoryLabel}
        dict={t}
      />
    </section>
  );
}
