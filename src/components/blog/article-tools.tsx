'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, LinkIcon } from '@/components/icons/gota';
import type { Dictionary } from '@/i18n/dictionary';
import { shareUrl } from '@/lib/attribution/conventions';

export function ArticleProgress({ color }: { color: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[80] h-[3px] bg-transparent">
      <div
        className="h-full origin-left transition-[width] duration-100"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function CopyArticleLink({ dict }: { dict: Dictionary['blog']['article'] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="action-button inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600"
      onClick={async () => {
        try {
          // The clean address with the share convention, never the tags this visit came with.
          const { origin, pathname } = window.location;
          await navigator.clipboard.writeText(shareUrl(origin + pathname, 'link', 'article'));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <CheckIcon className="h-4 w-4 text-[#47785B]" /> : <LinkIcon className="h-4 w-4" />}
      {copied ? dict.linkCopied : dict.copyLink}
    </button>
  );
}
