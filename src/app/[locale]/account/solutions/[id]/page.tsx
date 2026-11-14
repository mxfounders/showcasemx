import {
  getSolutionCategories,
  latestDecision,
  reviewTargetHours,
  solutionEvaluationRows,
  solutionSystemMessages,
  type FounderSolution,
  type SolutionEvent,
} from '@/lib/solutions/model';
import { activeListingBookings } from '@/lib/ads/account';
import { UnpublishListing, WithdrawSubmission } from '@/components/solutions/review-actions';
import { LocalTime } from '@/components/contacts/local-time';
import type { Dictionary } from '@/i18n/dictionary';
import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, ArrowUpRightIcon, MegaphoneIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { requireFounder, getSolution, getEvents } from '@/lib/solutions/server';
import { isSolutionId, isSolutionStatus } from '@/lib/solutions/model';
import { StatusBadge } from '@/components/solutions/status-badge';
import { SolutionEditor } from '@/components/solutions/solution-editor';
import {
  localizedCategoryDisplayLabel,
  localizedLinkKind,
  localizedOfferingOptions,
} from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { getOwnerReviewDigest } from '@/lib/reviews/server';
import { OwnerReviewDigest } from '@/components/reviews/owner-review-digest';
import { getRecognition } from '@/lib/recognition/server';
import { RecognitionCard } from '@/components/recognition/recognition-card';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.solutionEditor.detail.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}

type EditorDict = Dictionary['solutionEditor'];

/** The founder's own actions are stored as fixed Spanish text; show them translated. */
function historyMessage(message: string, messages: EditorDict['historyMessages']) {
  const key = (Object.keys(solutionSystemMessages) as (keyof typeof solutionSystemMessages)[]).find(
    item => solutionSystemMessages[item] === message,
  );
  return key ? messages[key] : message;
}

/** A sentence with a {date} shown in the reader's own time zone. */
function WithDate({
  template,
  value,
  locale,
}: {
  template: string;
  value: string;
  locale: string;
}) {
  const [before, after = ''] = template.split('{date}');
  return (
    <>
      {before}
      <LocalTime value={value} locale={locale} options={{ day: 'numeric', month: 'long' }} />
      {after}
    </>
  );
}

/**
 * Where the listing stands, above everything else (SHCWS-31): how long it has been in
 * review and how to take it back, what the team asked for, or that a public version
 * stays live while the founder prepares the next one.
 */
