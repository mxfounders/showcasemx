import { requireFounder, solutionsSql } from '@/lib/solutions/server';
import { googleConfig } from '@/lib/auth/google';
import { GoogleConnection } from '@/components/settings/google-connection';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function Connections(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const searchParams = await props.searchParams;
  const dict = (await getDictionary((await props.params).locale)).settings.connections;
  const account = await requireFounder(),
    sql = solutionsSql();
  const [identity] =
    await sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`;
  return (
    <section className="space-y-6">
      {searchParams.google === 'error' && (
        <p
          role="alert"
          className="rounded-2xl border border-[#E8C9BE] bg-[#FBF0EC] px-5 py-4 text-sm text-[#A94E35]"
        >
          {dict.linkError}
        </p>
      )}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-stone-900">Google</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.googleDesc}</p>
        <GoogleConnection
          linked={!!identity}
          email={identity ? String(identity.email) : undefined}
          available={!!googleConfig()}
          dict={dict.google}
        />
      </div>
    </section>
  );
}
