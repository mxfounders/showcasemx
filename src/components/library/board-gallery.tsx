"use client";
import { ExpandingSearch } from '@/components/search/expanding-search';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BuyerBoard } from '@/lib/library/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import { BoardCard } from './board-card';
export { BoardCard } from './board-card';
import { LibraryDialog } from './library-dialog';
import { ListForm } from './list-form';
export function CreateBoard({tile=false}:{tile?:boolean}){
 return <LibraryDialog title="Crea una lista" triggerClass={tile?'group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-stone-300 text-sm text-stone-500 transition-colors hover:border-[#365DC4] hover:bg-[#E4EBFC]/40 hover:text-[#365DC4]':'action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium'} triggerStyle={tile?undefined:actionButtonStyle} trigger={<><Plus className={tile?'size-7':'size-4'}/>Crear lista</>}>{()=> <ListForm/>}</LibraryDialog>;
}
export function BoardGallery({boards}:{boards:BuyerBoard[]}){
 const [query,setQuery]=useState('');const [visibility,setVisibility]=useState('all');const visible=boards.filter(board=>board.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())&&(visibility==='all'||(board.visibility??'private')===visibility));
 const filters=[{value:'all',label:'Todas'},{value:'private',label:'Privadas'},{value:'public',label:'Públicas'}] as const;
 return <><div className="mb-9 border-b border-stone-200 pb-6"><div className="flex flex-wrap items-center gap-3"><nav aria-label="Filtrar listas por visibilidad" className="selector-tabs">{filters.map(filter=>{const active=visibility===filter.value;return <button key={filter.value} type="button" aria-pressed={active} onClick={()=>setVisibility(filter.value)} className="selector-tab">{filter.label}</button>;})}</nav><div className="ml-auto flex items-center gap-3"><ExpandingSearch label="Buscar listas" placeholder="Buscar una lista" value={query} onChange={setQuery}/><CreateBoard/></div></div><p role="status" className="mt-4 text-xs text-stone-500">{visible.length} de {boards.length} {boards.length===1?'lista':'listas'}</p></div>{visible.length?<div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">{visible.map(board=><BoardCard key={board.id} board={board}/>)}{!query&&visibility==='all'&&<CreateBoard tile/>}</div>:<div className="border-y border-stone-200 py-14"><h2 className="text-xl font-medium">No hay listas con estos filtros.</h2><button type="button" onClick={()=>{setQuery('');setVisibility('all');}} style={actionButtonStyle} className="action-button mt-5 rounded-full px-5 py-3 text-sm">Ver todas las listas</button></div>}</>;
}
