import { requireFounder } from '@/lib/solutions/server';
import { notificationPreferences } from '@/lib/notifications/server';
import { NotificationPreferences } from '@/components/notifications/controls';
export default async function NotificationSettings(){const account=await requireFounder();const prefs=await notificationPreferences(account.id);return <section><h2 className="mb-6 text-2xl font-medium tracking-tight">Preferencias de avisos</h2><NotificationPreferences {...prefs}/></section>;}
