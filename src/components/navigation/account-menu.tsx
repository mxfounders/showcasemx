"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, UserRound, Settings } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { actionButtonStyle } from '@/lib/brand-colors';
export function AccountMenu({name,avatar,compact=false}:{name?:string;avatar?:string|null;compact?:boolean}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" aria-label="Mi cuenta" aria-expanded={open} aria-controls="account-navigation" style={actionButtonStyle} className={`action-button inline-flex items-center gap-2 rounded-full font-medium ${compact?'px-2.5 py-1.5 text-[13.5px]':'px-3.5 py-2.5 text-sm'}`} onClick={() => setOpen(value => !value)}><span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full">{avatar?<Image src={avatar} width={24} height={24} unoptimized alt=""/>:<UserRound aria-hidden="true" className="size-4" />}</span><span className={compact?"hidden max-w-28 truncate md:inline":"max-w-28 truncate"}>{name || 'Mi cuenta'}</span><ChevronDown aria-hidden="true" className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div id="account-navigation" className="absolute right-0 top-full z-30 mt-3 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.2)]">
      <nav aria-label="Menú de usuario" className="space-y-1"><Link href="/account/solutions" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-50">Mis soluciones</Link>
        <Link href="/account/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-50"><UserRound aria-hidden="true" className="size-4" />Editar mi perfil</Link>
        <Link href="/account/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-50"><Settings aria-hidden="true" className="size-4" />Configuración</Link>
        <Link href="/account/solutions/new" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-50 sm:hidden">Postular solución →</Link>
        <Link href="/#catalogo" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-50 lg:hidden">Explorar catálogo</Link>
      </nav>
      <div className="mt-2 border-t border-stone-100 px-2 pb-2 pt-3"><LogoutButton /></div>
    </div>}
  </div>;
}
