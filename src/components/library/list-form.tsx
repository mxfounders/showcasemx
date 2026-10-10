'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Plus, Check, Globe, LockKeyhole } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { solutionCategories } from '@/lib/solutions/model';
import { brandColors, solutionCategoryTones } from '@/lib/brand-colors';
import { listDetails, listPublicationDetails, type BuyerList } from '@/lib/library/model';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';
import { changeLibrary, libraryButton, libraryField, libraryError } from './client';
export function ListForm({
  list,
  onCreated,
  dict,
  locale,
}: {
  list?: BuyerList;
  onCreated?: (id: string) => Promise<void> | void;
  dict: Dictionary['library'];
  locale: string;
}) {
  const t = dict.form;
  const [visibility, setVisibility] = useState<'private' | 'public'>(list?.visibility ?? 'private');
  const [categories, setCategories] = useState<string[]>(list?.categories ?? []);
  const [publicDescription, setPublicDescription] = useState(list?.public_description ?? '');
  const [curatorName, setCuratorName] = useState(list?.curator_name ?? '');
  const [publishConfirmed, setPublishConfirmed] = useState(list?.visibility === 'public');
  const [name, setName] = useState(list?.name ?? '');
  const [purpose, setPurpose] = useState(list?.purpose ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const id = useRef<string | null>(null),
    busy = useRef(false);
  const router = useRouter();
  return (
    <form
      noValidate
      aria-label={list ? t.editLabel : t.createLabel}
      aria-busy={pending}
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        setError('');
        setMessage('');
        const details = listDetails({ name, purpose });
        const publication = listPublicationDetails({
          visibility,
          categories,
          publicDescription,
          curatorName,
          publishConfirmed,
        });
        if (!details || !publication) {
          setError(t.invalid);
          return;
        }
        busy.current = true;
        setPending(true);
        id.current ??= crypto.randomUUID();
        try {
          const result = await changeLibrary(
            {
              ...details,
              ...publication,
              publishConfirmed,
              action: list ? 'update-list' : 'create-list',
              ...(list ? { listId: list.id, version: list.version } : { id: id.current }),
            },
            dict.errors,
          );
          if (list) {
            setMessage(t.updated);
            router.refresh();
          } else if (result.id) {
            if (onCreated) await onCreated(result.id);
            else router.push(`/account/lists/${result.id}`);
          }
        } catch (error) {
          setError(libraryError(error, dict.errors.unconfirmed));
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending} className="space-y-5">
        <label className="block text-sm">
          {t.name}
          <input
            autoFocus={!list}
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={100}
            className={libraryField}
            placeholder={t.namePlaceholder}
          />
        </label>
        <label className="block text-sm">
          {t.purpose} <span className="text-stone-400">{t.optional}</span>
          <textarea
            value={purpose}
            onChange={event => setPurpose(event.target.value)}
            maxLength={400}
            rows={2}
            className={libraryField}
            placeholder={t.purposePlaceholder}
          />
        </label>
        <fieldset>
          <legend className="mb-3 text-sm">{t.visibility}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['private', 'public'] as const).map(value => {
              const active = visibility === value,
                Icon = value === 'private' ? LockKeyhole : Globe;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-sm transition-colors ${active ? 'border-[#365DC4] bg-[#E4EBFC]/50 text-[#365DC4]' : 'border-stone-200 hover:border-stone-400'}`}
                >
                  <input
                    className="sr-only peer"
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={active}
                    onChange={() => {
                      setVisibility(value);
                      setPublishConfirmed(false);
                    }}
                  />
                  <Icon
                    className="size-5 peer-focus-visible:outline peer-focus-visible:outline-2"
                    aria-hidden="true"
                  />
                  {value === 'private' ? t.private : t.public}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            {visibility === 'private' ? t.privateHint : t.publicHint}
          </p>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm">
            {t.categories}{' '}
            <span className="text-stone-400">
              {visibility === 'private' ? t.optional : t.categoriesRequired}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {solutionCategories.map(category => {
              const active = categories.includes(category),
                tone = brandColors[solutionCategoryTones[category]];
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setCategories(
                      active
                        ? categories.filter(item => item !== category)
                        : [...categories, category],
                    )
                  }
                  style={active ? { backgroundColor: tone.soft, color: tone.solid } : undefined}
                  className={`rounded-full border px-3 py-2 text-xs transition-colors ${active ? 'border-transparent' : 'border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                >
                  {active && <Check className="mr-1 inline size-3" aria-hidden="true" />}
                  {localizedCategoryDisplayLabel(category, locale)}
                </button>
              );
            })}
          </div>
        </fieldset>
        {visibility === 'public' && (
          <div className="space-y-5 border-t border-stone-200 pt-5">
            <label className="block text-sm">
              {t.publicDescription} <span className="text-stone-400">{t.optional}</span>
              <textarea
                value={publicDescription}
                onChange={event => setPublicDescription(event.target.value)}
                maxLength={400}
                rows={2}
                className={libraryField}
                placeholder={t.publicDescriptionPlaceholder}
              />
            </label>
            <label className="block text-sm">
              {t.curator}
              <input
                value={curatorName}
                onChange={event => setCuratorName(event.target.value)}
                maxLength={60}
                className={libraryField}
                placeholder={t.curatorPlaceholder}
              />
            </label>
            <label className="flex items-start gap-3 text-xs leading-relaxed text-stone-500">
              <input
                type="checkbox"
                checked={publishConfirmed}
                onChange={event => setPublishConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[#365DC4]"
              />
              {t.publishConfirm}
            </label>
          </div>
        )}
        <button style={actionButtonStyle} className={libraryButton} type="submit">
          {list ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {pending ? t.saving : list ? t.saveChanges : t.create}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-stone-500">
          {message}
        </p>
      )}
    </form>
  );
}
export function DeleteList({ id, dict }: { id: string; dict: Dictionary['library'] }) {
  const t = dict.deleteList;
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false);
  const router = useRouter();
  return (
    <div>
      {confirm ? (
        <div className="space-y-3 text-sm">
          <p className="text-stone-500">{t.warning}</p>
          <div className="flex gap-4">
            <button
              disabled={pending}
              className="text-[#A94E35] underline underline-offset-4"
              onClick={async () => {
                if (busy.current) return;
                busy.current = true;
                setPending(true);
                setError('');
                try {
                  await changeLibrary({ action: 'delete-list', listId: id }, dict.errors);
                  router.push('/account/lists');
                  router.refresh();
                } catch (error) {
                  setError(libraryError(error, dict.errors.unconfirmed));
                } finally {
                  busy.current = false;
                  setPending(false);
                }
              }}
            >
              {t.confirm}
            </button>
            <button disabled={pending} onClick={() => setConfirm(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="text-sm text-stone-500 underline underline-offset-4"
        >
          {t.trigger}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
