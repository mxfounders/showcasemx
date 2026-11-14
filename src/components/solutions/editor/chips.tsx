'use client';
import { CheckIcon, PlusIcon, SparklesIcon } from '@/components/icons/gota';
import { brandColors, type BrandTone } from '@/lib/brand-colors';

export type ChipOption = { value: string; label: string; detail?: string; tone?: BrandTone };

/**
 * Pill chips for every closed list in the editor: wraps instead of stacking big cards,
 * so 15 industries fit in a glance. Real checkboxes/radios underneath (visually hidden)
 * keep keyboard and screen-reader behaviour native; the visible pill mirrors the state.
 */
export function Chips({
  name,
  legend,
  options,
  selected,
  onToggle,
  multi = true,
  tone = 'blue',
  any,
}: {
  name: string;
  legend: string;
  options: readonly ChipOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  multi?: boolean;
  tone?: BrandTone;
  /**
   * An exclusive «Cualquiera» chip shown first: on, it means the deliberate answer []
   * («sirve a cualquiera»), which the caller stores; it is off as soon as one value is on.
   */
  any?: { label: string; checked: boolean; onChange: (checked: boolean) => void };
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-stone-800">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {any && (
          <Chip
            name={name}
            type="checkbox"
            label={any.label}
            checked={any.checked}
            tone={tone}
            onChange={() => any.onChange(!any.checked)}
          />
        )}
        {options.map(option => (
          <Chip
            key={option.value}
            name={name}
            type={multi ? 'checkbox' : 'radio'}
            label={option.label}
            detail={option.detail}
            checked={selected.includes(option.value)}
            tone={option.tone ?? tone}
            onChange={() => onToggle(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Chip({
  name,
  type,
  label,
  detail,
  checked,
  tone,
  onChange,
}: {
  name: string;
  type: 'checkbox' | 'radio';
  label: string;
  detail?: string;
  checked: boolean;
  tone: BrandTone;
  onChange: () => void;
}) {
  const color = brandColors[tone];
  return (
    <label className="editor-chip cursor-pointer">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        // A radio cannot be unchecked natively; clicking the chosen one clears it.
        onClick={type === 'radio' && checked ? onChange : undefined}
        className="peer sr-only"
      />
      <span
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transition-none"
        style={
          checked
            ? { backgroundColor: color.soft, color: color.solid, borderColor: color.solid }
            : { borderColor: '#d6d3d1', backgroundColor: '#fff', color: '#44403c' }
        }
      >
        {checked && <CheckIcon aria-hidden="true" className="size-3.5" />}
        {label}
        {detail && <span className="text-xs opacity-60">{detail}</span>}
      </span>
    </label>
  );
}

/**
 * One-click suggestions read from the founder's text. Adding one is the confirmation;
 * nothing here is ever marked on its own.
 */
export function Suggestions({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: readonly { value: string; label: string }[];
  onAdd: (value: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-dashed border-[#365DC4]/40 bg-[#E4EBFC]/40 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-[#365DC4]">
        <SparklesIcon className="size-3.5" aria-hidden="true" />
        {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => onAdd(item.value)}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#365DC4]/40 bg-white px-3 py-1.5 text-xs text-[#365DC4] transition-colors hover:bg-[#E4EBFC] active:translate-y-px"
          >
            <PlusIcon aria-hidden="true" className="size-3" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
