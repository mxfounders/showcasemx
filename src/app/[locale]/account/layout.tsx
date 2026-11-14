import { getDictionary } from '@/i18n/get-dictionary';
import { noticeHref } from '@/lib/notifications/href';
import { cookies } from 'next/headers';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql } from '@/lib/auth/security';
import { AccountSidebar } from '@/components/navigation/account-sidebar';
import { AccountIdentity } from '@/components/analytics/account-identity';
import { unreadOpportunities } from '@/lib/contacts/server';
import { resolveDashboardMode } from '@/lib/dashboard/model';
import {
  AccountUtilities,
  type AccountNotification,
} from '@/components/navigation/account-utilities';
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = (await getDictionary(locale)).account;
  let name = '',
    avatar: string | null = null,
    notifications: AccountNotification[] = [],
    unreadCount = 0,
    hasMoreNotifications = false,
    opportunitiesUnread = 0,
    accountId: string | null = null,
    sections = { buyer: true, founder: true };
  try {
    const account = await getSession((await cookies()).get(sessionCookie)?.value);
    if (account) {
      accountId = account.id;
      const sql = authSql();
      const [row] =
        await sql`SELECT name,(avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar FROM auth_accounts WHERE id=${account.id}`;
      name = String(row?.name ?? '');
      avatar = row?.has_avatar ? '/api/account/avatar' : null;
      // Which half of the navigation this account needs (SHCWS-169). The mode is only a
      // preference, so anything the account already has stays reachable whatever the mode.
      // A failure keeps both halves.
      try {
        const [use] = await sql`SELECT a.profile,a.dashboard_mode,
          EXISTS(SELECT 1 FROM founder_solutions WHERE owner_id=a.id) AS has_solutions,
          EXISTS(SELECT 1 FROM contact_requests WHERE recipient_id=a.id) AS has_incoming,
          (EXISTS(SELECT 1 FROM buyer_saved_projects WHERE owner_id=a.id)
            OR EXISTS(SELECT 1 FROM buyer_lists WHERE owner_id=a.id)
            OR EXISTS(SELECT 1 FROM contact_requests WHERE buyer_id=a.id)) AS has_buying
          FROM auth_accounts a WHERE a.id=${account.id}`;
        if (use) {
          const mode = resolveDashboardMode(use.dashboard_mode, use.profile, !!use.has_solutions);
          sections = {
            buyer: mode !== 'founder' || !!use.has_buying,
            founder: mode !== 'buyer' || !!use.has_solutions || !!use.has_incoming,
          };
        }
      } catch {
        /* both halves stay visible */
      }
      try {
        const [notificationRows, [count]] = await Promise.all([
          sql`SELECT id::text,title,href,read_at::text,created_at::text FROM account_notifications WHERE owner_id=${account.id} ORDER BY created_at DESC,id DESC LIMIT 11`,
          sql`SELECT count(*)::int AS unread FROM account_notifications WHERE owner_id=${account.id} AND read_at IS NULL`,
        ]);
        hasMoreNotifications = notificationRows.length > 10;
        notifications = notificationRows.slice(0, 10).map(item => {
          const href = String(item.href);
          return {
            id: String(item.id),
            title: String(item.title),
            href: noticeHref(href),
            readAt: item.read_at ? String(item.read_at) : null,
            createdAt: String(item.created_at),
          };
        });
        unreadCount = Number(count?.unread ?? 0);
      } catch {
        notifications = [];
      }
      // Unread opportunities beside «Oportunidades» (SHCWS-14); a failure hides the count.
      opportunitiesUnread = await unreadOpportunities(account.id).catch(() => 0);
    }
  } catch {
    /* The page supplies the storage error boundary. */
  }
  return (
    <div className="min-h-svh">
      {accountId && <AccountIdentity id={accountId} />}
      <AccountSidebar
        name={name}
        avatar={avatar}
        opportunitiesUnread={opportunitiesUnread}
        sections={sections}
        dict={dict}
      />
      <AccountUtilities
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        initialHasMore={hasMoreNotifications}
        dict={dict}
      />
      <main id="main-content" className="min-w-0 pb-10 pt-14 lg:ml-[264px] lg:pt-4">
        {children}
      </main>
    </div>
  );
}
