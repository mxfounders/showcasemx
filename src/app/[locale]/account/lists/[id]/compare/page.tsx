import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer, getLists, getMemberships, resolveProjects } from '@/lib/library/server';
import { comparisonKeys, type BuyerProject } from '@/lib/library/model';
import { isSolutionId, safeSolutionUrl } from '@/lib/solutions/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import { localizedOfferingOptions, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
import { formatPriceFrom, priceBandLabel, pricingModelLabels } from '@/lib/solutions/pricing';
import { Fragment } from 'react';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.library.compare.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
/** Rows of public, founder-declared fields; each label lives at `library.compare.fields`. */
const fields = [
  'description',
  'audience',
  'scope',
  'pricing',
  'implementation',
  'integrations',
  'support',
  'evidence',
] as const satisfies readonly (keyof BuyerProject)[];
export default async function ComparePage(props: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isSolutionId(params.id)) notFound();
  const t = (await getDictionary(params.locale)).library.compare;
  const offeringOptions = localizedOfferingOptions(params.locale);
  const account = await requireBuyer('/account/lists');
  const [lists, memberships] = await Promise.all([
    getLists(account.id),
    getMemberships(account.id),
  ]);
  const list = lists.find(row => row.id === params.id);
  if (!list) notFound();
  const items = memberships.filter(row => row.list_id === list.id),
    keys = comparisonKeys(
      searchParams.project,
      items.map(row => row.project_key),
    );
  const back = `/account/lists/${list.id}`;
  if (!keys)
    return (
      <section className="account-page">
        <h1 className="text-3xl font-semibold">{t.invalidTitle}</h1>
        <p className="mt-4 text-stone-500">{t.invalidBody}</p>
        <Link href={back} className="mt-6 inline-block text-[#365DC4]">
          {t.backToList}
        </Link>
      </section>
    );
  const projects = await resolveProjects(keys);
  // Only what each project declared, in its own currency: no conversion, no estimate.
  const priceRows: { label: string; value: (project: BuyerProject) => string | null }[] = [
    { label: t.price.from, value: project => formatPriceFrom(project, params.locale) },
    {
      label: t.price.model,
      value: project => pricingModelLabels(project, params.locale).join(' · ') || null,
    },
    { label: t.price.band, value: project => priceBandLabel(project.priceBand, params.locale) },
  ];
  const contactable = keys.filter(key => projects[key]?.solutionId);
  return (
    <section className="account-page">
      <Link href={back} className="text-sm text-[#365DC4]">
        {t.backTo.replace('{name}', () => list.name)}
      </Link>
      <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl text-stone-500">{t.intro}</p>
      <p id="compare-help" className="mt-4 text-xs text-stone-500">
        {t.help}
      </p>
      <div
        role="region"
        aria-label={t.regionLabel}
        aria-describedby="compare-help"
        tabIndex={0}
        className="mt-7 max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4]"
      >
        <table className="w-full min-w-[740px] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{t.caption.replace('{name}', () => list.name)}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 border-b border-stone-200 p-4">
                {t.evaluate}
              </th>
              {keys.map(key => {
                const p = projects[key];
                return (
                  <th key={key} scope="col" className="border-b border-stone-200 p-4 align-top">
                    <span className="block break-words text-xl">{p?.name || t.unavailable}</span>
                    {p && (
                      <>
                        <span className="mt-2 block text-xs font-normal text-stone-500">
                          {offeringOptions.find(option => option.value === p.kind)?.label ?? p.kind}{' '}
                          ·{' '}
                          {p.categories
                            .map(category => localizedCategoryDisplayLabel(category, params.locale))
                            .join(' · ')}
                        </span>
                        <Link
                          href={p.href}
                          target={p.external ? '_blank' : undefined}
                          rel={p.external ? 'noopener noreferrer' : undefined}
                          className="mt-4 inline-block text-xs text-[#365DC4]"
                        >
                          {p.external ? t.visitSite : t.viewProfile}
                        </Link>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fields.map(field => (
              <Fragment key={field}>
                {/* The declared price (SHCWS-51) right before the founder's own words on it. */}
                {field === 'pricing' &&
                  priceRows.map(row => (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className="border-b border-stone-200 p-4 align-top font-medium"
                      >
                        {row.label}
                      </th>
                      {keys.map(key => {
                        const project = projects[key];
                        return (
                          <td
                            key={key}
                            className="break-words border-b border-stone-200 p-4 align-top leading-relaxed text-stone-600"
                          >
                            {(project && row.value(project)) || t.missing}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                <tr>
                  <th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">
                    {t.fields[field]}
                  </th>
                  {keys.map(key => (
                    <td
                      key={key}
                      className="whitespace-pre-wrap break-words border-b border-stone-200 p-4 align-top leading-relaxed text-stone-600"
                    >
                      {projects[key]?.[field] || t.missing}
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
            <tr>
              <th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">
                {t.demo}
              </th>
              {keys.map(key => {
                const url = safeSolutionUrl(projects[key]?.evidenceUrl);
                return (
                  <td key={key} className="border-b border-stone-200 p-4">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#365DC4]"
                      >
                        {t.viewEvidence}
                      </a>
                    ) : (
                      t.noLink
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">
                {t.notes}
              </th>
              {keys.map(key => (
                <td
                  key={key}
                  className="whitespace-pre-wrap break-words border-b border-stone-200 p-4 align-top text-stone-500"
                >
                  {items.find(item => item.project_key === key)?.note || t.noNotes}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="p-4 align-top font-medium">
                {t.nextStep}
              </th>
              {keys.map(key => (
                <td key={key} className="p-4 align-top">
                  {projects[key]?.solutionId ? (
                    <Link
                      href={`/account/contacts/new?solution=${projects[key].solutionId}`}
                      style={actionButtonStyle}
                      className="action-button inline-flex rounded-full px-4 py-3 text-xs font-medium"
                    >
                      {t.requestContact}
                    </Link>
                  ) : (
                    <p className="text-xs text-stone-500">
                      {projects[key] ? t.externalContact : t.gone}
                    </p>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {contactable.length >= 2 && (
        // One form for all of them (SHCWS-62); the proposal page checks each recipient again.
        <section aria-labelledby="compare-propose" className="mt-10 max-w-2xl">
          <h2 id="compare-propose" className="text-xl font-medium">
            {t.proposeTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{t.proposeBody}</p>
          <Link
            href={`/account/lists/${list.id}/proposal?${new URLSearchParams(
              contactable.map(key => ['project', key]),
            )}`}
            style={actionButtonStyle}
            className="action-button mt-5 inline-flex rounded-full px-5 py-3 text-sm font-medium"
          >
            {t.propose.replace('{count}', String(contactable.length))}
          </Link>
        </section>
      )}
    </section>
  );
}
