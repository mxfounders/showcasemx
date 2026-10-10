'use client';
import { useState } from 'react';
import Link from '@/i18n/navigation';
import { Check, Link as LinkIcon, ArrowUpRight } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function ShareCollection({
  id,
  preview = false,
  dict,
}: {
  id: string;
  preview?: boolean;
  dict: Dictionary['community'];
}) {
  const [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        style={actionButtonStyle}
        className="action-button inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm"
        onClick={async () => {
          const url = new URL(`/comunidad/${id}`, window.location.origin).href;
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setFallback('');
          } catch {
            setFallback(url);
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
        {copied ? dict.share.copied : dict.share.share}
      </button>
      {preview && (
        <Link
          href={`/comunidad/${id}`}
          className="inline-flex items-center gap-1 text-sm text-stone-500"
        >
          {dict.share.viewPublic}
          <ArrowUpRight className="size-4" />
        </Link>
      )}
      <span role="status" className="sr-only">
        {copied ? dict.share.copiedToClipboard : ''}
      </span>
      {fallback && (
        <label className="w-full text-xs text-stone-500">
          {dict.share.copyThisLink}
          <input
            readOnly
            value={fallback}
            onFocus={event => event.target.select()}
            className="mt-2 w-full rounded-lg border border-stone-300 bg-transparent p-3"
          />
        </label>
      )}
    </div>
  );
}
