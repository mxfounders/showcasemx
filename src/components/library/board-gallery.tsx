'use client';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useState } from 'react';
import { FilterLinesIcon, FolderPlusIcon, PlusIcon } from '@/components/icons/gota';
import type { BuyerBoard } from '@/lib/library/model';
import { normalizeText } from '@/lib/search/normalize';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { BoardCard } from './board-card';
export { BoardCard } from './board-card';
import { LibraryDialog } from './library-dialog';
import { ListForm } from './list-form';
import { LibraryEmpty } from './library-empty';
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
          <PlusIcon className={tile ? 'size-7' : 'size-4'} />
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
  if (!boards.length)
    return (
      <LibraryEmpty icon={<FolderPlusIcon />} title={t.emptyTitle} text={t.emptyText}>
        <CreateBoard dict={libraryDict} locale={locale} />
      </LibraryEmpty>
    );
  // Visibility tabs only split something when both kinds exist, and a search box is
  // worth it from six lists on; below that the toolbar would be empty furniture.
  const publicCount = boards.filter(board => board.visibility === 'public').length;
  const showTabs = publicCount > 0 && publicCount < boards.length;
  const showSearch = boards.length >= 6 || !!query;
  const filtered = !!query || visibility !== 'all';
  function reset() {
    setQuery('');
    setVisibility('all');
  }
  return (
    <>
      {(showTabs || showSearch) && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {showTabs && (
            <nav aria-label={t.visibilityLabel} className="selector-tabs">
              {filters.map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={visibility === filter.value}
                  onClick={() => setVisibility(filter.value)}
                  className="selector-tab"
                >
                  {filter.label}
                </button>
              ))}
            </nav>
          )}
          {showSearch && (
            <ExpandingSearch
              clearLabel={commonText(locale).clearSearch}
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={setQuery}
            />
          )}
        </div>
      )}
      <p role="status" className="sr-only">
        {filtered &&
          (boards.length === 1 ? t.countSingular : t.countPlural)
            .replace('{visible}', String(visible.length))
            .replace('{total}', String(boards.length))}
      </p>
      {visible.length ? (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(board => (
            <BoardCard key={board.id} board={board} dict={dict} />
          ))}
          {!filtered && <CreateBoard tile dict={libraryDict} locale={locale} />}
        </div>
      ) : (
        <LibraryEmpty icon={<FilterLinesIcon />} title={t.emptyFiltered}>
          <button
            type="button"
            onClick={reset}
            style={actionButtonStyle}
            className="action-button rounded-full px-5 py-3 text-sm font-medium"
          >
            {t.reset}
          </button>
        </LibraryEmpty>
      )}
    </>
  );
}
