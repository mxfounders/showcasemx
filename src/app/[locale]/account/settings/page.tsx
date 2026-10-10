import Link from '@/i18n/navigation';
import {
  Bell,
  UserRound,
  ShieldCheck,
  Link2,
  ArrowRight,
  DatabaseZap,
  CircleAlert,
  CircleCheck,
} from 'lucide-react';
import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { brandColors } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

// Reads state rather than listing links: the point of this page is telling you
// what is actually configured, so a gap is visible without opening every section.
export default async function SettingsPage(props: { params: Promise<{ locale: string }> }) {
  const account = await requireFounder();
  const dict = (await getDictionary((await props.params).locale)).settings.overview;
  let name = '',
    organization = '',
    hasAvatar = false,
    verified = false,
    twoStep = false,
    sessions = 1,
    google = false,
    emailPrefs = 0,
    ready = true;
  try {
    const sql = authSql();
    const [[row], [sessionCount], [identity], [prefs]] = await Promise.all([
      sql`SELECT name,organization,(avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar,email_verified_at,totp_confirmed_at FROM auth_accounts WHERE id=${account.id}`,
      sql`SELECT count(*)::int AS total FROM auth_sessions WHERE account_id=${account.id} AND expires_at>now()`,
      sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`,
      sql`SELECT count(*)::int AS total FROM notification_preferences WHERE owner_id=${account.id}`,
    ]);
    name = String(row?.name ?? '');
    organization = String(row?.organization ?? '');
    hasAvatar = Boolean(row?.has_avatar);
    verified = Boolean(row?.email_verified_at);
    twoStep = Boolean(row?.totp_confirmed_at);
    sessions = Number(sessionCount?.total ?? 1);
    google = Boolean(identity);
    emailPrefs = Number(prefs?.total ?? 0);
  } catch {
    ready = false;
  }

  const cards = [
    {
      href: '/account/settings/profile',
      title: dict.profile.title,
      Icon: UserRound,
      tone: brandColors.lavender,
      state: name ? `${name}${organization ? ` · ${organization}` : ''}` : dict.profile.noName,
      done: Boolean(name),
      hint: hasAvatar ? dict.profile.withPhoto : dict.profile.withoutPhoto,
    },
    {
      href: '/account/settings/security',
      title: dict.security.title,
      Icon: ShieldCheck,
      tone: brandColors.sage,
      state: twoStep ? dict.security.twoStepOn : dict.security.passwordOnly,
      done: twoStep,
      hint: `${(sessions === 1 ? dict.security.sessionsOne : dict.security.sessionsOther).replace('{count}', String(sessions))} · ${verified ? dict.security.emailConfirmed : dict.security.emailUnconfirmed}`,
    },
    {
      href: '/account/settings/connections',
      title: dict.connections.title,
      Icon: Link2,
      tone: brandColors.terracotta,
      state: google ? dict.connections.googleLinked : dict.connections.none,
      done: google,
      hint: dict.connections.hint,
    },
    {
      href: '/account/settings/notifications',
      title: dict.notifications.title,
      Icon: Bell,
      tone: brandColors.blue,
      state: emailPrefs ? dict.notifications.saved : dict.notifications.defaults,
      done: true,
      hint: dict.notifications.hint,
    },
    {
      href: '/account/settings/data',
      title: dict.data.title,
      Icon: DatabaseZap,
      tone: brandColors.amber,
      state: dict.data.state,
      done: true,
      hint: dict.data.hint,
    },
  ];

  return (
    <div className="space-y-6">
      {!ready && (
        <p
          role="alert"
          className="rounded-2xl border border-[#E8C9BE] bg-[#FBF0EC] px-5 py-4 text-sm text-[#A94E35]"
        >
          {dict.loadError}
        </p>
      )}

      {ready && (!name || !verified) && (
        <section
          aria-labelledby="pendientes"
          className="rounded-2xl border border-[#E8D9A8] bg-[#FBF6E7] p-6"
        >
          <h2
            id="pendientes"
            className="flex items-center gap-2 text-sm font-semibold text-[#88631B]"
          >
            <CircleAlert aria-hidden="true" className="size-4" />
            {dict.pendingTitle}
          </h2>
          <ul className="mt-4 space-y-3">
            {!name && (
              <li className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B4E15]">
                {dict.pendingName}
                <Link
                  href="/account/settings/profile"
                  className="font-medium underline underline-offset-4"
                >
                  {dict.completeProfile}
                </Link>
              </li>
            )}
            {!verified && (
              <li className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B4E15]">
                {dict.pendingEmail}
                <Link
                  href="/account/settings/security"
                  className="font-medium underline underline-offset-4"
                >
                  {dict.confirmEmail}
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, Icon, tone, state, done, hint }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-[border-color,box-shadow] hover:border-stone-300 hover:shadow-[0_14px_35px_-28px_rgba(41,37,36,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]"
          >
            <span
              className="flex size-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: tone.soft, color: tone.solid }}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-medium tracking-tight text-stone-900">{title}</h2>
            <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-stone-600">
              {ready && done && (
                <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#416B50]" />
              )}
              {state}
            </p>
            <p className="mt-1 text-xs text-stone-400">{hint}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#365DC4]">
              {dict.open}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
