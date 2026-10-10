import { localeRedirect } from '@/i18n/redirect';
export default async function ProfilePage() {
  return localeRedirect('/account/settings');
}
