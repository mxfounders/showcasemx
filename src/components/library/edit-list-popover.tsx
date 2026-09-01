"use client";

import { useEffect,useId,useRef,useState } from 'react';
import { ChevronDown,PencilLine,X } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { BuyerList } from '@/lib/library/model';
import { ListForm } from './list-form';
import { libraryButton } from './client';

export function EditListPopover({list}:{list:BuyerList}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),id=useId();
 function close(){setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}
 useEffect(()=>{
  if(!open)return;
  requestAnimationFrame(()=>panel.current?.querySelector<HTMLInputElement>('input')?.focus());
  const pointer=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))close();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();}};
  document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',keyboard);
  return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',keyboard);};
 },[open]);
 return <div ref={root} className="relative shrink-0">
  <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)} style={actionButtonStyle} className={libraryButton}><PencilLine className="size-4" aria-hidden="true"/>Editar lista<ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open?'rotate-180':''}`} aria-hidden="true"/></button>
  {open&&<div ref={panel} id={id} role="dialog" aria-label="Editar lista" className="sidebar-reveal absolute left-0 top-[calc(100%+0.75rem)] z-40 max-h-[72svh] w-[min(560px,calc(100vw-3rem))] overflow-y-auto rounded-[28px] border border-stone-200 bg-[#fafaf9] p-6 shadow-[0_24px_65px_-24px_rgba(41,37,36,0.35)] sm:p-8">
   <div className="mb-7 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold tracking-tight">Editar lista</h2><button type="button" onClick={close} aria-label="Cerrar edición" className="flex size-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4]"><X className="size-4" aria-hidden="true"/></button></div>
   <ListForm key={list.version} list={list}/>
  </div>}
 </div>;
}
