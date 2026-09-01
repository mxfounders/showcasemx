"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLink } from './brand-link';
import { AccountMenu } from './account-menu';
import { navbarBar,navbarPosition } from './navbar-style';
import { actionButtonStyle } from '@/lib/brand-colors';
export function AccountNavbar({name,avatar}:{name:string;avatar:string|null}) {
 const pathname=usePathname();
 const links=[{href:'/account',label:'Mis soluciones',active:pathname==='/account'||pathname.startsWith('/account/solutions')},{href:'/account/settings',label:'Configuración',active:pathname.startsWith('/account/settings')},{href:'/#catalogo',label:'Explorar catálogo',active:false}];
 return <header className={navbarPosition}><div className={`${navbarBar} rounded-b-2xl`}>
  <div className="flex min-w-0 items-center gap-6"><BrandLink variant="navbar"/><nav aria-label="Navegación del dashboard" className="hidden items-center gap-0.5 lg:flex">{links.map(link=><Link key={link.href} href={link.href} aria-current={link.active?'page':undefined} className={`rounded-md px-3 py-1.5 text-[13.5px] font-medium text-stone-600 transition-colors hover:bg-stone-100/80 hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${link.active?'bg-stone-100/80 text-stone-900':''}`}>{link.label}</Link>)}</nav></div>
  <div className="flex shrink-0 items-center gap-2"><Link href="/account/solutions/new" style={actionButtonStyle} className="action-button hidden items-center gap-1 rounded-full px-4 py-1.5 text-[13.5px] font-medium sm:inline-flex">Postular solución<span aria-hidden="true" className="button-arrow">→</span></Link><AccountMenu name={name} avatar={avatar} compact/></div>
 </div></header>;
}
