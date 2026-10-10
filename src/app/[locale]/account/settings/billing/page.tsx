import { requireFounder } from '@/lib/solutions/server';
import { billingCountries } from '@/lib/billing/model';
import { getBillingProfile, paymentHistory } from '@/lib/billing/server';
import { categories, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { isAdPlacement } from '@/lib/ads/model';
import { BillingProfileForm } from '@/components/billing/billing-profile-form';
import { PaymentHistory } from '@/components/billing/payment-history';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.billing.meta.title} | shwcs`,
    robots: { index: false, follow: false },
  };
}

export default async function BillingSettings(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dictionary = await getDictionary(locale);
  const t = dictionary.billing;
  const account = await requireFounder();
  const [profile, payments] = await Promise.all([
    getBillingProfile(account.id),
    paymentHistory(account.id),
  ]);

  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = billingCountries.map(code => ({ code, name: regionName.of(code) ?? code }));
  const placementLabel = (placement: string, scope: string) => {
    const label = isAdPlacement(placement) ? dictionary.ads.placements[placement].label : placement;
    const category = categories.find(entry => entry.slug === scope)?.label;
    return category ? `${label} · ${localizedCategoryDisplayLabel(category, locale)}` : label;
  };
  const card = 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';

  return (
    <section className="space-y-6">
      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{t.profile.title}</h2>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-stone-500">{t.profile.desc}</p>
        {!profile && (
          <p className="mb-6 rounded-xl bg-[#E4EBFC] px-4 py-3 text-sm text-[#365DC4]">
            {t.profile.missing}
          </p>
        )}
        <BillingProfileForm
          initial={profile}
          version={profile?.version ?? 0}
          countries={countries}
          dict={t}
        />
      </div>

      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{t.history.title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{t.history.desc}</p>
        <PaymentHistory payments={payments} placementLabel={placementLabel} dict={t} />
      </div>

      <div className={card}>
        <h2 className="mb-4 text-lg font-medium text-stone-900">{t.how.title}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
          {t.how.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
