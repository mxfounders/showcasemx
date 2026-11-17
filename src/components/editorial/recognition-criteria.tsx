import { badgeSvg, toneForRank, type BadgeInput } from '@/lib/recognition/badge';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/**
 * /criterios#reconocimientos, laid out exactly like «Cómo se ordena el catálogo» above it:
 * heading and text on the left, small stone cards on the right. Each card's mark is the
 * seal itself, drawn here with the same code as /api/badge from sample text, so the page
 * never depends on a real listing.
 */
export function RecognitionCriteria({
  dict,
  locale,
}: {
  dict: Dictionary['recognition'];
  locale: string;
}) {
  const seal = dict.badge.seal;
  const text = dict.criteria;
  const sample = (input: Omit<BadgeInput, 'layout' | 'theme'>) =>
    dataUri(badgeSvg({ ...input, layout: 'seal', theme: 'light' }));
  const cards = [
    {
      ...text.verified,
      src: sample({
        variant: 'verified',
        tone: 'verified',
        label: dict.badge.verified,
        seal: { line1: seal.verified, line2: seal.verifiedBy },
        title: dict.verified,
      }),
    },
    {
      ...text.weekly,
      src: sample({
        variant: 'award',
        tone: toneForRank(1),
        rank: 1,
        label: dict.weeklyAll.replace('{rank}', '1'),
        seal: { line1: seal.weekly, line2: localizedCategoryDisplayLabel('Ventas', locale) },
        title: text.weekly.label,
      }),
    },
    {
      ...text.editorial,
      src: sample({
        variant: 'award',
        tone: 'editorial',
        label: dict.badge.editorial,
        seal: { line1: seal.editorial, line2: seal.editorialBy },
        title: dict.editorial,
      }),
    },
  ];
  return (
    <section
      id="reconocimientos"
      aria-labelledby="reconocimientos-title"
      className="mx-auto max-w-[1500px] scroll-mt-24 px-5 pt-16 sm:px-10 lg:px-16 lg:pt-24"
    >
      <div className="grid gap-8 border-t border-stone-200 pt-10 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-14">
        <div>
          <h2
            id="reconocimientos-title"
            className="max-w-lg text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-5xl"
          >
            {text.title}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
            {text.intro}
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-500">{text.note}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {cards.map(card => (
            <div key={card.label} className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <div className="mb-3 flex items-start justify-between">
                {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG sample */}
                <img src={card.src} alt="" width={40} height={47} className="block" />
                <span className="text-sm font-semibold text-stone-400">{card.tag}</span>
              </div>
              <p className="text-sm font-medium text-stone-800">{card.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
