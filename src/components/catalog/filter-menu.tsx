import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';

// Canonical dropdown pattern from CLAUDE.md §28: .selector-dropdown-trigger /
// .selector-menu-active. Two modes from one component:
//  - controlled ({open, onOpenChange, onChange}) for the client catalog bar;
//  - navigational ({href, clearHref}) for the community bar, a Server
//    Component — renders <Link>s and an uncontrolled <details>, so it works
//    with no JS and needs no 'use client'.
// Multi-select is just `values` being longer than one: every selected option
// keeps its Check, and the trigger label shows a count.

export type FilterOption = { value: string; label: string };

type BaseProps = {
  label: string;
  options: readonly FilterOption[];
  values: readonly string[];
  allowClear?: boolean;
  clearLabel?: string;
};

type ControlledProps = BaseProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  href?: never;
  clearHref?: never;
};

type NavigationalProps = BaseProps & {
  href: (value: string) => string;
  clearHref: string;
  open?: never;
  onOpenChange?: never;
  onChange?: never;
};

function triggerLabel(label: string, options: readonly FilterOption[], values: readonly string[]): string {
  if (values.length === 0) return label;
  if (values.length === 1) return options.find(option => option.value === values[0])?.label ?? label;
  return `${label} · ${values.length}`;
}

export function FilterMenu(props: ControlledProps | NavigationalProps) {
  const { label, options, values, allowClear = true, clearLabel = 'Cualquiera' } = props;
  const navigational = 'href' in props && typeof props.href === 'function';
  const cleared = values.length === 0;

  const rowClass = (active: boolean) =>
    `flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${active ? 'selector-menu-active' : ''}`;

  return (
    <details
      {...(navigational ? {} : { open: props.open, onToggle: (event: React.SyntheticEvent<HTMLDetailsElement>) => props.onOpenChange(event.currentTarget.open) })}
      className="group relative shrink-0"
    >
      <summary aria-label={label} data-selected={!cleared} className="selector-dropdown-trigger [&::-webkit-details-marker]:hidden">
        <span className="max-w-40 truncate">{triggerLabel(label, options, values)}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 text-stone-700 shadow-[0_18px_45px_-20px_rgba(41,37,36,0.35)]">
        {allowClear && (
          navigational ? (
            <Link href={props.clearHref} aria-current={cleared ? 'true' : undefined} className={rowClass(cleared)}>
              <span>{clearLabel}</span>
              {cleared && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </Link>
          ) : (
            <button type="button" aria-pressed={cleared} onClick={() => { props.onChange(''); props.onOpenChange(false); }} className={rowClass(cleared)}>
              <span>{clearLabel}</span>
              {cleared && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </button>
          )
        )}
        {options.map(option => {
          const active = values.includes(option.value);
          const content = (
            <>
              <span className="truncate">{option.label}</span>
              {active && <Check aria-hidden="true" className="size-4 shrink-0" />}
            </>
          );
          return navigational ? (
            <Link key={option.value} href={props.href(option.value)} aria-current={active ? 'true' : undefined} className={rowClass(active)}>
              {content}
            </Link>
          ) : (
            <button key={option.value} type="button" aria-pressed={active} onClick={() => { props.onChange(option.value); props.onOpenChange(false); }} className={rowClass(active)}>
              {content}
            </button>
          );
        })}
      </div>
    </details>
  );
}
