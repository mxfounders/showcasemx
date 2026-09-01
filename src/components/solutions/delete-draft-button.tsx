"use client";

import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2,X } from 'lucide-react';
import { brandColors } from '@/lib/brand-colors';

export function DeleteDraftButton({id,name}:{id:string;name:string}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),busy=useRef(false),router=useRouter();
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const close=()=>dialog.current?.close();
 async function remove(){
  if(busy.current)return;busy.current=true;setPending(true);setError('');
  try{
   const response=await fetch(`/api/solutions/${id}`,{method:'DELETE',signal:AbortSignal.timeout(15000)});
   const result=await response.json().catch(()=>null) as {error?:string}|null;
   if(!response.ok)throw new Error(result?.error||'No pudimos eliminar el borrador.');
   close();router.refresh();
  }catch(error){setError(error instanceof Error?error.message:'No pudimos eliminar el borrador.');}
  finally{busy.current=false;setPending(false);}
 }
 return <>
  <button ref={trigger} type="button" onClick={()=>{setError('');dialog.current?.showModal();}} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-stone-400 transition-colors hover:bg-[#F6E5DD] hover:text-[#A94E35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94E35]"><Trash2 aria-hidden="true" className="size-3.5"/>Eliminar</button>
  <dialog ref={dialog} aria-labelledby={`delete-draft-${id}`} onClose={()=>trigger.current?.focus()} onClick={event=>{if(event.target===event.currentTarget&&!pending)close();}} className="library-dialog w-[calc(100%-2rem)] max-w-md rounded-[28px] border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/25 backdrop:backdrop-blur-sm">
   <div className="p-6 sm:p-8"><div className="flex items-start justify-between gap-5"><span style={{backgroundColor:brandColors.terracotta.soft,color:brandColors.terracotta.solid}} className="flex size-11 items-center justify-center rounded-2xl"><Trash2 aria-hidden="true" className="size-5"/></span><button type="button" aria-label="Cerrar" disabled={pending} onClick={close} className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-stone-700"><X aria-hidden="true" className="size-5"/></button></div>
    <h2 id={`delete-draft-${id}`} className="mt-6 text-2xl font-semibold tracking-tight">¿Eliminar este borrador?</h2><p className="mt-3 text-sm leading-relaxed text-stone-500"><span className="font-medium text-stone-700">{name}</span> y su información se eliminarán definitivamente. Esta acción no se puede deshacer.</p>
    {error&&<p role="alert" className="mt-4 rounded-xl bg-[#F6E5DD] px-4 py-3 text-sm text-[#A94E35]">{error}</p>}
    <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={pending} onClick={close} className="rounded-full border border-stone-200 px-5 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Conservar borrador</button><button type="button" disabled={pending} onClick={()=>void remove()} style={{backgroundColor:brandColors.terracotta.solid}} className="rounded-full px-5 py-3 text-sm font-medium text-white transition-[filter,transform] hover:brightness-95 active:translate-y-px disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94E35]">{pending?'Eliminando…':'Sí, eliminar'}</button></div>
   </div>
  </dialog>
 </>;
}
