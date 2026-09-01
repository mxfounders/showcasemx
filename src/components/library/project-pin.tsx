import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BuyerProject } from '@/lib/library/model';
import { ProjectCover } from './project-cover';
export function ProjectPin({project,children}:{project?:BuyerProject;children?:ReactNode}){
 return <article className="min-w-0">{project?<><Link href={project.href} target={project.external?'_blank':undefined} rel={project.external?'noopener noreferrer':undefined} className="group block rounded-3xl"><div className="relative aspect-[4/3] overflow-hidden rounded-[24px]"><ProjectCover name={project.name} image={project.image}/><span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition-transform group-hover:-translate-y-1 motion-reduce:transform-none"><ArrowUpRight className="size-4" aria-hidden="true"/></span></div><div className="px-1 pt-4"><p className="mb-1 text-xs text-stone-500">{project.kind} · {project.categories[0]}</p><h2 className="truncate text-xl font-medium tracking-tight">{project.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">{project.description}</p></div>{project.external&&<span className="sr-only">Abre el sitio oficial en una pestaña nueva</span>}</Link></>:<div className="rounded-3xl bg-stone-200/40 p-8 text-sm text-stone-500">Proyecto no disponible.</div>}{children&&<div className="mt-4 px-1">{children}</div>}</article>;
}
