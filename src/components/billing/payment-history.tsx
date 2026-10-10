import { addDays } from '@/lib/ads/model';
import { formatDay, formatMoney } from '@/lib/ads/format';
import type { BillingDocumentView, PaymentRecord } from '@/lib/billing/server';
import type { Dictionary } from '@/i18n/dictionary';

/** Every payment with its Stripe receipt and its CFDI and credit notes, newest first. */
export function PaymentHistory({
  payments,
  placementLabel,
  dict,
}: {
  payments: PaymentRecord[];
  placementLabel: (placement: string, scope: string) => string;
  dict: Dictionary['billing'];
}) {
  const t = dict.history;
  if (payments.length === 0) return <p className="text-sm text-stone-500">{t.empty}</p>;
  const day = (date: string) => formatDay(date, dict.dateLocale);

  return (
    <ol className="divide-y divide-stone-200">
      {payments.map(payment => {
        const money = (minor: number) => formatMoney(minor, payment.currency, dict.numberLocale);
        return (
          <li key={payment.id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-stone-900">
                {payment.solutionName} · {placementLabel(payment.placement, payment.scope)}
              </p>
              <p className="text-sm text-stone-500">
                {t.paidOn.replace('{date}', day(payment.paidAt.slice(0, 10)))}
              </p>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {t.period
                .replace('{from}', day(payment.startsOn))
                .replace('{to}', day(addDays(payment.endsOn, -1)))}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <Amount label={t.subtotal} value={money(payment.subtotal)} />
              <Amount label={t.tax} value={money(payment.tax)} />
              <Amount label={t.total} value={money(payment.total)} />
              {payment.refunded > 0 && (
                <Amount label={t.refunded} value={money(payment.refunded)} />
              )}
            </dl>
            <ul className="mt-3 space-y-1 text-sm">
              {payment.receiptUrl && (
                <li>
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#365DC4] underline-offset-4 hover:underline"
                  >
                    {t.receipt}
                  </a>
                </li>
              )}
              {payment.documents.map((document, index) => (
                <li key={index} className="text-stone-600">
                  {documentLine(document, money, t.documents)}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-stone-800">{value}</dd>
    </div>
  );
}

function documentLine(
  document: BillingDocumentView,
  money: (minor: number) => string,
  t: Dictionary['billing']['history']['documents'],
) {
  const kind = document.kind === 'invoice' ? t.invoice : t.creditNote;
  const state =
    document.status === 'issued'
      ? [t.issued, document.folio ? t.folio.replace('{folio}', document.folio) : null]
          .filter(Boolean)
          .join(' · ')
      : t[document.status];
  return `${kind} (${money(document.amount)}): ${state}`;
}
