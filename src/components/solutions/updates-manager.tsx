'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { MegaphoneIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import {
  solutionUpdateKinds,
  type SolutionUpdate,
  type SolutionUpdateKind,
} from '@/lib/solutions/updates-model';
import type { Dictionary } from '@/i18n/dictionary';

const field =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';

/**
 * The founder's side of SHCWS-24: post a short dated update on the published listing,
 * see how many follow it (a number, never who) and remove an update of theirs.
 */
export function UpdatesManager({
  solutionId,
  published,
  updates,
  followers,
  remaining,
  limit,
  locale,
  dict,
}: {
  solutionId: string;
  published: boolean;
  updates: SolutionUpdate[];
  followers: number;
  remaining: number;
  limit: number;
  locale: string;
  dict: Dictionary['follows']['updates'];
}) {
  const t = dict.owner;
  const router = useRouter();
  const lock = useRef(false),
    postId = useRef<string | null>(null);
  const [kind, setKind] = useState<SolutionUpdateKind>('feature'),
    [body, setBody] = useState(''),
    [link, setLink] = useState(''),
    [pending, setPending] = useState(''),
    [error, setError] = useState(''),
    [confirming, setConfirming] = useState<string | null>(null);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  async function send(payload: Record<string, unknown>, busy: string) {
    if (lock.current) return false;
    lock.current = true;
    setPending(busy);
    setError('');
    try {
      const response = await fetch(`/api/solutions/${solutionId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw Error(result.error ?? '');
      router.refresh();
      return true;
    } catch (failure) {
      setError((failure instanceof Error && failure.message) || t.error);
      return false;
    } finally {
      lock.current = false;
      setPending('');
    }
  }

  const followerLine =
    followers === 0
      ? t.followersNone
      : followers === 1
        ? t.followersOne
        : t.followersMany.replace('{count}', String(followers));
  const remainingLine =
    remaining === 0
      ? t.remainingNone.replace('{count}', String(limit))
      : remaining === 1
        ? t.remainingOne
        : t.remainingMany.replace('{count}', String(remaining));

  return (
    <section
      aria-labelledby="updates-manager-title"
      className="rounded-2xl border border-stone-200 bg-white p-6"
    >
      <h2 id="updates-manager-title" className="flex items-center gap-2 font-medium text-stone-900">
        <MegaphoneIcon aria-hidden="true" className="size-5 text-[#365DC4]" />
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{t.body}</p>
      <p className="mt-3 text-sm text-stone-700">
        {followerLine} <span className="text-stone-400">{t.followersNote}</span>
      </p>

      {!published ? (
        <p className="mt-5 text-sm text-stone-500">{t.unpublished}</p>
      ) : (
        <form
          className="mt-5 space-y-4"
          noValidate
          onSubmit={async event => {
            event.preventDefault();
            const text = body.trim();
            if (text.length < 10 || text.length > 500) {
              setError(t.textInvalid);
              return;
            }
            if (link.trim() && !/^https?:\/\/\S+\.\S+/i.test(link.trim())) {
              setError(t.linkInvalid);
              return;
            }
            // One id per attempt: a retry after a timeout is the same update, never two.
            postId.current ??= crypto.randomUUID();
            if (
              await send({ action: 'post', id: postId.current, kind, body: text, link }, 'post')
            ) {
              postId.current = null;
              setBody('');
              setLink('');
            }
          }}
        >
          <fieldset>
            <legend className="text-sm font-medium text-stone-700">{t.kind}</legend>
            <div className="selector-tabs mt-2">
              {solutionUpdateKinds.map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                  className="selector-tab"
                >
                  {dict.kinds[value]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-stone-700">
            {t.text}
            <textarea
              value={body}
              onChange={event => {
                setBody(event.target.value);
                setError('');
              }}
              maxLength={500}
              rows={3}
              aria-describedby="update-text-help"
              className={`mt-2 ${field}`}
            />
            <span id="update-text-help" className="mt-1 block text-xs font-normal text-stone-400">
              {t.textHelp} {body.trim().length}/500
            </span>
          </label>
          <label className="block text-sm font-medium text-stone-700">
            {t.linkLabel}
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={event => {
                setLink(event.target.value);
                setError('');
              }}
              maxLength={500}
              placeholder="https://"
              aria-describedby="update-link-help"
              className={`mt-2 ${field}`}
            />
            <span id="update-link-help" className="mt-1 block text-xs font-normal text-stone-400">
              {t.linkHelp}
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-[#A94E35]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={!!pending || remaining === 0}
              style={actionButtonStyle}
              className="action-button inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {pending === 'post' ? t.submitting : t.submit}
            </button>
            <span className="text-xs text-stone-500">{remainingLine}</span>
          </div>
        </form>
      )}

      {updates.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-stone-700">{t.history}</h3>
          <ul className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
            {updates.map(update => (
              <li key={update.id} className="py-4">
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-stone-500">
                  <span className="font-medium text-stone-700">{dict.kinds[update.kind]}</span>
                  <time dateTime={update.createdAt}>{date(update.createdAt)}</time>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-stone-800">{update.body}</p>
                {update.hiddenReason && (
                  <p className="mt-2 text-xs text-[#A94E35]">
                    {t.hidden.replace('{reason}', update.hiddenReason)}
                  </p>
                )}
                {confirming === update.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-stone-600">{t.removeConfirm}</span>
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={async () => {
                        if (await send({ action: 'delete', updateId: update.id }, update.id))
                          setConfirming(null);
                      }}
                      className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {pending === update.id ? t.removing : t.remove}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-xs text-stone-500 underline underline-offset-4"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(update.id)}
                    className="mt-2 text-xs text-stone-500 underline-offset-4 hover:text-[#A94E35] hover:underline"
                  >
                    {t.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
