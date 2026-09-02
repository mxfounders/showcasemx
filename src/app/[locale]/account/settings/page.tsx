import Link from 'next/link';
import { Bell,UserRound,ShieldCheck,Link2,ArrowRight } from 'lucide-react';
import { brandColors } from '@/lib/brand-colors';
const sections=[
 {href:'/account/settings/notifications',title:'Avisos',description:'Elige qué novedades de tu cuenta recibir por correo.',Icon:Bell,tone:brandColors.blue},
 {href:'/account/settings/profile',title:'Perfil',description:'Tu nombre, foto, empresa y lo que haces.',Icon:UserRound,tone:brandColors.lavender},
 {href:'/account/settings/security',title:'Seguridad y acceso',description:'Cambia tu contraseña, recupera tu acceso o cierra sesión.',Icon:ShieldCheck,tone:brandColors.sage},
 {href:'/account/settings/connections',title:'Cuentas vinculadas',description:'Consulta los métodos de acceso y las conexiones disponibles.',Icon:Link2,tone:brandColors.terracotta},
];
export default function SettingsPage(){return <nav aria-label="Opciones de configuración" className="divide-y divide-stone-200">{sections.map(({href,title,description,Icon,tone})=><Link href={href} key={href} className="group flex items-center gap-4 rounded-lg py-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365DC4]"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{backgroundColor:tone.soft,color:tone.solid}}><Icon className="size-5" aria-hidden="true"/></span><span className="min-w-0 flex-1"><span className="block text-lg font-medium tracking-tight">{title}</span><span className="mt-1 block text-sm leading-relaxed text-stone-500">{description}</span></span><ArrowRight aria-hidden="true" className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"/></Link>)}</nav>;}
