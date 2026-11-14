'use client';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, CheckCircleIcon } from '@/components/icons/gota';
import Link, { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import { countryOptions } from '@/lib/countries';
import type { PublicReview } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { ReviewForm } from './review-form';

type Option = { value: string; label: string };

/**
 * The review form on its own page: the founder's invitation (SHCWS-132) and shwcs's
 * invitation after a conversation (SHCWS-135). Saving ends on a confirmation with a way
 * to the listing instead of closing the form.
 */
export function ReviewComposer({
  solutionId,
  solutionName,
  existing,
  defaultName,
  verified,
  companySizes,
  invite,
  locale,
  dict,
}: {
  solutionId: string;
  solutionName: string;
  existing: PublicReview | null;
  defaultName: string;
  /** Whether the viewer's email is confirmed: decides what «saved» means. */
  verified: boolean;
  companySizes: Option[];
  invite?: string;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  // Built in the browser after hydration: country names come from Intl, whose data can
  // differ between the server and the browser.
  const [countries, setCountries] = useState<Option[]>([]);
  useEffect(() => setCountries(countryOptions(locale)), [locale]);
  const listing = `/soluciones/${solutionId}#resenas`;
  if (done)
    return (
      <div role="status" className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <p className="flex items-center gap-2 text-base font-medium text-stone-900">
          <CheckCircleIcon className="size-5 text-[#416B50]" aria-hidden="true" />
          {verified ? dict.composer.done : dict.composer.doneUnverified}
        </p>
        <Link
          href={listing}
          style={actionButtonStyle}
          className="action-button mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
        >
          {dict.composer.viewListing}
          <ArrowRightIcon className="size-4 button-arrow" aria-hidden="true" />
        </Link>
      </div>
    );
  return (
    <ReviewForm
      solutionId={solutionId}
      solutionName={solutionName}
      existing={existing}
      defaultName={defaultName}
      companySizes={companySizes}
      countries={countries}
      dict={dict}
      invite={invite}
      onSaved={() => setDone(true)}
      onClose={() => router.push(`/soluciones/${solutionId}`)}
    />
  );
}
