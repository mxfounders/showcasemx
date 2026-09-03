import Link from 'next/link';
import { ArrowUpRight,Layers,ArrowRight,Clock3,PanelsTopLeft,BriefcaseBusiness } from 'lucide-react';
import { requireFounder,getOwnedSolutions } from '@/lib/solutions/server';
import { getSolutionCategories,statuses,type SolutionStatus } from '@/lib/solutions/model';
import { solutionChecklist } from '@/lib/solutions/completeness';
import { NewSolutionButton } from '@/components/solutions/new-solution-button';
import { StatusBadge } from '@/components/solutions/status-badge';
import { DeleteDraftButton } from '@/components/solutions/delete-draft-button';
import { brandColors } from '@/lib/brand-colors';

export const metadata={title:'Mis soluciones | shwcs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

const statusTone:Record<SolutionStatus,keyof typeof brandColors>={draft:'lavender',pending:'blue',changes_requested:'amber',published:'sage',rejected:'terracotta'};

export default async function AccountPage(){
 const account=await requireFounder();
 const solutions=await getOwnedSolutions(account.id);
 const overview=[
  {label:'Publicadas',value:solutions.filter(item=>Boolean(item.published_data)).length,tone:'sage' as const},
  {label:'En revisión',value:solutions.filter(item=>item.status==='pending').length,tone:'amber' as const},
  {label:'Borradores',value:solutions.filter(item=>item.status==='draft'&&!item.published_data).length,tone:'lavender' as const},
 ];
 return <section className="account-page">
  <header className="mb-10 flex flex-wrap items-end justify-between gap-7"><div><p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#416B50]">Tu portafolio</p><h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Mis soluciones.</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-stone-500">Postula lo que construyes, consulta su revisión y mantén cada ficha lista para quien la descubre.</p></div>{solutions.length>0&&<NewSolutionButton />}</header>

  {!solutions.length?<div className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-50/70 px-6 py-14 sm:px-10 sm:py-16"><span style={{backgroundColor:brandColors.lavender.soft,color:brandColors.lavender.solid}} className="mb-7 flex size-12 items-center justify-center rounded-2xl"><Layers aria-hidden="true" className="size-6" /></span><h2 className="max-w-xl text-3xl font-medium leading-tight tracking-tight">Dale un lugar a lo que estás construyendo.</h2><p className="mb-8 mt-4 max-w-lg leading-relaxed text-stone-500">Software, agencia o servicio: prepara tu información a tu ritmo. Nada se publica sin pasar antes por revisión.</p><NewSolutionButton /><p className="mt-5 text-xs text-stone-400">Puedes guardar el borrador y volver cuando quieras.</p></div>:<>
   <section aria-label="Estado de las soluciones" className="mb-10 border-y border-stone-200 py-7"><dl className="space-y-4">{overview.map(item=>{const tone=brandColors[item.tone],percentage=item.value/solutions.length*100;return <div key={item.label} className="grid grid-cols-[88px_minmax(0,1fr)_24px] items-center gap-3 sm:grid-cols-[110px_minmax(0,1fr)_28px]"><dt className="text-xs font-medium" style={{color:tone.solid}}>{item.label}</dt><dd className="contents"><div className="h-2 overflow-hidden rounded-full" style={{backgroundColor:tone.soft}} role="progressbar" aria-label={`${item.label}: ${item.value} de ${solutions.length}`} aria-valuemin={0} aria-valuemax={solutions.length} aria-valuenow={item.value}><div className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${percentage}%`,backgroundColor:tone.solid}}/></div><span className="text-right text-sm font-semibold tabular-nums text-stone-700">{item.value}</span></dd></div>;})}</dl></section>

   <section aria-labelledby="solution-list-title"><div className="mb-5 flex items-center justify-between gap-4"><div><h2 id="solution-list-title" className="text-lg font-semibold tracking-tight">Tus fichas</h2><p className="mt-1 text-xs text-stone-400">Ordenadas por la actualización más reciente</p></div><span className="text-xs text-stone-400">{solutions.length} {solutions.length===1?'solución':'soluciones'}</span></div>
    <div className="space-y-3">{solutions.map(solution=>{
     const tone=brandColors[statusTone[solution.status]],name=solution.data.name||'Solución sin nombre',categories=getSolutionCategories(solution.data),checklist=solutionChecklist(solution.data),done=checklist.filter(item=>item.done).length,progress=Math.round(done/checklist.length*100),deletable=solution.status==='draft'&&!solution.published_data;
     const KindIcon=solution.data.kind==='Software'?PanelsTopLeft:solution.data.kind==='Agencia'?BriefcaseBusiness:Layers;
     const action=solution.status==='pending'?'Ver seguimiento':solution.status==='published'?'Gestionar ficha':solution.status==='changes_requested'?'Revisar cambios':solution.status==='rejected'?'Revisar postulación':'Continuar borrador';
     return <article key={solution.id} className="group rounded-[24px] border border-stone-200 bg-white p-5 transition-[border-color,box-shadow] hover:border-stone-300 hover:shadow-[0_14px_35px_-28px_rgba(41,37,36,0.45)] sm:p-6"><div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
      <span style={{backgroundColor:tone.soft,color:tone.solid}} className="flex size-11 items-center justify-center rounded-2xl"><KindIcon aria-hidden="true" strokeWidth={1.7} className="size-5"/></span>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><h3 className="break-words text-xl font-semibold tracking-tight text-stone-900">{name}</h3><StatusBadge status={solution.status}/>{solution.published_data&&solution.status!=='published'&&<span className="rounded-full border border-stone-200 px-2.5 py-1 text-[11px] text-stone-500">La versión anterior sigue pública</span>}</div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{statuses[solution.status].next}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-400"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="size-3.5"/>Actualizada {new Date(solution.updated_at).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</span><span>{solution.data.kind||'Tipo por definir'}</span>{categories.slice(0,2).map(category=><span key={category} className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-500">{category}</span>)}</div>{solution.status==='draft'&&<div className="mt-4 max-w-md"><div className="mb-1.5 flex items-center justify-between text-[11px] text-stone-400"><span>Información de la ficha</span><span>{done}/{checklist.length} bloques</span></div><div role="progressbar" aria-label={`Información completada de ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div style={{width:`${progress}%`,backgroundColor:tone.solid}} className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"/></div></div>}</div>
      <div className="flex flex-wrap items-center gap-1 sm:col-start-2 lg:col-start-auto lg:justify-end"><Link href={`/account/solutions/${solution.id}`} className="action-button inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium" style={{backgroundColor:tone.soft,color:tone.solid}}>{action}<ArrowRight aria-hidden="true" className="size-4"/></Link>{solution.status==='published'&&<Link href={`/soluciones/${solution.id}`} target="_blank" aria-label={`Ver ficha pública de ${name}`} className="inline-flex size-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><ArrowUpRight aria-hidden="true" className="size-4"/></Link>}{deletable&&<DeleteDraftButton id={solution.id} name={name}/>}</div>
     </div></article>;
    })}</div>
   </section>
  </>}

 </section>;
}
