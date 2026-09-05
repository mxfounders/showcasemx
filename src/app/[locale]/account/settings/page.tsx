import Link from 'next/link';
import { Bell,UserRound,ShieldCheck,Link2,ArrowRight,DatabaseZap,CircleAlert,CircleCheck } from 'lucide-react';
import { requireFounder } from '@/lib/solutions/server';
import { authSql } from '@/lib/auth/security';
import { brandColors } from '@/lib/brand-colors';

// Reads state rather than listing links: the point of this page is telling you
// what is actually configured, so a gap is visible without opening every section.
export default async function SettingsPage(){
 const account=await requireFounder();
 let name='',organization='',hasAvatar=false,verified=false,twoStep=false,sessions=1,google=false,emailPrefs=0,ready=true;
 try{
  const sql=authSql();
  const [[row],[sessionCount],[identity],[prefs]]=await Promise.all([
   sql`SELECT name,organization,(avatar_key IS NOT NULL OR avatar_data IS NOT NULL) AS has_avatar,email_verified_at,totp_confirmed_at FROM auth_accounts WHERE id=${account.id}`,
   sql`SELECT count(*)::int AS total FROM auth_sessions WHERE account_id=${account.id} AND expires_at>now()`,
   sql`SELECT email FROM auth_google_identities WHERE account_id=${account.id}`,
   sql`SELECT count(*)::int AS total FROM notification_preferences WHERE owner_id=${account.id}`,
  ]);
  name=String(row?.name??'');organization=String(row?.organization??'');hasAvatar=Boolean(row?.has_avatar);
  verified=Boolean(row?.email_verified_at);twoStep=Boolean(row?.totp_confirmed_at);
  sessions=Number(sessionCount?.total??1);google=Boolean(identity);emailPrefs=Number(prefs?.total??0);
 }catch{ready=false;}

 const cards=[
  {href:'/account/settings/profile',title:'Perfil',Icon:UserRound,tone:brandColors.lavender,
   state:name?`${name}${organization?` · ${organization}`:''}`:'Sin nombre todavía',
   done:Boolean(name),hint:hasAvatar?'Con foto':'Sin foto'},
  {href:'/account/settings/security',title:'Seguridad y acceso',Icon:ShieldCheck,tone:brandColors.sage,
   state:twoStep?'Verificación en dos pasos activa':'Solo contraseña',
   done:twoStep,hint:`${sessions} ${sessions===1?'sesión abierta':'sesiones abiertas'} · correo ${verified?'confirmado':'sin confirmar'}`},
  {href:'/account/settings/connections',title:'Cuentas vinculadas',Icon:Link2,tone:brandColors.terracotta,
   state:google?'Google vinculado':'Sin cuentas vinculadas',
   done:google,hint:'Entrar sin escribir tu contraseña'},
  {href:'/account/settings/notifications',title:'Avisos',Icon:Bell,tone:brandColors.blue,
   state:emailPrefs?'Preferencias guardadas':'Con los valores por defecto',
   done:true,hint:'Qué te avisamos por correo'},
  {href:'/account/settings/data',title:'Datos y privacidad',Icon:DatabaseZap,tone:brandColors.amber,
   state:'Copia de tus datos, idioma y eliminación',
   done:true,hint:'Tú decides qué conservamos'},
 ];

 return <div className="space-y-6">
  {!ready&&<p role="alert" className="rounded-2xl border border-[#E8C9BE] bg-[#FBF0EC] px-5 py-4 text-sm text-[#A94E35]">No pudimos leer el estado de tu cuenta ahora mismo. Las secciones siguen disponibles.</p>}

  {ready&&(!name||!verified)&&<section aria-labelledby="pendientes" className="rounded-2xl border border-[#E8D9A8] bg-[#FBF6E7] p-6">
   <h2 id="pendientes" className="flex items-center gap-2 text-sm font-semibold text-[#88631B]"><CircleAlert aria-hidden="true" className="size-4"/>Te falta poco</h2>
   <ul className="mt-4 space-y-3">
    {!name&&<li className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B4E15]">Añade tu nombre para que sepan quién eres al comentar o escribir.<Link href="/account/settings/profile" className="font-medium underline underline-offset-4">Completar perfil</Link></li>}
    {!verified&&<li className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B4E15]">Confirma tu correo para recibir avisos y solicitudes de contacto.<Link href="/account/settings/security" className="font-medium underline underline-offset-4">Confirmar correo</Link></li>}
   </ul>
  </section>}

  <div className="grid gap-4 sm:grid-cols-2">
   {cards.map(({href,title,Icon,tone,state,done,hint})=><Link key={href} href={href} className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-[border-color,box-shadow] hover:border-stone-300 hover:shadow-[0_14px_35px_-28px_rgba(41,37,36,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]">
    <span className="flex size-12 items-center justify-center rounded-2xl" style={{backgroundColor:tone.soft,color:tone.solid}}><Icon aria-hidden="true" className="size-5"/></span>
    <h2 className="mt-5 text-lg font-medium tracking-tight text-stone-900">{title}</h2>
    <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-stone-600">{ready&&done&&<CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#416B50]"/>}{state}</p>
    <p className="mt-1 text-xs text-stone-400">{hint}</p>
    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#365DC4]">Abrir<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"/></span>
   </Link>)}
  </div>
 </div>;
}
