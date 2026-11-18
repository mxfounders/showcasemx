'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton, libraryField } from '@/components/library/client';
import type { Dictionary } from '@/i18n/dictionary';
import { useLocale } from '@/i18n/use-locale';
import { localizedCompanySizes } from '@/lib/taxonomy';
import {
  consentVersion,
  contactSizeLabel,
  readContact,
  sizeFit,
  storedOptionLabel,
  timelineOptions,
  type ContactDetails,
  type TimelineKey,
} from '@/lib/contacts/model';
import { composeNeed } from '@/lib/contacts/batch';

type ContactsDict = Dictionary['contacts'];
type BatchDict = Dictionary['contactBatch'];
type QuestionKey = keyof BatchDict['form']['questions'];

/** A project of the selection: one that will be asked, or one the buyer already wrote to. */
export type BatchRow = {
  solutionId: string;
  name: string;
  /** The listing's owner the buyer is shown; absent for a project already written to. */
  recipientId?: string;
  /** Company sizes the listing declares: undefined if it never said, [] for any size. */
  listingSizes?: string[];
  /** The buyer's request already on file for this project. */
  existingRequestId?: string;
};

type Result = {
  solutionId: string;
  outcome: 'sent' | 'existing' | 'failed';
  requestId?: string;
  error?: string;
};

