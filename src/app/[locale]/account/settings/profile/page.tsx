import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { AccountProfileForm } from '@/components/account-profile-form';
import { AvatarForm } from '@/components/settings/avatar-form';
import { PublicProfileForm } from '@/components/settings/public-profile-form';
import {
  getOwnProfile,
  getProfileItems,
  profileFollowerCount,
  type OwnProfile,
  type ProfileItems,
} from '@/lib/profiles/server';
import { siteOrigin } from '@/lib/seo';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function ProfileSettings(props: { params: Promise<{ locale: string }> }) {
  const account = await requireFounder();
  const locale = (await props.params).locale;
  const dictionary = await getDictionary(locale);
  const dict = dictionary.settings.profile;
  const sql = authSql();
  const [row] =
    await sql`SELECT name,organization,profile,role,(avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar FROM auth_accounts WHERE id=${account.id}`;
  const profile = {
    name: String(row?.name ?? ''),
    organization: String(row?.organization ?? ''),
    profile: String(row?.profile ?? ''),
    role: String(row?.role ?? ''),
  };
  const card = 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
  // The public profile (SHCWS-120). If its tables are missing or the read fails, the rest
  // of the page still works and the card says it is unavailable.
  const publicProfile = (await Promise.all([
    getOwnProfile(account.id),
    getProfileItems(account.id),
    profileFollowerCount(account.id),
  ]).catch(() => null)) as [OwnProfile | null, ProfileItems, number | null] | null;
  return (
    <section className="space-y-6">
      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.photoTitle}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.photoDesc}</p>
        <AvatarForm
          initial={row?.has_avatar ? '/api/account/avatar' : null}
          name={profile.name || account.email}
          dict={dict.avatar}
        />
      </div>

      <div className={card}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.infoTitle}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.infoDesc}</p>
        <AccountProfileForm
          initial={profile}
          dict={dict.form}
          options={{ profiles: dictionary.newsletter.profiles, roles: dictionary.newsletter.roles }}
        />
      </div>

      <div id="perfil-publico" className={`${card} scroll-mt-24`}>
        <h2 className="mb-2 text-lg font-medium text-stone-900">
          {dictionary.profiles.settings.title}
        </h2>
        {publicProfile ? (
          <PublicProfileForm
            initial={publicProfile[0]}
            suggestedName={profile.name}
            items={publicProfile[1]}
            followers={publicProfile[2]}
            host={new URL(siteOrigin).host}
            locale={locale}
            dict={dictionary.profiles.settings}
          />
        ) : (
          <p role="status" className="text-sm text-stone-500">
            {dictionary.profiles.errors.unavailable}
          </p>
        )}
      </div>
    </section>
  );
}
