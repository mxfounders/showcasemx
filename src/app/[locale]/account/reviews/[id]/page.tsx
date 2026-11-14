import { notFound } from 'next/navigation';
import Link from '@/i18n/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { verificationDomain } from '@/lib/trust/domain';
import { conflictsWithWebsite } from '@/lib/reviews/model';
import { contactBacked } from '@/lib/reviews/invitations';
import { getSolutionReviews } from '@/lib/reviews/server';
import { localizedCompanySizes } from '@/lib/taxonomy';
import { ReviewComposer } from '@/components/reviews/review-composer';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await props.params).locale);
  return {
    title: `${dict.reviews.write} | shwcs`,
    robots: { index: false, follow: false },
  };
}

/**
 * Where shwcs's own invitation to review lands (SHCWS-135), 30 days after a conversation
 * through shwcs. Any signed-in account may open it for a published listing; the review is
 * not invited by the vendor, and the «Contactó vía shwcs» level comes from the
 * conversation itself (review_contact_backed), never from having opened this page.
 */
export default async function WriteReview(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  if (!isSolutionId(id)) notFound();
  const account = await requireBuyer(`/account/reviews/${id}`);
  const dict = (await getDictionary(locale)).reviews;
  const sql = solutionsSql();
  const [listing] =
    await sql`SELECT s.owner_id,s.published_data->>'name' AS name,s.published_data->>'website' AS website,
      a.name AS viewer_name,a.email_verified_at IS NOT NULL AS verified
    FROM founder_solutions s JOIN auth_accounts a ON a.id=${account.id}
    WHERE s.id=${id} AND s.published_data IS NOT NULL`;
  if (!listing) notFound();
  const name = String(listing.name);
  const own = String(listing.owner_id) === account.id;
  const conflict = conflictsWithWebsite(
    account.email.split('@')[1] ?? '',
    verificationDomain(listing.website ? String(listing.website) : null),
  );
  const [backed, reviews] =
    own || conflict
      ? [false, null]
      : await Promise.all([
          contactBacked(account.id, id).catch(() => false),
          getSolutionReviews(id, account.id).catch(() => null),
        ]);
  const mine = reviews?.reviews.find(review => review.mine) ?? null;

  return (
    <section className="account-page">
      <Link href={`/soluciones/${id}`} className="text-sm text-[#365DC4]">
        {dict.composer.viewListing}
      </Link>
      <h1 className="mt-7 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
        {dict.composer.title.replace('{name}', name)}
      </h1>
      <p className="mb-8 mt-4 max-w-2xl leading-relaxed text-stone-500">
        {backed
          ? dict.composer.contactNote.replace('{name}', name)
          : dict.composer.intro.replace('{name}', name)}
      </p>
      {own || conflict ? (
        <p className="max-w-2xl rounded-2xl bg-[#F4ECD5] p-4 text-sm leading-relaxed text-[#6b4d14]">
          {own ? dict.composer.own : dict.errors.conflict}
        </p>
      ) : (
        <div className="max-w-4xl">
          <ReviewComposer
            solutionId={id}
            solutionName={name}
            existing={mine}
            defaultName={String(listing.viewer_name ?? '')}
            verified={Boolean(listing.verified)}
            companySizes={localizedCompanySizes(locale).map(size => ({
              value: size.value,
              label: size.label,
            }))}
            locale={locale}
            dict={dict}
          />
        </div>
      )}
    </section>
  );
}
