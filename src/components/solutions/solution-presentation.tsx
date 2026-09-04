import { PublicMetrics } from '@/components/metrics/public-metrics';
import { ReportForm } from '@/components/trust/report-form';
import { SolutionGallery } from './solution-gallery';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { LikeButton } from './like-button';
import { SolutionSocial } from './solution-social';
import { SimilarSolutions } from './similar-solutions';
import Link from 'next/link';
import { ArrowLeft,ArrowUpRight,ArrowRight,Play,CircleAlert } from 'lucide-react';
import { SocialIcon } from '@/components/icons/social-icons';
import { getSolutionCategories,safeSolutionUrl,solutionEvaluationFields,type SolutionData } from '@/lib/solutions/model';
import { solutionSlides } from '@/lib/solutions/gallery';
import { solutionChecklist } from '@/lib/solutions/completeness';
import { actionButtonStyle,brandColors,solutionCategoryTones } from '@/lib/brand-colors';
import type { SolutionComment } from '@/lib/solutions/social';
import type { PublishedProduct } from '@/lib/solutions/public';
export function SolutionPresentation({data,id,catalogKey,publishedAt,verifiedDomain,preview=false,social,comments,viewerName,own=false,hasSiteImage=false,similar=[]}:{data:SolutionData;id:string;catalogKey?:string|null;publishedAt?:string|null;verifiedDomain?:string|null;preview?:boolean;social?:{likes:number;liked:boolean;commentsCount:number};comments?:SolutionComment[];viewerName?:string;own?:boolean;hasSiteImage?:boolean;similar?:PublishedProduct[]}){
 const website=safeSolutionUrl(data.website),evidence=safeSolutionUrl(data.evidenceUrl),demo=safeSolutionUrl(data.demoUrl);
 const evaluation=solutionEvaluationFields.filter(field=>!['scope','evidence'].includes(field.key));
 const slides=solutionSlides(id,data.name,{screenshots:data.screenshots,hasSiteImage,hideSiteImage:data.hideSiteImage});
 // Shown to whoever reads the ficha, not just its owner: solutionChecklist
 // already exists to guide the founder, and being honest about a gap here is
 // exactly the information a buyer needs before deciding whether to reach out.
 // completeness is never equated with quality — see the copy below.
 const missing=solutionChecklist(data).filter(item=>!item.done);
 return <article className={preview?"account-page":"mx-auto max-w-6xl px-6 py-12 sm:py-20"}>
  {!preview&&<PublicMetrics solutionId={id}/>}
  <Link href={preview?'/account/solutions/'+id:'/#catalogo'} className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"><ArrowLeft className="size-4" aria-hidden="true"/>{preview?'Volver a la postulación':'Volver al catálogo'}</Link>
  {preview&&<p className="mb-6 rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">Vista previa privada del borrador guardado. Todavía no sustituye la ficha aprobada.</p>}
  <header className="border-b border-stone-200 pb-10"><div className="mb-5 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs text-stone-500">{data.kind}</span>{getSolutionCategories(data).map(category=>{const tone=brandColors[solutionCategoryTones[category]??'blue'];return <span key={category} className="rounded-full px-3 py-1.5 text-xs" style={{backgroundColor:tone.soft,color:tone.solid}}>{category}</span>})}</div><h1 className="break-words text-4xl font-semibold tracking-tight sm:text-6xl">{data.name||'Nombre pendiente'}</h1><p className="mt-5 max-w-3xl whitespace-pre-wrap break-words text-lg leading-relaxed text-stone-600">{data.problem||'Descripción pendiente.'}</p><p className="mt-5 text-xs text-stone-400">Información declarada por el proyecto · {preview?'Borrador privado':publishedAt?'Publicación actualizada el '+new Date(publishedAt).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'long',year:'numeric'}):'Fecha de actualización no registrada'}</p>{!preview&&verifiedDomain&&<p className="mt-4 text-xs text-[#416B50]">Control de dominio comprobado: {verifiedDomain}. No certifica resultados.</p>}</header>

  {slides.length?<div className="mt-10"><SolutionGallery slides={slides}/></div>:<p className="mt-10 text-sm text-stone-500">Este proyecto aún no ha compartido imágenes. Puedes pedirle una demostración.</p>}


  {!!missing.length&&<details className="mt-6"><summary>Qué falta por declarar en esta ficha ({missing.length})</summary><div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-5"><p className="flex items-start gap-2 text-xs leading-relaxed text-stone-500"><CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0"/>Que falte información no significa que la solución sea mala: es simplemente lo que el proyecto todavía no ha compartido públicamente.</p><ul className="mt-4 space-y-2">{missing.map(item=><li key={item.key} className="text-sm text-stone-600"><span className="font-medium text-stone-800">{item.label}.</span> {item.hint}</li>)}</ul></div></details>}

  <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
   <div className="min-w-0 space-y-10">
    <section><h2 className="text-xl font-medium">Para quién está pensada</h2><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">{data.audience||'El proyecto todavía no ha detallado para quién está pensado. Confírmalo con su equipo.'}</p></section>
    <section className="border-t border-stone-200 pt-8"><h2 className="text-xl font-medium">Cuándo puede no encajar</h2><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">{data.notFor||'El proyecto no ha indicado limitaciones específicas. Confirma si cubre tus requisitos.'}</p></section>
    <section className="border-t border-stone-200 pt-8"><h2 className="text-xl font-medium">Qué incluye</h2><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">{data.scope||'El proyecto todavía no ha detallado el alcance. Consulta qué incluye antes de contratar.'}</p></section>
    <section className="border-t border-stone-200 pt-8"><h2 className="text-xl font-medium">Antes de decidir</h2><dl className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2">{evaluation.map(field=><div key={field.key}><dt className="text-sm font-medium">{field.label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-500">{data[field.key]||'Información no proporcionada. Consúltala con el proyecto.'}</dd></div>)}</dl></section>
    <section className="border-t border-stone-200 pt-8"><h2 className="text-xl font-medium">Conoce su trabajo</h2><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-stone-600">{data.evidence||'Todavía no hay casos o resultados compartidos en esta ficha.'}</p>{evidence&&<a href={evidence} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]">Ver demo, caso o portafolio<ArrowUpRight className="size-4" aria-hidden="true"/><span className="sr-only"> (otra pestaña)</span></a>}</section>
    {!!data.founders?.length&&<section className="border-t border-stone-200 pt-8"><h2 className="text-xl font-medium">Quién está detrás</h2><p className="mt-2 text-xs text-stone-400">Personas presentadas por el proyecto. Identidad no verificada por shwcs.</p><div className="mt-6 space-y-7">{data.founders.filter(person=>person.name.trim()).map((person,index)=><article key={index}><h3 className="text-lg font-medium">{person.name}</h3>{person.role&&<p className="mt-1 text-sm text-stone-500">{person.role}</p>}{person.bio&&<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{person.bio}</p>}<div className="mt-4 flex flex-wrap gap-3">{person.links.map((link,i)=>{const href=safeSolutionUrl(link.url);return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#365DC4]"><SocialIcon label={link.label} className="size-4 shrink-0"/>{link.label}<ArrowUpRight className="size-3" aria-hidden="true"/><span className="sr-only"> (otra pestaña)</span></a>:null})}</div></article>)}</div></section>}
   </div>
   <aside className="border-t border-stone-200 pt-6 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
    {demo&&<div className="mb-8"><a href={demo} target="_blank" rel="noopener noreferrer" style={actionButtonStyle} className="action-button flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium">Ver demo o recorrido<Play className="size-4" aria-hidden="true"/><span className="sr-only"> (otra pestaña)</span></a></div>}
    <h2 className="text-lg font-medium">¿Encaja con lo que necesitas?</h2>
    <p className="mt-3 text-sm leading-relaxed text-stone-500">Conoce al equipo desde su sitio y confirma alcance, precio y tiempos para tu empresa.</p>
    {website&&<a data-official-site href={website} target="_blank" rel="noopener noreferrer" style={actionButtonStyle} className="action-button mt-6 flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium">Visitar sitio oficial<ArrowUpRight className="size-4" aria-hidden="true"/><span className="sr-only"> (otra pestaña)</span></a>}
    {!preview&&<>
     <Link href={`/account/contacts/new?solution=${id}`} style={actionButtonStyle} className="action-button mt-3 flex w-full items-center justify-between gap-2 rounded-full px-5 py-3 text-sm font-medium">Quiero conocer esta solución<ArrowRight className="size-4" aria-hidden="true"/></Link>
     <div className="mt-3"><SaveProjectButton variant="secondary" projectKey={catalogKey?`catalog:${catalogKey}`:`solution:${id}`} /></div>
     {social&&<div className="mt-3"><LikeButton id={id} initialLikes={social.likes} liked={social.liked} own={own}/></div>}
    </>}
    {!!data.projectLinks?.length&&<div className="mt-6 border-t border-stone-200 pt-6"><h3 className="text-sm font-medium text-stone-700">Sigue al proyecto</h3><div className="mt-3 flex flex-wrap gap-2">{data.projectLinks.map((link,index)=>{const href=safeSolutionUrl(link.url);return href?<a key={index} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"><SocialIcon label={link.label} className="size-3.5 shrink-0"/>{link.label}<span className="sr-only"> (otra pestaña)</span></a>:null})}</div></div>}
    <p className="mt-6 text-xs leading-relaxed text-stone-400">Información proporcionada por el proyecto. La revisión editorial para aparecer en el catálogo no certifica sus resultados, seguridad ni calidad del servicio.</p>
    {!preview&&<details className="mt-6 border-t border-stone-200 pt-5"><summary className="cursor-pointer text-xs text-stone-500">Reportar esta ficha</summary><div className="mt-4"><ReportForm solutionId={id}/></div></details>}
   </aside>
  </div>
  {!preview&&social&&<SolutionSocial id={id} initialCommentsCount={social.commentsCount} comments={comments??[]} initialName={viewerName}/>}
  {!preview&&!!similar.length&&<SimilarSolutions products={similar}/>}
 </article>;
}
