'use client';
import { useId, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { messageMaxLength, type ThreadItem } from '@/lib/contacts/thread';
import type { ContactStatus } from '@/lib/contacts/model';
import type { Dictionary } from '@/i18n/dictionary';
import { LocalTime } from './local-time';

const when = { dateStyle: 'medium', timeStyle: 'short' } as const;

function relative(iso: string, locale: string) {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  const format = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'es', { numeric: 'auto' });
  // Under a minute reads «ahora» / «now» rather than «este minuto».
  if (Math.abs(minutes) < 1) return format.format(0, 'second');
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  if (Math.abs(minutes) < 60 * 24) return format.format(Math.round(minutes / 60), 'hour');
  return format.format(Math.round(minutes / 1440), 'day');
}

/**
 * The conversation of a contact request (SHCWS-168): whose turn it is, the messages of
 * both sides oldest first (the buyer's need opens it), status changes as system lines,
 * and a box to write while it is open. Sending refreshes the page from the server; there
 * is no live channel, so a reply from the other side shows on the next load.
 */
export function ContactThread({
  requestId,
  role,
  status,
  items,
  opening,
  counterpart,
  turn,
  since,
  locale,
  dict,
}: {
  requestId: string;
  role: 'buyer' | 'recipient';
  status: ContactStatus;
  items: ThreadItem[];
  /** The buyer's need, shown as the first message of the conversation. */
  opening: { text: string; at: string };
  /** Who the viewer is talking to: the project for a buyer, the buyer for a founder. */
  counterpart: string;
  turn: 'mine' | 'theirs' | 'none';
  since: string | null;
  locale: string;
  dict: Dictionary['contactThread'];
}) {
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const open = status === 'new' || status === 'conversation';
  const name = (mine: boolean) => (mine ? dict.you : counterpart);

  async function send() {
    const message = text.trim();
    if (busy.current) return;
    if (!message || message.length > messageMaxLength) {
      setError(dict.errors.invalid);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    setSent(false);
    try {
      const response = await fetch(`/api/contacts/${requestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(15000),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || dict.errors.failed);
      setText('');
      setSent(true);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name === 'Error' && failure.message
          ? failure.message
          : dict.errors.failed,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const bubble = (key: string, mine: boolean, body: string, at: string) => (
    <li key={key} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <p className={`mb-1 text-xs text-stone-400 ${mine ? 'text-right' : ''}`}>
          <span className="font-medium text-stone-600">{name(mine)}</span> ·{' '}
          <LocalTime value={at} locale={locale} options={when} />
        </p>
        <p
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine ? 'rounded-br-md bg-[#E4EBFC] text-stone-900' : 'rounded-bl-md border border-stone-200 bg-white text-stone-800'}`}
        >
          {body}
        </p>
      </div>
    </li>
  );

  return (
    <section aria-labelledby={`${ids}-title`} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${ids}-title`} className="text-lg font-semibold tracking-tight">
          {dict.title}
        </h2>
        {turn === 'mine' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#365DC4] px-3 py-1.5 text-xs font-medium text-white">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />
            {dict.turnMine}
          </span>
        )}
        {turn === 'theirs' && since && (
          <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">
            {dict.turnTheirs
              .replace('{name}', counterpart)
              .replace('{since}', relative(since, locale))}
          </span>
        )}
      </div>
      <ol aria-label={dict.title} className="space-y-4">
        {bubble('opening', role === 'buyer', opening.text, opening.at)}
        {items.map(item =>
          item.type === 'message' ? (
            bubble(item.id, item.mine, item.text, item.at)
          ) : (
            <li key={item.id} className="flex items-center gap-3 text-xs text-stone-400">
              <span aria-hidden="true" className="h-px flex-1 bg-stone-200" />
              <span>
                {item.mine
                  ? dict.changesMine[item.change]
                  : dict.changes[item.change].replace('{name}', counterpart)}{' '}
                · <LocalTime value={item.at} locale={locale} options={when} />
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-stone-200" />
            </li>
          ),
        )}
      </ol>
      {open ? (
        <form
          onSubmit={event => {
            event.preventDefault();
            void send();
          }}
          className="rounded-2xl border border-stone-200 bg-white p-3 focus-within:border-[#365DC4] focus-within:ring-1 focus-within:ring-[#365DC4]"
        >
          <label htmlFor={`${ids}-message`} className="sr-only">
            {dict.composerLabel}
          </label>
          <textarea
            id={`${ids}-message`}
            value={text}
            maxLength={messageMaxLength}
            rows={3}
            disabled={pending}
            placeholder={role === 'buyer' ? dict.placeholderBuyer : dict.placeholderRecipient}
            onChange={event => {
              setText(event.target.value);
              setError('');
              setSent(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
            className="w-full resize-y bg-transparent px-2 py-1 text-sm leading-relaxed outline-none placeholder:text-stone-400"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-xs text-stone-400">{dict.hint}</span>
            <button
              type="submit"
              disabled={pending || !text.trim()}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {pending ? dict.sending : dict.send}
              <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          {status === 'withdrawn'
            ? dict.withdrawn
            : role === 'recipient'
              ? dict.closed
              : dict.closedBuyer}
        </p>
      )}
      <p role="status" aria-live="polite" className="text-xs">
        {error ? (
          <span className="text-[#A94E35]">{error}</span>
        ) : sent ? (
          <span className="text-stone-500">{dict.sent}</span>
        ) : null}
      </p>
    </section>
  );
}
