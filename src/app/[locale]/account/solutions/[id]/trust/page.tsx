import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { CheckIcon, VerifiedIcon } from '@/components/icons/gota';
import { requireFounder, solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { verificationDomain } from '@/lib/trust/domain';
import { DomainForm } from '@/components/trust/domain-form';
import { getDictionary } from '@/i18n/get-dictionary';
import { getRecognition } from '@/lib/recognition/server';
import { verificationChecks } from '@/lib/recognition/model';
import { recognitionDate } from '@/lib/recognition/format';

/**
 * «Verificado por shwcs» from the founder's side: what the team reviews and where their
 * listing stands. Nothing to fill in — the team decides in ops (SHCWS-163). The domain
 * TXT proof stays as an optional way to save the team a step.
 */
export default async function TrustPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const dict = (await getDictionary(params.locale)).solutionEditor;
  const text = dict.trust;
  if (!isSolutionId(params.id)) notFound();
  const account = await requireFounder(),
    sql = solutionsSql();
  const [solution] =
    await sql`SELECT published_data->>'website' AS website FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND published_data IS NOT NULL`;
  if (!solution) notFound();
  const [[proof], recognition] = await Promise.all([
    sql`SELECT domain,token,verified_at FROM solution_domain_proofs WHERE solution_id=${params.id} AND owner_id=${account.id} AND domain=${verificationDomain(solution.website)} AND expires_at>now()`,
    getRecognition(params.id, String(solution.website)).catch(() => null),
  ]);
  return (
    <section className="account-page">
      <Link
        href={`/account/solutions/${params.id}`}
        className="text-sm text-stone-500 hover:text-stone-900"
      >
        {text.back}
      </Link>
      <h1 className="mt-7 text-4xl font-semibold tracking-tight">{text.title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">{text.intro}</p>
      <div className="mt-8 flex max-w-xl items-start gap-3 rounded-2xl border border-stone-200 bg-white p-5">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${recognition?.verifiedAt ? 'bg-[#E4EBFC] text-[#365DC4]' : 'bg-stone-100 text-stone-400'}`}
        >
          <VerifiedIcon aria-hidden="true" className="size-5" />
        </span>
        <p className="text-sm leading-relaxed text-stone-700">
          {recognition?.verifiedAt
            ? text.verifiedOn.replace(
                '{date}',
                recognitionDate(recognition.verifiedAt, params.locale),
              )
            : recognition?.movedAway
              ? text.moved
              : text.pending}
        </p>
      </div>
      <h2 className="mb-4 mt-10 text-lg font-medium text-stone-900">{text.whatTitle}</h2>
      <ul className="max-w-xl space-y-3">
        {verificationChecks.map(check => (
          <li key={check} className="flex items-start gap-3 text-sm text-stone-600">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#416B50]" />
            {text.checks[check]}
          </li>
        ))}
      </ul>
      <h2 className="mt-12 text-lg font-medium text-stone-900">{text.domainTitle}</h2>
      <p className="mb-5 mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
        {text.domainIntro}
      </p>
      <DomainForm
        id={params.id}
        dict={dict.domain}
        initial={
          proof
            ? {
                domain: String(proof.domain),
                token: String(proof.token),
                verified: !!proof.verified_at,
              }
            : undefined
        }
      />
    </section>
  );
}
