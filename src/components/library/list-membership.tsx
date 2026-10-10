'use client';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { Plus, Check, FolderOpen } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { BuyerList, BuyerProject, ListItem } from '@/lib/library/model';
import { changeLibrary, libraryButton, libraryField, libraryError } from './client';
import { LibraryDialog } from './library-dialog';
import { ListForm } from './list-form';
import { ProjectCover } from './project-cover';
import type { Dictionary } from '@/i18n/dictionary';
import { commonText } from '@/i18n/common';
export function ListMembership(props: {
  projectKey: string;
  lists: BuyerList[];
  memberships: string[];
  dict: Dictionary['library'];
  locale: string;
}) {
  return (
    <LibraryDialog
      title={props.dict.membership.title}
      closeLabel={props.dict.dialog.close}
      triggerClass="action-button inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-3 text-sm text-stone-600"
      trigger={
        <>
          <FolderOpen className="size-4" />
          {props.dict.membership.trigger}
          {props.memberships.length ? ` · ${props.memberships.length}` : ''}
        </>
      }
    >
      {close => <BoardPicker {...props} close={close} />}
    </LibraryDialog>
  );
}
function BoardPicker({
  projectKey,
  lists,
  memberships,
  close,
  dict,
  locale,
}: {
  projectKey: string;
  lists: BuyerList[];
  memberships: string[];
  close: () => void;
  dict: Dictionary['library'];
  locale: string;
}) {
  const t = dict.membership;
  const [query, setQuery] = useState(''),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<string | null>(null);
  const busy = useRef(false),
    router = useRouter();
  async function add(listId: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(listId);
    setError('');
    try {
      await changeLibrary({ action: 'add-to-list', projectKey, listId }, dict.errors);
      router.refresh();
      close();
    } catch (error) {
      setError(libraryError(error, dict.errors.unconfirmed));
    } finally {
      busy.current = false;
      setPending(null);
    }
  }
  if (creating)
    return (
      <>
        <button
          type="button"
          className="mb-6 text-sm text-stone-500"
          onClick={() => setCreating(false)}
        >
          {t.back}
        </button>
        <ListForm
          dict={dict}
          locale={locale}
          onCreated={async id => {
            try {
              await changeLibrary({ action: 'add-to-list', projectKey, listId: id }, dict.errors);
              router.refresh();
              close();
            } catch {
              router.refresh();
              throw new Error(t.partialFailure);
            }
          }}
        />
      </>
    );
  const visible = lists.filter(list =>
    list.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <ExpandingSearch
        clearLabel={commonText(locale).clearSearch}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        value={query}
        onChange={setQuery}
        className="mb-5"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {visible.map(list => {
          const included = memberships.includes(list.id);
          return (
            <button
              key={list.id}
              type="button"
              disabled={!!pending || included}
              onClick={() => void add(list.id)}
              className="group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-stone-200/50 disabled:cursor-default"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#EEE5F5] text-[#7E54B1]">
                <FolderOpen className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{list.name}</span>
                <span className="text-xs text-stone-400">
                  {(list.count === 1 ? t.projectSingular : t.projectPlural).replace(
                    '{count}',
                    String(list.count),
                  )}
                </span>
              </span>
              {included ? (
                <>
                  <Check className="size-4 text-[#416B50]" />
                  <span className="sr-only">{t.alreadySaved}</span>
                </>
              ) : (
                <span className="text-xs text-[#365DC4]">
                  {pending === list.id ? t.saving : t.save}
                </span>
              )}
            </button>
          );
        })}
        {!visible.length && (
          <p className="py-6 text-center text-sm text-stone-500">
            {lists.length ? t.noMatches : t.empty}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={!!pending}
        onClick={() => setCreating(true)}
        style={actionButtonStyle}
        className={`${libraryButton} mt-6 w-full`}
      >
        <Plus className="size-4" />
        {t.createList}
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </>
  );
}
export function AddSavedToList({
  listId,
  projects,
  dict,
  locale,
}: {
  listId: string;
  projects: BuyerProject[];
  dict: Dictionary['library'];
  locale: string;
}) {
  return (
    <LibraryDialog
      title={dict.addSaved.title}
      closeLabel={dict.dialog.close}
      triggerClass={libraryButton}
      triggerStyle={actionButtonStyle}
      trigger={
        <>
          <Plus className="size-4" />
          {dict.addSaved.trigger}
        </>
      }
    >
      {() => <SavedPicker listId={listId} projects={projects} dict={dict} locale={locale} />}
    </LibraryDialog>
  );
}
function SavedPicker({
  listId,
  projects,
  dict,
  locale,
}: {
  listId: string;
  projects: BuyerProject[];
  dict: Dictionary['library'];
  locale: string;
}) {
  const t = dict.addSaved;
  const [choices] = useState(projects);
  const [query, setQuery] = useState(''),
    [added, setAdded] = useState<string[]>([]),
    [pending, setPending] = useState<string | null>(null),
    [error, setError] = useState('');
  const busy = useRef(false),
    router = useRouter();
  const visible = choices.filter(project =>
    project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <ExpandingSearch
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        clearLabel={commonText(locale).clearSearch}
        value={query}
        onChange={setQuery}
        className="mb-5"
      />
      <div className="grid grid-cols-2 gap-4">
        {visible.map(project => (
          <button
            key={project.key}
            type="button"
            disabled={!!pending || added.includes(project.key)}
            onClick={async () => {
              if (busy.current) return;
              busy.current = true;
              setPending(project.key);
              setError('');
              try {
                await changeLibrary(
                  { action: 'add-to-list', listId, projectKey: project.key },
                  dict.errors,
                );
                setAdded(values => [...values, project.key]);
                router.refresh();
              } catch (error) {
                setError(libraryError(error, dict.errors.unconfirmed));
              } finally {
                busy.current = false;
                setPending(null);
              }
            }}
            className="group min-w-0 text-left"
          >
            <span className="block aspect-[4/3] overflow-hidden rounded-2xl">
              <ProjectCover name={project.name} image={project.image} />
            </span>
            <span className="mt-2 block truncate text-sm font-medium">{project.name}</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-[#365DC4]">
              {added.includes(project.key) ? (
                <>
                  <Check className="size-3" />
                  {t.added}
                </>
              ) : pending === project.key ? (
                t.adding
              ) : (
                t.add
              )}
            </span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="py-5 text-sm text-stone-500">{query ? t.noMatches : t.empty}</p>
      )}
      <p role="status" className="sr-only">
        {added.length
          ? (added.length === 1 ? t.addedSingular : t.addedPlural).replace(
              '{count}',
              String(added.length),
            )
          : ''}
      </p>
      <Link href="/#catalogo" className="mt-6 inline-block text-sm text-[#365DC4]">
        {t.explore}
      </Link>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </>
  );
}
export function ListItemNotes({ item, dict }: { item: ListItem; dict: Dictionary['library'] }) {
  const t = dict.notes;
  const [note, setNote] = useState(item.note),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [confirm, setConfirm] = useState(false);
  const busy = useRef(false);
  const router = useRouter();
  async function submit(action: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      await changeLibrary(
        {
          action,
          listId: item.list_id,
          projectKey: item.project_key,
          note,
          version: item.version,
        },
        dict.errors,
      );
      setMessage(t.saved);
      router.refresh();
    } catch (error) {
      setError(libraryError(error, dict.errors.unconfirmed));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="mt-5">
      <form
        noValidate
        onSubmit={event => {
          event.preventDefault();
          void submit('update-note');
        }}
      >
        <label className="block text-xs text-stone-500">
          {t.label}
          <textarea
            value={note}
            onChange={event => {
              setNote(event.target.value);
              setMessage('');
            }}
            maxLength={2000}
            rows={2}
            disabled={pending}
            className={libraryField}
            placeholder={t.placeholder}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            disabled={pending || note === item.note}
            type="submit"
            style={actionButtonStyle}
            className={libraryButton}
          >
            {t.save}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirm(true)}
            className="text-xs text-stone-500 underline underline-offset-4"
          >
            {t.remove}
          </button>
        </div>
      </form>
      {confirm && (
        <div className="mt-4 text-sm text-stone-500">
          <p>{t.removeWarning}</p>
          <div className="mt-3 flex gap-4">
            <button
              disabled={pending}
              onClick={() => void submit('remove-from-list')}
              className="text-[#A94E35]"
            >
              {t.removeConfirm}
            </button>
            <button disabled={pending} onClick={() => setConfirm(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-xs text-stone-500">
          {message}
        </p>
      )}
    </div>
  );
}
