import Link from '@/i18n/navigation';
import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { ExportData, DeleteAccount } from '@/components/settings/data-controls';
import { LanguagePreference } from '@/components/settings/language-preference';
import { ConsentPreferencesButton } from '@/components/analytics/consent';
import { i18n, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function DataSettings(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).settings.data;
  const account = await requireFounder();
  let publications = 0,
    conversations = 0,
    twoStep = false,
    storageFailed = false;
  try {
    const sql = authSql();
    const [[owned], [contacts], [security]] = await Promise.all([
      sql`SELECT count(*)::int AS total FROM founder_solutions WHERE owner_id=${account.id} AND published_data IS NOT NULL`,
      sql`SELECT count(*)::int AS total FROM contact_requests WHERE buyer_id=${account.id} OR recipient_id=${account.id}`,
      sql`SELECT totp_confirmed_at IS NOT NULL AS enabled FROM auth_accounts WHERE id=${account.id}`,
    ]);
    publications = Number(owned?.total ?? 0);
    conversations = Number(contacts?.total ?? 0);
    twoStep = security?.enabled === true;
  } catch {
    storageFailed = true;
  }

  const current = (i18n.locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : i18n.defaultLocale;
  const card = 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
  const [beforeEmail, afterEmail] = dict.storedBody.split('{email}');
  return (
    <section className="space-y-6">
      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.languageTitle}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.languageDesc}</p>
        <LanguagePreference current={current} dict={dict.language} />
      </div>

      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.exportTitle}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.exportDesc}</p>
        <ExportData dict={dict.export} />
      </div>

      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.storedTitle}</h2>
        <p className="text-sm leading-relaxed text-stone-500">
          {beforeEmail}
          <a href="mailto:hola@shwcs.site" className="font-medium text-[#365DC4] hover:underline">
            hola@shwcs.site
          </a>
          {afterEmail}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/privacidad" className="font-medium text-[#365DC4] hover:underline">
            {dict.privacyLink}
          </Link>
          <Link href="/cookies" className="font-medium text-[#365DC4] hover:underline">
            {dict.cookiesLink}
          </Link>
          <ConsentPreferencesButton className="rounded font-medium text-[#365DC4] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]" />
        </p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-red-900">{dict.deleteTitle}</h2>
        {storageFailed ? (
          <p role="alert" className="text-sm text-[#A94E35]">
            {dict.deleteLoadError}
          </p>
        ) : (
          <DeleteAccount
            publications={publications}
            conversations={conversations}
            twoStep={twoStep}
            dict={dict.delete}
          />
        )}
      </div>
    </section>
  );
}
