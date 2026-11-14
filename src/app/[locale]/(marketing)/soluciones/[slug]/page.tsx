import { cookies } from 'next/headers';
import { verificationDomain } from '@/lib/trust/domain';
import { notFound, permanentRedirect } from 'next/navigation';
import { isSolutionId, getSolutionCategories, type SolutionData } from '@/lib/solutions/model';
import { isSolutionSlug, solutionPath } from '@/lib/solutions/slug';
import { solutionsSql } from '@/lib/solutions/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { getSolutionSocial, getSolutionComments } from '@/lib/solutions/social';
import { publicProducts } from '@/lib/solutions/public';
import { pickSimilar, similarExits } from '@/lib/solutions/similar';
import { outboundMedium, sponsoredVisitParam } from '@/lib/solutions/outbound';
import { sponsoredBookingParam } from '@/lib/ads/model';
import { SponsoredVisit } from '@/components/ads/beacons';
import type { SimilarSection } from '@/components/solutions/similar-solutions';
import type { Metadata } from 'next';
import { SolutionPresentation } from '@/components/solutions/solution-presentation';
import { getSolutionReviews } from '@/lib/reviews/server';
import { ReviewSection } from '@/components/reviews/review-section';
import { SolutionUpdates } from '@/components/solutions/solution-updates';
import { getSolutionUpdates } from '@/lib/solutions/updates';
import { ReviewBadge } from '@/components/reviews/review-badge';
import { localizedCompanySizes } from '@/lib/taxonomy';
import { complianceResult } from '@/lib/compliance/server';
import { getRecognition } from '@/lib/recognition/server';
import { recognitionPills } from '@/lib/recognition/format';
import { badgeOptions, badgeSrc } from '@/lib/recognition/badges';
import type { Recognition } from '@/lib/recognition/model';
import type { Dictionary } from '@/i18n/dictionary';
import { RecognitionSeals } from '@/components/recognition/recognition-seals';
import { ComplianceNote } from '@/components/compliance/compliance-note';
import { solutionResponseSignal } from '@/lib/solutions/response';
import { ResponseSignalNote } from '@/components/catalog/response-signal';
import { getDictionary } from '@/i18n/get-dictionary';
import { localeAlternates, siteOrigin } from '@/lib/seo';
import { solutionMarkdownUrl } from '@/lib/machine-readable';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd, solutionJsonLd, solutionQuestionsJsonLd } from '@/lib/structured-data';
import { getSolutionQuestions } from '@/lib/questions/server';
import { contactBacked } from '@/lib/reviews/invitations';
import { QuestionSection } from '@/components/questions/question-section';
import { categories as taxonomyCategories, localizedCategoryDisplayLabel } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * The segment is the listing's slug (SHCWS-101). A UUID or a slug it used before still
 * finds it: the middleware answers those with a 301 to the current slug, so the page
 * only meets them when the middleware could not tell (src/lib/solutions/slug-routing.ts).
 */
