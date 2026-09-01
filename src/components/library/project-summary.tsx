import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { BuyerProject } from '@/lib/library/model';
export function ProjectSummary({project}:{project?:BuyerProject}){
 if(!project)return <div><h2 className="text-xl font-medium">Proyecto no disponible</h2><p className="mt-2 text-sm text-stone-500">Su ficha ya no está publicada. Tus notas siguen siendo privadas; puedes quitarlo de la lista.</p></div>;
 return <div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold tracking-tight">{project.name}</h2><Link href={project.href} target={project.external?'_blank':undefined} rel={project.external?'noopener noreferrer':undefined} className="inline-flex items-center gap-1 text-sm text-[#365DC4]">{project.external?'Visitar sitio':'Ver ficha'}<ArrowUpRight className="size-4" aria-hidden="true"/>{project.external&&<span className="sr-only"> (otra pestaña)</span>}</Link></div><p className="mt-2 text-xs text-stone-500">{project.kind} · {project.categories.join(' · ')}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">{project.description}</p>{project.solutionId&&<Link href={`/account/contacts/new?solution=${project.solutionId}`} className="mt-4 inline-flex text-sm text-[#365DC4]">Solicitar contacto →</Link>}</div>;
}
