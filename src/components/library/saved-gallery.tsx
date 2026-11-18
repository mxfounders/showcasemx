'use client';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useState } from 'react';
import { CheckIcon, ChevronDownIcon, CloseIcon, FilterLinesIcon } from '@/components/icons/gota';
import type { BuyerList } from '@/lib/library/model';
import { filterSaved, type SavedEntry } from '@/lib/library/filters';
import {
  localizedIndustries,
  localizedCompanySizes,
  localizedOfferingOptions,
  localizedCategoryDisplayLabel,
} from '@/lib/taxonomy';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { ProjectPin } from './project-pin';
import { SaveProjectButton } from './save-project-button';
import { ListMembership } from './list-membership';
import { LibraryEmpty } from './library-empty';
import { commonText } from '@/i18n/common';
type FilterOption = { value: string; label: string };
function FilterMenu({
  label,
  placeholder,
  value,
  defaultValue,
  options,
  open,
  align = 'start',
  onOpenChange,
  onChange,
}: {
  label: string;
  /** Short name of the axis («Tipo»), shown while nothing is chosen. */
  placeholder?: string;
  value: string;
  defaultValue: string;
  options: FilterOption[];
  open: boolean;
  align?: 'start' | 'end';
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find(option => option.value === value) ?? options[0];
  const chosen = value !== defaultValue;
  return (
    <details
      open={open}
      onToggle={event => onOpenChange(event.currentTarget.open)}
      className="group relative"
    >
      <summary
        aria-label={`${label}: ${selected.label}`}
        data-selected={chosen}
        className="selector-dropdown-trigger [&::-webkit-details-marker]:hidden"
      >
        <span className="max-w-48 truncate">
          {!chosen && placeholder ? placeholder : selected.label}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} top-[calc(100%+0.5rem)] z-30 min-w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 text-stone-700 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]`}
      >
        {options.map(option => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
              className={`flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${active ? 'selector-menu-active' : ''}`}
            >
              <span className="truncate">{option.label}</span>
              {active && <CheckIcon aria-hidden="true" className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </details>
  );
}
export function SavedGallery({
  entries,
  lists,
  initialList = '',
  dict,
  libraryDict,
  locale,
}: {
  entries: SavedEntry[];
  lists: BuyerList[];
  initialList?: string;
  dict: Dictionary['solutionUi'];
  libraryDict: Dictionary['library'];
  locale: string;
}) {
  const t = libraryDict.savedGallery;
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState(''),
    [category, setCategory] = useState(''),
    [industry, setIndustry] = useState(''),
    [size, setSize] = useState(''),
    [list, setList] = useState(initialList),
    [sort, setSort] = useState('recent'),
    [openFilter, setOpenFilter] = useState('');
  const kinds = Array.from(
    new Set(entries.flatMap(entry => (entry.project ? [entry.project.kind] : []))),
  ).sort();
  const categories = Array.from(new Set(entries.flatMap(entry => entry.project?.categories ?? [])))
    .map(value => ({ value, label: localizedCategoryDisplayLabel(value, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const industryValues = new Set(entries.flatMap(entry => entry.project?.industries ?? []));
  const sizeValues = new Set(entries.flatMap(entry => entry.project?.companySizes ?? []));
  const visible = filterSaved(entries, { query, kind, category, industry, size, list, sort }),
    active = !!(query || kind || category || industry || size || list);
  function clear() {
    setQuery('');
    setKind('');
    setCategory('');
    setIndustry('');
    setSize('');
    setList('');
    setSort('recent');
  }
  const offeringOptions = localizedOfferingOptions(locale);
  const typeOptions = [
      { value: '', label: t.allTypes },
      ...kinds.map(value => ({
        value,
        label: offeringOptions.find(option => option.value === value)?.label ?? value,
      })),
    ],
    categoryOptions = [{ value: '', label: t.allCategories }, ...categories],
    industryOptions = [
      { value: '', label: t.allIndustries },
      ...localizedIndustries(locale)
        .filter(item => industryValues.has(item.value))
        .map(item => ({ value: item.value, label: item.label })),
    ],
    sizeOptions = [
      { value: '', label: t.allSizes },
      ...localizedCompanySizes(locale)
        .filter(item => sizeValues.has(item.value))
        .map(item => ({ value: item.value, label: item.label })),
    ],
    listOptions = [
      { value: '', label: t.allLists },
      { value: 'none', label: t.unorganized },
      ...lists.map(value => ({ value: value.id, label: value.name })),
    ],
    sortOptions = [
      { value: 'recent', label: t.sortRecent },
      { value: 'oldest', label: t.sortOldest },
      { value: 'name', label: t.sortName },
    ];
  // The toolbar earns its place: nothing to sort or search with a handful of projects,
  // and the narrowing menus only from six on. A filter that is already on (for
  // example «sin organizar» from Inicio) still shows on its own, so it can be cleared.
  const allFilters = entries.length >= 6;
  const shows = (value: string) => allFilters || !!value;
  const showSortSearch = entries.length >= 4 || !!query;
  const showFilters = allFilters || !!(kind || category || industry || size || list);
  const showToolbar = showSortSearch || showFilters;
  // The first menu in the row, if any: while it is plain text its padding would read as
  // an indent, so the row shifts to line its text up with the title; once it is a
  // filled pill, the pill itself sits on the edge.
  const firstMenu = (
    [
      [kind, true],
      [category, true],
      [industry, industryOptions.length > 1],
      [size, sizeOptions.length > 1],
      [list, true],
    ] as const
  ).find(([value, available]) => available && shows(value));
  // Without menus, sort leads the row on a phone, so the same rule applies to it.
  const alignText = firstMenu ? !firstMenu[0] : sort === 'recent';
  const filterOpen = (id: string) => (open: boolean) =>
    setOpenFilter(current => (open ? id : current === id ? '' : current));
  return (
    <>
      {showToolbar && (
        <div
          className={`${alignText ? '-ml-4' : ''} mb-8 flex flex-wrap items-center gap-x-2 gap-y-2`}
        >
          {showFilters && (
            <div className="flex flex-wrap items-center gap-1">
              {shows(kind) && (
                <FilterMenu
                  label={t.filterType}
                  placeholder={t.typeLabel}
                  value={kind}
                  defaultValue=""
                  options={typeOptions}
                  open={openFilter === 'kind'}
                  onOpenChange={filterOpen('kind')}
                  onChange={setKind}
                />
              )}
              {shows(category) && (
                <FilterMenu
                  label={t.filterCategory}
                  placeholder={t.categoryLabel}
                  value={category}
                  defaultValue=""
                  options={categoryOptions}
                  open={openFilter === 'category'}
                  onOpenChange={filterOpen('category')}
                  onChange={setCategory}
                />
              )}
              {shows(industry) && industryOptions.length > 1 && (
                <FilterMenu
                  label={t.filterIndustry}
                  placeholder={t.industryLabel}
                  value={industry}
                  defaultValue=""
                  options={industryOptions}
                  open={openFilter === 'industry'}
                  onOpenChange={filterOpen('industry')}
                  onChange={setIndustry}
                />
              )}
              {shows(size) && sizeOptions.length > 1 && (
                <FilterMenu
                  label={t.filterSize}
                  placeholder={t.sizeLabel}
                  value={size}
                  defaultValue=""
                  options={sizeOptions}
                  open={openFilter === 'size'}
                  onOpenChange={filterOpen('size')}
                  onChange={setSize}
                />
              )}
              {shows(list) && (
                <FilterMenu
                  label={t.filterList}
                  placeholder={t.listLabel}
                  value={list}
                  defaultValue=""
                  options={listOptions}
                  open={openFilter === 'list'}
                  onOpenChange={filterOpen('list')}
                  onChange={setList}
                />
              )}
            </div>
          )}
          {/* On a phone this group takes its own row: sort lines up under the menus and
              the search sits at the far right. */}
          <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
            <p
              role="status"
              className="sr-only whitespace-nowrap px-2 text-xs text-stone-400 sm:not-sr-only"
            >
              {active &&
                (entries.length === 1 ? t.countSingular : t.countPlural)
                  .replace('{visible}', String(visible.length))
                  .replace('{total}', String(entries.length))}
            </p>
            {active && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-stone-500 transition-colors hover:bg-white hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]"
              >
                <CloseIcon aria-hidden="true" className="size-3.5" />
                {t.clear}
              </button>
            )}
            {showSortSearch && (
              <FilterMenu
                label={t.sortLabel}
                value={sort}
                defaultValue="recent"
                options={sortOptions}
                open={openFilter === 'sort'}
                align="end"
                onOpenChange={filterOpen('sort')}
                onChange={setSort}
              />
            )}
            {showSortSearch && (
              <div className="ml-auto sm:ml-0" onPointerDown={() => setOpenFilter('')}>
                <ExpandingSearch
                  clearLabel={commonText(locale).clearSearch}
                  className="saved-search"
                  label={t.searchLabel}
                  placeholder={t.searchPlaceholder}
                  value={query}
                  onChange={setQuery}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {visible.length ? (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(entry => (
            <ProjectPin
              key={entry.key}
              project={entry.project}
              unavailableLabel={libraryDict.pin.unavailable}
              externalLabel={libraryDict.pin.external}
              locale={locale}
            >
              <div className="flex flex-wrap items-start gap-2">
                <SaveProjectButton projectKey={entry.key} initialSaved dict={dict} />
                <ListMembership
                  projectKey={entry.key}
                  lists={lists}
                  memberships={entry.memberships}
                  dict={libraryDict}
                  locale={locale}
                />
              </div>
            </ProjectPin>
          ))}
        </div>
      ) : (
        <LibraryEmpty icon={<FilterLinesIcon />} title={t.noMatches} text={t.noMatchesText}>
          <button
            type="button"
            onClick={clear}
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
