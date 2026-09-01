import Link from 'next/link';
import { Bookmark,LockKeyhole } from 'lucide-react';
import { requireBuyer,getSaved,getLists,getMemberships,resolveProjects } from '@/lib/library/server';
import { validProjectKey } from '@/lib/library/model';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { ProjectSummary } from '@/components/library/project-summary';
import { SavedGallery } from '@/components/library/saved-gallery';
import { actionButtonStyle } from '@/lib/brand-colors';
export const metadata={title:'Guardados | shwcs',robots:{index:false,follow:false}};
export default async function SavedPage(props:{searchParams: Promise<{project?:string;list?:string}>}) {
 const searchParams = await props.searchParams;
 const requested=validProjectKey(searchParams.project)?searchParams.project:null;
 const account=await requireBuyer(requested?`/account/saved?project=${encodeURIComponent(requested)}`:'/account/saved');
 const [saved,lists,memberships]=await Promise.all([getSaved(account.id),getLists(account.id),getMemberships(account.id)]);
 const projects=await resolveProjects([...saved.map(item=>item.project_key),...(requested?[requested]:[])]);
 const initialList=searchParams.list==='none'||lists.some(list=>list.id===searchParams.list)?searchParams.list:undefined;
 const resume=requested&&!saved.some(item=>item.project_key===requested)?requested:null;
 return <section className="account-page"><header className="mb-9"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Guardados.</h1><p className="mt-4 flex items-center gap-2 text-xs text-stone-400"><LockKeyhole className="size-3.5" aria-hidden="true"/>Solo tú.</p></header>
 {resume&&<section className="mb-10 border-y border-stone-200 py-7"><p className="mb-4 text-sm font-medium">El proyecto que querías guardar</p><ProjectSummary project={projects[resume]}/>{projects[resume]&&<div className="mt-5"><SaveProjectButton projectKey={resume} initialSaved={false}/></div>}</section>}
 <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-stone-500">{saved.length} {saved.length===1?'proyecto guardado':'proyectos guardados'}</p><Link href="/account/lists" style={actionButtonStyle} className="action-button rounded-full px-5 py-3 text-sm font-medium">Mis listas →</Link></div>
 {saved.length?<SavedGallery key={initialList??'all'} initialList={initialList} entries={saved.map(item=>({key:item.project_key,project:projects[item.project_key],memberships:memberships.filter(member=>member.project_key===item.project_key).map(member=>member.list_id)}))} lists={lists}/>:!resume&&<div className="border-y border-stone-200 py-14"><Bookmark className="mb-5 size-8 text-stone-300" aria-hidden="true"/><h2 className="text-2xl font-medium">Guarda tu primera idea.</h2><Link href="/#catalogo" style={actionButtonStyle} className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm">Explorar proyectos →</Link></div>}
 </section>;
}
