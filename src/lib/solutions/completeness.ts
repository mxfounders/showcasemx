import { getSolutionCategories,safeSolutionUrl,type SolutionData } from './model';
// English overrides for the public ficha's "Qué falta por declarar" disclosure
// (the only place this renders outside the Spanish-only founder editor). Keyed
// by `key`, same fallback-to-Spanish convention as src/lib/taxonomy-en.ts.
const checklistEn:Record<string,{label:string;hint:string}>={
 basics:{label:'Identity and categories',hint:'Name, type and at least one category.'},
 fit:{label:'Problem and ideal client',hint:'Explain the challenge and who it’s built for.'},
 market:{label:'Industries and company size',hint:'Declare where it fits, or mark that it serves any.'},
 capabilities:{label:'What it does, specifically',hint:'The specific capabilities it covers, not just the broad category.'},
 scope:{label:'Scope and limits',hint:'What’s included and when it doesn’t fit.'},
 visual:{label:'Screenshots with context',hint:'Add at least one screenshot and explain what it shows.'},
 demo:{label:'Demo or walkthrough',hint:'A link to see how it works.'},
 commercial:{label:'Price and implementation',hint:'State terms and how to get started.'},
 readiness:{label:'Setup, integrations and compliance',hint:'How long it takes to start and what it connects to.'},
 support:{label:'Integrations and support',hint:'What connections and support you offer.'},
 people:{label:'Creators and public presence',hint:'Introduce the team and their official links, with their consent.'},
 evidence:{label:'Evidence and contact',hint:'Experience backed by a link, site and valid contact.'},
};
export function solutionChecklist(data:SolutionData,locale?:string){
 const items=[
  {key:'basics',label:'Identidad y categorías',hint:'Nombre, tipo y al menos una categoría.',step:0,done:!!data.name&&!!data.kind&&getSolutionCategories(data).length>0},
  {key:'fit',label:'Problema y cliente ideal',hint:'Explica el reto y para quién está pensada.',step:1,done:data.problem.length>=20&&data.audience.length>=10},
  {key:'market',label:'Industrias y tamaño de empresa',hint:'Declara dónde encaja, o marca que sirve a cualquiera.',step:1,done:data.industries!==undefined&&data.companySizes!==undefined},
  {key:'capabilities',label:'Qué hace en concreto',hint:'Las capacidades específicas que cubres, no solo la categoría amplia.',step:1,done:!!data.capabilities?.length},
  {key:'scope',label:'Alcance y límites',hint:'Qué incluye y en qué casos no encaja.',step:1,done:!!data.scope?.trim()&&!!data.notFor?.trim()},
  {key:'visual',label:'Capturas con contexto',hint:'Añade al menos una captura y explica qué muestra.',step:1,done:!!data.screenshots?.length&&data.screenshots.every(item=>item.caption.trim().length>=3)},
  {key:'demo',label:'Demo o recorrido',hint:'Un enlace para conocer cómo funciona.',step:1,done:!!safeSolutionUrl(data.demoUrl)},
  {key:'commercial',label:'Precio e implementación',hint:'Indica condiciones y cómo empezar.',step:2,done:!!data.priceBand&&!!data.pricing?.trim()&&!!data.implementation?.trim()},
  {key:'readiness',label:'Arranque, integraciones y cumplimiento',hint:'Cuánto tarda en arrancar y con qué se conecta.',step:2,done:!!data.setupTime&&data.integrationKeys!==undefined},
  {key:'support',label:'Integraciones y soporte',hint:'Qué conexiones y acompañamiento ofreces.',step:2,done:!!data.integrations?.trim()&&!!data.support?.trim()},
  {key:'people',label:'Creadores y presencia pública',hint:'Presenta al equipo y sus enlaces oficiales, con su autorización.',step:1,done:!!data.founders?.length&&data.founders.every(person=>!!person.name.trim())&&!!data.projectLinks?.length&&data.projectLinks.every(link=>!!safeSolutionUrl(link.url))},
  {key:'evidence',label:'Evidencia y contacto',hint:'Experiencia respaldada con enlace, sitio y contacto válido.',step:2,done:!!data.evidence?.trim()&&!!safeSolutionUrl(data.evidenceUrl)&&!!safeSolutionUrl(data.website)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)}
 ];
 if(locale!=='en')return items;
 return items.map(item=>({...item,...(checklistEn[item.key]??{})}));
}
export function needsPublicationReview(publishedAt:string|null|undefined,now=Date.now()){
 if(!publishedAt)return true;const time=new Date(publishedAt).getTime();return !Number.isFinite(time)||now-time>90*24*60*60*1000;
}
