import { requireFounder } from '@/lib/solutions/server';
import { notificationPreferences } from '@/lib/notifications/server';
import { NotificationPreferences } from '@/components/notifications/controls';

export const dynamic='force-dynamic';

export default async function NotificationSettings(){
 const account=await requireFounder();
 const prefs=await notificationPreferences(account.id);
 return <section className="space-y-6">
  <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
   <h2 className="mb-2 text-lg font-medium text-stone-900">Preferencias de avisos</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Elige qué novedades de tu cuenta te llegan por correo. Los avisos dentro de la app siguen apareciendo en la campana.</p>
   <NotificationPreferences {...prefs}/>
  </div>
 </section>;
}
