import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireFounder, solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { verificationDomain } from '@/lib/trust/domain';
import { DomainForm } from '@/components/trust/domain-form';
import { getDictionary } from '@/i18n/get-dictionary';
export default async function TrustPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const dict = (await getDictionary(params.locale)).solutionEditor;
  if (!isSolutionId(params.id)) notFound();
  const account = await requireFounder(),
    sql = solutionsSql();
  const [solution] =
    await sql`SELECT published_data->>'website' AS website FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND published_data IS NOT NULL`;
  if (!solution) notFound();
  const [proof] =
    await sql`SELECT domain,token,verified_at FROM solution_domain_proofs WHERE solution_id=${params.id} AND owner_id=${account.id} AND domain=${verificationDomain(solution.website)} AND expires_at>now()`;
  return (
    <section className="account-page">
      <Link href={`/account/solutions/${params.id}`} className="text-sm text-stone-500">
        {dict.trust.back}
      </Link>
      <h1 className="mb-8 mt-7 text-4xl font-semibold tracking-tight">{dict.trust.title}</h1>
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
