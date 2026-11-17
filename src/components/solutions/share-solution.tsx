'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, SendIcon } from '@/components/icons/gota';
import { LinkedInIcon, WhatsAppIcon, XIcon } from '@/components/icons/social-icons';
import { localePath } from '@/i18n/paths';
import { useLocale } from '@/i18n/use-locale';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * «Compartir» on a listing (SHCWS-54). In B2B whoever finds a tool passes it to the
 * owner or the CFO, usually over WhatsApp. Where the browser has the native share sheet
 * (phones, Safari) it opens that; elsewhere, or if the sheet fails, a small menu offers
 * copy link, LinkedIn, WhatsApp and X. Every link carries `utm_source=share` and the
 * channel as `utm_medium`, so shared visits are recognisable; the card a chat app shows
 * comes from the listing's own Open Graph image (opengraph-image.tsx).
 */
type Channel = 'native' | 'link' | 'linkedin' | 'whatsapp' | 'x';

export function ShareSolution({
  id,
  name,
  dict,
}: {
  id: string;
  name: string;
  dict: Dictionary['solution']['share'];
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false),
    [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState('');
  const wrapper = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    firstItem = useRef<HTMLButtonElement>(null);
  const text = dict.text.replace('{name}', name);

  function shareUrl(channel: Channel) {
    const url = new URL(localePath(`/soluciones/${id}`, locale), window.location.origin);
    url.searchParams.set('utm_source', 'share');
    url.searchParams.set('utm_medium', channel);
    return url.href;
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    setCopied(false);
    setFallback('');
    if (returnFocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    function outside(event: PointerEvent) {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
      setCopied(false);
      setFallback('');
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  async function start() {
    if (open) return close(true);
    if (typeof navigator.share === 'function') {
      const data = { title: name, text, url: shareUrl('native') };
      if (!navigator.canShare || navigator.canShare(data)) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          // Closing the sheet is a choice, not a failure; anything else falls back to the menu.
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
    }
    setOpen(true);
  }

  async function copy() {
    const url = shareUrl('link');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFallback('');
    } catch {
      setFallback(url);
    }
  }

  const external = open
    ? [
        {
          channel: 'linkedin' as const,
          label: dict.linkedin,
          Icon: LinkedInIcon,
          href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl('linkedin'))}`,
        },
        {
          channel: 'whatsapp' as const,
          label: dict.whatsapp,
          Icon: WhatsAppIcon,
          href: `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl('whatsapp')}`)}`,
        },
        {
          channel: 'x' as const,
          label: dict.x,
          Icon: XIcon,
          href: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl('x'))}`,
        },
      ]
    : [];

  const item =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900';
  return (
    <div
      ref={wrapper}
      className="relative"
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? `share-${id}` : undefined}
        onClick={() => void start()}
        className="flex w-full items-center justify-between gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium transition-colors hover:bg-stone-50"
      >
        {dict.button}
        <SendIcon className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`share-${id}`}
          role="group"
          aria-label={dict.menuLabel}
          className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_12px_40px_-12px_rgba(28,25,23,0.25)]"
        >
          <button ref={firstItem} type="button" onClick={() => void copy()} className={item}>
            {copied ? (
              <CheckIcon className="size-4 shrink-0 text-[#416B50]" aria-hidden="true" />
            ) : (
              <CopyIcon className="size-4 shrink-0" aria-hidden="true" />
            )}
            {copied ? dict.copied : dict.copy}
          </button>
          {external.map(({ channel, label, Icon, href }) => (
            <a
              key={channel}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              // After the click: a link removed from the page mid-click would not open.
              onClick={() => window.setTimeout(() => close(false), 0)}
              className={item}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </a>
          ))}
          <span role="status" className="sr-only">
            {copied ? dict.copied : ''}
          </span>
          {fallback && (
            <label className="block px-3 pb-2 pt-1 text-xs text-stone-500">
              {dict.copyFallback}
              <input
                readOnly
                value={fallback}
                onFocus={event => event.target.select()}
                className="mt-2 w-full rounded-lg border border-stone-300 bg-transparent p-2 text-stone-700"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
