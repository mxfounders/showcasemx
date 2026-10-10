'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from './cn';

export function CopyButton({
  value,
  label = 'Copiar',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? 'Copiado' : label}
      title={copied ? 'Copiado' : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-md text-subtle transition hover:bg-surface-3 hover:text-fg',
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-sage" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </button>
  );
}

/** Monospace identifier with a copy affordance. */
export function IdChip({ value, display }: { value: string; display?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-surface-3 py-0.5 pl-1.5 pr-0.5 font-mono text-[11.5px] text-fg-2">
      <span className="truncate">{display ?? value}</span>
      <CopyButton value={value} label="Copiar identificador" className="size-5" />
    </span>
  );
}
