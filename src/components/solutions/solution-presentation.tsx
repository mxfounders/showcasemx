import { PublicMetrics } from '@/components/metrics/public-metrics';
import { ReportForm } from '@/components/trust/report-form';
import { SolutionGallery } from './solution-gallery';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { LikeButton } from './like-button';
import { SolutionSocial } from './solution-social';
import { SimilarSolutions } from './similar-solutions';
import type { ReactNode } from 'react';
import Link from '@/i18n/navigation';
import { ArrowLeft, ArrowUpRight, ArrowRight, Play, CircleAlert } from 'lucide-react';
import { SocialIcon } from '@/components/icons/social-icons';
import {
  getSolutionCategories,
  safeSolutionUrl,
  solutionEvaluationFields,
  solutionCapabilities,
  type SolutionData,
} from '@/lib/solutions/model';
import { solutionSlides } from '@/lib/solutions/gallery';
import { solutionChecklist } from '@/lib/solutions/completeness';
import { actionButtonStyle, brandColors, solutionCategoryTones } from '@/lib/brand-colors';
import {
  industries as industryOptions,
  localizedIndustries,
  localizedCompanySizes,
  localizedCapabilityLabel,
  localizedIntegrationOptions,
  localizedPriceBandOptions,
  localizedSetupTimeOptions,
  localizedComplianceOptions,
  localizedCategoryDisplayLabel,
  localizedOfferingOptions,
  localizedLinkKind,
} from '@/lib/taxonomy';
import type { SolutionComment } from '@/lib/solutions/social';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';
const industryTones = Object.fromEntries(industryOptions.map(item => [item.value, item.tone]));
const capabilityCategories = Object.fromEntries(
  solutionCapabilities.map(item => [item.id, item.category]),
);

