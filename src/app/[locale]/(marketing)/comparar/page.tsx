import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from '@/i18n/navigation';
import { ArrowLeftIcon } from '@/components/icons/gota';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { comparedProjects } from '@/lib/library/comparison-server';
import { comparisonHref, publishedSelection, selectionKeys } from '@/lib/library/comparison';
import { ComparisonRegion, ComparisonTable } from '@/components/library/comparison-table';
import { SaveComparison } from '@/components/compare/save-comparison';
import { CompareSync } from '@/components/compare/compare-sync';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

// Built per request from the URL: nothing about a comparison is stored (§8, SHCWS-53).
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string | string[] }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  const t = (await getDictionary(locale)).library.tempCompare;
  // Endless combinations of the same public data: never indexed (robots.ts blocks it too).
  return { title: `${t.metaTitle} | shwcs`, robots: { index: false, follow: true } };
}

/**
 * A comparison of two or three published listings straight from the catalog (SHCWS-53):
 * marked with «Comparar» on cards or listings, opened from the tray, with no list needed.
 * Public data only, the same table as a list's comparison minus the private notes. From
 * here the buyer can keep it as a list or ask all of them for a proposal at once.
 */
export default async function TemporaryComparePage(props: Props) {
  const [{ locale }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const dictionary = await getDictionary(locale);
  const t = dictionary.library.tempCompare;
  const compare = dictionary.library.compare;
  const candidates = selectionKeys(searchParams.project);
  const projects = candidates ? await comparedProjects(candidates) : {};
  // Every key must be a listing published right now, resolved here: never a draft.
  const keys = candidates && publishedSelection(candidates, Object.keys(projects));
  if (!keys)
    return (
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.invalidTitle}</h1>
        <p className="mt-4 leading-relaxed text-stone-500">{t.invalidBody}</p>
        <Link href="/#catalogo" className="mt-6 inline-block text-[#365DC4]">
          {t.backToCatalog}
        </Link>
      </section>
    );
  let signedIn = false;
  try {
    signedIn = Boolean(await getSession((await cookies()).get(sessionCookie)?.value));
  } catch {
    /* the comparison is public; saving asks to sign in */
  }
  const names = keys.map(key => projects[key].name);
  const contactable = keys.filter(key => projects[key]?.solutionId);
  const proposal = `/account/contacts/proposal?${new URLSearchParams(
    contactable.map(key => ['project', key]),
  )}`;
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 pt-12 sm:pt-16">
      <CompareSync items={keys.map(key => ({ key, name: projects[key].name }))} />
      <Link
        href="/#catalogo"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {dictionary.solution.backToCatalog}
      </Link>
      <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-stone-500">{t.intro}</p>
      <p id="compare-help" className="mt-4 text-xs text-stone-500">
        {t.help}
      </p>
      <ComparisonRegion label={compare.regionLabel} describedBy="compare-help">
        <ComparisonTable
          keys={keys}
          projects={projects}
          locale={locale}
          t={compare}
          caption={t.caption.replace('{names}', () => names.join(', '))}
          // Three can drop to two; two is the minimum, so their columns stay.
          remove={
            keys.length > 2
              ? {
                  href: key => comparisonHref(keys.filter(item => item !== key)),
                  label: t.remove,
                }
              : undefined
          }
        />
      </ComparisonRegion>
      <div className="mt-12 grid gap-10 border-t border-stone-200 pt-10 lg:grid-cols-2">
        <section aria-labelledby="compare-save">
          <h2 id="compare-save" className="text-xl font-medium">
            {t.saveTitle}
          </h2>
          <p className="mb-5 mt-3 max-w-xl text-sm leading-relaxed text-stone-500">{t.saveBody}</p>
          <SaveComparison
            keys={keys}
            names={names}
            signedIn={signedIn}
            dict={t}
            errors={dictionary.library.errors}
          />
        </section>
        {contactable.length >= 2 && (
          // The same form as a list's proposal (SHCWS-62); it checks every recipient again.
          <section aria-labelledby="compare-propose">
            <h2 id="compare-propose" className="text-xl font-medium">
              {compare.proposeTitle}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
              {compare.proposeBody}
            </p>
            <Link
              href={signedIn ? proposal : `/sign-in?next=${encodeURIComponent(proposal)}`}
              style={actionButtonStyle}
              className="action-button mt-5 inline-flex rounded-full px-5 py-3 text-sm font-medium"
            >
              {(signedIn ? compare.propose : t.signInToPropose).replace(
                '{count}',
                String(contactable.length),
              )}
            </Link>
          </section>
        )}
      </div>
    </section>
  );
}
