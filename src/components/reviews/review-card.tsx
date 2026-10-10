'use client';
import { useId, useRef, useState } from 'react';
import { BadgeCheck, CornerDownRight, Flag, MailCheck, ReceiptText } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import { reviewLimits, reviewReportReasons } from '@/lib/reviews/model';
import type { PublicReview } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { Stars } from './stars';
import { reviewRequest } from './request';

const textArea =
  'mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#365DC4]';

/**
 * One review. The owner of the solution may answer in public; anyone signed in who
 * did not write it may report it. Nobody but its author can change the review itself.
 */
export function ReviewCard({
  review,
  solutionId,
  solutionName,
  canReply,
  canReport,
  sizeLabel,
  countryLabel,
  locale,
  dict,
}: {
  review: PublicReview;
  solutionId: string;
  solutionName: string;
  canReply: boolean;
  canReport: boolean;
  sizeLabel: string | null;
  countryLabel: string | null;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const [mode, setMode] = useState<'' | 'reply' | 'report'>('');
  const [reply, setReply] = useState(review.reply?.body ?? '');
  const [reason, setReason] = useState<string>(reviewReportReasons[0]);
  const [details, setDetails] = useState('');
  const [reported, setReported] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const send = async (payload: Record<string, unknown>, after: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await reviewRequest(solutionId, { reviewId: review.id, ...payload });
      after();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const meta = [
    dict.usedFor + ': ' + dict.usageDurations[review.usageDuration].toLowerCase(),
    sizeLabel,
    countryLabel,
  ].filter(Boolean);

  return (
    <article className="py-7" aria-labelledby={`${ids}-headline`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Stars
          rating={review.rating}
          label={dict.starsLabel.replace('{rating}', String(review.rating))}
        />
        <h3 id={`${ids}-headline`} className="text-base font-semibold text-stone-900">
          {review.headline}
        </h3>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span className="font-medium text-stone-700">{review.name}</span>
        {review.level === 'customer' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#416B50] px-2 py-0.5 text-white">
            <ReceiptText className="size-3.5" aria-hidden="true" />
            {dict.levels.customer}
          </span>
        ) : review.level === 'work' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E4EDE2] px-2 py-0.5 text-[#416B50]">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            {dict.levels.work}
          </span>
        ) : review.level === 'email' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
            <MailCheck className="size-3.5" aria-hidden="true" />
            {dict.levels.email}
          </span>
        ) : (
          <span className="rounded-full bg-[#F4ECD5] px-2 py-0.5 text-[#88631B]">
            {dict.levels.unverified}
          </span>
        )}
        <time dateTime={review.createdAt}>{date(review.createdAt)}</time>
        {review.edited && <span>· {dict.edited}</span>}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        {meta.join(' · ')}
        {' · '}
        <span className={review.recommends ? 'text-[#416B50]' : 'text-[#A94E35]'}>
          {review.recommends ? dict.recommends : dict.doesNotRecommend}
        </span>
      </p>

      <dl className="mt-5 space-y-4 text-sm leading-relaxed">
        {(
          [
            ['useCase', dict.useCase, review.useCase],
            ['pros', dict.pros, review.pros],
            ['cons', dict.cons, review.cons],
          ] as const
        ).map(([key, label, body]) => (
          <div key={key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-stone-700">{body}</dd>
          </div>
        ))}
      </dl>

      {review.reply && mode !== 'reply' && (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-stone-600">
            <CornerDownRight className="size-3.5" aria-hidden="true" />
            {dict.replyFrom.replace('{name}', solutionName)}
            <time className="font-normal text-stone-400" dateTime={review.reply.at}>
              · {date(review.reply.at)}
            </time>
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
            {review.reply.body}
          </p>
        </div>
      )}

      {(canReply || (canReport && !reported)) && mode === '' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canReply && (
            <button
              type="button"
              onClick={() => setMode('reply')}
              className="rounded-full px-3 py-1.5 text-sm text-[#365DC4] hover:bg-[#E4EBFC]"
            >
              {review.reply ? dict.reply.edit : dict.reply.action}
            </button>
          )}
          {canReport && !reported && (
            <button
              type="button"
              onClick={() => setMode('report')}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              <Flag className="size-3.5" aria-hidden="true" />
              {dict.report.action}
            </button>
          )}
        </div>
      )}
      {reported && (
        <p role="status" className="mt-4 text-sm text-[#416B50]">
          {dict.report.done}
        </p>
      )}

      {mode === 'reply' && (
        <form
          noValidate
          className="mt-5"
          onSubmit={event => {
            event.preventDefault();
            void send({ action: 'reply', reply }, () => {
              setMode('');
              router.refresh();
            });
          }}
        >
          <label htmlFor={`${ids}-reply`} className="text-sm font-medium text-stone-700">
            {dict.reply.label}
          </label>
          <textarea
            id={`${ids}-reply`}
            autoFocus
            rows={3}
            maxLength={reviewLimits.reply}
            value={reply}
            placeholder={dict.reply.placeholder}
            onChange={event => setReply(event.target.value)}
            className={textArea}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={pending || !reply.trim()}
              style={actionButtonStyle}
              className="action-button rounded-full px-4 py-2.5 text-sm"
            >
              {pending ? dict.reply.saving : dict.reply.submit}
            </button>
            {review.reply && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  void send({ action: 'reply', reply: '' }, () => {
                    setReply('');
                    setMode('');
                    router.refresh();
                  })
                }
                className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-[#A94E35]"
              >
                {dict.reply.remove}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setReply(review.reply?.body ?? '');
                setMode('');
                setError('');
              }}
              className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
            >
              {dict.reply.cancel}
            </button>
          </div>
        </form>
      )}

      {mode === 'report' && (
        <form
          noValidate
          className="mt-5 space-y-3 rounded-2xl border border-stone-200 p-4"
          onSubmit={event => {
            event.preventDefault();
            void send({ action: 'report', reason, details }, () => {
              setMode('');
              setReported(true);
            });
          }}
        >
          <p className="text-sm font-medium text-stone-700">{dict.report.title}</p>
          <label className="block text-sm text-stone-600">
            {dict.report.reason}
            <select
              value={reason}
              onChange={event => setReason(event.target.value)}
              className={textArea}
            >
              {reviewReportReasons.map(value => (
                <option key={value} value={value}>
                  {dict.report.reasons[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-stone-600">
            {dict.report.details}
            <textarea
              rows={3}
              maxLength={reviewLimits.reportDetails[1]}
              value={details}
              placeholder={dict.report.detailsPlaceholder}
              onChange={event => setDetails(event.target.value)}
              className={textArea}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              style={actionButtonStyle}
              className="action-button rounded-full px-4 py-2.5 text-sm"
            >
              {pending ? dict.report.sending : dict.report.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('');
                setError('');
              }}
              className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
            >
              {dict.report.cancel}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </article>
  );
}
