"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Columns3 } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton } from './client';
export function ComparisonPicker({listId,projects}:{listId:string;projects:{key:string;name:string}[]}){
 const [selected,setSelected]=useState<string[]>([]),[error,setError]=useState('');const router=useRouter();
 return <details className="my-8 border-y border-stone-200 py-5"><summary className="cursor-pointer text-sm font-medium">Comparar proyectos · elige 2 o 3</summary>{projects.length<2?<p className="mt-4 text-sm text-stone-500">Añade al menos dos proyectos disponibles a esta lista.</p>:<form className="mt-5" onSubmit={event=>{event.preventDefault();const valid=selected.filter(key=>projects.some(project=>project.key===key));if(valid.length<2){setError('Selecciona al menos dos proyectos.');return;}const query=new URLSearchParams();valid.forEach(key=>query.append('project',key));router.push(`/account/lists/${listId}/compare?${query}`);}}><div className="flex flex-wrap gap-3">{projects.map(project=><label key={project.key} className="flex max-w-full cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm"><input type="checkbox" className="size-4 accent-[#365DC4]" checked={selected.includes(project.key)} disabled={selected.length===3&&!selected.includes(project.key)} onChange={event=>{setError('');setSelected(values=>event.target.checked?[...values,project.key]:values.filter(key=>key!==project.key));}}/><span className="min-w-0 break-words">{project.name}</span></label>)}</div><button style={actionButtonStyle} className={`${libraryButton} mt-5`}><Columns3 className="size-4" aria-hidden="true"/>Comparar selección ({selected.length}/3)</button>{error&&<p role="alert" className="mt-3 text-sm text-[#A94E35]">{error}</p>}</form>}</details>;
}
