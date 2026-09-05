import { isSolutionId,solutionCategories } from '@/lib/solutions/model';
export const staticProjectIds = ['cord','flouvia'] as const;
export function validProjectKey(value:unknown):value is string {
 return typeof value==='string'&&(staticProjectIds.some(id=>value===`catalog:${id}`)||(value.startsWith('solution:')&&isSolutionId(value.slice(9))));
}
export function projectKey(product:{catalogId?:string;detailUrl?:string}) {
 if(product.catalogId&&staticProjectIds.some(id=>id===product.catalogId))return `catalog:${product.catalogId}`;
 if(product.detailUrl?.startsWith('/soluciones/')){const key=`solution:${product.detailUrl.slice(12)}`;if(validProjectKey(key))return key;}
 const key=`catalog:${product.catalogId}`;return validProjectKey(key)?key:null;
}
export function listDetails(body:Record<string,unknown>){
 if(typeof body.name!=='string'||typeof body.purpose!=='string')return null;
 const name=body.name.trim(),purpose=body.purpose.trim();
 return name.length>0&&name.length<=100&&purpose.length<=400?{name,purpose}:null;
}
export type BuyerList={id:string;name:string;purpose:string;version:number;count:number;visibility?:'private'|'public';categories?:string[];public_description?:string;curator_name?:string};
export type SavedReference={project_key:string};
export type ListItem=SavedReference&{list_id:string;note:string;version:number};
export type BuyerProject={key:string;name:string;description:string;kind:string;categories:string[];industries?:string[];companySizes?:string[];href:string;external:boolean;solutionId?:string;image?:string;pricing?:string;scope?:string;implementation?:string;audience?:string;integrations?:string;support?:string;evidence?:string;evidenceUrl?:string};

export function comparisonKeys(value:unknown,members:string[]):string[]|null {
 if(!Array.isArray(value)||value.length<2||value.length>3||value.some(key=>!validProjectKey(key)))return null;
 const keys=Array.from(new Set(value as string[]));
 return keys.length===value.length&&keys.every(key=>members.includes(key))?keys:null;
}

export type BuyerBoard=BuyerList&{covers:Pick<BuyerProject,'key'|'name'|'image'>[]};

// Public copy is deliberately separate from the buyer's private purpose and notes.
export function listPublicationDetails(body:Record<string,unknown>){
 const visibility=body.visibility??'private',categories=body.categories??[];
 const description=body.publicDescription??'',curator=body.curatorName??'';
 if(!['private','public'].includes(String(visibility))||!Array.isArray(categories)||categories.length>7||categories.some(value=>!solutionCategories.some(category=>category===value)))return null;
 if(typeof description!=='string'||description.length>400||typeof curator!=='string'||curator.length>60)return null;
 if(visibility==='public'&&(body.publishConfirmed!==true||!categories.length||!curator.trim()))return null;
 return {visibility:visibility as 'private'|'public',categories:Array.from(new Set(categories)) as string[],publicDescription:description.trim(),curatorName:curator.trim()};
}
