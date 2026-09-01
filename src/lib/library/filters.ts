import type { BuyerProject } from './model';
export type SavedEntry={key:string;project?:BuyerProject;memberships:string[]};
export type SavedFilters={query:string;kind:string;category:string;list:string;sort:string};
export const normalizeLibrarySearch=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function filterSaved(entries:SavedEntry[],filters:SavedFilters){
 const words=normalizeLibrarySearch(filters.query).split(/\s+/).filter(Boolean);
 const visible=entries.filter(entry=>{
  const project=entry.project;
  if(filters.kind&&project?.kind!==filters.kind)return false;
  if(filters.category&&!project?.categories.includes(filters.category))return false;
  if(filters.list==='none'&&entry.memberships.length)return false;
  if(filters.list&&filters.list!=='none'&&!entry.memberships.includes(filters.list))return false;
  const text=normalizeLibrarySearch(project?[project.name,project.description,project.kind,...project.categories].join(' '):'Proyecto no disponible');
  return words.every(word=>text.includes(word));
 });
 if(filters.sort==='name')return visible.sort((a,b)=>(a.project?.name??'Proyecto no disponible').localeCompare(b.project?.name??'Proyecto no disponible','es'));
 if(filters.sort==='oldest')return visible.reverse();
 return visible;
}
