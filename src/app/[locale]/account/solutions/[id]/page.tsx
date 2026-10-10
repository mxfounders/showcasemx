import { getSolutionCategories, solutionEvaluationRows } from '@/lib/solutions/model';
import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { requireFounder, getSolution, getEvents } from '@/lib/solutions/server';
import { isSolutionId, isSolutionStatus } from '@/lib/solutions/model';
import { StatusBadge } from '@/components/solutions/status-badge';
import { SolutionEditor } from '@/components/solutions/solution-editor';
import { SiteImageCard } from '@/components/solutions/site-image-card';
import { safeSolutionUrl } from '@/lib/solutions/model';
import {
  localizedCategoryDisplayLabel,
  localizedLinkKind,
  localizedOfferingOptions,
} from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { getOwnerReviewDigest } from '@/lib/reviews/server';
import { OwnerReviewDigest } from '@/components/reviews/owner-review-digest';
import { complianceResult, getTaxIdentity } from '@/lib/compliance/server';
import { TaxIdentityCard } from '@/components/compliance/tax-identity-card';
import { countryOptions } from '@/lib/countries';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.solutionEditor.detail.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function SolutionPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const dictionary = await getDictionary(locale);
  const dict = dictionary.solutionEditor,
    text = dict.detail;
  const account = await requireFounder();
  if (!isSolutionId(params.id)) notFound();
  const solution = await getSolution(params.id, account.id);
  if (!solution) notFound();
  const [events, reviewDigest, taxIdentity, compliance] = await Promise.all([
    getEvents(solution.id),
    // Optional: an outage in any of these hides its card, never the listing page.
    solution.published_data ? getOwnerReviewDigest(solution.id).catch(() => null) : null,
    getTaxIdentity(solution.id).catch(() => undefined),
    complianceResult(solution.id).catch(() => null),
  ]);
  const kindLabel =
      localizedOfferingOptions(locale).find(item => item.value === solution.data.kind)?.label ??
      solution.data.kind,
    linkLine = (link: { label: string; url: string }) =>
      localizedLinkKind(link.label, locale) + ': ' + link.url;
  return (
    <section className="account-page">
      <Link
        href="/account/solutions"
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500"
      >
        <ArrowLeft className="size-4" />
        {text.back}
      </Link>
      <Link
        href={`/account/solutions/${solution.id}/preview`}
        target="_blank"
        className="mb-6 ml-5 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#365DC4]/50 focus:ring-offset-2"
      >
        {text.preview} <ArrowUpRight className="size-3.5 text-stone-400" aria-hidden="true" />
      </Link>
      {solution.published_data && (
        <Link
          href={`/account/solutions/${solution.id}/trust`}
          className="mb-6 ml-5 inline-flex text-sm text-[#365DC4]"
        >
          {text.verifyDomain}
        </Link>
      )}
      {solution.published_data && (
        <Link
          href={`/${locale}/account/solutions/${solution.id}/promote`}
          className="mb-6 ml-5 inline-flex text-sm text-[#365DC4]"
        >
          {text.promote}
        </Link>
      )}
      <header className="mb-9 border-b border-stone-200 pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={solution.status} dict={dict.statuses} />
          {solution.published_data && (
            <Link
              href={`/soluciones/${solution.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-stone-500"
            >
              {text.viewPublished}
              <ArrowUpRight className="size-3" />
              <span className="sr-only"> {text.otherTab}</span>
            </Link>
          )}
        </div>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {solution.data.name || text.untitled}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-500">
          {dict.statuses[solution.status].next}
        </p>
        {solution.published_data && solution.status !== 'published' && (
          <p className="mt-3 text-xs text-stone-500">{text.approvedStillPublic}</p>
        )}
      </header>
      <div className="space-y-12">
        {taxIdentity !== undefined && (
          <TaxIdentityCard
            solutionId={solution.id}
            initial={taxIdentity}
            initialResult={compliance}
            countries={countryOptions(locale)}
            locale={locale}
            dict={dictionary.compliance}
          />
        )}
        {reviewDigest && (
          <OwnerReviewDigest
            solutionId={solution.id}
            digest={reviewDigest}
            locale={locale}
            dict={dictionary.reviews}
          />
        )}
        <div className="min-w-0 space-y-8">
          {(solution.status === 'pending' || solution.status === 'published') && (
            <details
              open={solution.status === 'pending'}
              className="border-b border-stone-200 pb-6"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {text.applicationInfo}
              </summary>
              <dl className="mt-5 space-y-4">
                {[
                  [
                    text.kind,
                    `${kindLabel} · ${getSolutionCategories(solution.data)
                      .map(category => localizedCategoryDisplayLabel(category, locale))
                      .join(' · ')}`,
                  ],
                  [text.problem, solution.data.problem],
                  [text.audience, solution.data.audience],
                  [text.notFor, solution.data.notFor ?? dict.toComplete],
                  [text.demo, solution.data.demoUrl ?? dict.toComplete],
                  [text.website, solution.data.website],
                  [text.contactEmail, solution.data.contactEmail],
                  [
                    text.founders,
                    solution.data.founders
                      ?.map(person =>
                        [person.name, person.role, person.bio, ...person.links.map(linkLine)]
                          .filter(Boolean)
                          .join('\n'),
                      )
                      .join('\n\n') || dict.toComplete,
                  ],
                  [
                    text.projectLinks,
                    solution.data.projectLinks?.map(linkLine).join('\n') || dict.toComplete,
                  ],
                  ...solutionEvaluationRows(solution.data, {
                    fields: dict.evaluationFields,
                    missing: dict.toComplete,
                  }),
                  [text.evidenceUrl, solution.data.evidenceUrl ?? dict.toComplete],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-stone-400">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <SiteImageCard
            solutionId={solution.id}
            website={safeSolutionUrl(solution.data.website) ?? ''}
            hasImage={Boolean(solution.has_site_image)}
            failure={solution.site_image_failure}
            data={solution.data}
            step={solution.step}
            version={solution.version}
            dict={dict.siteImage}
          />
          <SolutionEditor
            key={`${solution.id}-${solution.version}`}
            solution={solution}
            locale={locale}
            dict={dict}
          />
        </div>
        <aside className="border-t border-stone-200 pt-6 lg:border-t-0 lg:pt-0">
          <details>
            <summary className="mb-5 cursor-pointer text-sm font-semibold">{text.history}</summary>
            {events.length ? (
              <ol className="space-y-6">
                {events.map(event => (
                  <li key={event.id} className="border-l border-stone-300 pl-4">
                    <p className="text-xs font-medium text-stone-700">
                      {isSolutionStatus(event.status)
                        ? dict.statuses[event.status].label
                        : text.eventFallback}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-500">
                      {event.message}
                    </p>
                    <time className="mt-2 block text-xs text-stone-400">
                      {new Date(event.created_at).toLocaleDateString(dict.dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm leading-relaxed text-stone-500">{text.noEvents}</p>
            )}
          </details>
        </aside>
      </div>
    </section>
  );
}
