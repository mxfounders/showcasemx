'use client';
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
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
import { commonText } from '@/i18n/common';
type FilterOption = { value: string; label: string };
function FilterMenu({
  label,
  value,
  defaultValue,
  options,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  defaultValue: string;
  options: FilterOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const selected = options.find(option => option.value === value) ?? options[0];
  return (
    <details
      open={open}
      onToggle={event => onOpenChange(event.currentTarget.open)}
      className="group relative"
    >
      <summary
        aria-label={label}
        data-selected={value !== defaultValue}
        className="selector-dropdown-trigger [&::-webkit-details-marker]:hidden"
      >
        <span className="max-w-48 truncate">{selected.label}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 text-stone-700 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]">
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
              {active && <Check aria-hidden="true" className="size-4 shrink-0" />}
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
  const filterOpen = (id: string) => (open: boolean) =>
    setOpenFilter(current => (open ? id : current === id ? '' : current));
  return (
    <>
      <div className="mb-8 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <FilterMenu
            label={t.filterType}
            value={kind}
            defaultValue=""
            options={typeOptions}
            open={openFilter === 'kind'}
            onOpenChange={filterOpen('kind')}
            onChange={setKind}
          />
          <FilterMenu
            label={t.filterCategory}
            value={category}
            defaultValue=""
            options={categoryOptions}
            open={openFilter === 'category'}
            onOpenChange={filterOpen('category')}
            onChange={setCategory}
          />
          {industryOptions.length > 1 && (
            <FilterMenu
              label={t.filterIndustry}
              value={industry}
              defaultValue=""
              options={industryOptions}
              open={openFilter === 'industry'}
              onOpenChange={filterOpen('industry')}
              onChange={setIndustry}
            />
          )}
          {sizeOptions.length > 1 && (
            <FilterMenu
              label={t.filterSize}
              value={size}
              defaultValue=""
              options={sizeOptions}
              open={openFilter === 'size'}
              onOpenChange={filterOpen('size')}
              onChange={setSize}
            />
          )}
          <FilterMenu
            label={t.filterList}
            value={list}
            defaultValue=""
            options={listOptions}
            open={openFilter === 'list'}
            onOpenChange={filterOpen('list')}
            onChange={setList}
          />
          <FilterMenu
            label={t.sortLabel}
            value={sort}
            defaultValue="recent"
            options={sortOptions}
            open={openFilter === 'sort'}
            onOpenChange={filterOpen('sort')}
            onChange={setSort}
          />
          <div className="ml-auto pl-8" onPointerDown={() => setOpenFilter('')}>
            <ExpandingSearch
              clearLabel={commonText(locale).clearSearch}
              className="saved-search"
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={setQuery}
            />
          </div>
        </div>
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
          <p role="status" className="text-xs text-stone-500">
            {(entries.length === 1 ? t.countSingular : t.countPlural)
              .replace('{visible}', String(visible.length))
              .replace('{total}', String(entries.length))}
          </p>
          {active && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-stone-500 hover:bg-stone-200/50"
            >
              <X className="size-3.5" />
              {t.clear}
            </button>
          )}
        </div>
      </div>
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
        <div className="py-14 text-center">
          <h2 className="text-xl font-medium">{t.noMatches}</h2>
          <button
            type="button"
            onClick={clear}
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
