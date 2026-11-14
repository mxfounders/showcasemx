'use client';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { SendIcon, ViewColumnsIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton } from './client';
import type { Dictionary } from '@/i18n/dictionary';
export function ComparisonPicker({
  listId,
  projects,
  dict,
}: {
  listId: string;
  projects: { key: string; name: string }[];
  dict: Dictionary['library'];
}) {
  const t = dict.comparisonPicker;
  const [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState('');
  const router = useRouter();
  return (
    <details className="my-8 border-y border-stone-200 py-5">
      <summary className="cursor-pointer text-sm font-medium">{t.summary}</summary>
      {projects.length < 2 ? (
        <p className="mt-4 text-sm text-stone-500">{t.needTwo}</p>
      ) : (
        <form
          className="mt-5"
          onSubmit={event => {
            event.preventDefault();
            const valid = selected.filter(key => projects.some(project => project.key === key));
            if (valid.length < 2) {
              setError(t.selectTwo);
              return;
            }
            const query = new URLSearchParams();
            valid.forEach(key => query.append('project', key));
            // The same selection opens the comparator or one form for a proposal to all
            // of them (SHCWS-62); the server checks the selection again on either page.
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            const page = submitter?.getAttribute('value') === 'proposal' ? 'proposal' : 'compare';
            router.push(`/account/lists/${listId}/${page}?${query}`);
          }}
        >
          <div className="flex flex-wrap gap-3">
            {projects.map(project => (
              <label
                key={project.key}
                className="flex max-w-full cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[#365DC4]"
                  checked={selected.includes(project.key)}
                  disabled={selected.length === 3 && !selected.includes(project.key)}
                  onChange={event => {
                    setError('');
                    setSelected(values =>
                      event.target.checked
                        ? [...values, project.key]
                        : values.filter(key => key !== project.key),
                    );
                  }}
                />
                <span className="min-w-0 break-words">{project.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button value="compare" style={actionButtonStyle} className={libraryButton}>
              <ViewColumnsIcon className="size-4" aria-hidden="true" />
              {t.submit.replace('{count}', String(selected.length))}
            </button>
            <button value="proposal" style={actionButtonStyle} className={libraryButton}>
              <SendIcon className="size-4" aria-hidden="true" />
              {t.propose.replace('{count}', String(selected.length))}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-[#A94E35]">
              {error}
            </p>
          )}
        </form>
      )}
    </details>
  );
}
