import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireBuyer,getLists,getMemberships,resolveProjects } from '@/lib/library/server';
import { comparisonKeys,type BuyerProject } from '@/lib/library/model';
import { isSolutionId,safeSolutionUrl } from '@/lib/solutions/model';
import { actionButtonStyle } from '@/lib/brand-colors';
export const metadata={title:'Comparar proyectos | shwcs',robots:{index:false,follow:false}};
const fields:[string,keyof BuyerProject][]=[['Qué resuelve','description'],['Cliente ideal','audience'],['Qué incluye','scope'],['Precio orientativo','pricing'],['Implementación','implementation'],['Integraciones','integrations'],['Soporte','support'],['Evidencia declarada','evidence']];
export default async function ComparePage(
 props:{params: Promise<{id:string}>;searchParams: Promise<{project?:string|string[]}>}
) {
 const searchParams = await props.searchParams;
 const params = await props.params;
 if(!isSolutionId(params.id))notFound();const account=await requireBuyer('/account/lists');
 const [lists,memberships]=await Promise.all([getLists(account.id),getMemberships(account.id)]);
 const list=lists.find(row=>row.id===params.id);if(!list)notFound();
 const items=memberships.filter(row=>row.list_id===list.id),keys=comparisonKeys(searchParams.project,items.map(row=>row.project_key));
 const back=`/account/lists/${list.id}`;
 if(!keys)return <section className="account-page"><h1 className="text-3xl font-semibold">Elige dos o tres proyectos de tu lista.</h1><p className="mt-4 text-stone-500">La selección cambió o no pertenece a esta lista.</p><Link href={back} className="mt-6 inline-block text-[#365DC4]">Volver a la lista →</Link></section>;
 const projects=await resolveProjects(keys);
 return <section className="account-page"><Link href={back} className="text-sm text-[#365DC4]">← Volver a {list.name}</Link><h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">Decide con contexto.</h1><p className="mt-4 max-w-2xl text-stone-500">Información publicada por cada proyecto, sin puntuaciones ni certificaciones. Confirma precios, alcance y disponibilidad antes de contratar.</p><p id="compare-help" className="mt-4 text-xs text-stone-500">En móvil, desliza la tabla horizontalmente. Tus notas solo las ves tú.</p>
 <div role="region" aria-label="Comparación de proyectos" aria-describedby="compare-help" tabIndex={0} className="mt-7 max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4]">
 <table className="w-full min-w-[740px] table-fixed border-collapse text-left text-sm"><caption className="sr-only">Comparación de {list.name}</caption><thead><tr><th scope="col" className="w-40 border-b border-stone-200 p-4">Qué evaluar</th>{keys.map(key=>{const p=projects[key];return <th key={key} scope="col" className="border-b border-stone-200 p-4 align-top"><span className="block break-words text-xl">{p?.name||'Proyecto no disponible'}</span>{p&&<><span className="mt-2 block text-xs font-normal text-stone-500">{p.kind} · {p.categories.join(' · ')}</span><Link href={p.href} target={p.external?'_blank':undefined} rel={p.external?'noopener noreferrer':undefined} className="mt-4 inline-block text-xs text-[#365DC4]">{p.external?'Visitar sitio ↗':'Ver ficha →'}</Link></>}</th>;})}</tr></thead><tbody>
 {fields.map(([label,field])=><tr key={field}><th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">{label}</th>{keys.map(key=><td key={key} className="whitespace-pre-wrap break-words border-b border-stone-200 p-4 align-top leading-relaxed text-stone-600">{projects[key]?.[field]||'Sin información publicada.'}</td>)}</tr>)}
 <tr><th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">Demo o caso</th>{keys.map(key=>{const url=safeSolutionUrl(projects[key]?.evidenceUrl);return <td key={key} className="border-b border-stone-200 p-4">{url?<a href={url} target="_blank" rel="noopener noreferrer" className="text-[#365DC4]">Ver evidencia ↗</a>:'Sin enlace publicado.'}</td>;})}</tr>
 <tr><th scope="row" className="border-b border-stone-200 p-4 align-top font-medium">Tus notas privadas</th>{keys.map(key=><td key={key} className="whitespace-pre-wrap break-words border-b border-stone-200 p-4 align-top text-stone-500">{items.find(item=>item.project_key===key)?.note||'Todavía no has añadido notas.'}</td>)}</tr>
 <tr><th scope="row" className="p-4 align-top font-medium">Siguiente paso</th>{keys.map(key=><td key={key} className="p-4 align-top">{projects[key]?.solutionId?<Link href={`/account/contacts/new?solution=${projects[key].solutionId}`} style={actionButtonStyle} className="action-button inline-flex rounded-full px-4 py-3 text-xs font-medium">Solicitar contacto →</Link>:<p className="text-xs text-stone-500">{projects[key]?'Contacto desde su sitio oficial; aún no recibe solicitudes aquí.':'La ficha ya no está disponible.'}</p>}</td>)}</tr>
 </tbody></table></div></section>;
}
