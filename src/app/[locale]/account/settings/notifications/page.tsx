import { requireFounder } from '@/lib/solutions/server';
import { notificationPreferences } from '@/lib/notifications/server';
import { NotificationPreferences } from '@/components/notifications/controls';
export default async function NotificationSettings(){const account=await requireFounder();const prefs=await notificationPreferences(account.id);return <section className="space-y-6">
<h2 className="text-2xl font-medium tracking-tight mb-2">Preferencias de avisos</h2>
<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
  <NotificationPreferences {...prefs}/>
</div>
</section>;}
