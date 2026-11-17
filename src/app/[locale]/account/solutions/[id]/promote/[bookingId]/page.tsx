import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/icons/gota';
import { requireFounder } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { categories, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { addDays, adToday, bookingState } from '@/lib/ads/model';
import { formatDay } from '@/lib/ads/format';
import { bookingReport } from '@/lib/ads/server';
import { BookingReportView } from '@/components/ads/booking-report';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.ads.report.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}

/** The advertiser's report of one booking (SHCWS-70). Only its owner can open it. */
export default async function BookingReportPage(props: {
  params: Promise<{ id: string; bookingId: string; locale: string }>;
}) {
  const { id, bookingId, locale } = await props.params;
  const dict = (await getDictionary(locale)).ads;
  const account = await requireFounder();
  if (!isSolutionId(id) || !isSolutionId(bookingId)) notFound();
  const report = await bookingReport(account.id, bookingId);
  if (!report || report.solutionId !== id) notFound();

  const { booking } = report;
  const today = adToday();
  const place =
    booking.placement === 'category'
      ? `${dict.placements.category.label} · ${localizedCategoryDisplayLabel(
          categories.find(entry => entry.slug === booking.scope)?.label ?? booking.scope,
          locale,
        )}`
      : dict.placements[booking.placement].label;
  const state = bookingState(booking, today);

  return (
    <section className="account-page">
      <Link
        href={`/account/solutions/${id}/promote`}
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {dict.report.back}
      </Link>
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
          {dict.bookings.statuses[state]}
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.report.title.replace('{place}', place)}
        </h1>
        <p className="mt-3 text-[15px] text-stone-600">
          {dict.bookings.dates
            .replace('{from}', formatDay(booking.startsOn, dict.dateLocale))
            .replace('{to}', formatDay(addDays(booking.endsOn, -1), dict.dateLocale))}
        </p>
      </header>
      <BookingReportView report={report} today={today} dict={dict} />
    </section>
  );
}
