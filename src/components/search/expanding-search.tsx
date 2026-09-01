"use client";
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';
import { SearchIcon } from '@/components/icons/search-icon';
import { actionButtonStyle } from '@/lib/brand-colors';

type Props={label:string;placeholder:string;value?:string;defaultValue?:string;onChange?:(value:string)=>void;onSearch?:(value:string)=>void;action?:string;fields?:Record<string,string>;maxLength?:number;className?:string};
export function ExpandingSearch({label,placeholder,value,defaultValue='',onChange,onSearch,action,fields={},maxLength=200,className=''}:Props){
 const [draft,setDraft]=useState(defaultValue),[open,setOpen]=useState(Boolean(value??defaultValue));
 const query=value??draft,input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId(),router=useRouter();
 function change(next:string){if(value===undefined)setDraft(next);onChange?.(next);}
 function close(){change('');onSearch?.('');setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());if(action&&defaultValue){const params=new URLSearchParams(fields);router.push(action+(params.size?'?'+params.toString():''),{scroll:false});}}
 return <div className={`expanding-search-shell relative ml-auto h-14 shrink-0 ${open?'is-open z-30':''} ${className}`} onBlur={event=>{if(!query&&!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();}}}>
  <button ref={trigger} type="button" title={label} aria-label={label} aria-expanded={open} aria-controls={id} tabIndex={open?-1:0} aria-hidden={open} onClick={()=>setOpen(true)} className={`absolute right-0 top-0 flex size-14 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] ${open?'invisible':'visible'}`}><SearchIcon className="size-5"/></button>
  <form id={id} role={open?'search':undefined} aria-label={open?label:undefined} action={action} method="get" noValidate aria-hidden={!open} inert={!open} onSubmit={event=>{if(!action){event.preventDefault();onSearch?.(query.trim());input.current?.focus();}}} className={`expanding-search-capsule absolute right-0 top-0 flex h-14 items-center gap-2 overflow-hidden rounded-full border bg-white px-3 shadow-[0_4px_16px_-10px_rgba(0,0,0,0.18)] focus-within:border-[#365DC4]/40 ${open?'is-open border-stone-200':'pointer-events-none border-transparent'}`}>
   {open&&<><SearchIcon className="ml-1 size-4 shrink-0 text-stone-400"/><input autoFocus ref={input} type="search" name="q" aria-label={label} placeholder={placeholder} value={query} onChange={event=>change(event.target.value)} maxLength={maxLength} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-stone-900 outline-none [&::-webkit-search-cancel-button]:hidden"/>{Object.entries(fields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}<button type="submit" aria-label={`Enviar: ${label.toLocaleLowerCase()}`} style={actionButtonStyle} className="action-button flex size-9 shrink-0 items-center justify-center rounded-full"><ArrowRight className="size-4" aria-hidden="true"/></button><button type="button" aria-label="Cerrar y limpiar búsqueda" onClick={close} className="flex size-8 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100"><X className="size-4" aria-hidden="true"/></button></>}
  </form>
 </div>;
}
