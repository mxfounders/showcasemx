"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Check,Link as LinkIcon,ArrowUpRight } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
export function ShareCollection({id,preview=false}:{id:string;preview?:boolean}){
 const [copied,setCopied]=useState(false),[fallback,setFallback]=useState('');
 return <div className="flex flex-wrap items-center gap-3"><button type="button" style={actionButtonStyle} className="action-button inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm" onClick={async()=>{const url=new URL(`/comunidad/${id}`,window.location.origin).href;try{await navigator.clipboard.writeText(url);setCopied(true);setFallback('');}catch{setFallback(url);}}}>{copied?<Check className="size-4"/>:<LinkIcon className="size-4"/>}{copied?'Enlace copiado':'Compartir lista'}</button>{preview&&<Link href={`/comunidad/${id}`} className="inline-flex items-center gap-1 text-sm text-stone-500">Ver pública<ArrowUpRight className="size-4"/></Link>}<span role="status" className="sr-only">{copied?'Enlace copiado al portapapeles':''}</span>{fallback&&<label className="w-full text-xs text-stone-500">Copia este enlace<input readOnly value={fallback} onFocus={event=>event.target.select()} className="mt-2 w-full rounded-lg border border-stone-300 bg-transparent p-3"/></label>}</div>;
}
