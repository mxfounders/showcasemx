import Link from 'next/link';
import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { ExportData,DeleteAccount } from '@/components/settings/data-controls';
import { LanguagePreference } from '@/components/settings/language-preference';
import { i18n,type Locale } from '@/i18n/config';

export const dynamic='force-dynamic';

export default async function DataSettings(props:{params:Promise<{locale:string}>}){
 const {locale}=await props.params;
 const account=await requireFounder();
 let publications=0,conversations=0,storageFailed=false;
 try{
  const sql=authSql();
  const [[owned],[contacts]]=await Promise.all([
   sql`SELECT count(*)::int AS total FROM founder_solutions WHERE owner_id=${account.id} AND published_data IS NOT NULL`,
   sql`SELECT count(*)::int AS total FROM contact_requests WHERE buyer_id=${account.id} OR recipient_id=${account.id}`,
  ]);
  publications=Number(owned?.total??0);conversations=Number(contacts?.total??0);
 }catch{storageFailed=true;}

 const current=(i18n.locales as readonly string[]).includes(locale)?locale as Locale:i18n.defaultLocale;
 const card='rounded-2xl border border-stone-200 bg-white p-6 shadow-sm';
 return <section className="space-y-6">
  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Idioma</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Elige en qué idioma quieres ver shwcs.</p>
   <LanguagePreference current={current}/>
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Tu copia de datos</h2>
   <p className="mb-6 text-sm leading-relaxed text-stone-500">Puedes llevarte lo que has construido aquí cuando quieras.</p>
   <ExportData/>
  </div>

  <div className={card}>
   <h2 className="mb-2 text-lg font-medium text-stone-900">Qué guardamos</h2>
   <p className="text-sm leading-relaxed text-stone-500">Guardamos tu cuenta y perfil, lo que publicas, tu biblioteca privada y las solicitudes de contacto que envías o recibes. Las métricas del catálogo son agregadas y no identifican a quien visita. Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a <a href="mailto:hola@shwcs.site" className="font-medium text-[#365DC4] hover:underline">hola@shwcs.site</a>.</p>
   <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
    <Link href="/privacidad" className="font-medium text-[#365DC4] hover:underline">Aviso de privacidad →</Link>
    <Link href="/cookies" className="font-medium text-[#365DC4] hover:underline">Cookies →</Link>
   </p>
  </div>

  <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
   <h2 className="mb-2 text-lg font-medium text-red-900">Eliminar mi cuenta</h2>
   {storageFailed
    ? <p role="alert" className="text-sm text-[#A94E35]">No pudimos comprobar qué se eliminaría con tu cuenta. Recarga la página antes de continuar.</p>
    : <DeleteAccount publications={publications} conversations={conversations}/>}
  </div>
 </section>;
}
