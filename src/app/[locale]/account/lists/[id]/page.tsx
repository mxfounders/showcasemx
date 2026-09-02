import { ShareCollection } from '@/components/library/share-collection';
import { ComparisonPicker } from '@/components/library/comparison-picker';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft,LockKeyhole,Globe } from 'lucide-react';
import { isSolutionId } from '@/lib/solutions/model';
import { requireBuyer,getSaved,getLists,getMemberships,resolveProjects } from '@/lib/library/server';
import { DeleteList } from '@/components/library/list-form';
import { AddSavedToList,ListItemNotes } from '@/components/library/list-membership';
import { ProjectPin } from '@/components/library/project-pin';
import { EditListPopover } from '@/components/library/edit-list-popover';
export const metadata={title:'Tu lista | shwcs',robots:{index:false,follow:false}};
export default async function ListPage(props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!isSolutionId(params.id))notFound();const account=await requireBuyer('/account/lists');const lists=await getLists(account.id);const list=lists.find(item=>item.id===params.id);if(!list)notFound();
 const [saved,memberships]=await Promise.all([getSaved(account.id),getMemberships(account.id)]);const items=memberships.filter(item=>item.list_id===list.id);const projects=await resolveProjects(saved.map(item=>item.project_key));const options=Object.values(projects).filter(project=>!items.some(item=>item.project_key===project.key));
 return <section className="account-page"><Link href="/account/lists" className="mb-7 inline-flex items-center gap-2 text-sm text-stone-500"><ArrowLeft className="size-4" aria-hidden="true"/>Mis listas</Link><header className="mb-8"><h1 className="break-words text-4xl font-semibold tracking-tight sm:text-5xl">{list.name}</h1>{list.purpose&&<p className="mt-4 max-w-2xl whitespace-pre-wrap break-words leading-relaxed text-stone-500">{list.purpose}<span className="mt-1 block text-xs text-stone-400">Propósito privado · solo tú</span></p>}<p className="mt-4 flex items-center gap-2 text-xs text-stone-400">{list.visibility==='public'?<Globe className="size-3.5" aria-hidden="true"/>:<LockKeyhole className="size-3.5" aria-hidden="true"/>}{list.visibility==='public'?'Lista pública':'Lista privada'} · {items.length} {items.length===1?'proyecto':'proyectos'}</p>{list.visibility==='public'&&<div className="mt-5"><ShareCollection id={list.id} preview/></div>}</header>
 <div className="mb-7 flex flex-wrap items-center gap-3"><AddSavedToList listId={list.id} projects={options}/><EditListPopover list={list}/></div>
 {items.length>1&&<ComparisonPicker listId={list.id} projects={items.flatMap(item=>projects[item.project_key]?[projects[item.project_key]]:[])}/>}
 {items.length?<div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=><ProjectPin key={item.project_key} project={projects[item.project_key]}><details className="border-t border-stone-200 pt-4"><summary className="cursor-pointer text-sm text-stone-500">{item.note?'Ver nota privada':'Añadir nota'}<span className="sr-only"> y opciones del proyecto</span></summary><ListItemNotes key={`${item.project_key}-${item.version}`} item={item}/></details></ProjectPin>)}</div>:<div className="rounded-3xl border border-dashed border-stone-300 py-16 text-center"><p className="text-lg font-medium">Tu lista empieza con un proyecto.</p><Link href="/#catalogo" className="mt-4 inline-block text-sm text-[#365DC4]">Explorar catálogo →</Link></div>}
 <div className="mt-10"><DeleteList id={list.id}/></div>
 </section>;
}