function listingRef(segment: string) {
  return isSolutionId(segment)
    ? { id: segment, slug: segment }
    : isSolutionSlug(segment)
      ? { id: null, slug: segment }
      : null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const ref = listingRef(params.slug);
  if (!ref) return {};
  const { meta } = await getDictionary(params.locale);
  const sql = solutionsSql();
  const [row] = await sql`SELECT id::text AS id,slug,published_data
    FROM founder_solutions WHERE published_data IS NOT NULL AND (id=${ref.id}::uuid OR slug=${ref.slug}
      OR id=(SELECT h.solution_id FROM solution_slug_history h WHERE h.slug=${ref.slug}))`;
  if (!row) return {};
  const data = row.published_data as SolutionData;
  // Canonical, hreflang and Open Graph name the slug, whatever URL reached the page.
  const path = solutionPath({ id: String(row.id), slug: row.slug as string | null });
  const title = `${data.name} | shwcs`;
  const description = data.problem
    ? data.problem.length > 150
      ? data.problem.substring(0, 147) + '...'
      : data.problem
    : meta.solution.fallbackDescription;

  return {
    title,
    description,
    alternates: {
      ...localeAlternates(params.locale, path),
      // The same listing as Markdown, for assistants (SHCWS-106).
      types: { 'text/markdown': solutionMarkdownUrl(path) },
    },
    openGraph: {
      title,
      description,
      url: `${siteOrigin}/${params.locale}${path}`,
      siteName: 'shwcs',
      locale: meta.site.ogLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicSolution(props: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  // A sponsored slot links here with `?from=sponsored`, so the project's links tag the
  // visit as `utm_medium=sponsored` (SHCWS-19).
  const searchParams = await props.searchParams;
  const medium = outboundMedium(searchParams[sponsoredVisitParam]);
  // `ad` names the booking the slot belongs to, so the visit counts for it (SHCWS-70).
  const adParam = searchParams[sponsoredBookingParam];
  const sponsoredBooking =
    medium === 'sponsored' && typeof adParam === 'string' && isSolutionId(adParam) ? adParam : null;
  const ref = listingRef(params.slug);
  if (!ref) notFound();
  const dict = await getDictionary(params.locale);
  const sql = solutionsSql();
  const [row] =
    await sql`SELECT id::text AS id,slug,owner_id,catalog_key,published_data - 'contactEmail' - 'otherCategory' AS published_data,published_at::text,
  EXISTS(SELECT 1 FROM solution_site_image_ready r WHERE r.solution_id=founder_solutions.id) AS has_site_image
  FROM founder_solutions WHERE published_data IS NOT NULL AND (id=${ref.id}::uuid OR slug=${ref.slug}
    OR id=(SELECT h.solution_id FROM solution_slug_history h WHERE h.slug=${ref.slug}))`;
  if (!row) notFound();
  // The UUID stays the identity for everything below; the slug only names the page.
  const id = String(row.id);
  const path = solutionPath({ id, slug: row.slug as string | null });
  if (path !== `/soluciones/${params.slug}`) {
    // Normally the middleware's 301 got here first; this covers a listing it did not know
    // yet (published or renamed seconds ago). Under the loading boundary it is a soft redirect.
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams))
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value])
        query.append(key, item);
    permanentRedirect(`/${params.locale}${path}${query.size ? `?${query}` : ''}`);
  }
  const data = row.published_data as SolutionData;
  const [proof] =
    await sql`SELECT p.domain FROM solution_domain_proofs p JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id WHERE p.solution_id=${id} AND p.domain=${verificationDomain(data.website)} AND p.verified_at IS NOT NULL AND p.expires_at>now()`;
  // The public ficha still renders when session/social storage is unavailable —
  // only the like/comments block is skipped, never the whole page.
  let viewer = '',
    viewerName = '',
    viewerVerified = false;
  try {
    const account = await getSession((await cookies()).get(sessionCookie)?.value);
    if (account) {
      viewer = account.id;
      const [profile] =
        await sql`SELECT name,email_verified_at FROM auth_accounts WHERE id=${account.id}`;
      viewerName = String(profile?.name ?? '');
      viewerVerified = Boolean(profile?.email_verified_at);
    }
  } catch {
    /* public ficha still works when account storage is unavailable */
  }
  let social: { likes: number; liked: boolean; commentsCount: number } | undefined,
    comments: Awaited<ReturnType<typeof getSolutionComments>> | undefined,
    reviews: Awaited<ReturnType<typeof getSolutionReviews>> | undefined;
  try {
    [social, comments] = await Promise.all([
      getSolutionSocial(id, viewer),
      getSolutionComments(id, viewer),
    ]);
  } catch {
    /* like/comments are optional; the ficha itself must still render */
  }
  // Reviews and registry results are optional and independent: an outage in either
  // hides only its own section, never the ficha.
  const [
    reviewsLoad,
    complianceLoad,
    recognitionLoad,
    responseLoad,
    questionsLoad,
    contactedLoad,
    updatesLoad,
  ] = await Promise.allSettled([
    getSolutionReviews(id, viewer),
    complianceResult(id),
    getRecognition(id, data.website),
    // How the founder answers contact requests (SHCWS-52); null below 3 requests.
    solutionResponseSignal(id),
    // Public questions and the founder's answers (SHCWS-57).
    getSolutionQuestions(id, viewer),
    // Whether the viewer's review will show «Contactó vía shwcs» (SHCWS-135).
    viewer && viewer !== String(row.owner_id)
      ? contactBacked(viewer, id)
      : Promise.resolve(false),
    // Dated updates and whether the viewer follows the listing (SHCWS-24).
    getSolutionUpdates(id, viewer),
  ]);
  const updates = updatesLoad.status === 'fulfilled' ? updatesLoad.value : null;
  if (reviewsLoad.status === 'fulfilled') reviews = reviewsLoad.value;
  const compliance = complianceLoad.status === 'fulfilled' ? complianceLoad.value : null;
  const recognition = recognitionLoad.status === 'fulfilled' ? recognitionLoad.value : null;
  const responseSignal = responseLoad.status === 'fulfilled' ? responseLoad.value : null;
  const questions = questionsLoad.status === 'fulfilled' ? questionsLoad.value : null;
  const faq = questions && solutionQuestionsJsonLd(path, params.locale, questions);
  // Country names resolved here, not in the browser, so the markup matches on hydration.
  const regionNames = new Intl.DisplayNames([params.locale], { type: 'region' });
  const countryNames = Object.fromEntries(
    (reviews?.reviews ?? [])
      .flatMap(review => (review.country ? [review.country] : []))
      .map(code => [code, regionNames.of(code) ?? code]),
  );
  // Up to three listings that declared something in common, weighted by how specific it
  // is (src/lib/solutions/similar.ts), from the same cached organic catalogue the
  // category pages use: never a sponsored slot. With fewer than three, the listing still
  // ends with its collection, its category page or the brief (SHCWS-55).
  const current = {
    categories: getSolutionCategories(data),
    capabilities: data.capabilities,
    industries: data.industries,
    companySizes: data.companySizes,
  };
  let items: SimilarSection['items'] = [];
  try {
    items = pickSimilar(current, id, await publicProducts());
  } catch {
    /* optional: the exits below still give the listing a way out */
  }
  const similar: SimilarSection = { items, exits: similarExits(current, items.length) };
  // Structured data from what the page already shows (SHCWS-100): public reviews only.
  const firstCategory = getSolutionCategories(data)[0];
  const categoryPage = taxonomyCategories.find(item => item.label === firstCategory);
  const structured = (
    <>
      <JsonLd
        data={solutionJsonLd({
          path,
          locale: params.locale,
          data,
          publishedAt: row.published_at as string | null,
          reviews: reviews?.summary ?? { count: 0, average: null },
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'shwcs', path: `/${params.locale}` },
          ...(categoryPage
            ? [
                {
                  name: localizedCategoryDisplayLabel(categoryPage.label, params.locale),
                  path: `/${params.locale}/explorar/${categoryPage.slug}`,
                },
              ]
            : []),
          { name: data.name, path: `/${params.locale}${path}` },
        ])}
      />
      {faq && <JsonLd data={faq} />}
    </>
  );
  return (
    <>
      {structured}
      {sponsoredBooking && <SponsoredVisit bookingId={sponsoredBooking} solutionId={id} />}
      <SolutionPresentation
        verified={recognition?.verifiedAt ? { label: dict.recognition.verified } : null}
        recognition={
          recognition && (
            <RecognitionSeals
              seals={recognitionSeals(id, data.name, recognition, params.locale, dict)}
              moreLabel={dict.recognition.howItWorks}
              buttonLabel={dict.recognition.sealButton}
            />
          )
        }
        verifiedDomain={proof ? String(proof.domain) : null}
        id={id}
        path={path}
        data={data}
        catalogKey={row.catalog_key as string | null}
        publishedAt={row.published_at as string | null}
        social={social}
        comments={comments}
        viewerName={viewerName}
        own={!!viewer && viewer === String(row.owner_id)}
        viewerLoggedIn={!!viewer}
        viewerVerified={viewerVerified}
        hasSiteImage={Boolean(row.has_site_image)}
        similar={similar}
        outboundMedium={medium}
        sponsoredBooking={sponsoredBooking}
        reviewBadge={
          reviews && (
            <ReviewBadge summary={reviews.summary} locale={params.locale} dict={dict.reviews} />
          )
        }
        reviews={
          <>
            {updates && (
              <SolutionUpdates
                solutionId={id}
                updates={updates.updates}
                following={updates.following}
                signedIn={!!viewer}
                own={!!viewer && viewer === String(row.owner_id)}
                locale={params.locale}
                dict={dict.follows}
              />
            )}
            {reviews && (
              <ReviewSection
                solutionId={id}
                solutionName={data.name}
                summary={reviews.summary}
                reviews={reviews.reviews}
                viewer={{
                  signedIn: !!viewer,
                  owner: !!viewer && viewer === String(row.owner_id),
                  name: viewerName,
                  contacted: contactedLoad.status === 'fulfilled' && contactedLoad.value,
                }}
                companySizes={localizedCompanySizes(params.locale).map(size => ({
                  value: size.value,
                  label: size.label,
                }))}
                countryNames={countryNames}
                proofMethod={compliance?.country === 'MX' ? 'cfdi' : null}
                locale={params.locale}
                dict={dict.reviews}
              />
            )}
            {questions && (
              <QuestionSection
                solutionId={id}
                solutionName={data.name}
                questions={questions}
                viewer={{
                  signedIn: !!viewer,
                  owner: !!viewer && viewer === String(row.owner_id),
                  verified: viewerVerified,
                  name: viewerName,
                }}
                locale={params.locale}
                dict={dict.questions}
              />
            )}
          </>
        }
        responseSignal={
          <ResponseSignalNote
            signal={responseSignal}
            locale={params.locale}
            // The aside is narrow: let the line wrap instead of cutting «respondidas».
            className="mt-2 text-xs text-stone-500 [&>span]:whitespace-normal"
          />
        }
        compliance={
          <ComplianceNote
            result={compliance}
            locale={params.locale}
            dict={dict.compliance.public}
          />
        }
        locale={params.locale}
        dict={dict.solution}
        uiDict={dict.solutionUi}
      />
    </>
  );
}

/** The seals under the listing's name: same artwork as the embeddable badges. */
function recognitionSeals(
  id: string,
  name: string,
  recognition: Recognition,
  locale: string,
  dict: Dictionary,
) {
  const pills = recognitionPills(recognition, dict.recognition, locale);
  return badgeOptions(name, recognition, locale, dict.recognition).flatMap(option => {
    const pill = pills.find(item => item.key === option.key);
    return pill
      ? [
          {
            key: option.key,
            src: badgeSrc('', id, option, 'light', locale, 'seal'),
            title: pill.label,
            detail: pill.detail,
          },
        ]
      : [];
  });
}
