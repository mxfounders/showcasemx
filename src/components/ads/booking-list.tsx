import Link from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import {
  addDays,
  bookingState,
  clickThroughRate,
  isScopedPlacement,
  type AdPlacement,
  type BookingState,
} from '@/lib/ads/model';
import { formatDay, formatMoney } from '@/lib/ads/format';
import type { OwnedBooking } from '@/lib/ads/server';
import type { OutageCredit } from '@/lib/ads/outages';
import type { Dictionary } from '@/i18n/dictionary';
import { CancelBookingButton } from './cancel-booking-button';

const cancelable: BookingState[] = ['scheduled', 'live'];
/** States with something to report: the booking was paid. */
const reported: BookingState[] = ['scheduled', 'live', 'ended', 'canceled', 'paused', 'disputed'];

/** The advertiser's bookings for one listing: what runs when, what it cost, how it did. */
export function BookingList({
  solutionId,
  bookings,
  today,
  scopeLabel,
  credits = [],
  dict,
}: {
  solutionId: string;
  bookings: OwnedBooking[];
  today: string;
  /** The page a scoped booking runs on, by name (src/lib/ads/scopes.ts). */
  scopeLabel: (placement: AdPlacement, scope: string) => string;
  /** Days made up for outages (SHCWS-179), shown under the booking they belong to. */
  credits?: OutageCredit[];
  dict: Dictionary['ads'];
}) {
  const t = dict.bookings;
  const day = (date: string) => formatDay(date, dict.dateLocale);
  const duration = (minutes: number) =>
    minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes / 60} h`;
  const percent = new Intl.NumberFormat(dict.numberLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });

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
            const ctr = clickThroughRate(booking.clicks, booking.impressions);
            const money = (minor: number) =>
              formatMoney(minor, booking.currency, dict.numberLocale);
            const place = isScopedPlacement(booking.placement)
              ? `${dict.placements[booking.placement].label} · ${scopeLabel(booking.placement, booking.scope)}`
              : dict.placements[booking.placement].label;
            // A free make-good day (SHCWS-179): nothing was paid and nothing is refunded.
            const makegood = booking.makegoodOf !== null;
            const bookingCredits = credits.filter(credit => credit.bookingId === booking.id);
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
                {makegood && booking.makegoodDay && (
                  <p className="mt-1 text-xs text-[#416B50]">
                    {t.makegood.replace('{date}', day(booking.makegoodDay))}
                  </p>
                )}
                {booking.servedUntil && booking.servedUntil < booking.endsOn && (
                  <p className="mt-1 text-xs text-stone-500">
                    {booking.servedUntil > booking.startsOn
                      ? t.servedUntil.replace('{date}', day(addDays(booking.servedUntil, -1)))
                      : t.statuses.canceled}
                  </p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  {booking.total !== null && !makegood && (
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
                  {booking.discount > 0 && !makegood && (
                    <div>
                      <dt className="text-xs text-stone-400">{t.discount}</dt>
                      <dd className="text-stone-800">
                        {money(booking.discount)}
                        {booking.promotionCode ? ` · ${booking.promotionCode}` : ''}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-stone-400">{t.ctr}</dt>
                    <dd className="text-stone-800">
                      {ctr === null ? t.noData : percent.format(ctr)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-400">{t.visits}</dt>
                    <dd className="text-stone-800">{booking.visits}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-400">{t.contacts}</dt>
                    <dd className="text-stone-800">{booking.contacts}</dd>
                  </div>
                </dl>
                {reported.includes(state) && (
                  <Link
                    href={`/account/solutions/${solutionId}/promote/${booking.id}`}
                    className="mt-3 mr-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#365DC4] underline-offset-4 hover:underline"
                  >
                    {t.report}
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                  </Link>
                )}
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
                {bookingCredits.length > 0 && (
                  <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3">
                    <p className="text-xs font-medium text-stone-700">{t.outagesTitle}</p>
                    <ul className="mt-2 space-y-2 text-xs leading-relaxed text-stone-600">
                      {bookingCredits.map(credit => (
                        <li key={credit.day}>
                          {t.outageLead
                            .replace('{date}', day(credit.day))
                            .replace('{duration}', duration(credit.unservedMinutes))}{' '}
                          {credit.outcome === 'makegood' && credit.makegoodDay
                            ? t.outageMakegood.replace('{makegood}', day(credit.makegoodDay))
                            : `${credit.reason !== 'room' ? t.outageReasons[credit.reason] : ''} ${
                                credit.refundAmount === 0
                                  ? t.outageNoAmount
                                  : (credit.refundStatus === 'issued'
                                      ? t.outageRefund
                                      : t.outageRefundPending
                                    ).replace('{amount}', money(credit.refundAmount))
                              }`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(state === 'checkout' || cancelable.includes(state)) &&
                  !booking.canceledAt &&
                  !makegood && (
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