function ReviewBand({
  solution,
  events,
  targetHours,
  dict,
}: {
  solution: FounderSolution;
  events: SolutionEvent[];
  targetHours: number | null;
  dict: EditorDict;
}) {
  const t = dict.reviewBand,
    live = !!solution.published_data,
    locale = dict.dateLocale,
    card = 'mb-12 rounded-2xl border border-stone-200 bg-white p-6';
  if (solution.status === 'pending') {
    const sent =
      events.find(event => event.status === 'pending')?.created_at ?? solution.updated_at;
    return (
      <section aria-labelledby="review-band-title" className={card}>
        <h2 id="review-band-title" className="font-medium text-stone-900">
          <WithDate
            template={live ? t.pendingUpdateTitle : t.pendingTitle}
            value={sent}
            locale={locale}
          />
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          {live ? t.pendingUpdateText : t.pendingText}
          {targetHours ? ' ' + t.expected.replace('{hours}', String(targetHours)) : ''}
        </p>
        <WithdrawSubmission
          id={solution.id}
          version={solution.version}
          dict={t}
          errors={{ network: dict.errors.unconfirmed }}
        />
      </section>
    );
  }
  const decision = latestDecision(solution.status, events);
  if (decision)
    return (
      <section aria-labelledby="review-band-title" className={card}>
        <h2 id="review-band-title" className="font-medium text-stone-900">
          <WithDate
            template={decision.status === 'rejected' ? t.rejectedTitle : t.changesTitle}
            value={decision.created_at}
            locale={locale}
          />
        </h2>
        <p className="mt-4 text-xs text-stone-400">{t.comment}</p>
        <p className="mt-1 max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-800">
          {decision.message}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <a href="#solution-editor" className="text-sm font-medium text-[#365DC4]">
            {t.fixLink} ↓
          </a>
          <span className="text-xs text-stone-500">{t.resubmitNote}</span>
        </div>
      </section>
    );
  if (live && solution.status === 'draft')
    return (
      <section aria-labelledby="review-band-title" className={card}>
        <h2 id="review-band-title" className="font-medium text-stone-900">
          {t.liveDraftTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{t.liveDraftText}</p>
      </section>
    );
  if (!live && events[0]?.message === solutionSystemMessages.unpublished)
    return (
      <section aria-labelledby="review-band-title" className={card}>
        <h2 id="review-band-title" className="font-medium text-stone-900">
          {t.unpublishedTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{t.unpublishedText}</p>
      </section>
    );
  return null;
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
  const published = solution.published_data;
  const [events, reviewDigest, recognition, bookings] = await Promise.all([
    getEvents(solution.id),
    // Optional: an outage in either hides its card, never the listing page.
    published ? getOwnerReviewDigest(solution.id).catch(() => null) : null,
    published ? getRecognition(solution.id, published.website).catch(() => null) : null,
    // What unpublishing would cancel (SHCWS-32); a failure reads as none.
    published ? activeListingBookings(account.id, solution.id).catch(() => 0) : 0,
  ]);
  // jsonb returns keys in a canonical order, so the two serialise identically when equal.
  const hasUnpublishedChanges =
    !!published && JSON.stringify(solution.data) !== JSON.stringify(published);
  const kindLabel =
      localizedOfferingOptions(locale).find(item => item.value === solution.data.kind)?.label ??
      solution.data.kind,
    linkLine = (link: { label: string; url: string }) =>
      localizedLinkKind(link.label, locale) + ': ' + link.url;
  const origin = (process.env.AUTH_APP_ORIGIN || 'https://shwcs.site').replace(/\/+$/, '');
  return (
    <section className="account-page">
      <Link
        href="/account/solutions"
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {text.back}
      </Link>
      <header className="mb-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge
            status={solution.status}
            dict={dict.statuses}
            live={published ? dict.liveStatuses : undefined}
          />
          {published && (
            <>
              <Link
                href={`/soluciones/${solution.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900"
              >
                {text.viewPublished}
                <ArrowUpRightIcon className="size-3" aria-hidden="true" />
                <span className="sr-only"> {text.otherTab}</span>
              </Link>
              <Link
                href={`/account/solutions/${solution.id}/trust`}
                className="text-xs font-medium text-[#365DC4]"
              >
                {text.verifyDomain}
              </Link>
              {/* A button, not a text link: the way to buy a sponsored slot (SHCWS-72). */}
              <Link
                href={`/account/solutions/${solution.id}/promote`}
                style={actionButtonStyle}
                className="action-button inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium"
              >
                <MegaphoneIcon aria-hidden="true" className="size-4" />
                {dictionary.ads.entry.promote}
              </Link>
            </>
          )}
        </div>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {solution.data.name || text.untitled}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
          {dict.statuses[solution.status].next}
        </p>
      </header>
      <ReviewBand
        solution={solution}
        events={events}
        targetHours={reviewTargetHours(process.env.SOLUTION_REVIEW_TARGET_HOURS)}
        dict={dict}
      />
      <div className="space-y-12">
        {published && recognition && (
          <RecognitionCard
            solutionId={solution.id}
            name={published.name}
            recognition={recognition}
            movedAway={!!recognition.movedAway}
            origin={origin}
            locale={locale}
            dict={dictionary.recognition}
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
        {solution.status === 'pending' && (
          <details open className="rounded-2xl border border-stone-200 bg-white p-6">
            <summary className="cursor-pointer text-sm font-medium">{text.applicationInfo}</summary>
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
        <div id="solution-editor" className="scroll-mt-8">
          <SolutionEditor
            key={`${solution.id}-${solution.version}`}
            solution={solution}
            locale={locale}
            dict={dict}
            hasSiteImage={Boolean(solution.has_site_image)}
            siteImageFailure={solution.site_image_failure}
            hasUnpublishedChanges={hasUnpublishedChanges}
          />
        </div>
        {published && (
          <UnpublishListing
            id={solution.id}
            version={solution.version}
            name={published.name || text.untitled}
            bookings={bookings}
            dict={dict.unpublish}
            errors={{ network: dict.errors.unconfirmed }}
          />
        )}
        <details className="border-t border-stone-200 pt-6">
          <summary className="cursor-pointer text-sm font-medium">{text.history}</summary>
          {events.length ? (
            <ol className="mt-5 space-y-6">
              {events.map(event => (
                <li key={event.id} className="border-l border-stone-300 pl-4">
                  <p className="text-xs font-medium text-stone-700">
                    {isSolutionStatus(event.status)
                      ? dict.statuses[event.status].label
                      : text.eventFallback}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-500">
                    {historyMessage(event.message, dict.historyMessages)}
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
            <p className="mt-4 text-sm leading-relaxed text-stone-500">{text.noEvents}</p>
          )}
        </details>
      </div>
    </section>
  );
}
