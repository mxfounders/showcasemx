import { localeRedirect } from '@/i18n/redirect';
// The notification feed lives in the bell (AccountUtilities); preferences live in Settings.
export default async function NotificationsPage() {
  return localeRedirect('/account');
}
