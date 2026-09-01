"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { SearchIcon } from '@/components/icons/search-icon';
import { actionButtonStyle } from '@/lib/brand-colors';

export function NavbarSearch({onOpen}:{onOpen?:()=>void}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const frame=requestAnimationFrame(()=>input.current?.focus());
    const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',dismiss);
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',dismiss);};
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className="relative size-9 shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape'&&open) { event.stopPropagation(); close(); } }}>
    <button ref={trigger} type="button" aria-label="Buscar soluciones" aria-expanded={open} aria-controls="navbar-search-form" onClick={() => {if(open){close();return;}onOpen?.();setOpen(true);}} className="inline-flex size-9 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 focus-visible:outline focus-visible:outline-2"><SearchIcon className="size-4" /></button>
    {open&&<form id="navbar-search-form" role="search" aria-label="Buscar en el catálogo" noValidate onSubmit={event => { event.preventDefault(); const query = input.current?.value.trim(); if (!query) { input.current?.focus(); return; } close(); router.push(`/?q=${encodeURIComponent(query)}#catalogo`); }} className="navbar-search-panel fixed left-4 right-4 top-16 z-20 flex h-14 items-center gap-2 rounded-full border border-stone-200 focus-within:border-[#365DC4]/40 bg-white px-3 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.22)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+20px)] sm:w-[420px]">
      <SearchIcon className="ml-1 size-4 shrink-0 text-stone-400" />
      <label htmlFor="navbar-query" className="sr-only">Buscar soluciones en el catálogo</label>
      <input autoFocus ref={input} id="navbar-query" name="q" type="search" maxLength={200} autoComplete="off" tabIndex={open ? 0 : -1} placeholder="¿Qué necesitas resolver?" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-stone-900 outline-none [&::-webkit-search-cancel-button]:hidden" />
      <button type="submit" tabIndex={open ? 0 : -1} aria-label="Enviar búsqueda" style={actionButtonStyle} className="action-button flex size-9 shrink-0 items-center justify-center rounded-full"><ArrowRight aria-hidden="true" className="size-4" /></button>
      <button type="button" tabIndex={open ? 0 : -1} onClick={close} aria-label="Cerrar búsqueda" className="flex size-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"><X aria-hidden="true" className="size-4" /></button>
    </form>}
  </div>;
}
