import Link from '@/i18n/navigation';
import { requireFounder } from '@/lib/solutions/server';
import { notificationPreferences } from '@/lib/notifications/server';
import { NotificationPreferences } from '@/components/notifications/controls';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export default async function NotificationSettings(props: { params: Promise<{ locale: string }> }) {
  const account = await requireFounder();
  const dictionary = await getDictionary((await props.params).locale);
  const dict = dictionary.notifications;
  const alerts = dictionary.alerts;
  const prefs = await notificationPreferences(account.id);
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-stone-900">{dict.settingsPage.title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-stone-500">{dict.settingsPage.desc}</p>
        <NotificationPreferences
          {...prefs}
          dict={{ preferences: dict.preferences, action: dict.action }}
        />
      </div>
      {/* Saved-search alerts live on their own page (SHCWS-47), reachable from here. */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-stone-900">{alerts.page.title}</h2>
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-stone-500">
          {alerts.page.subtitle}
        </p>
        <Link
          href="/account/alerts"
          style={actionButtonStyle}
          className="action-button inline-flex rounded-full px-5 py-2.5 text-sm"
        >
          {alerts.button.manage}
        </Link>
      </div>
    </section>
  );
}
