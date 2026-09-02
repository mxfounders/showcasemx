import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { isSolutionId } from '@/lib/solutions/model';
import { getPublicCollections,getPublicComments } from '@/lib/library/community';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { ProjectPin } from '@/components/library/project-pin';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { ShareCollection } from '@/components/library/share-collection';
import { CommunityActions } from '@/components/library/community-actions';
import { brandColors,solutionCategoryTones } from '@/lib/brand-colors';
export const dynamic='force-dynamic';
// Public does not mean permanent: never cache a list or embed private data in metadata.
export const metadata={title:'Lista de la comunidad | shwcs',robots:{index:false,follow:true}};
export default async function PublicCollectionPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!isSolutionId(id))notFound();
 let viewer='';try{viewer=(await getSession((await cookies()).get(sessionCookie)?.value))?.id??'';}catch{/* The public page still works when account storage is unavailable. */}
 const [{collections},comments]=await Promise.all([getPublicCollections({id,viewer}),getPublicComments(id,viewer)]);const collection=collections[0];if(!collection)notFound();
 return <section className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-14 sm:px-10 sm:pt-20 lg:px-16"><Link href="/comunidad" className="mb-9 inline-flex items-center gap-2 text-sm text-stone-500"><ArrowLeft className="size-4"/>Comunidad</Link><header className="mb-10 border-b border-stone-200 pb-8"><div className="flex flex-col items-start justify-between gap-6 sm:flex-row"><div className="min-w-0 w-full sm:flex-1"><h1 className="break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{collection.name}</h1>{collection.description&&<p className="mt-5 max-w-2xl whitespace-pre-wrap break-words leading-relaxed text-stone-500">{collection.description}</p>}<p className="mt-5 text-sm text-stone-500">Por {collection.curator} <span aria-hidden="true">·</span> {collection.count} {collection.count===1?'proyecto':'proyectos'}</p></div><ShareCollection id={id}/></div><div className="mt-6 flex flex-wrap gap-2">{collection.categories.map(category=>{const tone=brandColors[solutionCategoryTones[category]??'blue'];return <Link key={category} href={`/comunidad?category=${encodeURIComponent(category)}`} style={{color:tone.solid,backgroundColor:tone.soft}} className="rounded-full px-3 py-2 text-xs">{category}</Link>;})}</div></header>
 {collection.projects.length?<div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{collection.projects.map(project=><ProjectPin key={project.key} project={project}><SaveProjectButton projectKey={project.key}/></ProjectPin>)}</div>:<p className="py-16 text-center text-stone-500">Esta selección aún no tiene proyectos disponibles.</p>}
 <CommunityActions id={id} initialLikes={collection.likes} initialSaves={collection.saves} initialCommentsCount={collection.comments} liked={collection.liked} saved={collection.saved} own={collection.own} comments={comments}/>
 <p className="mt-14 border-t border-stone-200 pt-5 text-xs text-stone-400">Selección de la comunidad. No implica una evaluación editorial de estos proyectos.</p></section>;
}
