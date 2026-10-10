import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSolution, requireFounder } from '@/lib/solutions/server';
import { getSolutionCategories, isSolutionId } from '@/lib/solutions/model';
import { categories, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { adToday, maxCampaignDays, maxLeadDays } from '@/lib/ads/model';
import { adOffers, ownedBookings } from '@/lib/ads/server';
import { settleReturn } from '@/lib/ads/settle';
import { stripeClient } from '@/lib/ads/stripe';
import { getBillingProfile } from '@/lib/billing/server';
import { PromoteForm } from '@/components/ads/promote-form';
import { BookingList } from '@/components/ads/booking-list';
import { getDictionary } from '@/i18n/get-dictionary';

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
  const t = (await getDictionary(locale)).ads;
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
  const [offers, bookings, billingProfile] = await Promise.all([
    published ? adOffers() : Promise.resolve([]),
    ownedBookings(account.id, solution.id),
    getBillingProfile(account.id),
  ]);
  const today = adToday();
  const name = published?.name || solution.data.name;

  return (
    <section className="account-page">
      <Link
        href={`/${locale}/account/solutions/${solution.id}`}
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
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
      ) : offers.length === 0 || !stripe ? (
        <p className="max-w-2xl text-sm text-stone-600">{t.page.closed}</p>
      ) : !billingProfile ? (
        <div className="max-w-2xl rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-700">
          <p>{t.page.billingRequired}</p>
          <Link
            href={`/${locale}/account/settings/billing`}
            className="mt-3 inline-flex font-medium text-[#365DC4] underline-offset-4 hover:underline"
          >
            {t.page.billingLink}
          </Link>
        </div>
      ) : (
        <PromoteForm
          solutionId={solution.id}
          offers={offers}
          categories={declared}
          today={today}
          maxLeadDays={maxLeadDays}
          maxDays={maxCampaignDays}
          locale={locale}
          dict={t}
        />
      )}

      <BookingList bookings={bookings} today={today} categoryLabel={categoryLabel} dict={t} />
    </section>
  );
}
