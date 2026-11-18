'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { handleProblem, normalizeHandle } from '@/lib/profiles/handle';
import { profileBioMax, profileLinksMax, profileNameMax } from '@/lib/profiles/model';
import { publicLinkKinds, type PublicLink } from '@/lib/solutions/profile';
import { localizedLinkKind } from '@/lib/taxonomy';
import type { OwnProfile, ProfileItems } from '@/lib/profiles/server';
import type { Dictionary } from '@/i18n/dictionary';

type Dict = Dictionary['profiles']['settings'];
type FieldError = { field: string; message: string };
type HandleState = 'idle' | 'checking' | 'free' | 'taken';

/**
 * The «Perfil público» card (SHCWS-120). Off until the person turns it on; everything
 * typed here is public once it is. Their published listings and public lists show by
 * default and can be unticked one by one. The account's private data (email, company,
 * photo) is never used: the name is only a suggestion the person can change.
 */
export function PublicProfileForm({
  initial,
  suggestedName,
  items,
  followers,
  host,
  locale,
  dict,
}: {
  initial: OwnProfile | null;
  suggestedName: string;
  items: ProfileItems;
  followers: number | null;
  /** The site's host, to show the profile's address (shwcs.site/c/…). */
  host: string;
  locale: string;
  dict: Dict;
}) {
  const id = useId();
  const router = useRouter();
  const [version, setVersion] = useState(initial?.version ?? 0);
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState(initial?.active ?? false);
  const [handle, setHandle] = useState(
    initial?.handle ?? normalizeHandle(suggestedName).slice(0, 30),
  );
  const [displayName, setDisplayName] = useState(initial?.displayName ?? suggestedName);
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [links, setLinks] = useState<PublicLink[]>(initial?.links ?? []);
  const [hiddenSolutions, setHiddenSolutions] = useState(new Set(initial?.hiddenSolutions ?? []));
  const [hiddenLists, setHiddenLists] = useState(new Set(initial?.hiddenLists ?? []));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<FieldError | null>(null);
  const [availability, setAvailability] = useState<HandleState>('idle');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const busy = useRef(false);

  const normalized = normalizeHandle(handle);
  const problem = handleProblem(normalized);
  const field =
    'mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
  const label = 'text-sm font-medium text-stone-600';
  const help = 'mt-1.5 text-xs leading-relaxed text-stone-500';
  const errorText = 'mt-1.5 text-xs text-[#A94E35]';

  // Whether the handle is free, as the person types (their own current one always is).
  useEffect(() => {
    if (problem || normalized === saved?.handle) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/account/public-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-handle', handle: normalized }),
          signal: controller.signal,
        });
        const body = (await response.json()) as { available?: boolean };
        if (response.ok) setAvailability(body.available ? 'free' : 'taken');
        else setAvailability('idle');
      } catch {
        if (!controller.signal.aborted) setAvailability('idle');
      }
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalized, problem, saved?.handle]);

  function touched() {
    setMessage('');
    setError(null);
  }

  function toggle(set: Set<string>, update: (next: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
    touched();
  }

  const fieldMessage = (name: string) => (error?.field === name ? error.message : '');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    touched();
    if (problem) {
      setError({ field: 'handle', message: dict.handleProblems[problem] });
      return;
    }
    if (!displayName.trim()) {
      setError({ field: 'displayName', message: dict.displayNameProblems.empty });
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const response = await fetch('/api/account/public-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          handle: normalized,
          displayName,
          bio,
          links: links.filter(link => link.url.trim()),
          hiddenSolutions: [...hiddenSolutions],
          hiddenLists: [...hiddenLists],
          active,
          version,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
        problem?: string;
        version?: number;
        handle?: string;
      };
      if (!response.ok) {
        const field = body.field ?? '';
        const message =
          field === 'handle' && body.problem === 'taken'
            ? dict.handleTaken
            : field === 'handle' && body.problem && body.problem in dict.handleProblems
              ? dict.handleProblems[body.problem as keyof Dict['handleProblems']]
              : field === 'displayName' && body.problem && body.problem in dict.displayNameProblems
                ? dict.displayNameProblems[body.problem as keyof Dict['displayNameProblems']]
                : field === 'links'
                  ? dict.linksInvalid
                  : (body.error ?? dict.saveError);
        setError({ field: field || 'form', message });
        if (field === 'handle' && body.problem === 'taken') setAvailability('taken');
        return;
      }
      setVersion(Number(body.version));
      setHandle(String(body.handle));
      setSaved({
        handle: String(body.handle),
        displayName,
        bio,
        links,
        hiddenSolutions: [...hiddenSolutions],
        hiddenLists: [...hiddenLists],
        active,
        hiddenByOps: saved?.hiddenByOps ?? null,
        version: Number(body.version),
      });
      setAvailability('idle');
      setMessage(dict.saved);
      router.refresh();
    } catch {
      setError({ field: 'form', message: dict.saveError });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    touched();
    try {
      const response = await fetch('/api/account/public-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw Error(body.error ?? '');
      setSaved(null);
      setVersion(0);
      setActive(false);
      setConfirmRemove(false);
      setMessage(dict.removed);
      router.refresh();
    } catch (failure) {
      setError({
        field: 'form',
        message: (failure instanceof Error && failure.message) || dict.saveError,
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const liveUrl = saved ? `${host}/c/${saved.handle}` : '';
  const visible = !!saved?.active && !saved.hiddenByOps;

  return (
    <form noValidate onSubmit={save} aria-busy={pending} aria-label={dict.title}>
      <p className="text-sm leading-relaxed text-stone-500">{dict.intro}</p>

      {saved?.hiddenByOps && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-[#F6E5DD] px-4 py-3 text-sm leading-relaxed text-[#A94E35]"
        >
          {dict.hiddenByOps.replace('{reason}', saved.hiddenByOps.reason)}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={active}
            onChange={event => {
              setActive(event.target.checked);
              touched();
            }}
            className="mt-0.5"
            aria-describedby={`${id}-active-help`}
          />
          <span>
            <span className="block text-sm font-medium text-stone-800">{dict.active}</span>
            <span id={`${id}-active-help`} className="mt-1 block text-xs text-stone-500">
              {dict.activeHelp}
            </span>
          </span>
        </label>
        <p className="text-xs text-stone-500">
          {visible ? (
            <Link
              href={`/c/${saved!.handle}`}
              className="inline-flex items-center gap-1 font-medium text-[#365DC4] underline-offset-4 hover:underline"
            >
              {dict.on.replace('{url}', liveUrl)}
              <ArrowUpRightIcon aria-hidden="true" className="size-3" />
            </Link>
          ) : (
            dict.off
          )}
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-handle`} className={label}>
            {dict.handle}
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-[1.4rem] text-base text-stone-400"
            >
              /c/
            </span>
            <input
              id={`${id}-handle`}
              value={handle}
              onChange={event => {
                setHandle(event.target.value);
                touched();
              }}
              onBlur={() => setHandle(normalized)}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!fieldMessage('handle') || (!!handle && !!problem)}
              aria-describedby={`${id}-handle-help ${id}-handle-state`}
              className={`${field} pl-11`}
            />
          </div>
          <p id={`${id}-handle-help`} className={help}>
            {dict.handleHelp}
          </p>
          <p id={`${id}-handle-state`} aria-live="polite" className="mt-1.5 text-xs">
            {fieldMessage('handle') ? (
              <span className="text-[#A94E35]">{fieldMessage('handle')}</span>
            ) : handle && problem ? (
              <span className="text-[#A94E35]">{dict.handleProblems[problem]}</span>
            ) : availability === 'checking' ? (
              <span className="text-stone-500">{dict.handleChecking}</span>
            ) : availability === 'taken' ? (
              <span className="text-[#A94E35]">{dict.handleTaken}</span>
            ) : normalized ? (
              <span className="text-stone-500">
                {dict.handlePreview.replace('{url}', `${host}/c/${normalized}`)}
                {availability === 'free' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[#4F7A5A]">
                    <CheckIcon aria-hidden="true" className="size-3" />
                    {dict.handleFree}
                  </span>
                )}
              </span>
            ) : null}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            {dict.displayName}
          </label>
          <input
            id={`${id}-name`}
            value={displayName}
            onChange={event => {
              setDisplayName(event.target.value);
              touched();
            }}
            maxLength={profileNameMax}
            autoComplete="off"
            aria-invalid={!!fieldMessage('displayName')}
            aria-describedby={`${id}-name-help`}
            className={field}
          />
          <p id={`${id}-name-help`} className={fieldMessage('displayName') ? errorText : help}>
            {fieldMessage('displayName') || dict.displayNameHelp}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor={`${id}-bio`} className={label}>
          {dict.bio}
        </label>
        <textarea
          id={`${id}-bio`}
          value={bio}
          onChange={event => {
            setBio(event.target.value);
            touched();
          }}
          rows={4}
          maxLength={profileBioMax}
          aria-describedby={`${id}-bio-help`}
          className={field}
        />
        <p id={`${id}-bio-help`} className={help}>
          {dict.bioHelp} {bio.length}/{profileBioMax}
        </p>
      </div>

      <fieldset className="mt-6">
        <legend className={label}>{dict.links}</legend>
        <p className={help}>{dict.linksHelp}</p>
        <ul className="mt-3 space-y-3">
          {links.map((link, index) => (
            <li key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="text-xs text-stone-500 sm:w-48">
                {dict.linkKind}
                <select
                  value={link.label}
                  onChange={event => {
                    const value = event.target.value as PublicLink['label'];
                    setLinks(previous =>
                      previous.map((item, i) => (i === index ? { ...item, label: value } : item)),
                    );
                    touched();
                  }}
                  className={field}
                >
                  {publicLinkKinds.map(kind => (
                    <option key={kind} value={kind}>
                      {localizedLinkKind(kind, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 text-xs text-stone-500">
                {dict.linkUrl}
                <input
                  type="url"
                  inputMode="url"
                  value={link.url}
                  placeholder="https://"
                  onChange={event => {
                    const value = event.target.value;
                    setLinks(previous =>
                      previous.map((item, i) => (i === index ? { ...item, url: value } : item)),
                    );
                    touched();
                  }}
                  maxLength={500}
                  aria-invalid={error?.field === 'links'}
                  className={field}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setLinks(previous => previous.filter((_, i) => i !== index));
                  touched();
                }}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#A94E35]"
              >
                <TrashIcon aria-hidden="true" className="size-4" />
                <span className="sr-only">{dict.removeLink}</span>
              </button>
            </li>
          ))}
        </ul>
        {fieldMessage('links') && <p className={errorText}>{fieldMessage('links')}</p>}
        {links.length < profileLinksMax && (
          <button
            type="button"
            onClick={() => {
              setLinks(previous => [...previous, { label: 'LinkedIn', url: '' }]);
              touched();
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-white"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {dict.addLink}
          </button>
        )}
      </fieldset>

      <fieldset className="mt-8 border-t border-stone-200 pt-6">
        <legend className="text-base font-medium text-stone-900">{dict.showsTitle}</legend>
        <p className={help}>{dict.showsHelp}</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-stone-600">{dict.projects}</p>
            {items.solutions.length ? (
              <ul className="mt-2 space-y-2">
                {items.solutions.map(solution => (
                  <li key={solution.id}>
                    <label className="flex items-start gap-3 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={!hiddenSolutions.has(solution.id)}
                        onChange={() => toggle(hiddenSolutions, setHiddenSolutions, solution.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 break-words">{solution.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone-500">{dict.noProjects}</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-stone-600">{dict.lists}</p>
            {items.lists.length ? (
              <ul className="mt-2 space-y-2">
                {items.lists.map(list => (
                  <li key={list.id}>
                    <label className="flex items-start gap-3 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={!hiddenLists.has(list.id)}
                        onChange={() => toggle(hiddenLists, setHiddenLists, list.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 break-words">
                        {list.name}
                        <span className="block text-xs text-stone-500">
                          {dict.signedAs.replace('{name}', list.curator)}
                          {!list.visible && <> · {dict.listNotVisible}</>}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone-500">{dict.noLists}</p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          style={actionButtonStyle}
          className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending ? dict.saving : dict.save}
          <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
        </button>
        {message && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-stone-600">
            <CheckIcon aria-hidden="true" className="size-4" />
            {message}
          </p>
        )}
      </div>
      {error?.field === 'form' && error.message && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error.message}
        </p>
      )}
      {error && error.field !== 'form' && (
        <p role="alert" className="sr-only">
          {error.message}
        </p>
      )}

      {saved && (
        <div className="mt-8 border-t border-stone-200 pt-6">
          {followers !== null && (
            <p className="text-sm text-stone-600">
              {followers === 0
                ? dict.followersNone
                : followers === 1
                  ? dict.followersOne
                  : dict.followersMany.replace('{count}', String(followers))}{' '}
              <span className="text-xs text-stone-400">{dict.followersNote}</span>
            </p>
          )}
          {confirmRemove ? (
            <div className="mt-4 rounded-xl border border-[#E8C4B5] px-4 py-4">
              <p className="text-sm text-stone-700">{dict.removeConfirm}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="rounded-full bg-[#A94E35] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {pending ? dict.removing : dict.removeSubmit}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
                >
                  {dict.removeCancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="mt-4 rounded-full px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#A94E35]"
            >
              {dict.remove}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
