'use client';
import { useId, useState } from 'react';
import Link from '@/i18n/navigation';

export type RecognitionSeal = {
  key: string;
  /** The seal from /api/badge (layout=seal): the same artwork a founder can embed. */
  src: string;
  /** What the seal says, as its accessible name. */
  title: string;
  /** What it means and when, shown when the seal is opened. */
  detail: string;
};

/**
 * The listing's seals under its name: «Verificado por shwcs» and its awards, drawn as the
 * real badges rather than tags. Each one opens a line that says what it means, so no seal
 * reads as unexplained decoration.
 */
export function RecognitionSeals({
  seals,
  moreLabel,
  buttonLabel,
}: {
  seals: RecognitionSeal[];
  moreLabel: string;
  /** Accessible name of each button, with {name}. */
  buttonLabel: string;
}) {
  const ids = useId();
  const [open, setOpen] = useState<string | null>(null);
  if (!seals.length) return null;
  const current = seals.find(seal => seal.key === open);
  return (
    <div className="mt-6">
      <ul className="flex flex-wrap items-start gap-3">
        {seals.map(seal => {
          const expanded = open === seal.key;
          return (
            <li key={seal.key}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${ids}-detail`}
                aria-label={buttonLabel.replace('{name}', seal.title)}
                onClick={() => setOpen(expanded ? null : seal.key)}
                className={`block rounded-[14px] transition-[transform,filter,opacity] duration-200 hover:-translate-y-0.5 hover:drop-shadow-[0_10px_14px_rgba(28,25,23,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365DC4] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${open && !expanded ? 'opacity-75' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- our own SVG seal */}
                <img src={seal.src} alt="" width={112} height={132} className="block" />
              </button>
            </li>
          );
        })}
      </ul>
      <div id={`${ids}-detail`} aria-live="polite">
        {current && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            <span className="font-medium text-stone-900">{current.title}.</span> {current.detail}{' '}
            <Link
              href="/criterios#reconocimientos"
              className="text-[#365DC4] underline-offset-4 hover:underline"
            >
              {moreLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
