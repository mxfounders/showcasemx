import { addDays, bookingState, type BookingState } from '@/lib/ads/model';
import { formatDay, formatMoney } from '@/lib/ads/format';
import type { OwnedBooking } from '@/lib/ads/server';
import type { Dictionary } from '@/i18n/dictionary';
import { CancelBookingButton } from './cancel-booking-button';

const cancelable: BookingState[] = ['scheduled', 'live'];

/** The advertiser's bookings for one listing: what runs when, what it cost, how it did. */
export function BookingList({
  bookings,
  today,
  categoryLabel,
  dict,
}: {
  bookings: OwnedBooking[];
  today: string;
  categoryLabel: (slug: string) => string;
  dict: Dictionary['ads'];
}) {
  const t = dict.bookings;
  const day = (date: string) => formatDay(date, dict.dateLocale);

  return (
    <section className="mt-14 max-w-2xl" aria-labelledby="bookings-title">
      <h2 id="bookings-title" className="text-xl font-medium text-stone-900">
        {t.title}
      </h2>
      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">{t.empty}</p>
      ) : (
        <ol className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {bookings.map(booking => {
            const state = bookingState(booking, today);
            const money = (minor: number) =>
              formatMoney(minor, booking.currency, dict.numberLocale);
            const place =
              booking.placement === 'category'
                ? `${dict.placements.category.label} · ${categoryLabel(booking.scope)}`
                : dict.placements[booking.placement].label;
            return (
              <li key={booking.id} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-stone-900">{place}</p>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                    {t.statuses[state]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {t.dates
                    .replace('{from}', day(booking.startsOn))
                    .replace('{to}', day(addDays(booking.endsOn, -1)))}
                </p>
                {booking.servedUntil && booking.servedUntil < booking.endsOn && (
                  <p className="mt-1 text-xs text-stone-500">
                    {booking.servedUntil > booking.startsOn
                      ? t.servedUntil.replace('{date}', day(addDays(booking.servedUntil, -1)))
                      : t.statuses.canceled}
                  </p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {booking.total !== null && (
                    <div>
                      <dt className="text-xs text-stone-400">{t.paid}</dt>
                      <dd className="text-stone-800">{money(booking.total)}</dd>
                    </div>
                  )}
                  {booking.refunded > 0 && (
                    <div>
                      <dt className="text-xs text-stone-400">{t.refunded}</dt>
                      <dd className="text-stone-800">{money(booking.refunded)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-stone-400">{t.impressions}</dt>
                    <dd className="text-stone-800">{booking.impressions}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-400">{t.clicks}</dt>
                    <dd className="text-stone-800">{booking.clicks}</dd>
                  </div>
                </dl>
                {booking.invoiceUrl && (
                  <a
                    href={booking.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm text-[#365DC4] underline-offset-4 hover:underline"
                  >
                    {t.receipt}
                  </a>
                )}
                {(state === 'checkout' || cancelable.includes(state)) && !booking.canceledAt && (
                  <CancelBookingButton
                    bookingId={booking.id}
                    version={booking.version}
                    hold={state === 'checkout'}
                    dict={t}
                    errors={dict.errors}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
