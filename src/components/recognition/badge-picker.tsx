'use client';
import { useId, useState } from 'react';
import { CheckIcon, CopyIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

export type PickerOption = {
  key: string;
  pick: string;
  title: string;
  width: number;
  /** Absolute, for the snippet the founder pastes on another site. */
  src: Record<Layout, Record<Theme, string>>;
  /** Same badge from this origin, for the preview here. */
  preview: Record<Layout, Record<Theme, string>>;
};
type Layout = 'card' | 'seal';
type Theme = 'light' | 'dark';
const seal = { width: 132, height: 156 };

/** Choose a badge and a theme, see it, copy the HTML. The preview is the real endpoint. */
export function BadgePicker({
  options,
  href,
  dict,
}: {
  options: PickerOption[];
  href: string;
  dict: Dictionary['recognition']['founder'];
}) {
  const ids = useId();
  const [key, setKey] = useState(options[options.length > 1 ? 1 : 0].key);
  const [theme, setTheme] = useState<Theme>('light');
  const [layout, setLayout] = useState<Layout>('card');
  const [status, setStatus] = useState<'' | 'copied' | 'failed'>('');
  const option = options.find(item => item.key === key) ?? options[0];
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const width = layout === 'seal' ? seal.width : option.width,
    height = layout === 'seal' ? seal.height : 56;
  const code = `<a href="${escape(href)}" target="_blank" rel="noopener"><img src="${escape(option.src[layout][theme])}" alt="${escape(option.title)}" width="${width}" height="${height}" /></a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="selector-tabs" role="group" aria-label={dict.badgesTitle}>
          {options.map(item => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === option.key}
              onClick={() => {
                setKey(item.key);
                setStatus('');
              }}
              className="selector-tab"
            >
              {item.pick}
            </button>
          ))}
        </div>
        <div className="selector-tabs" role="group" aria-label={dict.layoutLabel}>
          {(['card', 'seal'] as const).map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={layout === value}
              onClick={() => {
                setLayout(value);
                setStatus('');
              }}
              className="selector-tab"
            >
              {value === 'card' ? dict.card : dict.sealLayout}
            </button>
          ))}
        </div>
        <div className="selector-tabs" role="group" aria-label={dict.themeLabel}>
          {(['light', 'dark'] as const).map(value => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => {
                setTheme(value);
                setStatus('');
              }}
              className="selector-tab"
            >
              {dict[value]}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`flex min-h-48 items-center justify-center rounded-2xl border border-stone-200 p-6 ${theme === 'dark' ? 'bg-stone-900' : 'bg-[repeating-conic-gradient(#f5f5f4_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the real cross-origin badge */}
        <img
          src={option.preview[layout][theme]}
          alt={dict.previewAlt}
          width={width}
          height={height}
          className="max-w-full"
        />
      </div>
      <div>
        <label htmlFor={`${ids}-code`} className="text-xs font-medium text-stone-600">
          {dict.codeLabel}
        </label>
        <textarea
          id={`${ids}-code`}
          readOnly
          value={code}
          rows={3}
          onFocus={event => event.currentTarget.select()}
          className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs leading-relaxed text-stone-700"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void copy()}
            style={actionButtonStyle}
            className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            {status === 'copied' ? (
              <CheckIcon aria-hidden="true" className="size-4" />
            ) : (
              <CopyIcon aria-hidden="true" className="size-4" />
            )}
            {status === 'copied' ? dict.copied : dict.copy}
          </button>
          <span role="status" className="text-xs text-stone-500">
            {status === 'failed' ? dict.copyFailed : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
