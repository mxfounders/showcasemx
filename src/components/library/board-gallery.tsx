'use client';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BuyerBoard } from '@/lib/library/model';
import { normalizeText } from '@/lib/search/normalize';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { BoardCard } from './board-card';
export { BoardCard } from './board-card';
import { LibraryDialog } from './library-dialog';
import { ListForm } from './list-form';
import { commonText } from '@/i18n/common';
export function CreateBoard({
  tile = false,
  dict,
  locale,
}: {
  tile?: boolean;
  dict: Dictionary['library'];
  locale: string;
}) {
  return (
    <LibraryDialog
      title={dict.boards.createTitle}
      closeLabel={dict.dialog.close}
      triggerClass={
        tile
          ? 'group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-stone-300 text-sm text-stone-500 transition-colors hover:border-[#365DC4] hover:bg-[#E4EBFC]/40 hover:text-[#365DC4]'
          : 'action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium'
      }
      triggerStyle={tile ? undefined : actionButtonStyle}
      trigger={
        <>
          <Plus className={tile ? 'size-7' : 'size-4'} />
          {dict.boards.create}
        </>
      }
    >
      {() => <ListForm dict={dict} locale={locale} />}
    </LibraryDialog>
  );
}
export function BoardGallery({
  boards,
  dict,
  libraryDict,
  locale,
}: {
  boards: BuyerBoard[];
  dict: Dictionary['community'];
  libraryDict: Dictionary['library'];
  locale: string;
}) {
  const t = libraryDict.boards;
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const needle = normalizeText(query);
  const visible = boards.filter(
    board =>
      normalizeText(board.name).includes(needle) &&
      (visibility === 'all' || (board.visibility ?? 'private') === visibility),
  );
  const filters = [
    { value: 'all', label: t.all },
    { value: 'private', label: t.private },
    { value: 'public', label: t.public },
  ] as const;
  return (
    <>
      <div className="mb-9 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label={t.visibilityLabel} className="selector-tabs">
            {filters.map(filter => {
              const active = visibility === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVisibility(filter.value)}
                  className="selector-tab"
                >
                  {filter.label}
                </button>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ExpandingSearch
              clearLabel={commonText(locale).clearSearch}
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={setQuery}
            />
            <CreateBoard dict={libraryDict} locale={locale} />
          </div>
        </div>
        <p role="status" className="mt-4 text-xs text-stone-500">
          {(boards.length === 1 ? t.countSingular : t.countPlural)
            .replace('{visible}', String(visible.length))
            .replace('{total}', String(boards.length))}
        </p>
      </div>
      {visible.length ? (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(board => (
            <BoardCard key={board.id} board={board} dict={dict} />
          ))}
          {!query && visibility === 'all' && (
            <CreateBoard tile dict={libraryDict} locale={locale} />
          )}
        </div>
      ) : (
        <div className="border-y border-stone-200 py-14">
          <h2 className="text-xl font-medium">{t.emptyFiltered}</h2>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setVisibility('all');
            }}
            style={actionButtonStyle}
            className="action-button mt-5 rounded-full px-5 py-3 text-sm"
          >
            {t.reset}
          </button>
        </div>
      )}
    </>
  );
}
