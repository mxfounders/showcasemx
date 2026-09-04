"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Expand, X, Images } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { SolutionSlide } from '@/lib/solutions/gallery';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The ficha's image strip: the site's own og:image first when present, then the
 * founder's screenshots in the order they set — see solutionSlides() in
 * src/lib/solutions/gallery.ts. One ratio (16/10) and object-contain for every
 * slide on purpose: cropping a screenshot of an interface hides the very thing
 * it was meant to show, and it's what makes an arbitrary-ratio og:image and a
 * founder's arbitrary-ratio screenshot sit together without a visible jump.
 *
 * Deliberately small and off to the side of the text, Product Hunt's gallery
 * style: a supporting visual, not a dominant hero. A "1/1" badge shows even
 * with a single slide, so the format reads as a gallery that can grow, not a
 * one-off banner — first version of this spanned the full content width and
 * read as a giant cinematic hero instead.
 *
 * The strip is snap-scroll (mechanics copied from blog-index.tsx, the only
 * other carousel in the repo); the zoomed <dialog> is screenshot-gallery.tsx's
 * original almost verbatim — showModal(), focus return to the trigger, Escape
 * handling — because that part already met the bar and rewriting it risks
 * losing exactly what made it accessible.
 */
export function SolutionGallery({ slides }: { slides: SolutionSlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const count = slides.length;
  const selected = slides[Math.min(active, count - 1)];

  const scrollTo = useCallback((index: number) => {
    const node = track.current;
    if (!node) return;
    const clamped = Math.max(0, Math.min(count - 1, index));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
    setActive(clamped);
  }, [count]);

  // Keep `active` in sync when the person swipes or drags the strip directly.
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = node.clientWidth || 1;
        setActive(Math.round(node.scrollLeft / width));
      });
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => { node.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => { if (expanded) dialog.current?.showModal(); }, [expanded]);

  if (!count || !selected) return null;

  return <section aria-label={`Imágenes del proyecto, ${count} en total`} className="max-w-md">
    <div className="relative">
      <div
        ref={track}
        role="region"
        aria-roledescription="carrusel"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'ArrowRight') { event.preventDefault(); scrollTo(active + 1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); scrollTo(active - 1); }
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-xl border border-stone-200 motion-reduce:scroll-auto"
      >
        {slides.map(slide => <div key={slide.key} className="relative aspect-[16/10] w-full shrink-0 snap-center snap-always bg-stone-50">
          {failed[slide.key]
            ? <p role="status" className="flex h-full items-center justify-center p-4 text-xs text-stone-500">No pudimos cargar esta imagen.</p>
            : <Image src={slide.src} alt={slide.alt} fill unoptimized sizes="448px" className="object-contain" onError={() => setFailed(current => ({ ...current, [slide.key]: true }))} />}
        </div>)}
      </div>

      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
        <Images aria-hidden="true" className="size-3" />{active + 1}/{count}
      </span>
      <button ref={trigger} type="button" onClick={() => setExpanded(true)} aria-label="Ampliar imagen" className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/70">
        <Expand className="size-3.5" aria-hidden="true" />
      </button>
      {count > 1 && <>
        <button type="button" onClick={() => scrollTo(active - 1)} disabled={active === 0} aria-label="Imagen anterior" className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur disabled:opacity-0">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => scrollTo(active + 1)} disabled={active >= count - 1} aria-label="Siguiente imagen" className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur disabled:opacity-0">
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </>}
    </div>
    {selected.caption && <p className="mt-2 break-words text-xs leading-relaxed text-stone-500">{selected.caption}</p>}

    <dialog ref={dialog} aria-label="Imagen ampliada" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dialog.current?.close(); } }} onClose={() => { setExpanded(false); trigger.current?.focus(); }} className="w-[94vw] max-w-6xl rounded-2xl bg-[#f5f5f4] p-4 backdrop:bg-black/60">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="min-w-0 break-words text-sm">{selected.caption}</p>
        <button type="button" autoFocus aria-label="Cerrar imagen" onClick={() => dialog.current?.close()} style={actionButtonStyle} className="action-button shrink-0 rounded-full p-3"><X className="size-4" /></button>
      </div>
      <div className="relative h-[65svh]"><Image src={selected.src} alt={selected.alt} fill unoptimized sizes="94vw" className="object-contain" /></div>
      {count > 1 && <div className="mt-4 flex justify-center gap-5">
        <button type="button" aria-label="Imagen anterior" onClick={() => scrollTo((active - 1 + count) % count)} className="rounded-lg p-3"><ArrowLeft className="size-5" /></button>
        <button type="button" aria-label="Imagen siguiente" onClick={() => scrollTo((active + 1) % count)} className="rounded-lg p-3"><ArrowRight className="size-5" /></button>
      </div>}
    </dialog>
  </section>;
}
