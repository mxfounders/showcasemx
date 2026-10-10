'use client';
import { Plus, Trash2 } from 'lucide-react';
import { publicLinkKinds, type PublicLink, type SolutionFounder } from '@/lib/solutions/profile';
import { actionButtonStyle } from '@/lib/brand-colors';
import { localizedLinkKind } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';
export const solutionInput =
  'mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
type ProfileDict = Dictionary['solutionEditor']['profile'];
export function PublicLinksEditor({
  links,
  onChange,
  limit = 6,
  label,
  locale,
  dict,
}: {
  links: PublicLink[];
  onChange: (links: PublicLink[]) => void;
  limit?: number;
  label: string;
  locale: string;
  dict: ProfileDict;
}) {
  return (
    <section aria-label={label}>
      <div className="space-y-4">
        {links.map((link, index) => (
          <div key={index} className="grid items-end gap-3 sm:grid-cols-[155px_minmax(0,1fr)_40px]">
            <label className="text-xs text-stone-500">
              {dict.linkType.replace('{index}', String(index + 1))}
              <select
                className={solutionInput}
                value={link.label}
                onChange={e =>
                  onChange(
                    links.map((item, i) =>
                      i === index
                        ? { ...item, label: e.target.value as PublicLink['label'] }
                        : item,
                    ),
                  )
                }
              >
                {publicLinkKinds.map(kind => (
                  <option key={kind} value={kind}>
                    {localizedLinkKind(kind, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-xs text-stone-500">
              {dict.linkUrl.replace('{index}', String(index + 1))}
              <input
                type="url"
                className={solutionInput}
                value={link.url}
                maxLength={500}
                placeholder="https://"
                onChange={e =>
                  onChange(
                    links.map((item, i) => (i === index ? { ...item, url: e.target.value } : item)),
                  )
                }
              />
            </label>
            <button
              type="button"
              aria-label={dict.removeLink.replace('{index}', String(index + 1))}
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              className="justify-self-end rounded-lg p-3 text-stone-500 hover:bg-stone-200/50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {links.length < limit && (
        <button
          type="button"
          onClick={() => onChange([...links, { label: 'LinkedIn', url: '' }])}
          style={actionButtonStyle}
          className="action-button mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm"
        >
          <Plus className="size-4" />
          {dict.addLink}
        </button>
      )}
      <p className="mt-3 text-xs text-stone-400">
        {dict.linksCount.replace('{count}', String(links.length)).replace('{limit}', String(limit))}
      </p>
    </section>
  );
}
export function FoundersEditor({
  value,
  onChange,
  locale,
  dict,
}: {
  value: SolutionFounder[];
  onChange: (people: SolutionFounder[]) => void;
  locale: string;
  dict: ProfileDict;
}) {
  function update(index: number, patch: Partial<SolutionFounder>) {
    onChange(value.map((person, i) => (i === index ? { ...person, ...patch } : person)));
  }
  return (
    <div>
      <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.foundersNote}</p>
      <div className="space-y-8">
        {value.map((person, index) => (
          <fieldset key={index} className="space-y-5 border-b border-stone-200 pb-7">
            <legend className="mb-4 text-sm font-medium">
              {dict.person.replace('{index}', String(index + 1))}
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm">
                {dict.publicName}
                <input
                  className={solutionInput}
                  value={person.name}
                  maxLength={100}
                  onChange={e => update(index, { name: e.target.value })}
                  placeholder={dict.publicNamePlaceholder}
                />
              </label>
              <label className="text-sm">
                {dict.role}
                <input
                  className={solutionInput}
                  value={person.role}
                  maxLength={80}
                  onChange={e => update(index, { role: e.target.value })}
                  placeholder={dict.rolePlaceholder}
                />
              </label>
            </div>
            <label className="block text-sm">
              {dict.bio}
              <textarea
                className={solutionInput}
                value={person.bio}
                maxLength={400}
                rows={3}
                onChange={e => update(index, { bio: e.target.value })}
                placeholder={dict.bioPlaceholder}
              />
            </label>
            <PublicLinksEditor
              label={dict.personLinks.replace('{index}', String(index + 1))}
              links={person.links}
              limit={4}
              onChange={links => update(index, { links })}
              locale={locale}
              dict={dict}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="text-sm text-stone-500"
            >
              {dict.removePerson}
            </button>
          </fieldset>
        ))}
      </div>
      {value.length < 3 && (
        <button
          type="button"
          onClick={() => onChange([...value, { name: '', role: '', bio: '', links: [] }])}
          style={actionButtonStyle}
          className="action-button mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm"
        >
          <Plus className="size-4" />
          {dict.addPerson}
        </button>
      )}
    </div>
  );
}
