'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { SolutionSlide } from '@/lib/solutions/gallery';
import type { Dictionary } from '@/i18n/dictionary';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The ficha's carousel, in the order solutionSlides() sets (src/lib/solutions/gallery.ts):
 * the site's og:image first unless the founder chose their own first image.
 *
 * A row across the whole ficha width, so it reads as a carousel at a glance: two images
 * whole and the third peeking on desktop, one and a peek on a phone. Every slide shares
 * one 16:10 frame. Screenshots use object-contain, since cropping an interface hides
 * what it was meant to show. The site's og:image (1.91:1 by spec) uses object-cover, as
 * og images keep their content centred.
 *
 * Arrows and dots move one slide; the strip also scrolls by touch, trackpad and the arrow
 * keys. Clicking a slide opens it large in a <dialog> with its own previous/next, the
 * arrow keys and Escape. Focus returns to the slide that opened it.
 */
export function SolutionGallery({
  slides,
  dict,
}: {
  slides: SolutionSlide[];
  dict: Dictionary['solutionUi']['gallery'];
}) {
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [first, setFirst] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const count = slides.length;

  const scrollTo = useCallback(
    (index: number) => {
      const node = track.current;
      const target = node?.children[Math.max(0, Math.min(count - 1, index))] as
        HTMLElement | undefined;
      if (!node || !target) return;
      node.scrollTo({
        left: target.offsetLeft - node.offsetLeft,
        behavior: reducedMotion() ? 'auto' : 'smooth',
      });
    },
    [count],
  );

  // Which slide sits at the left edge, and whether the last one is fully in view.
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const left = node.scrollLeft + node.offsetLeft;
        const children = Array.from(node.children) as HTMLElement[];
        const index = children.findIndex(child => child.offsetLeft + child.offsetWidth / 2 >= left);
        setFirst(Math.max(0, index));
        setAtEnd(node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
      });
    };
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      node.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (open !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  if (!count) return null;
  const single = count === 1;
  const shown = open === null ? null : slides[open];
  const step = (delta: number) =>
    setOpen(current => (current === null ? null : (current + delta + count) % count));

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          role="region"
          aria-roledescription={dict.carousel}
          aria-label={dict.regionAria.replace('{count}', String(count))}
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              scrollTo(first + 1);
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scrollTo(first - 1);
            }
          }}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[#365DC4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5f5f4] motion-reduce:scroll-auto"
        >
          {slides.map((slide, index) => (
            <figure
              key={slide.key}
              className={`min-w-0 shrink-0 snap-start ${
                single ? 'w-full sm:w-[70%] lg:w-[58%]' : 'w-[85%] sm:w-[60%] lg:w-[43%]'
              }`}
            >
              <button
                type="button"
                onClick={event => {
                  opener.current = event.currentTarget;
                  setOpen(index);
                }}
                aria-label={dict.expand
                  .replace('{index}', String(index + 1))
                  .replace('{alt}', slide.alt)}
                className="group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-stone-200 bg-white outline-none transition-shadow hover:shadow-lg hover:shadow-stone-200/70 focus-visible:ring-2 focus-visible:ring-[#365DC4] focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {failed[slide.key] ? (
                  <span
                    role="status"
                    className="flex h-full items-center justify-center p-4 text-xs text-stone-500"
                  >
                    {dict.loadError}
                  </span>
                ) : (
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={index < 2}
                    sizes="(min-width: 1024px) 480px, (min-width: 640px) 60vw, 85vw"
                    className={`${slide.kind === 'site' ? 'object-cover' : 'object-contain'} transition-transform duration-500 group-hover:scale-[1.015] motion-reduce:transform-none`}
                    onError={() => setFailed(current => ({ ...current, [slide.key]: true }))}
                  />
                )}
              </button>
              {slide.caption && (
                <figcaption className="mt-2 line-clamp-2 break-words px-1 text-xs leading-relaxed text-stone-500">
                  {slide.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {!single && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(first - 1)}
              aria-label={dict.previous}
              className={`absolute left-0 top-[calc(50%-1.25rem)] flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md transition-opacity hover:text-stone-950 motion-reduce:transition-none max-sm:hidden ${
                first === 0 ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
              tabIndex={first === 0 ? -1 : 0}
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(first + 1)}
              aria-label={dict.next}
              className={`absolute right-0 top-[calc(50%-1.25rem)] flex size-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-md transition-opacity hover:text-stone-950 motion-reduce:transition-none max-sm:hidden ${
                atEnd ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
              tabIndex={atEnd ? -1 : 0}
            >
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {!single && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => scrollTo(index)}
              aria-label={dict.goTo.replace('{index}', String(index + 1))}
              aria-current={index === first ? 'true' : undefined}
              className="flex h-6 items-center px-0.5"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  index === first ? 'w-5 bg-[#365DC4]' : 'w-1.5 bg-stone-300 hover:bg-stone-400'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <dialog
        ref={dialog}
        aria-label={dict.dialogAria}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            dialog.current?.close();
          }
          if (!single && event.key === 'ArrowRight') step(1);
          if (!single && event.key === 'ArrowLeft') step(-1);
        }}
        onClick={event => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        onClose={() => {
          if (open !== null) scrollTo(open);
          setOpen(null);
          opener.current?.focus();
        }}
        className="w-[94vw] max-w-6xl rounded-2xl bg-[#f5f5f4] p-4 backdrop:bg-black/70 sm:p-6"
      >
        {shown && open !== null && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="min-w-0 break-words text-sm text-stone-600">
                {!single && (
                  <span className="mr-2 font-medium text-stone-900">
                    {dict.position
                      .replace('{index}', String(open + 1))
                      .replace('{count}', String(count))}
                  </span>
                )}
                {shown.caption}
              </p>
              <button
                type="button"
                autoFocus
                aria-label={dict.close}
                onClick={() => dialog.current?.close()}
                style={actionButtonStyle}
                className="action-button shrink-0 rounded-full p-3"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
            <div className="relative h-[70svh]">
              <Image
                key={shown.key}
                src={shown.src}
                alt={shown.alt}
                fill
                sizes="94vw"
                className="object-contain"
              />
              {!single && (
                <>
                  <button
                    type="button"
                    aria-label={dict.previous}
                    onClick={() => step(-1)}
                    className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md hover:text-stone-950"
                  >
                    <ArrowLeftIcon className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={dict.dialogNext}
                    onClick={() => step(1)}
                    className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-700 shadow-md hover:text-stone-950"
                  >
                    <ArrowRightIcon className="size-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