/** Server messages are shown as-is; network, timeout and parse failures get a generic one. */
function sendError(error: unknown, network: string) {
  return error instanceof Error &&
    !['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.name)
    ? error.message
    : network;
}

/**
 * One form for a proposal to several projects (SHCWS-62): the same details for each,
 * a review of exactly what each one receives, a consent per recipient, and a result per
 * project. Every id is generated once, so retrying after a failure or a timeout never
 * creates a second request for a project that already got one.
 */
export function BatchContactForm({
  listId,
  rows,
  email,
  defaults,
  contactsDict: c,
  dict: t,
}: {
  /** null when the projects come from a temporary comparison, not a list (SHCWS-53). */
  listId: string | null;
  rows: BatchRow[];
  email: string;
  defaults: { name: string; company: string };
  contactsDict: ContactsDict;
  dict: BatchDict;
}) {
  const locale = useLocale();
  const sizes = localizedCompanySizes(locale);
  const router = useRouter();
  const recipients = rows.filter(row => row.recipientId && !row.existingRequestId);
  const earlier = rows.filter(row => row.existingRequestId);
  const [details, setDetails] = useState<ContactDetails>({
      ...defaults,
      size: '',
      timeline: '',
      budget: '',
      need: '',
    }),
    [questions, setQuestions] = useState<QuestionKey[]>([]),
    [consents, setConsents] = useState<Record<string, boolean>>({}),
    [step, setStep] = useState<'form' | 'review' | 'results'>('form'),
    [results, setResults] = useState<Result[]>([]),
    [batchId, setBatchId] = useState<string | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const ids = useRef<{ batch: string; requests: Record<string, string> } | null>(null),
    lastBody = useRef<Record<string, unknown> | null>(null),
    busy = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (step !== 'form') heading.current?.focus();
  }, [step]);

  const need = composeNeed(
    details.need,
    questions.map(key => t.form.questions[key]),
    t.form.questionsHeading,
  );
  const chosen = recipients.filter(row => consents[row.solutionId]);
  const name = (solutionId: string) => rows.find(row => row.solutionId === solutionId)?.name ?? '';
  const field = (key: keyof ContactDetails, value: string) => {
    setDetails(current => ({ ...current, [key]: value }));
    setError('');
  };

  async function send(body: Record<string, unknown>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/contacts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || c.clientErrors.fallback);
      const answer = result as { batchId: string | null; results: Result[] };
      setResults(answer.results);
      setBatchId(answer.batchId);
      if (answer.batchId && answer.results.every(item => item.outcome !== 'failed')) {
        router.push('/account/contacts/groups/' + answer.batchId);
        router.refresh();
        return;
      }
      setStep('results');
    } catch (failure) {
      setError(sendError(failure, c.clientErrors.network));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (step === 'results')
    return (
      <section aria-labelledby="batch-results-title">
        <h2
          id="batch-results-title"
          tabIndex={-1}
          ref={heading}
          className="text-xl font-medium outline-none"
        >
          {t.results.title}
        </h2>
        <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {results.map(item => (
            <li key={item.solutionId} className="py-5 text-sm">
              <p
                className={item.outcome === 'failed' ? 'font-medium text-[#A94E35]' : 'font-medium'}
              >
                {t.results[item.outcome].replace('{project}', () => name(item.solutionId))}
              </p>
              {item.error && <p className="mt-2 text-stone-500">{item.error}</p>}
              {item.requestId && (
                <Link
                  href={'/account/contacts/' + item.requestId}
                  className="mt-2 inline-block text-[#365DC4]"
                >
                  {t.results.viewThread}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {!batchId && results.some(item => item.outcome !== 'failed') && (
          <p className="mt-5 text-sm leading-relaxed text-stone-500">{t.results.notGrouped}</p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-5">
          {(results.some(item => item.outcome === 'failed') ||
            (!batchId && results.some(item => item.outcome !== 'failed'))) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => lastBody.current && send(lastBody.current)}
              style={actionButtonStyle}
              className={libraryButton}
            >
              {pending ? t.results.retrying : t.results.retry}
            </button>
          )}
          {batchId && (
            <Link href={'/account/contacts/groups/' + batchId} className="text-sm text-[#365DC4]">
              {t.results.viewGroup}
            </Link>
          )}
          <Link href="/account/contacts" className="text-sm text-stone-500">
            {t.results.myContacts}
          </Link>
        </div>
        {results.some(item => item.outcome === 'failed') && (
          <p className="mt-4 text-xs leading-relaxed text-stone-500">{t.results.retryNote}</p>
        )}
        {error && (
          <p role="alert" className="mt-5 text-sm text-[#A94E35]">
            {error}
          </p>
        )}
      </section>
    );

  return (
    <form
      noValidate
      aria-label={t.form.aria}
      aria-busy={pending}
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        setError('');
        const validated = readContact({ ...details, need });
        if (!validated) {
          setError(need.length > 2000 ? t.form.needTooLong : c.form.incomplete);
          return;
        }
        if (step === 'form') {
          setStep('review');
          return;
        }
        if (!chosen.length) {
          setError(t.form.consentRequired);
          return;
        }
        ids.current ??= {
          batch: crypto.randomUUID(),
          requests: Object.fromEntries(rows.map(row => [row.solutionId, crypto.randomUUID()])),
        };
        const requests = ids.current.requests;
        // In the buyer's order: the projects they authorized, and the ones they had
        // already written to, which join the group without receiving anything new.
        const body = {
          id: ids.current.batch,
          listId,
          consentVersion,
          ...validated,
          recipients: rows.flatMap(row =>
            row.existingRequestId
              ? [{ id: requests[row.solutionId], solutionId: row.solutionId, consent: false }]
              : consents[row.solutionId] && row.recipientId
                ? [
                    {
                      id: requests[row.solutionId],
                      solutionId: row.solutionId,
                      recipientId: row.recipientId,
                      consent: true,
                    },
                  ]
                : [],
          ),
        };
        lastBody.current = body;
        await send(body);
      }}
    >
      {step === 'form' ? (
        <fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2">
          <label className="text-sm">
            {c.form.yourName}
            <input
              autoComplete="name"
              value={details.name}
              onChange={e => field('name', e.target.value)}
              maxLength={100}
              className={libraryField}
            />
          </label>
          <label className="text-sm">
            {c.form.company}
            <input
              autoComplete="organization"
              value={details.company}
              onChange={e => field('company', e.target.value)}
              maxLength={150}
              className={libraryField}
            />
          </label>
          <label className="text-sm">
            {c.form.teamSize}
            <select
              value={details.size}
              onChange={e => field('size', e.target.value)}
              className={libraryField}
            >
              <option value="">{c.form.selectOption}</option>
              {sizes.map(size => (
                <option key={size.value} value={size.value}>
                  {size.label} ({size.range})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {c.form.start}
            <select
              value={details.timeline}
              onChange={e => field('timeline', e.target.value)}
              className={libraryField}
            >
              <option value="">{c.form.selectOption}</option>
              {(Object.keys(timelineOptions) as TimelineKey[]).map(key => (
                <option key={key} value={timelineOptions[key]}>
                  {c.timelines[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {c.form.need}
            <textarea
              value={details.need}
              onChange={e => field('need', e.target.value)}
              minLength={20}
              maxLength={2000}
              rows={4}
              className={libraryField}
              placeholder={c.form.needPlaceholder}
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm">
              {t.form.questionsLegend} <span className="text-stone-400">{c.form.optional}</span>
            </legend>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{t.form.questionsHint}</p>
            <div className="mt-3 flex flex-col gap-3">
              {(Object.keys(t.form.questions) as QuestionKey[]).map(key => (
                <label key={key} className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={questions.includes(key)}
                    onChange={event => {
                      setError('');
                      setQuestions(current =>
                        event.target.checked
                          ? (Object.keys(t.form.questions) as QuestionKey[]).filter(
                              item => item === key || current.includes(item),
                            )
                          : current.filter(item => item !== key),
                      );
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[#365DC4]"
                  />
                  <span>{t.form.questions[key]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm sm:col-span-2">
            {c.form.budget} <span className="text-stone-400">{c.form.optional}</span>
            <input
              value={details.budget}
              onChange={e => field('budget', e.target.value)}
              maxLength={200}
              className={libraryField}
              placeholder={c.form.budgetPlaceholder}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={libraryButton} style={actionButtonStyle}>
              {t.form.review}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        </fieldset>
      ) : (
        <div>
          <h2 tabIndex={-1} ref={heading} className="text-xl font-medium outline-none">
            {t.form.reviewTitle}
          </h2>
          <dl className="mt-6 grid gap-5 border-y border-stone-200 py-6 text-sm sm:grid-cols-2">
            {[
              ['name', c.fields.name, details.name],
              ['email', c.fields.yourAccountEmail, email],
              ['company', c.fields.company, details.company],
              ['size', c.fields.size, contactSizeLabel(details.size, locale, c.teamSizes)],
              [
                'timeline',
                c.fields.timeline,
                storedOptionLabel(details.timeline, timelineOptions, c.timelines),
              ],
              ['budget', c.fields.budget, details.budget || c.fields.notSpecified],
              ['need', c.fields.need, need],
            ].map(([key, label, value]) => (
              <div key={key} className={key === 'need' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-relaxed text-stone-500">{t.form.reviewNote}</p>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{c.form.deliveryNote}</p>
          <fieldset disabled={pending} className="mt-7">
            <legend className="text-base font-medium">{t.form.consentLegend}</legend>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{t.form.consentScope}</p>
            <ul className="mt-4 space-y-4">
              {recipients.map(row => (
                <li key={row.solutionId}>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                    <input
                      type="checkbox"
                      checked={Boolean(consents[row.solutionId])}
                      onChange={event => {
                        setError('');
                        setConsents(current => ({
                          ...current,
                          [row.solutionId]: event.target.checked,
                        }));
                      }}
                      className="mt-1 size-4 shrink-0 accent-[#365DC4]"
                    />
                    <span>
                      {t.form.consentFor.replace('{project}', () => row.name)}
                      {details.size && (
                        // Whether each listing says it serves the buyer's size (§54 tri-state).
                        <span className="mt-1 block text-xs text-stone-500">
                          {c.form.sizeFit[sizeFit(details.size, row.listingSizes)].replace(
                            '{sizes}',
                            sizes
                              .filter(size => row.listingSizes?.includes(size.value))
                              .map(size => size.label)
                              .join(', '),
                          )}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
              {earlier.map(row => (
                <li key={row.solutionId} className="pl-7 text-sm text-stone-500">
                  {t.form.existingRow.replace('{project}', () => row.name)}
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-7 flex flex-wrap gap-5">
            <button disabled={pending} style={actionButtonStyle} className={libraryButton}>
              {pending
                ? t.form.sending
                : chosen.length === 1
                  ? t.form.sendOne
                  : t.form.sendMany.replace('{count}', String(chosen.length))}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setStep('form');
                setConsents({});
                setError('');
              }}
              className="text-sm text-stone-500"
            >
              {t.form.edit}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
