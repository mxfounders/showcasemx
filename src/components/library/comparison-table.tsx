import type { ReactNode } from 'react';
import Link from '@/i18n/navigation';
import { CheckIcon } from '@/components/icons/gota';
import { VerifiedMark } from '@/components/recognition/verified-mark';
import { ResponseSignalNote } from '@/components/catalog/response-signal';
import { actionButtonStyle } from '@/lib/brand-colors';
import { safeSolutionUrl } from '@/lib/solutions/model';
import { formatPriceFrom, priceBandLabel, pricingModelLabels } from '@/lib/solutions/pricing';
import { providerRowKeys, providerValues } from '@/lib/solutions/provider';
import { offerValues, planPrice } from '@/lib/solutions/offer';
import {
  localizedCapabilityLabel,
  localizedCategoryDisplayLabel,
  localizedComplianceOptions,
  localizedIntegrationOptions,
  localizedOfferingOptions,
  localizedSetupTimeOptions,
  localizedDeveloperToolOptions,
} from '@/lib/taxonomy';
import { declaredMatrix, type ComparedProject, type MatrixCell } from '@/lib/library/comparison';
import type { Dictionary } from '@/i18n/dictionary';

type CompareDict = Dictionary['library']['compare'];
type Cell = ReactNode | null;

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find(option => option.value === value)?.label ?? value;

/**
 * The comparator's table (SHCWS-53), for a buyer's list and for a temporary comparison
 * from the catalog. One semantic table, scrolled sideways inside its own region on a
 * phone. Rows are grouped; every cell says what the project published or that it did
 * not: no scores, no winner, no estimate. Notes appear only when the page is the owner's
 * list comparison and passes them.
 */