// Founder-authored prose (name, problem, audience, scope, notFor,
// pricing/implementation/integrations/support/evidence text, founder bios) is
// deliberately never translated here — it's the project's own words, in
// whatever language they wrote it; only the chrome around it is.
export function SolutionPresentation({
  data,
  id,
  catalogKey,
  publishedAt,
  verifiedDomain,
  preview = false,
  social,
  comments,
  viewerName,
  own = false,
  viewerLoggedIn = false,
  viewerVerified = false,
  hasSiteImage = false,
  similar = [],
  reviewBadge,
  reviews,
  compliance,
  locale,
  dict,
  uiDict,
}: {
  data: SolutionData;
  id: string;
  catalogKey?: string | null;
  publishedAt?: string | null;
  verifiedDomain?: string | null;
  preview?: boolean;
  social?: { likes: number; liked: boolean; commentsCount: number };
  comments?: SolutionComment[];
  viewerName?: string;
  own?: boolean;
  viewerLoggedIn?: boolean;
  viewerVerified?: boolean;
  hasSiteImage?: boolean;
  similar?: PublishedProduct[];
  /** Public ficha only: rating under the title and the reviews section (src/components/reviews). */
  reviewBadge?: ReactNode;
  reviews?: ReactNode;
  /** Public registry result (src/components/compliance), under the domain check. */
  compliance?: ReactNode;
  locale?: string;
  dict: Dictionary['solution'];
  uiDict: Dictionary['solutionUi'];
}) {
  const website = safeSolutionUrl(data.website),
    evidence = safeSolutionUrl(data.evidenceUrl),
    demo = safeSolutionUrl(data.demoUrl);
  const evaluation = solutionEvaluationFields.filter(
    field => !['scope', 'evidence'].includes(field.key),
  );
  const slides = solutionSlides(id, data.name, {
    screenshots: data.screenshots,
    hasSiteImage,
    hideSiteImage: data.hideSiteImage,
    labels: uiDict.gallery,
  });
  const industryLabels = Object.fromEntries(
    localizedIndustries(locale).map(item => [item.value, item.label]),
  );
  const companySizeLabels = Object.fromEntries(
    localizedCompanySizes(locale).map(item => [item.value, item.label]),
  );
  const integrationLabels = Object.fromEntries(
    localizedIntegrationOptions(locale).map(item => [item.value, item.label]),
  );
  const priceBandLabels = Object.fromEntries(
    localizedPriceBandOptions(locale).map(item => [item.value, item.label]),
  );
  const setupTimeLabels = Object.fromEntries(
    localizedSetupTimeOptions(locale).map(item => [item.value, item.label]),
  );
  const complianceLabels = Object.fromEntries(
    localizedComplianceOptions(locale).map(item => [item.value, item.label]),
  );
  const offeringLabels = Object.fromEntries(
    localizedOfferingOptions(locale).map(item => [item.value, item.label]),
  );
  // Shown to whoever reads the ficha, not just its owner: solutionChecklist
  // already exists to guide the founder, and being honest about a gap here is
  // exactly the information a buyer needs before deciding whether to reach out.
  // completeness is never equated with quality — see the copy below.
  const missing = solutionChecklist(data, locale).filter(item => !item.done);
  return (
    <article className={preview ? 'account-page' : 'mx-auto max-w-6xl px-6 py-12 sm:py-20'}>
      {!preview && <PublicMetrics solutionId={id} />}
      <Link
        href={preview ? '/account/solutions/' + id : '/#catalogo'}
        className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {preview ? dict.backToApplication : dict.backToCatalog}
      </Link>
      {preview && (
        <p className="mb-6 rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          {dict.previewBanner}
        </p>
      )}
      <header className="border-b border-stone-200 pb-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs text-stone-500">
            {offeringLabels[data.kind] ?? data.kind}
          </span>
          {getSolutionCategories(data).map(category => {
            const tone = brandColors[solutionCategoryTones[category] ?? 'blue'];
            return (
              <span
                key={category}
                className="rounded-full px-3 py-1.5 text-xs"
                style={{ backgroundColor: tone.soft, color: tone.solid }}
              >
                {localizedCategoryDisplayLabel(category, locale)}
              </span>
            );
          })}
        </div>
        <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-6xl">
          {data.name || dict.namePending}
        </h1>
        {!preview && reviewBadge}
        <p className="mt-5 max-w-3xl whitespace-pre-wrap break-words text-lg leading-relaxed text-stone-600">
          {data.problem || dict.descriptionPending}
        </p>
        {!!data.capabilities?.length && (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.capabilities.map(capId => {
              const tone =
                brandColors[solutionCategoryTones[capabilityCategories[capId] ?? ''] ?? 'blue'];
              return (
                <span
                  key={capId}
                  className="rounded-full px-3 py-1.5 text-xs"
                  style={{ backgroundColor: tone.soft, color: tone.solid }}
                >
                  {localizedCapabilityLabel(capId, locale)}
                </span>
              );
            })}
          </div>
        )}
        <p className="mt-5 text-xs text-stone-400">
          {dict.declaredBy} ·{' '}
          {preview
            ? dict.draftPrivate
            : publishedAt
              ? dict.publishedUpdated +
                ' ' +
                new Date(publishedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
                  timeZone: 'America/Mexico_City',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : dict.dateUnknown}
        </p>
        {!preview && verifiedDomain && (
          <p className="mt-4 text-xs text-[#416B50]">
            {dict.domainVerified}: {verifiedDomain}. {dict.domainVerifiedSuffix}
          </p>
        )}
        {!preview && compliance}
      </header>

      {slides.length ? (
        <div className="mt-10">
          <SolutionGallery slides={slides} dict={uiDict.gallery} />
        </div>
      ) : (
        <p className="mt-10 text-sm text-stone-500">{dict.noImages}</p>
      )}

      {(data.priceBand || data.setupTime || data.integrationKeys !== undefined) && (
        <dl className="mt-6 flex flex-wrap gap-6 border-t border-stone-200 pt-6 text-sm">
          {data.priceBand && (
            <div>
              <dt className="text-xs text-stone-400">{dict.priceBand}</dt>
              <dd className="mt-1 font-medium text-stone-800">
                {priceBandLabels[data.priceBand] ?? data.priceBand}
              </dd>
            </div>
          )}
          {data.setupTime && (
            <div>
              <dt className="text-xs text-stone-400">{dict.setupTime}</dt>
              <dd className="mt-1 font-medium text-stone-800">
                {setupTimeLabels[data.setupTime] ?? data.setupTime}
              </dd>
            </div>
          )}
          {data.integrationKeys !== undefined && (
            <div>
              <dt className="text-xs text-stone-400">{dict.integratesWith}</dt>
              <dd className="mt-1 font-medium text-stone-800">
                {data.integrationKeys.length
                  ? `${data.integrationKeys.length} ${dict.toolsCount}`
                  : dict.noToolsDeclared}
              </dd>
            </div>
          )}
        </dl>
      )}

      {!!missing.length && (
        <details className="mt-6">
          <summary>
            {dict.missingInfoTitle} ({missing.length})
          </summary>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {dict.missingInfoNote}
            </p>
            <ul className="mt-4 space-y-2">
              {missing.map(item => (
                <li key={item.key} className="text-sm text-stone-600">
                  <span className="font-medium text-stone-800">{item.label}.</span> {item.hint}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-xl font-medium">{dict.audienceTitle}</h2>
            <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">
              {data.audience || dict.audienceFallback}
            </p>
            {(data.industries !== undefined || data.companySizes !== undefined) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {data.industries !== undefined &&
                  (data.industries.length ? (
                    data.industries.map(value => {
                      const tone = brandColors[industryTones[value] ?? 'blue'];
                      return (
                        <span
                          key={value}
                          className="rounded-full px-3 py-1.5 text-xs"
                          style={{ backgroundColor: tone.soft, color: tone.solid }}
                        >
                          {industryLabels[value] ?? value}
                        </span>
                      );
                    })
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">
                      {dict.anyIndustry}
                    </span>
                  ))}
                {data.companySizes !== undefined &&
                  (data.companySizes.length ? (
                    data.companySizes.map(value => (
                      <span
                        key={value}
                        className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600"
                      >
                        {companySizeLabels[value] ?? value}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600">
                      {dict.anyCompanySize}
                    </span>
                  ))}
              </div>
            )}
          </section>
          <section className="border-t border-stone-200 pt-8">
            <h2 className="text-xl font-medium">{dict.notForTitle}</h2>
            <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">
              {data.notFor || dict.notForFallback}
            </p>
          </section>
          <section className="border-t border-stone-200 pt-8">
            <h2 className="text-xl font-medium">{dict.scopeTitle}</h2>
            <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">
              {data.scope || dict.scopeFallback}
            </p>
          </section>
          <section className="border-t border-stone-200 pt-8">
            <h2 className="text-xl font-medium">{dict.beforeDecidingTitle}</h2>
            <dl className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {evaluation.map(field => (
                <div key={field.key}>
                  <dt className="text-sm font-medium">{dict.evaluationLabels[field.key]}</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-500">
                    {data[field.key] || dict.fieldNotProvided}
                  </dd>
                </div>
              ))}
              {data.integrationKeys !== undefined && (
                <div>
                  <dt className="text-sm font-medium">{dict.integratesWith}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {data.integrationKeys.length ? (
                      data.integrationKeys.map(intId => (
                        <span
                          key={intId}
                          className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                        >
                          {integrationLabels[intId] ?? intId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm leading-relaxed text-stone-500">
                        {dict.noIntegrationsNote}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {!!data.compliance?.length && (
                <div>
                  <dt className="text-sm font-medium">{dict.complianceLabel}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {data.compliance.map(compId => (
                      <span
                        key={compId}
                        className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600"
                      >
                        {complianceLabels[compId] ?? compId}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>
          <section className="border-t border-stone-200 pt-8">
            <h2 className="text-xl font-medium">{dict.workTitle}</h2>
            <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">
              {data.evidence || dict.workFallback}
            </p>
            {evidence && (
              <a
                href={evidence}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]"
              >
                {dict.viewDemoLink}
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only"> {dict.otherTab}</span>
              </a>
            )}
          </section>
          {!!data.founders?.length && (
            <section className="border-t border-stone-200 pt-8">
              <h2 className="text-xl font-medium">{dict.teamTitle}</h2>
              <p className="mt-2 text-xs text-stone-400">{dict.teamNote}</p>
              <div className="mt-6 space-y-7">
                {data.founders
                  .filter(person => person.name.trim())
                  .map((person, index) => (
                    <article key={index}>
                      <h3 className="text-lg font-medium">{person.name}</h3>
                      {person.role && <p className="mt-1 text-sm text-stone-500">{person.role}</p>}
                      {person.bio && (
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">
                          {person.bio}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {person.links.map((link, i) => {
                          const href = safeSolutionUrl(link.url);
                          return href ? (
                            <a
                              key={i}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-[#365DC4]"
                            >
                              <SocialIcon label={link.label} className="size-4 shrink-0" />
                              {localizedLinkKind(link.label, locale)}
                              <ArrowUpRight className="size-3" aria-hidden="true" />
                              <span className="sr-only"> {dict.otherTab}</span>
                            </a>
                          ) : null;
                        })}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </div>
        <aside className="border-t border-stone-200 pt-6 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
          {demo && (
            <div className="mb-8">
              <a
                href={demo}
                target="_blank"
                rel="noopener noreferrer"
                style={actionButtonStyle}
                className="action-button flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium"
              >
                {dict.demoButton}
                <Play className="size-4" aria-hidden="true" />
                <span className="sr-only"> {dict.otherTab}</span>
              </a>
            </div>
          )}
          <h2 className="text-lg font-medium">{dict.fitTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{dict.fitDesc}</p>
          {website && (
            <a
              data-official-site
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              style={actionButtonStyle}
              className="action-button mt-6 flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              {dict.officialSite}
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only"> {dict.otherTab}</span>
            </a>
          )}
          {!preview && (
            <>
              <Link
                href={`/account/contacts/new?solution=${id}`}
                style={actionButtonStyle}
                className="action-button mt-3 flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium"
              >
                {dict.contactCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <div className="mt-3">
                <SaveProjectButton
                  variant="secondary"
                  projectKey={catalogKey ? `catalog:${catalogKey}` : `solution:${id}`}
                  dict={uiDict}
                />
              </div>
              {social && (
                <div className="mt-3">
                  <LikeButton
                    id={id}
                    initialLikes={social.likes}
                    liked={social.liked}
                    own={own}
                    dict={uiDict}
                  />
                  {viewerLoggedIn && !viewerVerified && !own && (
                    <p className="mt-2 text-xs leading-relaxed text-stone-400">
                      {dict.verifyNote}{' '}
                      <Link
                        href="/account/settings"
                        className="underline underline-offset-4 hover:text-stone-600"
                      >
                        {dict.verifyLink}
                      </Link>
                      .
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {!!data.projectLinks?.length && (
            <div className="mt-6 border-t border-stone-200 pt-6">
              <h3 className="text-sm font-medium text-stone-700">{dict.followProject}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.projectLinks.map((link, index) => {
                  const href = safeSolutionUrl(link.url);
                  return href ? (
                    <a
                      key={index}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
                    >
                      <SocialIcon label={link.label} className="size-3.5 shrink-0" />
                      {localizedLinkKind(link.label, locale)}
                      <span className="sr-only"> {dict.otherTab}</span>
                    </a>
                  ) : null;
                })}
              </div>
            </div>
          )}
          <p className="mt-6 text-xs leading-relaxed text-stone-400">{dict.disclaimer}</p>
          {!preview && (
            <details className="mt-6 border-t border-stone-200 pt-5">
              <summary className="cursor-pointer text-xs text-stone-500">{dict.reportThis}</summary>
              <div className="mt-4">
                <ReportForm solutionId={id} dict={uiDict} />
              </div>
            </details>
          )}
        </aside>
      </div>
      {!preview && reviews}
      {!preview && social && (
        <SolutionSocial
          id={id}
          initialCommentsCount={social.commentsCount}
          comments={comments ?? []}
          initialName={viewerName}
          own={own}
          dict={uiDict}
          locale={locale}
        />
      )}
      {!preview && !!similar.length && <SimilarSolutions products={similar} dict={dict} />}
    </article>
  );
}
