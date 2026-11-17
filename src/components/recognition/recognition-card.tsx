import Link from '@/i18n/navigation';
import { ArrowRightIcon, AwardIcon, VerifiedIcon } from '@/components/icons/gota';
import { badgeOptions, badgeSrc, type BadgeReviews } from '@/lib/recognition/badges';
import { awardPeriod, awardTitle, recognitionDate } from '@/lib/recognition/format';
import type { Recognition } from '@/lib/recognition/model';
import type { Dictionary } from '@/i18n/dictionary';
import { BadgePicker } from './badge-picker';

/**
 * The founder's view of what their published listing has earned, and the badges they can
 * put on their own site. Shown only for published listings: a badge needs a public page
 * to link to.
 */
export function RecognitionCard({
  solutionId,
  path,
  name,
  recognition,
  reviews = null,
  movedAway,
  origin,
  locale,
  dict,
}: {
  solutionId: string;
  /** The listing's public path, `/soluciones/<slug>`: the badge links to its name. */
  path: string;
  name: string;
  recognition: Recognition;
  /** Public review count and average: the «Publicado en» badge shows them from three up. */
  reviews?: BadgeReviews | null;
  /** A verification exists but for another host: the site changed since it was checked. */
  movedAway: boolean;
  origin: string;
  locale: string;
  dict: Dictionary['recognition'];
}) {
  const text = dict.founder;
  const options = badgeOptions(name, recognition, locale, dict, reviews).map(option => ({
    key: option.key,
    pick: option.pick,
    title: option.title,
    width: option.width,
    src: {
      card: {
        light: badgeSrc(origin, solutionId, option, 'light', locale),
        dark: badgeSrc(origin, solutionId, option, 'dark', locale),
      },
      seal: {
        light: badgeSrc(origin, solutionId, option, 'light', locale, 'seal'),
        dark: badgeSrc(origin, solutionId, option, 'dark', locale, 'seal'),
      },
    },
    preview: {
      card: {
        light: badgeSrc('', solutionId, option, 'light', locale),
        dark: badgeSrc('', solutionId, option, 'dark', locale),
      },
      seal: {
        light: badgeSrc('', solutionId, option, 'light', locale, 'seal'),
        dark: badgeSrc('', solutionId, option, 'dark', locale, 'seal'),
      },
    },
  }));
  return (
    <section
      aria-labelledby="recognition-title"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 id="recognition-title" className="text-lg font-medium tracking-[-0.02em]">
        {text.title}
      </h2>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="flex gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${recognition.verifiedAt ? 'bg-[#E4EBFC] text-[#365DC4]' : 'bg-stone-100 text-stone-400'}`}
          >
            <VerifiedIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm text-stone-700">
              {recognition.verifiedAt
                ? text.verified.replace('{date}', recognitionDate(recognition.verifiedAt, locale))
                : movedAway
                  ? text.moved
                  : text.pending}
            </p>
            <Link
              href={`/account/solutions/${solutionId}/trust`}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#365DC4]"
            >
              {text.verificationLink}
              <ArrowRightIcon aria-hidden="true" className="size-3" />
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${recognition.awards.length ? 'bg-[#F4ECD5] text-[#88631B]' : 'bg-stone-100 text-stone-400'}`}
          >
            <AwardIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800">{text.awards}</p>
            {recognition.awards.length ? (
              <ul className="mt-1 space-y-1 text-sm text-stone-600">
                {recognition.awards.slice(0, 4).map(award => (
                  <li key={award.id}>
                    {awardTitle(award, dict, locale)}{' '}
                    <span className="text-stone-400">· {awardPeriod(award, locale)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-stone-500">{text.noAwards}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-stone-200 pt-6">
        <h3 className="text-sm font-medium text-stone-800">{text.badgesTitle}</h3>
        <p className="mb-5 mt-1 text-sm leading-relaxed text-stone-500">{text.badgesHint}</p>
        {/* ?ref=badge attributes the visit to the badge; the listing's canonical has no query,
            and robots.txt lets crawlers follow it, so the link still counts for the listing. */}
        <BadgePicker options={options} href={`${origin}/${locale}${path}?ref=badge`} dict={text} />
      </div>
    </section>
  );
}
