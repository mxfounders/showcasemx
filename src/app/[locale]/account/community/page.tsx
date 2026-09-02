import Link from 'next/link';
import { ArrowLeft,ArrowRight,LibraryBig } from 'lucide-react';
import { requireBuyer } from '@/lib/library/server';
import { getPublicCollections } from '@/lib/library/community';
import { BoardCard } from '@/components/library/board-card';
import { actionButtonStyle } from '@/lib/brand-colors';
export const metadata={title:'Listas guardadas | shwcs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function SavedCommunityListsPage({searchParams}:{searchParams:Promise<{page?:string}>}){
 const params=await searchParams,page=Math.max(1,Math.min(1000,Number.parseInt(String(params.page??'1'),10)||1));
 const account=await requireBuyer(`/account/community${page>1?`?page=${page}`:''}`);
 const {collections,hasMore}=await getPublicCollections({savedBy:account.id,viewer:account.id,page});
 const href=(value:number)=>value>1?`/account/community?page=${value}`:'/account/community';
 return <section className="account-page"><header className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Listas guardadas.</h1><p className="mt-4 text-sm text-stone-500">Selecciones de la comunidad que quieres volver a consultar.</p></div><Link href="/comunidad" style={actionButtonStyle} className="action-button rounded-full px-5 py-3 text-sm">Explorar comunidad →</Link></header>
 {collections.length?<div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{collections.map(collection=><BoardCard key={collection.id} board={{id:collection.id,name:collection.name,count:collection.count,covers:collection.covers,visibility:collection.visibility}} href={`/comunidad/${collection.id}`} byline={collection.curator} stats={{likes:collection.likes,saves:collection.saves,comments:collection.comments}}/>)}</div>:<div className="border-y border-stone-200 py-14"><LibraryBig className="mb-5 size-8 text-stone-300" aria-hidden="true"/><h2 className="text-2xl font-medium">Guarda una selección que valga la pena.</h2><p className="mt-3 max-w-lg text-sm text-stone-500">La encontrarás aquí mientras su creador la mantenga pública.</p><Link href="/comunidad" style={actionButtonStyle} className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm">Ver listas públicas →</Link></div>}
 {(page>1||hasMore)&&<nav aria-label="Páginas de listas guardadas" className="mt-12 flex justify-between border-t border-stone-200 pt-6">{page>1?<Link href={href(page-1)} className="inline-flex items-center gap-2 text-sm text-[#365DC4]"><ArrowLeft className="size-4"/>Anterior</Link>:<span/>}{hasMore?<Link href={href(page+1)} className="inline-flex items-center gap-2 text-sm text-[#365DC4]">Siguiente<ArrowRight className="size-4"/></Link>:<span/>}</nav>}
 </section>;
}
