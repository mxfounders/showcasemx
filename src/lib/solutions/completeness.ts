import { getSolutionCategories,safeSolutionUrl,type SolutionData } from './model';
export function solutionChecklist(data:SolutionData){
 return [
  {key:'basics',label:'Identidad y categorías',hint:'Nombre, tipo y al menos una categoría.',step:0,done:!!data.name&&!!data.kind&&getSolutionCategories(data).length>0},
  {key:'fit',label:'Problema y cliente ideal',hint:'Explica el reto y para quién está pensada.',step:1,done:data.problem.length>=20&&data.audience.length>=10},
  {key:'scope',label:'Alcance y límites',hint:'Qué incluye y en qué casos no encaja.',step:1,done:!!data.scope?.trim()&&!!data.notFor?.trim()},
  {key:'visual',label:'Capturas con contexto',hint:'Añade al menos una captura y explica qué muestra.',step:1,done:!!data.screenshots?.length&&data.screenshots.every(item=>item.caption.trim().length>=3)},
  {key:'demo',label:'Demo o recorrido',hint:'Un enlace para conocer cómo funciona.',step:1,done:!!safeSolutionUrl(data.demoUrl)},
  {key:'commercial',label:'Precio e implementación',hint:'Indica condiciones y cómo empezar.',step:2,done:!!data.pricing?.trim()&&!!data.implementation?.trim()},
  {key:'support',label:'Integraciones y soporte',hint:'Qué conexiones y acompañamiento ofreces.',step:2,done:!!data.integrations?.trim()&&!!data.support?.trim()},
  {key:'people',label:'Creadores y presencia pública',hint:'Presenta al equipo y sus enlaces oficiales, con su autorización.',step:1,done:!!data.founders?.length&&data.founders.every(person=>!!person.name.trim())&&!!data.projectLinks?.length&&data.projectLinks.every(link=>!!safeSolutionUrl(link.url))},
  {key:'evidence',label:'Evidencia y contacto',hint:'Experiencia respaldada con enlace, sitio y contacto válido.',step:2,done:!!data.evidence?.trim()&&!!safeSolutionUrl(data.evidenceUrl)&&!!safeSolutionUrl(data.website)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)}
 ];
}
export function needsPublicationReview(publishedAt:string|null|undefined,now=Date.now()){
 if(!publishedAt)return true;const time=new Date(publishedAt).getTime();return !Number.isFinite(time)||now-time>90*24*60*60*1000;
}
