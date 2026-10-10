import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { contactTarget, findContact } from '@/lib/contacts/server';
import { ContactForm } from '@/components/contacts/forms';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contacts.meta.newContact} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function NewContact(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ solution?: string }>;
}) {
  const [{ locale }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const t = (await getDictionary(locale)).contacts;
  const id = searchParams.solution;
  if (!id || !isSolutionId(id)) notFound();
  const account = await requireBuyer('/account/contacts/new?solution=' + id),
    target = await contactTarget(id);
  if (!target) notFound();
  const existing = await findContact(account.id, id);
  const sql = solutionsSql();
  const [profile] = await sql`SELECT name,organization FROM auth_accounts WHERE id=${account.id}`;
  return (
    <section className="account-page">
      <Link href={'/soluciones/' + id} className="text-sm text-[#365DC4]">
        {t.newPage.back}
      </Link>
      <h1 className="mt-7 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
        {t.newPage.title.replace('{project}', () => target.name)}
      </h1>
      <p className="mb-10 mt-4 max-w-xl leading-relaxed text-stone-500">{t.newPage.intro}</p>
      {target.owner_id === account.id ? (
        <p className="text-stone-500">
          {t.newPage.ownSolution}{' '}
          <Link href="/account/opportunities" className="text-[#365DC4]">
            {t.newPage.opportunities}
          </Link>
          .
        </p>
      ) : existing ? (
        <div>
          <h2 className="text-xl font-medium">{t.newPage.existingTitle}</h2>
          <p className="mt-3 text-stone-500">{t.newPage.existingText}</p>
          <Link href={'/account/contacts/' + existing} className="mt-5 inline-block text-[#365DC4]">
            {t.newPage.viewRequest}
          </Link>
        </div>
      ) : (
        <ContactForm
          solutionId={id}
          recipientId={target.owner_id}
          projectName={target.name}
          email={account.email}
          defaults={{
            name: String(profile?.name ?? ''),
            company: String(profile?.organization ?? ''),
          }}
          dict={t}
        />
      )}
    </section>
  );
}
