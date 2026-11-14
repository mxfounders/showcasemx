'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon, RefreshIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton, libraryField } from '@/components/library/client';
import type { Dictionary } from '@/i18n/dictionary';
import { useLocale } from '@/i18n/use-locale';
import { localizedCompanySizes } from '@/lib/taxonomy';
import {
  contactSizeLabel,
  sizeFit,
  timelineOptions,
  consentVersion,
  readContact,
  canTransition,
  contactStatuses,
  storedOptionLabel,
  contactOutcomes,
  outcomeValues,
  type TimelineKey,
  type ContactDetails,
  type ContactOutcome,
  type ContactStatus,
  type OutcomeValue,
} from '@/lib/contacts/model';
type ContactsDict = Dictionary['contacts'];
async function sendContact(body: Record<string, unknown>, fallback: string) {
  const response = await fetch('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result as { ok: boolean; id: string };
}
/** Server messages are shown as-is; network, timeout and parse failures get a generic message. */
function contactError(error: unknown, t: ContactsDict['clientErrors']) {
  return error instanceof Error &&
    !['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.name)
    ? error.message
    : t.network;
}
export function ContactForm({
  solutionId,
  recipientId,
  projectName,
  email,
  defaults,
  listingSizes,
  dict: t,
}: {
  solutionId: string;
  recipientId: string;
  projectName: string;
  email: string;
  defaults: { name: string; company: string };
  /** Company sizes the listing declares: undefined if it never said, [] for any size. */
  listingSizes?: string[];
  dict: ContactsDict;
}) {
  const locale = useLocale();
  const sizes = localizedCompanySizes(locale);
  const [details, setDetails] = useState<ContactDetails>({
      ...defaults,
      size: '',
      timeline: '',
      budget: '',
      need: '',
    }),
    [consent, setConsent] = useState(false),
    [review, setReview] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const id = useRef<string | null>(null),
    busy = useRef(false);
  const router = useRouter();
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);
  const field = (key: keyof ContactDetails, value: string) => {
    setDetails(current => ({ ...current, [key]: value }));
    setError('');
  };
  return (
    <form
      noValidate
      aria-label={t.form.aria}
      aria-busy={pending}
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        setError('');
        const validated = readContact(details);
        if (!validated) {
          setError(t.form.incomplete);
          return;
        }
        if (!review) {
          setReview(true);
          return;
        }
        if (!consent) {
          setError(t.form.consentRequired);
          return;
        }
        busy.current = true;
        setPending(true);
        id.current ??= crypto.randomUUID();
        try {
          const result = await sendContact(
            {
              ...validated,
              action: 'create',
              id: id.current,
              solutionId,
              recipientId,
              consent,
              consentVersion,
            },
            t.clientErrors.fallback,
          );
          router.push('/account/contacts/' + result.id);
          router.refresh();
        } catch (error) {
          setError(contactError(error, t.clientErrors));
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      {!review ? (
        <fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2">
          <label className="text-sm">
            {t.form.yourName}
            <input
              autoComplete="name"
              value={details.name}
              onChange={e => field('name', e.target.value)}
              maxLength={100}
              className={libraryField}
            />
          </label>
          <label className="text-sm">
            {t.form.company}
            <input
              autoComplete="organization"
              value={details.company}
              onChange={e => field('company', e.target.value)}
              maxLength={150}
              className={libraryField}
            />
          </label>
          <label className="text-sm">
            {t.form.teamSize}
            <select
              value={details.size}
              onChange={e => field('size', e.target.value)}
              className={libraryField}
            >
              <option value="">{t.form.selectOption}</option>
              {sizes.map(size => (
                <option key={size.value} value={size.value}>
                  {size.label} ({size.range})
                </option>
              ))}
            </select>
            {details.size && (
              // Whether this listing says it serves the buyer's size (SHCWS-64, §54 tri-state).
              <span role="status" className="mt-2 block text-xs leading-relaxed text-stone-500">
                {t.form.sizeFit[sizeFit(details.size, listingSizes)].replace(
                  '{sizes}',
                  sizes
                    .filter(size => listingSizes?.includes(size.value))
                    .map(size => size.label)
                    .join(', '),
                )}
              </span>
            )}
          </label>
          <label className="text-sm">
            {t.form.start}
            <select
              value={details.timeline}
              onChange={e => field('timeline', e.target.value)}
              className={libraryField}
            >
              <option value="">{t.form.selectOption}</option>
              {(Object.keys(timelineOptions) as TimelineKey[]).map(key => (
                <option key={key} value={timelineOptions[key]}>
                  {t.timelines[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {t.form.need}
            <textarea
              value={details.need}
              onChange={e => field('need', e.target.value)}
              minLength={20}
              maxLength={2000}
              rows={4}
              className={libraryField}
              placeholder={t.form.needPlaceholder}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            {t.form.budget} <span className="text-stone-400">{t.form.optional}</span>
            <input
              value={details.budget}
              onChange={e => field('budget', e.target.value)}
              maxLength={200}
              className={libraryField}
              placeholder={t.form.budgetPlaceholder}
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
          <h2 tabIndex={-1} ref={reviewHeading} className="text-xl font-medium outline-none">
            {t.form.reviewTitle.replace('{project}', () => projectName)}
          </h2>
          <dl className="mt-6 grid gap-5 border-y border-stone-200 py-6 text-sm sm:grid-cols-2">
            {[
              ['name', t.fields.name, details.name],
              ['email', t.fields.yourAccountEmail, email],
              ['company', t.fields.company, details.company],
              ['size', t.fields.size, contactSizeLabel(details.size, locale, t.teamSizes)],
              [
                'timeline',
                t.fields.timeline,
                storedOptionLabel(details.timeline, timelineOptions, t.timelines),
              ],
              ['budget', t.fields.budget, details.budget || t.fields.notSpecified],
              ['need', t.fields.need, details.need],
            ].map(([key, label, value]) => (
              <div key={key} className={key === 'need' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm leading-relaxed text-stone-500">{t.form.deliveryNote}</p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              disabled={pending}
              onChange={event => setConsent(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[#365DC4]"
            />
            <span>{t.consent}</span>
          </label>
          <div className="mt-7 flex flex-wrap gap-5">
            <button disabled={pending} style={actionButtonStyle} className={libraryButton}>
              {pending ? t.form.sending : t.form.send}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setReview(false);
                setConsent(false);
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
      <Link href="/account/contacts" className="mt-7 inline-block text-sm text-stone-500">
        {t.form.myContacts}
      </Link>
    </form>
  );
}
export function ContactActions({
  id,
  version,
  status,
  actor,
  dict: t,
}: {
  id: string;
  version: number;
  status: ContactStatus;
  actor: 'buyer' | 'recipient';
  dict: ContactsDict;
}) {
  const options = contactStatuses.filter(next => canTransition(status, next, actor));
  // Nothing preselected for the recipient: the form used to open on «Cerrada», one click
  // from closing by mistake. Writing to the buyer happens in the conversation (SHCWS-168);
  // this form is only for changing the status.
  const [next, setNext] = useState<ContactStatus | ''>(actor === 'buyer' ? (options[0] ?? '') : ''),
    [message, setMessage] = useState(''),
    [outcome, setOutcome] = useState<ContactOutcome | ''>(''),
    [outcomeValue, setOutcomeValue] = useState<OutcomeValue | ''>(''),
    [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const closing = actor === 'recipient' && next === 'closed';
  const busy = useRef(false);
  const router = useRouter();
  if (!options.length)
    return (
      <p className="text-sm text-stone-500">
        {status === 'withdrawn' ? t.actions.withdrawnNotice : t.actions.noActions}
      </p>
    );
  return (
    <form
      noValidate
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        setError('');
        if (!confirm) {
          if (!next) {
            setError(t.actions.chooseChange);
            return;
          }
          if (actor === 'recipient' && message.trim().length < 10) {
            setError(t.actions.replyTooShort);
            return;
          }
          if (closing && !outcome) {
            setError(t.actions.outcomeRequired);
            return;
          }
          setConfirm(true);
          return;
        }
        busy.current = true;
        setPending(true);
        try {
          await sendContact(
            {
              action: 'update',
              id,
              status: next as ContactStatus,
              version,
              message,
              ...(closing && outcome
                ? {
                    outcome,
                    ...(outcome === 'won' && outcomeValue ? { outcomeValue } : {}),
                  }
                : {}),
            },
            t.clientErrors.fallback,
          );
          router.refresh();
        } catch (error) {
          setError(contactError(error, t.clientErrors));
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      {actor === 'recipient' ? (
        <fieldset disabled={pending || confirm} className="space-y-5">
          <label className="block text-sm">
            {t.actions.updateStatus}
            <select
              value={next}
              onChange={event => {
                setNext(event.target.value as ContactStatus);
                setError('');
              }}
              className={libraryField}
            >
              <option value="" disabled>
                {t.actions.chooseChange}
              </option>
              {options.map(value => (
                <option value={value} key={value}>
                  {t.statuses[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t.actions.replyLabel}
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              maxLength={2000}
              rows={4}
              className={libraryField}
              placeholder={t.actions.replyPlaceholder}
            />
          </label>
          {closing && (
            <OutcomeFields
              outcome={outcome}
              value={outcomeValue}
              onOutcome={value => {
                setOutcome(value);
                if (value !== 'won') setOutcomeValue('');
                setError('');
              }}
              onValue={setOutcomeValue}
              dict={t}
            />
          )}
          {status === 'closed' && next === 'conversation' && (
            <p className="text-xs leading-relaxed text-stone-500">{t.actions.outcomeReopenNote}</p>
          )}
          <p className="text-xs leading-relaxed text-stone-500">{t.actions.emailNote}</p>
        </fieldset>
      ) : (
        <p className="text-sm text-stone-500">{t.actions.withdrawHint}</p>
      )}
      {confirm && (
        <p className="mt-5 text-sm leading-relaxed">
          {actor === 'buyer'
            ? t.actions.confirmWithdraw
            : t.actions.confirmReply.replace('{status}', next ? t.statuses[next] : '')}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-4">
        <button disabled={pending} style={actionButtonStyle} className={libraryButton}>
          {pending
            ? t.actions.saving
            : confirm
              ? actor === 'buyer'
                ? t.actions.confirmWithdrawButton
                : t.actions.publishReply
              : actor === 'buyer'
                ? t.actions.withdraw
                : t.actions.reviewReply}
        </button>
        {confirm && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirm(false)}
            className="text-sm text-stone-500"
          >
            {t.actions.cancel}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
/** Won / lost / not a fit and, for a won deal, an optional value range (SHCWS-22). */
function OutcomeFields({
  outcome,
  value,
  onOutcome,
  onValue,
  dict: t,
}: {
  outcome: ContactOutcome | '';
  value: OutcomeValue | '';
  onOutcome: (value: ContactOutcome) => void;
  onValue: (value: OutcomeValue | '') => void;
  dict: ContactsDict;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm">{t.actions.outcomeLegend}</legend>
      <div className="flex flex-col gap-2">
        {contactOutcomes.map(option => (
          <label key={option} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name="contact-outcome"
              value={option}
              checked={outcome === option}
              onChange={() => onOutcome(option)}
              className="size-4 accent-[#365DC4]"
            />
            {t.actions.outcomes[option]}
          </label>
        ))}
      </div>
      {outcome === 'won' && (
        <label className="block text-sm">
          {t.actions.valueLabel} <span className="text-stone-400">{t.form.optional}</span>
          <select
            value={value}
            onChange={event => onValue(event.target.value as OutcomeValue | '')}
            className={libraryField}
          >
            <option value="">{t.actions.valueNone}</option>
            {outcomeValues.map(option => (
              <option key={option} value={option}>
                {t.actions.values[option]}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs leading-relaxed text-stone-500">{t.actions.outcomeHint}</p>
    </fieldset>
  );
}

/**
 * The founder's private record of how a closed opportunity ended, editable afterwards
 * (also for opportunities closed before outcomes existed). Never shown to the buyer.
 */
export function OutcomeForm({
  id,
  version,
  outcome: saved,
  value: savedValue,
  dict: t,
}: {
  id: string;
  version: number;
  outcome: ContactOutcome | null;
  value: OutcomeValue | null;
  dict: ContactsDict;
}) {
  const [editing, setEditing] = useState(!saved),
    [outcome, setOutcome] = useState<ContactOutcome | ''>(saved ?? ''),
    [value, setValue] = useState<OutcomeValue | ''>(savedValue ?? ''),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false);
  const router = useRouter();
  return (
    <section
      aria-labelledby="contact-outcome-title"
      className="mt-8 border-t border-stone-200 pt-6"
    >
      <h2 id="contact-outcome-title" className="text-base font-medium">
        {t.actions.outcomeTitle}
      </h2>
      {!editing && saved ? (
        <div className="mt-3">
          <p className="text-sm">
            {t.actions.outcomes[saved]}
            {saved === 'won' && savedValue ? ` · ${t.actions.values[savedValue]}` : ''}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 text-sm text-[#365DC4]"
          >
            {t.actions.outcomeChange}
          </button>
        </div>
      ) : (
        <form
          noValidate
          className="mt-3 space-y-4"
          onSubmit={async event => {
            event.preventDefault();
            if (busy.current) return;
            if (!outcome) {
              setError(t.actions.outcomeRequired);
              return;
            }
            busy.current = true;
            setPending(true);
            setError('');
            try {
              await sendContact(
                {
                  action: 'outcome',
                  id,
                  version,
                  outcome,
                  ...(outcome === 'won' && value ? { outcomeValue: value } : {}),
                },
                t.clientErrors.fallback,
              );
              router.refresh();
            } catch (error) {
              setError(contactError(error, t.clientErrors));
            } finally {
              busy.current = false;
              setPending(false);
            }
          }}
        >
          {!saved && <p className="text-sm text-stone-500">{t.actions.outcomeEmpty}</p>}
          <fieldset disabled={pending}>
            <OutcomeFields
              outcome={outcome}
              value={value}
              onOutcome={option => {
                setOutcome(option);
                if (option !== 'won') setValue('');
                setError('');
              }}
              onValue={setValue}
              dict={t}
            />
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <button disabled={pending} style={actionButtonStyle} className={libraryButton}>
              {pending ? t.actions.saving : t.actions.outcomeSave}
            </button>
            {saved && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setOutcome(saved);
                  setValue(savedValue ?? '');
                  setError('');
                }}
                className="text-sm text-stone-500"
              >
                {t.actions.cancel}
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-[#A94E35]">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/**
 * Marks an opportunity read once its recipient opens it (SHCWS-14). A POST from the page,
 * never a side effect of the GET, then a refresh so the sidebar count follows.
 */
export function MarkContactRead({ id }: { id: string }) {
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', id }),
    })
      .then(response => {
        if (response.ok) router.refresh();
      })
      .catch(() => undefined);
  }, [id, router]);
  return null;
}

export function RefreshContacts({ dict: t }: { dict: ContactsDict }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="action-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-stone-500"
    >
      <RefreshIcon className="size-4" aria-hidden="true" />
      {t.refresh}
    </button>
  );
}
