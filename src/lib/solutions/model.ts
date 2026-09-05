import {readPublicLinks,readFounders,type PublicLink,type SolutionFounder} from './profile';
export type SolutionScreenshot={id:string;caption:string};
// hideSiteImage: the founder's opt-out of showing the auto-fetched og:image of
// their own site as a ficha slide. Absent/false = shown, so no existing ficha
// changes. Named in the negative on purpose: an absent boolean must mean
// "show", and a jsonb key that is merely false already means that.
export type SolutionData = { name:string; kind:string; category:string; categories?:string[]; problem:string; audience:string; website:string; contactEmail:string; scope?:string; pricing?:string; implementation?:string; integrations?:string; support?:string; evidence?:string; evidenceUrl?:string;demoUrl?:string;notFor?:string;screenshots?:SolutionScreenshot[];founders?:SolutionFounder[];projectLinks?:PublicLink[];hideSiteImage?:boolean;industries?:string[];companySizes?:string[];capabilities?:string[];integrationKeys?:string[];pricingModel?:string[];priceBand?:string;setupTime?:string;compliance?:string[] };
export const emptySolution:SolutionData={name:'',kind:'',category:'',problem:'',audience:'',website:'',contactEmail:''};
export const solutionCategories=['Cobros','Finanzas','Nómina','Ventas','Operación','Legal','Agencias'] as const;
// Plain value lists a solution can declare. This file owns what is legal to
// store; src/lib/taxonomy.ts imports these same arrays to attach labels,
// tones and routes for the UI, so the two can never drift apart. Reversing
// that import direction would create a cycle (model.ts needs the value list
// to validate; taxonomy.ts needs the value list to build its richer entries).
export const solutionIndustries=['Agencias','Retail','Manufactura','Legal','Construcción','Salud','Educación'] as const;
export const companySizes=['micro','pyme','mediana','corporativo'] as const;
// [] on either field means "declared, serves any" — a deliberate answer, not a
// gap. undefined means the founder never answered the question. The public
// ficha and the filters must tell these two apart; see solutionChecklist.
// Capabilities: what a solution actually *does*, one level more specific than
// its 7 broad categories — "Ventas" alone can't tell "cotizaciones" apart from
// "conciliación bancaria". Each capability belongs to exactly one category, so
// the editor can offer only the ones under categories the founder already
// declared. Unlike industries/companySizes there's no "any" answer here: a
// solution either does something concrete or it doesn't, so the field has no
// [] state — undefined (never answered) is the only gap, and at least one
// capability is required to submit (see solutionErrors). Labels live in
// src/lib/taxonomy.ts, search terms in src/lib/search/vocabulary.ts.
export const solutionCapabilities=[
 {id:'facturacion-cfdi',category:'Cobros'},{id:'cobranza-recordatorios',category:'Cobros'},{id:'conciliacion-bancaria',category:'Cobros'},{id:'portal-pagos',category:'Cobros'},{id:'suscripciones',category:'Cobros'},{id:'cartera-antiguedad',category:'Cobros'},{id:'cuentas-por-pagar',category:'Cobros'},{id:'factoraje',category:'Cobros'},
 {id:'flujo-efectivo',category:'Finanzas'},{id:'presupuestos',category:'Finanzas'},{id:'contabilidad',category:'Finanzas'},{id:'reportes-tableros',category:'Finanzas'},{id:'gastos-reembolsos',category:'Finanzas'},{id:'tarjetas-corporativas',category:'Finanzas'},{id:'consolidacion-multiempresa',category:'Finanzas'},{id:'impuestos',category:'Finanzas'},
 {id:'calculo-timbrado',category:'Nómina'},{id:'dispersion',category:'Nómina'},{id:'imss-infonavit',category:'Nómina'},{id:'asistencia-horarios',category:'Nómina'},{id:'vacaciones-ausencias',category:'Nómina'},{id:'reclutamiento-onboarding',category:'Nómina'},{id:'desempeno',category:'Nómina'},{id:'capacitacion',category:'Nómina'},{id:'prestaciones',category:'Nómina'},
 {id:'crm-pipeline',category:'Ventas'},{id:'cotizaciones-propuestas',category:'Ventas'},{id:'catalogo-precios',category:'Ventas'},{id:'prospeccion',category:'Ventas'},{id:'pronostico',category:'Ventas'},{id:'comisiones',category:'Ventas'},{id:'contratos-cierre',category:'Ventas'},{id:'mayoreo-b2b',category:'Ventas'},{id:'postventa-renovaciones',category:'Ventas'},
 {id:'inventario-almacen',category:'Operación'},{id:'compras-proveedores',category:'Operación'},{id:'logistica-envios',category:'Operación'},{id:'proyectos-tareas',category:'Operación'},{id:'produccion',category:'Operación'},{id:'mantenimiento',category:'Operación'},{id:'calidad',category:'Operación'},{id:'mesa-ayuda',category:'Operación'},{id:'automatizacion-procesos',category:'Operación'},{id:'documentos',category:'Operación'},
 {id:'firma-electronica',category:'Legal'},{id:'gestion-contratos',category:'Legal'},{id:'expedientes-casos',category:'Legal'},{id:'cumplimiento-normativo',category:'Legal'},{id:'societario',category:'Legal'},{id:'marcas-pi',category:'Legal'},{id:'proteccion-datos',category:'Legal'},
 {id:'horas-facturables',category:'Agencias'},{id:'cuentas-clientes',category:'Agencias'},{id:'propuestas-briefs',category:'Agencias'},{id:'rentabilidad-proyecto',category:'Agencias'},{id:'reportes-cliente',category:'Agencias'},{id:'capacidad-equipo',category:'Agencias'},{id:'aprobaciones-creativas',category:'Agencias'},
] as const satisfies readonly {id:string;category:typeof solutionCategories[number]}[];
// The other four commercial axes. None of these have a tri-state "any": an
// empty/absent value means the same thing (never answered), so there's
// nothing to distinguish the way [] does for industries/companySizes.
export const solutionIntegrations=['sat-cfdi','contpaqi','aspel','quickbooks','xero','odoo','sap','netsuite','shopify','mercado-libre','woocommerce','amazon','stripe','conekta','clip','mercado-pago','paypal','bancos-mx','google-workspace','microsoft-365','slack','whatsapp-business','zapier-make','api-publica','webhooks'] as const;
export const solutionPricingModels=['suscripcion-mensual','suscripcion-anual','pago-unico','por-uso','por-proyecto','por-hora','comision','solo-cotizar'] as const;
export const solutionPriceBands=['menos-1000','de-1000-a-5000','de-5000-a-20000','de-20000-a-50000','mas-50000','depende-alcance'] as const;
export const solutionSetupTimes=['mismo-dia','menos-semana','una-a-cuatro-semanas','uno-a-tres-meses','mas-tres-meses'] as const;
export const solutionCompliance=['cfdi-4-0','sat-buzon','nom-151','nom-024','imss-infonavit','lfpdppp','gdpr','iso-27001','soc-2','soporte-espanol','factura-fiscal-mx'] as const;
export const statuses={draft:{label:'Borrador',next:'Completa los datos y envía tu solución.'},pending:{label:'En revisión',next:'El equipo está revisando tu postulación. Puedes consultar lo que enviaste.'},changes_requested:{label:'Necesita cambios',next:'Revisa los comentarios, corrige y vuelve a enviar.'},published:{label:'Publicada',next:'Tu ficha está disponible. Las modificaciones necesitan una nueva revisión.'},rejected:{label:'No aceptada',next:'Consulta el motivo. Puedes preparar una versión corregida.'}} as const;
export type SolutionStatus=keyof typeof statuses;
// has_site_image: whether the og:image read from the project's own website is
// stored, so a draft already has a cover. See src/lib/solutions/site-image.ts.
export type FounderSolution={id:string;catalog_key?:string|null;owner_id:string;data:SolutionData;status:SolutionStatus;step:number;version:number;published_data:SolutionData|null;updated_at:string;published_at?:string|null;editor_question?:string|null;has_site_image?:boolean;site_image_failure?:string|null};
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
 if(input.hideSiteImage!==undefined){if(typeof input.hideSiteImage!=='boolean')return null;result.hideSiteImage=input.hideSiteImage;}
 // An empty array is a real, valid answer ("sirve a cualquier industria/tamaño"),
 // distinct from the field being absent (never answered). Both fields keep that
 // distinction all the way through: never default a missing one to [].
 if(input.industries!==undefined){if(!Array.isArray(input.industries)||input.industries.length>solutionIndustries.length||input.industries.some(value=>typeof value!=='string'||!solutionIndustries.some(industry=>industry===value)))return null;result.industries=Array.from(new Set(input.industries as string[]));}
 if(input.companySizes!==undefined){if(!Array.isArray(input.companySizes)||input.companySizes.length>companySizes.length||input.companySizes.some(value=>typeof value!=='string'||!companySizes.some(size=>size===value)))return null;result.companySizes=Array.from(new Set(input.companySizes as string[]));}
 // capabilities has no [] state (see the comment above its declaration): an
 // absent key is the only gap, so this is the same shape of check as
 // industries/companySizes minus the "any" branch.
 if(input.capabilities!==undefined){if(!Array.isArray(input.capabilities)||input.capabilities.length>solutionCapabilities.length||input.capabilities.some(value=>typeof value!=='string'||!solutionCapabilities.some(item=>item.id===value)))return null;result.capabilities=Array.from(new Set(input.capabilities as string[]));}
 if(input.integrationKeys!==undefined){if(!Array.isArray(input.integrationKeys)||input.integrationKeys.length>solutionIntegrations.length||input.integrationKeys.some(value=>typeof value!=='string'||!solutionIntegrations.some(key=>key===value)))return null;result.integrationKeys=Array.from(new Set(input.integrationKeys as string[]));}
 if(input.pricingModel!==undefined){if(!Array.isArray(input.pricingModel)||input.pricingModel.length>solutionPricingModels.length||input.pricingModel.some(value=>typeof value!=='string'||!solutionPricingModels.some(model=>model===value)))return null;result.pricingModel=Array.from(new Set(input.pricingModel as string[]));}
 if(input.priceBand!==undefined){if(typeof input.priceBand!=='string'||!solutionPriceBands.some(band=>band===input.priceBand))return null;result.priceBand=input.priceBand;}
 if(input.setupTime!==undefined){if(typeof input.setupTime!=='string'||!solutionSetupTimes.some(time=>time===input.setupTime))return null;result.setupTime=input.setupTime;}
 if(input.compliance!==undefined){if(!Array.isArray(input.compliance)||input.compliance.length>solutionCompliance.length||input.compliance.some(value=>typeof value!=='string'||!solutionCompliance.some(item=>item===value)))return null;result.compliance=Array.from(new Set(input.compliance as string[]));}
 return result;
}
export function solutionErrors(data:SolutionData,step?:number){
 const errors:Partial<Record<keyof SolutionData,string>>={};
 if(step===undefined||step===0){if(!data.name)errors.name='Dale un nombre a tu solución.';if(!data.kind)errors.kind='Selecciona qué ofreces.';if(!getSolutionCategories(data).length)errors.category='Selecciona al menos una categoría.';}
 if(step===undefined||step===1){if(data.problem.length<20)errors.problem='Cuéntanos qué resuelves en al menos 20 caracteres.';if(data.audience.length<10)errors.audience='Describe para quién es tu solución.';if(data.industries===undefined)errors.industries='Elige las industrias donde encaja, o marca que sirve a cualquiera.';if(data.companySizes===undefined)errors.companySizes='Elige los tamaños de empresa donde encaja, o marca que sirve a cualquiera.';
  if(!data.capabilities?.length)errors.capabilities='Marca al menos una capacidad: qué hace tu solución en concreto.';
  else if(data.capabilities.some(id=>{const capability=solutionCapabilities.find(item=>item.id===id);return !capability||!getSolutionCategories(data).includes(capability.category);}))errors.capabilities='Quitaste una categoría; revisa las capacidades que ya no aplican.';
 }
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
