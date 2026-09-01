import {readPublicLinks,readFounders,type PublicLink,type SolutionFounder} from './profile';
export type SolutionScreenshot={id:string;caption:string};
export type SolutionData = { name:string; kind:string; category:string; categories?:string[]; problem:string; audience:string; website:string; contactEmail:string; scope?:string; pricing?:string; implementation?:string; integrations?:string; support?:string; evidence?:string; evidenceUrl?:string;demoUrl?:string;notFor?:string;screenshots?:SolutionScreenshot[];founders?:SolutionFounder[];projectLinks?:PublicLink[] };
export const emptySolution:SolutionData={name:'',kind:'',category:'',problem:'',audience:'',website:'',contactEmail:''};
export const solutionCategories=['Cobros','Finanzas','Nómina','Ventas','Operación','Legal','Agencias'] as const;
export const statuses={draft:{label:'Borrador',next:'Completa los datos y envía tu solución.'},pending:{label:'En revisión',next:'El equipo está revisando tu postulación. Puedes consultar lo que enviaste.'},changes_requested:{label:'Necesita cambios',next:'Revisa los comentarios, corrige y vuelve a enviar.'},published:{label:'Publicada',next:'Tu ficha está disponible. Las modificaciones necesitan una nueva revisión.'},rejected:{label:'No aceptada',next:'Consulta el motivo. Puedes preparar una versión corregida.'}} as const;
export type SolutionStatus=keyof typeof statuses;
export type FounderSolution={id:string;catalog_key?:string|null;owner_id:string;data:SolutionData;status:SolutionStatus;step:number;version:number;published_data:SolutionData|null;updated_at:string;published_at?:string|null;editor_question?:string|null};
export type SolutionEvent={id:string;status:SolutionStatus;message:string;created_at:string};
export const isSolutionId=(value:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function readSolutionData(value:unknown):SolutionData|null{
 if(!value||typeof value!=='object')return null;
 const input=value as Record<string,unknown>;const result={...emptySolution};
 const limits={name:100,kind:20,category:30,problem:1500,audience:800,website:500,contactEmail:254};
 for(const key of Object.keys(limits) as (keyof typeof limits)[]){if(key==='category'&&input.category===undefined&&Array.isArray(input.categories))continue;if(typeof input[key]!=='string'||input[key].length>limits[key])return null;result[key]=input[key].trim();}
 if(result.kind&&!['Software','Agencia','Servicio'].includes(result.kind))return null;
 if(result.category&&!solutionCategories.some(category=>category===result.category))return null;
 if(input.categories!==undefined){if(!Array.isArray(input.categories)||input.categories.length>solutionCategories.length||input.categories.some(value=>typeof value!=='string'||!solutionCategories.some(category=>category===value)))return null;result.categories=Array.from(new Set(input.categories as string[]));result.category=result.categories[0]??'';}
 for(const field of solutionEvaluationFields){const value=input[field.key];if(value!==undefined){if(typeof value!=='string'||value.length>field.limit)return null;result[field.key]=value.trim();}}
 if(input.evidenceUrl!==undefined){if(typeof input.evidenceUrl!=='string'||input.evidenceUrl.length>500)return null;result.evidenceUrl=input.evidenceUrl.trim();}
 if(input.demoUrl!==undefined){if(typeof input.demoUrl!=='string'||input.demoUrl.length>500)return null;result.demoUrl=input.demoUrl.trim();}
 if(input.notFor!==undefined){if(typeof input.notFor!=='string'||input.notFor.length>500)return null;result.notFor=input.notFor.trim();}
 if(input.screenshots!==undefined){
  if(!Array.isArray(input.screenshots)||input.screenshots.length>4)return null;
  const screenshots:SolutionScreenshot[]=[];
  for(const item of input.screenshots){if(!item||typeof item!=='object'||typeof item.id!=='string'||!isSolutionId(item.id)||typeof item.caption!=='string'||item.caption.length>180||screenshots.some(s=>s.id===item.id))return null;screenshots.push({id:item.id,caption:item.caption.trim()});}
  result.screenshots=screenshots;
 }
 if(input.founders!==undefined){const founders=readFounders(input.founders);if(!founders)return null;result.founders=founders;}
 if(input.projectLinks!==undefined){const links=readPublicLinks(input.projectLinks,6);if(!links)return null;result.projectLinks=links;}
 return result;
}
export function solutionErrors(data:SolutionData,step?:number){
 const errors:Partial<Record<keyof SolutionData,string>>={};
 if(step===undefined||step===0){if(!data.name)errors.name='Dale un nombre a tu solución.';if(!data.kind)errors.kind='Selecciona qué ofreces.';if(!getSolutionCategories(data).length)errors.category='Selecciona al menos una categoría.';}
 if(step===undefined||step===1){if(data.problem.length<20)errors.problem='Cuéntanos qué resuelves en al menos 20 caracteres.';if(data.audience.length<10)errors.audience='Describe para quién es tu solución.';}
 if(step===undefined||step===2){try{const url=new URL(data.website);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.'))throw new Error();}catch{errors.website='Escribe un sitio válido, empezando por https://.';}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail))errors.contactEmail='Escribe un correo de contacto válido.';}
 if((step===undefined||step===2)&&data.evidenceUrl&&!safeSolutionUrl(data.evidenceUrl))errors.evidenceUrl='El enlace de evidencia debe empezar por https:// y no contener credenciales.';
 if((step===undefined||step===1)&&data.demoUrl&&!safeSolutionUrl(data.demoUrl))errors.demoUrl='Escribe un enlace HTTP(S) válido para la demo, sin credenciales.';
 if((step===undefined||step===1)&&data.screenshots?.some(item=>item.caption.trim().length<3))errors.screenshots='Describe qué muestra cada captura en al menos 3 caracteres.';
 if(step===undefined||step===1){
  if(data.founders?.some(person=>!person.name.trim()||person.links.some(link=>!safeSolutionUrl(link.url))))errors.founders="Añade el nombre de cada persona y enlaces HTTP(S) válidos, o elimina los campos que no usarás.";
  if(data.projectLinks?.some(link=>!safeSolutionUrl(link.url)))errors.projectLinks="Completa los enlaces del proyecto con URLs HTTP(S) sin credenciales, o elimina los vacíos.";
 }
 return errors;
}

export function getSolutionCategories(data:{category?:string;categories?:string[]}){return data.categories??(data.category?[data.category]:[]);}

export const solutionEvaluationFields = [
 {key:'scope',label:'Qué incluye',prompt:'¿Qué recibe quien te contrata?',placeholder:'Funciones, entregables o alcance concreto. Aclara también qué no incluye.',limit:800},
 {key:'pricing',label:'Precios y contratación',prompt:'¿Cómo se contrata y cuánto cuesta?',placeholder:'Indica moneda, periodicidad y qué incluye. Si cotizas a medida, explica de qué depende.',limit:400},
 {key:'implementation',label:'Implementación',prompt:'¿Qué se necesita para empezar?',placeholder:'Tiempo orientativo de puesta en marcha, requisitos y acompañamiento.',limit:400},
 {key:'integrations',label:'Integraciones',prompt:'¿Con qué herramientas se conecta?',placeholder:'Integraciones disponibles hoy. Distingue las que necesitan desarrollo adicional.',limit:400},
 {key:'support',label:'Soporte',prompt:'¿Qué acompañamiento ofreces?',placeholder:'Canales, horarios e idioma. Evita prometer tiempos que no puedas cumplir.',limit:400},
 {key:'evidence',label:'Experiencia y evidencia',prompt:'¿Qué puedes mostrar de tu trabajo?',placeholder:'Un caso, una demo o un resultado con contexto. Comparte solo información que puedas hacer pública.',limit:800},
] as const;
export function safeSolutionUrl(value:string|undefined){if(!value)return null;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&url.hostname.includes('.')?url.href:null;}catch{return null;}}
export function solutionEvaluationRows(data:SolutionData){return solutionEvaluationFields.map(field=>[field.label,data[field.key]||'Por completar'] as const);}
