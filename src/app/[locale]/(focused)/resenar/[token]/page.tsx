import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql } from '@/lib/auth/security';
import { verificationDomain } from '@/lib/trust/domain';
import { conflictsWithWebsite } from '@/lib/reviews/model';
import { contactBacked, resolveReviewInvite } from '@/lib/reviews/invitations';
import { getSolutionReviews } from '@/lib/reviews/server';
import { localizedCompanySizes } from '@/lib/taxonomy';
import { ReviewComposer } from '@/components/reviews/review-composer';
import { InviteSignIn } from '@/components/reviews/invite-sign-in';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale, token } = await props.params;
  const dict = (await getDictionary(locale)).reviews.invite.page;
  const invite = await resolveReviewInvite(token).catch(() => null);
  return {
    title: `${invite ? dict.metaTitle.replace('{name}', invite.name) : dict.invalidTitle} | shwcs`,
    // The link is the founder's to share, not a page to index; the path carries the token.
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/**
 * Where the founder's invitation link lands (SHCWS-132). Signed out: sign in by email (or
 * password) and come back here. Signed in: the review form, which marks the review as
 * invited. Everything the founder cannot do on their own listing stays refused here too.
 */
export default async function ReviewInvitation(props: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await props.params;
  const dict = (await getDictionary(locale)).reviews;
  const text = dict.invite.page;
  const invite = await resolveReviewInvite(token).catch(() => null);

  if (!invite)
    return (
      <section className="mx-auto max-w-2xl px-6 pb-20 pt-8 sm:pt-14">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          {text.invalidTitle}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-500">{text.invalidBody}</p>
        <Link
          href="/#catalogo"
          className="mt-6 inline-block text-sm text-[#365DC4] underline underline-offset-4"
        >
          {text.toCatalog}
        </Link>
      </section>
    );

  let viewer: { id: string; name: string; verified: boolean; domain: string } | null = null;
  try {
    const account = await getSession((await cookies()).get(sessionCookie)?.value);
    if (account) {
      const [row] =
        await authSql()`SELECT name,email_verified_at FROM auth_accounts WHERE id=${account.id}`;
      viewer = {
        id: account.id,
        name: String(row?.name ?? ''),
        verified: Boolean(row?.email_verified_at),
        domain: account.email.split('@')[1] ?? '',
      };
    }
  } catch {
    /* treated as signed out: the email form still works */
  }

  let body: React.ReactNode;
  if (!viewer) body = <InviteSignIn invite={token} dict={dict} />;
  else if (viewer.id === invite.ownerId) body = <Notice>{text.own}</Notice>;
  else if (conflictsWithWebsite(viewer.domain, verificationDomain(invite.website)))
    body = <Notice>{text.conflict}</Notice>;
  else {
    const [reviews, backed] = await Promise.all([
      getSolutionReviews(invite.solutionId, viewer.id).catch(() => null),
      contactBacked(viewer.id, invite.solutionId).catch(() => false),
    ]);
    const mine = reviews?.reviews.find(review => review.mine) ?? null;
    body = (
      <>
        {mine && (
          <p className="mb-4 text-sm text-stone-500">
            {text.already.replace('{name}', invite.name)}
          </p>
        )}
        {backed && !mine && (
          <p className="mb-4 text-sm leading-relaxed text-stone-500">
            {dict.composer.contactNote.replace('{name}', invite.name)}
          </p>
        )}
        <ReviewComposer
          solutionId={invite.solutionId}
          solutionName={invite.name}
          existing={mine}
          defaultName={viewer.name}
          verified={viewer.verified}
          companySizes={localizedCompanySizes(locale).map(size => ({
            value: size.value,
            label: size.label,
          }))}
          invite={token}
          locale={locale}
          dict={dict}
        />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-14">
      <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-stone-900 sm:text-5xl">
        {text.title.replace('{name}', invite.name)}
      </h1>
      <p className="mb-8 mt-4 max-w-2xl text-base leading-relaxed text-stone-500">
        {text.intro.replace('{name}', invite.name)}{' '}
        <Link
          href={`/soluciones/${invite.solutionId}`}
          className="text-[#365DC4] underline underline-offset-4"
        >
          {dict.composer.viewListing}
        </Link>
      </p>
      {body}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-[#F4ECD5] p-4 text-sm leading-relaxed text-[#6b4d14]">
      {children}
    </p>
  );
}
