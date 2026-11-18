'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import { solutionInput as input } from '@/components/solutions/profile-editor';
import { libraryError } from '@/components/library/client';
import { comparisonHref } from '@/lib/library/comparison';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * «Guardar como lista» on a temporary comparison (SHCWS-53): one request creates a
 * private list with these listings, saved and added in a single transaction. The list
 * id is generated once, so a retry after a timeout never makes a second list.
 */
export function SaveComparison({
  keys,
  names,
  signedIn,
  dict,
  errors,
}: {
  keys: string[];
  names: string[];
  signedIn: boolean;
  dict: Dictionary['library']['tempCompare'];
  errors: Dictionary['library']['errors'];
}) {
  const [name, setName] = useState(() =>
    dict.defaultName.replace('{names}', names.join(', ')).slice(0, 100),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const id = useRef<string | null>(null);

  if (!signedIn)
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(comparisonHref(keys))}`}
        className="inline-flex text-sm font-medium text-[#365DC4]"
      >
        {dict.signInToSave}
      </Link>
    );
  if (saved)
    return (
      <p role="status" className="text-sm text-stone-700">
        {dict.saved.replace('{name}', saved.name)}{' '}
        <Link href={`/account/lists/${saved.id}`} className="font-medium text-[#365DC4]">
          {dict.openList}
        </Link>
      </p>
    );
  return (
    <form
      noValidate
      className="max-w-xl"
      onSubmit={async event => {
        event.preventDefault();
        if (pending) return;
        const trimmed = name.trim();
        if (!trimmed) {
          setError(errors.invalidListDetails);
          return;
        }
        setPending(true);
        setError('');
        id.current ??= crypto.randomUUID();
        try {
          const response = await fetch('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-comparison',
              id: id.current,
              name: trimmed,
              projectKeys: keys,
            }),
            signal: AbortSignal.timeout(15000),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error);
          setSaved({ id: id.current, name: trimmed });
        } catch (failure) {
          setError(libraryError(failure, errors.unconfirmed));
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor="comparison-list-name" className="block text-sm font-medium text-stone-800">
        {dict.nameLabel}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="comparison-list-name"
          value={name}
          maxLength={100}
          onChange={event => setName(event.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'comparison-save-error' : undefined}
          className={`${input} mt-0 flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          style={actionButtonStyle}
          className="action-button shrink-0 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending ? dict.saving : dict.save}
        </button>
      </div>
      {error && (
        <p id="comparison-save-error" role="alert" className="mt-2 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
