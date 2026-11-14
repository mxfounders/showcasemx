'use client';

import { useMemo, useRef, useState } from 'react';
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  TaxIdElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import { ArrowLeftIcon, LoaderIcon, LockIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * The payment step of a sponsored slot, on shwcs itself (no redirect to a Stripe page).
 * The server opened the Checkout Session in `ui_mode: 'elements'`; this mounts Stripe's
 * billing address, tax id and Payment Elements styled like the site, shows the total
 * Stripe computes (discount and tax included) and confirms in place. Card details live
 * only in Stripe's iframes. A card that needs 3-D Secure opens Stripe's own frame; a
 * method that must leave the page comes back to `returnUrl`, which settles the booking
 * from Stripe's record exactly like the webhook.
 */
export type CheckoutPaymentProps = {
  publishableKey: string;
  clientSecret: string;
  /** Absolute address of the promote page with `checkout=success&session_id=…`. */
  returnUrl: string;
  billing: { name: string; email: string; country: string; postalCode: string | null };
  locale: string;
  dict: Dictionary['ads']['payment'];
  /** Releases the held dates and goes back to the selection. */
  onBack: () => Promise<boolean>;
};

const stripeInstances = new Map<string, Promise<Stripe | null>>();
function stripeFor(key: string, locale: string) {
  const id = `${key}:${locale}`;
  let instance = stripeInstances.get(id);
  if (!instance) {
    instance = loadStripe(key, { locale: locale === 'en' ? 'en' : 'es-419' });
    stripeInstances.set(id, instance);
  }
  return instance;
}

/** The site's look inside Stripe's iframes (brand blue, stone text, rounded fields). */
const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#365DC4',
    colorBackground: '#ffffff',
    colorText: '#1c1917',
    colorTextSecondary: '#57534e',
    colorTextPlaceholder: '#a8a29e',
    colorDanger: '#A94E35',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontSizeBase: '15px',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { borderColor: '#d6d3d1', boxShadow: 'none' },
    '.Input:focus': { borderColor: '#365DC4', boxShadow: '0 0 0 3px rgba(54, 93, 196, 0.18)' },
    '.Label': { fontWeight: '500', color: '#44403c' },
    '.Tab': { borderColor: '#d6d3d1', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#365DC4', boxShadow: '0 0 0 1px #365DC4' },
  },
};

export function CheckoutPayment(props: CheckoutPaymentProps) {
  const stripe = useMemo(
    () => stripeFor(props.publishableKey, props.locale),
    [props.publishableKey, props.locale],
  );
  const { billing } = props;
  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{
        clientSecret: props.clientSecret,
        elementsOptions: { appearance, loader: 'auto' },
        defaultValues: {
          email: billing.email,
          // The buyer's own billing profile, so tax is computed without typing it again.
          billingAddress: {
            name: billing.name,
            address: { country: billing.country, postal_code: billing.postalCode },
          },
        },
      }}
    >
      <PaymentForm {...props} />
    </CheckoutElementsProvider>
  );
}

function PaymentForm({ returnUrl, dict, onBack }: CheckoutPaymentProps) {
  const state = useCheckoutElements();
  const busy = useRef(false);
  const [pending, setPending] = useState<'pay' | 'back' | null>(null);
  const [error, setError] = useState('');

  if (state.type === 'loading')
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-stone-500">
        <LoaderIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        {dict.loading}
      </p>
    );
  if (state.type === 'error')
    return (
      <p role="alert" className="text-sm text-[#A94E35]">
        {dict.loadError}
      </p>
    );

  const { checkout } = state;
  const totals = checkout.total;
  const taxKnown = checkout.taxAmounts !== null;

  async function pay() {
    if (busy.current) return;
    busy.current = true;
    setPending('pay');
    setError('');
    const result = await checkout.confirm({ redirect: 'if_required', returnUrl });
    if (result.type === 'error') {
      setError(result.error.message || dict.genericError);
      busy.current = false;
      setPending(null);
      return;
    }
    // Paid in place: the promote page reads the session from Stripe and shows the booking.
    window.location.assign(returnUrl);
  }

  async function back() {
    if (busy.current) return;
    busy.current = true;
    setPending('back');
    setError('');
    if (!(await onBack())) {
      setError(dict.backError);
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="pay-billing">
          <h3 id="pay-billing" className="mb-3 text-sm font-medium text-stone-900">
            {dict.billingHeading}
          </h3>
          <BillingAddressElement />
          <div className="mt-4">
            <TaxIdElement options={{ visibility: 'auto' }} />
          </div>
        </section>
        <section aria-labelledby="pay-method">
          <h3 id="pay-method" className="mb-3 text-sm font-medium text-stone-900">
            {dict.methodHeading}
          </h3>
          <PaymentElement options={{ layout: 'tabs' }} />
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm">
        <dl className="space-y-2" aria-live="polite">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-stone-600">{dict.subtotal}</dt>
            <dd className="tabular-nums text-stone-900">{totals.subtotal.amount}</dd>
          </div>
          {totals.discount.minorUnitsAmount > 0 && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#416B50]">{dict.discount}</dt>
              <dd className="tabular-nums text-[#416B50]">−{totals.discount.amount}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-stone-600">{dict.tax}</dt>
            <dd className="tabular-nums text-stone-900">
              {taxKnown ? totals.taxExclusive.amount : dict.taxPending}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-stone-200 pt-3">
            <dt className="font-medium text-stone-900">{dict.total}</dt>
            <dd className="text-lg font-semibold tabular-nums text-stone-900">
              {totals.total.amount}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => void pay()}
          disabled={pending !== null || !checkout.canConfirm}
          style={actionButtonStyle}
          className="action-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending === 'pay' ? (
            <>
              <LoaderIcon
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              {dict.paying}
            </>
          ) : (
            <>
              <LockIcon aria-hidden="true" className="size-4" />
              {dict.pay.replace('{amount}', totals.total.amount)}
            </>
          )}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[#A94E35]">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-stone-500">{dict.secure}</p>
        <button
          type="button"
          onClick={() => void back()}
          disabled={pending !== null}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#365DC4] disabled:opacity-60"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {pending === 'back' ? dict.backing : dict.back}
        </button>
      </aside>
    </div>
  );
}