export function ComparisonTable({
  keys,
  projects,
  locale,
  t,
  caption,
  notes,
  remove,
}: {
  keys: string[];
  projects: Record<string, ComparedProject | undefined>;
  locale: string;
  t: CompareDict;
  caption: string;
  /** The owner's private notes for this list, by project key. Never on a temporary comparison. */
  notes?: Record<string, string> | null;
  /** A temporary comparison of three can drop one column: its URL without that listing. */
  remove?: { href: (key: string) => string | null; label: string };
}) {
  const offering = localizedOfferingOptions(locale);
  const list = keys.map(key => projects[key]);
  const missing = <span className="text-stone-400">{t.missing}</span>;
  const columns = keys.length + 1;

  const row = (label: ReactNode, cells: Cell[], key?: string, preWrap = false) => (
    <tr key={key ?? String(label)}>
      <th
        scope="row"
        className="border-b border-stone-200 p-4 align-top text-[13px] font-medium text-stone-800"
      >
        {label}
      </th>
      {cells.map((cell, index) => (
        <td
          key={keys[index]}
          className={`break-words border-b border-stone-200 p-4 align-top text-sm leading-relaxed text-stone-600 ${preWrap ? 'whitespace-pre-wrap' : ''}`}
        >
          {cell ?? missing}
        </td>
      ))}
    </tr>
  );
  const group = (title: string, rows: ReactNode) => (
    <tbody>
      <tr>
        <th
          scope="colgroup"
          colSpan={columns}
          className="border-b border-stone-200 bg-stone-100/70 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-stone-500"
        >
          {title}
        </th>
      </tr>
      {rows}
    </tbody>
  );
  const cells = (read: (project: ComparedProject) => Cell) =>
    list.map(project => (project ? read(project) : null));
  const matrixCell = (cell: MatrixCell) =>
    cell === 'yes' ? (
      <span className="inline-flex items-center gap-1.5 font-medium text-[#416B50]">
        <CheckIcon aria-hidden="true" className="size-3.5" />
        {t.matrixYes}
      </span>
    ) : (
      <span className="text-stone-400">
        {cell === 'no' ? t.matrixNo : cell === 'none' ? t.matrixNone : t.matrixUnknown}
      </span>
    );

  // Declared values side by side: one row per capability or tool any of them declared.
  const capabilities = declaredMatrix(list.map(project => project?.capabilities));
  const integrations = declaredMatrix(list.map(project => project?.integrationKeys));
  const integrationOptions = localizedIntegrationOptions(locale);
  // SHCWS-180: technical tools as a matrix, like integrations.
  const tools = declaredMatrix(list.map(project => project?.developerTools));
  const toolOptions = localizedDeveloperToolOptions(locale);
  const offer = (project: ComparedProject) => offerValues(project, locale);
  // «Dónde opera» rows only where at least one project declared something (SHCWS-56).
  const provider = list.map(project =>
    project ? providerValues(project, locale, t.provider.anyCountry) : null,
  );
  const providerKeys = providerRowKeys.filter(key => provider.some(values => values?.[key]));
  const anyCases = list.some(project => project?.caseClients?.length);

  const reviews = (project: ComparedProject): Cell => {
    const summary = project.reviews;
    if (!project.solutionId) return null;
    if (!summary?.count || summary.average == null) return t.trust.noReviews;
    const rating = summary.average.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
    const levels = (
      [
        ['customers', summary.customers],
        ['contacts', summary.contacts],
        ['work', summary.work],
        ['invited', summary.invited],
      ] as const
    ).filter(([, count]) => count > 0);
    return (
      <>
        <span className="font-medium text-stone-800">
          {(summary.count === 1 ? t.trust.reviewsOne : t.trust.reviewsMany)
            .replace('{rating}', rating)
            .replace('{count}', String(summary.count))}
        </span>
        {levels.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-xs text-stone-500">
            {levels.map(([level, count]) => (
              <li key={level}>{t.trust[level].replace('{count}', String(count))}</li>
            ))}
          </ul>
        )}
      </>
    );
  };

  return (
    <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-44 border-b border-stone-200 p-4 align-bottom">
            <span className="text-xs font-medium text-stone-500">{t.evaluate}</span>
          </th>
          {keys.map(key => {
            const p = projects[key];
            const removeTo = remove?.href(key);
            return (
              <th key={key} scope="col" className="border-b border-stone-200 p-4 align-top">
                <span className="flex items-center gap-2 break-words text-xl font-semibold tracking-tight">
                  <span className="min-w-0">{p?.name || t.unavailable}</span>
                  {p?.verified && <VerifiedMark locale={locale} />}
                </span>
                {p && (
                  <>
                    <span className="mt-2 block text-xs font-normal text-stone-500">
                      {labelOf(offering, p.kind)} ·{' '}
                      {p.categories
                        .map(category => localizedCategoryDisplayLabel(category, locale))
                        .join(' · ')}
                    </span>
                    <span className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-normal">
                      <Link
                        href={p.href}
                        target={p.external ? '_blank' : undefined}
                        rel={p.external ? 'noopener noreferrer' : undefined}
                        className="text-[#365DC4]"
                      >
                        {p.external ? t.visitSite : t.viewProfile}
                      </Link>
                      {remove && removeTo && (
                        <Link href={removeTo} className="text-stone-500 hover:text-stone-800">
                          {remove.label}
                        </Link>
                      )}
                    </span>
                  </>
                )}
              </th>
            );
          })}
        </tr>
      </thead>

      {group(
        t.groups.trust,
        <>
          {row(
            t.trust.verified,
            cells(project =>
              project.solutionId ? (
                project.verified ? (
                  <span className="font-medium text-[#365DC4]">{t.trust.verifiedYes}</span>
                ) : (
                  t.trust.verifiedNo
                )
              ) : null,
            ),
          )}
          {row(
            t.trust.domain,
            cells(project =>
              project.solutionId ? (project.verifiedDomain ?? t.trust.domainNo) : null,
            ),
          )}
          {row(t.trust.reviews, cells(reviews))}
          {row(
            t.trust.response,
            cells(project =>
              !project.solutionId ? null : project.response ? (
                <ResponseSignalNote
                  signal={project.response}
                  locale={locale}
                  className="text-sm text-stone-600 [&>span]:whitespace-normal"
                />
              ) : (
                <span className="text-stone-500">{t.trust.noResponse}</span>
              ),
            ),
          )}
        </>,
      )}

      {group(
        t.groups.price,
        <>
          {row(
            t.price.from,
            cells(project => formatPriceFrom(project, locale)),
          )}
          {row(
            t.price.model,
            cells(project => pricingModelLabels(project, locale).join(' · ') || null),
          )}
          {row(
            t.price.band,
            cells(project => priceBandLabel(project.priceBand, locale)),
          )}
          {row(
            t.offer.plans,
            cells(project =>
              project.plans?.length ? (
                <ul className="space-y-1">
                  {project.plans.map((plan, index) => (
                    <li key={index}>
                      <span className="text-stone-800">{plan.name}</span> ·{' '}
                      {planPrice(plan, locale)}
                    </li>
                  ))}
                </ul>
              ) : null,
            ),
            'plans',
          )}
          {row(
            t.offer.tryIt,
            cells(project => offer(project).tryOptions.join(' · ') || null),
            'try',
          )}
          {row(
            t.fields.pricing,
            cells(project => project.pricing || null),
            'pricing',
            true,
          )}
        </>,
      )}

      {group(
        t.groups.fit,
        <>
          {row(
            t.fields.description,
            cells(project => project.description || null),
            'description',
            true,
          )}
          {row(
            t.fields.audience,
            cells(project => project.audience || null),
            'audience',
            true,
          )}
          {row(
            t.fields.scope,
            cells(project => project.scope || null),
            'scope',
            true,
          )}
          {capabilities.length
            ? capabilities.map(item =>
                row(
                  <>
                    <span className="block text-[11px] font-normal text-stone-400">
                      {t.capabilities}
                    </span>
                    {localizedCapabilityLabel(item.value, locale)}
                  </>,
                  // No [] state for capabilities: an empty list only means none of these.
                  item.cells.map(cell => matrixCell(cell === 'none' ? 'no' : cell)),
                  `capability-${item.value}`,
                ),
              )
            : row(
                t.capabilities,
                cells(() => null),
              )}
        </>,
      )}

      {group(
        t.groups.setup,
        <>
          {row(
            t.setupTime,
            cells(project =>
              project.setupTime
                ? labelOf(localizedSetupTimeOptions(locale), project.setupTime)
                : null,
            ),
          )}
          {row(
            t.fields.implementation,
            cells(project => project.implementation || null),
            'implementation',
            true,
          )}
          {row(
            t.fields.support,
            cells(project => project.support || null),
            'support',
            true,
          )}
        </>,
      )}

      {group(
        t.groups.service,
        <>
          {row(
            t.offer.channels,
            cells(project => offer(project).supportChannels.join(', ') || null),
            'channels',
          )}
          {row(
            t.offer.response,
            cells(project => offer(project).supportResponse),
            'response',
          )}
          {row(
            t.offer.sla,
            cells(project => offer(project).sla),
            'sla',
          )}
          {row(
            t.offer.onboarding,
            cells(project => offer(project).onboarding.join(', ') || null),
            'onboarding',
          )}
          {row(
            t.offer.exitTerms,
            cells(project => offer(project).exitTerms.join(' · ') || null),
            'exit',
          )}
        </>,
      )}

      {group(
        t.groups.integrations,
        <>
          {integrations.map(item =>
            row(
              labelOf(integrationOptions, item.value),
              item.cells.map(matrixCell),
              `integration-${item.value}`,
            ),
          )}
          {/* No tool declared by any of them: still one row, so «connects to nothing» shows. */}
          {!integrations.length &&
            row(
              t.groups.integrations,
              cells(project =>
                project.integrationKeys?.length === 0 ? (
                  <span className="text-stone-500">{t.matrixNone}</span>
                ) : null,
              ),
              'integrations-none',
            )}
          {row(
            t.fields.integrations,
            cells(project => project.integrations || null),
            'integrations',
            true,
          )}
        </>,
      )}

      {group(
        t.groups.technical,
        <>
          {tools.map(item =>
            row(
              labelOf(toolOptions, item.value),
              item.cells.map(cell => matrixCell(cell === 'none' ? 'no' : cell)),
              `tool-${item.value}`,
            ),
          )}
          {!tools.length &&
            row(
              t.groups.technical,
              cells(() => null),
              'tools-none',
            )}
        </>,
      )}

      {group(
        t.groups.compliance,
        row(
          t.compliance,
          cells(project =>
            project.compliance?.length
              ? project.compliance
                  .map(value => labelOf(localizedComplianceOptions(locale), value))
                  .join(' · ')
              : null,
          ),
        ),
      )}

      {group(
        t.groups.provider,
        <>
          {providerKeys.length
            ? providerKeys.map(key =>
                row(
                  t.provider[key],
                  provider.map(values => values?.[key] ?? null),
                  `provider-${key}`,
                ),
              )
            : row(
                t.groups.provider,
                cells(() => null),
                'provider-none',
              )}
          {anyCases &&
            row(
              <>
                {t.cases}
                <span className="mt-1 block text-[11px] font-normal text-stone-400">
                  {t.casesNote}
                </span>
              </>,
              cells(project =>
                project.caseClients?.length
                  ? t.casesValue.replace('{clients}', project.caseClients.join(', '))
                  : null,
              ),
              'cases',
            )}
        </>,
      )}

      {group(
        t.groups.evidence,
        <>
          {row(
            t.fields.evidence,
            cells(project => project.evidence || null),
            'evidence',
            true,
          )}
          {row(
            t.demo,
            cells(project => {
              const url = safeSolutionUrl(project.evidenceUrl);
              return url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#365DC4]">
                  {t.viewEvidence}
                </a>
              ) : (
                <span className="text-stone-400">{t.noLink}</span>
              );
            }),
          )}
        </>,
      )}

      {group(
        t.groups.mine,
        <>
          {notes &&
            row(
              t.notes,
              keys.map(key => (
                <span key={key} className="whitespace-pre-wrap text-stone-500">
                  {notes[key] || t.noNotes}
                </span>
              )),
            )}
          {row(
            t.nextStep,
            keys.map(key => {
              const project = projects[key];
              return project?.solutionId ? (
                <Link
                  href={`/account/contacts/new?solution=${project.solutionId}`}
                  style={actionButtonStyle}
                  className="action-button inline-flex rounded-full px-4 py-3 text-xs font-medium"
                >
                  {t.requestContact}
                </Link>
              ) : (
                <span className="text-xs text-stone-500">
                  {project ? t.externalContact : t.gone}
                </span>
              );
            }),
          )}
        </>,
      )}
    </table>
  );
}

/** The scroll container every comparison sits in: its own region, keyboard-focusable. */
export function ComparisonRegion({
  label,
  describedBy,
  children,
}: {
  label: string;
  describedBy: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={0}
      className="mt-7 max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4]"
    >
      {children}
    </div>
  );
}
