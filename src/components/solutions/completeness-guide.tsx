import Link from '@/i18n/navigation';
import { Check, ArrowUpRight } from 'lucide-react';
import { solutionChecklist } from '@/lib/solutions/completeness';
import type { SolutionData } from '@/lib/solutions/model';
import type { Dictionary } from '@/i18n/dictionary';
export function CompletenessGuide({
  data,
  id,
  onChoose,
  locale,
  dict,
}: {
  data: SolutionData;
  id: string;
  onChoose?: (step: number, key?: string) => void;
  locale: string;
  dict: Dictionary['solutionEditor']['completeness'];
}) {
  const items = solutionChecklist(data, locale),
    done = items.filter(item => item.done).length;
  return (
    <section className="my-7 border-y border-stone-200 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{dict.title}</h2>
        <span className="text-xs text-stone-500">
          {dict.progress.replace('{done}', String(done)).replace('{total}', String(items.length))}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">{dict.note}</p>
      <div
        className="mt-4 h-1 rounded-full bg-stone-200"
        role="progressbar"
        aria-label={dict.progressAria}
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={items.length}
      >
        <div
          className="h-full rounded-full bg-[#416B50] transition-[width] motion-reduce:transition-none"
          style={{ width: `${(done / items.length) * 100}%` }}
        />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-stone-600">
          {done === items.length ? dict.reviewGuide : dict.seeMissing}
        </summary>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map(item => (
            <li key={item.key} className="min-w-0">
              <button
                type="button"
                disabled={!onChoose}
                onClick={() => onChoose?.(item.step, item.key)}
                className="flex w-full items-start gap-2 rounded-lg py-2 text-left text-sm disabled:cursor-default"
              >
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${item.done ? 'border-[#416B50] bg-[#E4EDE2] text-[#416B50]' : 'border-stone-300'}`}
                >
                  {item.done && <Check className="size-3" aria-hidden="true" />}
                </span>
                <span>
                  <span className="block">{item.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{item.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
      <Link
        href={`/account/solutions/${id}/preview`}
        target="_blank"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#365DC4]/50 focus:ring-offset-2"
      >
        {dict.preview}
        <ArrowUpRight className="size-3.5 text-stone-400" aria-hidden="true" />
        <span className="sr-only"> {dict.otherTab}</span>
      </Link>
    </section>
  );
}
