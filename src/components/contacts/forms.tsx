'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton, libraryField } from '@/components/library/client';
import type { Dictionary } from '@/i18n/dictionary';
import {
  companySizeOptions,
  timelineOptions,
  consentVersion,
  readContact,
  canTransition,
  contactStatuses,
  storedOptionLabel,
  type CompanySizeKey,
  type TimelineKey,
  type ContactDetails,
  type ContactStatus,
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
  dict: t,
}: {
  solutionId: string;
  recipientId: string;
  projectName: string;
  email: string;
  defaults: { name: string; company: string };
  dict: ContactsDict;
}) {
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
              {(Object.keys(companySizeOptions) as CompanySizeKey[]).map(key => (
                <option key={key} value={companySizeOptions[key]}>
                  {t.teamSizes[key]}
                </option>
              ))}
            </select>
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
              <ArrowRight className="size-4" aria-hidden="true" />
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
              [
                'size',
                t.fields.size,
                storedOptionLabel(details.size, companySizeOptions, t.teamSizes),
              ],
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
              <ArrowRight className="size-4" aria-hidden="true" />
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
  const [next, setNext] = useState<ContactStatus>(options[0] ?? status),
    [message, setMessage] = useState(''),
    [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
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
          if (actor === 'recipient' && message.trim().length < 10) {
            setError(t.actions.replyTooShort);
            return;
          }
          setConfirm(true);
          return;
        }
        busy.current = true;
        setPending(true);
        try {
          await sendContact(
            { action: 'update', id, status: next, version, message },
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
              onChange={event => setNext(event.target.value as ContactStatus)}
              className={libraryField}
            >
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
          <p className="text-xs leading-relaxed text-stone-500">{t.actions.emailNote}</p>
        </fieldset>
      ) : (
        <p className="text-sm text-stone-500">{t.actions.withdrawHint}</p>
      )}
      {confirm && (
        <p className="mt-5 text-sm leading-relaxed">
          {actor === 'buyer'
            ? t.actions.confirmWithdraw
            : t.actions.confirmReply.replace('{status}', t.statuses[next])}
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
export function RefreshContacts({ dict: t }: { dict: ContactsDict }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="action-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-stone-500"
    >
      <RefreshCw className="size-4" aria-hidden="true" />
      {t.refresh}
    </button>
  );
}
