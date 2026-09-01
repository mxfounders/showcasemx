export const publicLinkKinds=['LinkedIn','X','Instagram','YouTube','GitHub','Product Hunt','TikTok','Sitio web','Documentación','Precios','Contacto'] as const;
export type PublicLink={label:typeof publicLinkKinds[number];url:string};
export type SolutionFounder={name:string;role:string;bio:string;links:PublicLink[]};
export function readPublicLinks(value:unknown,maximum:number):PublicLink[]|null{
 if(!Array.isArray(value)||value.length>maximum)return null;
 const links:PublicLink[]=[];
 for(const item of value){if(!item||typeof item!=='object'||!publicLinkKinds.includes(item.label)||typeof item.url!=='string'||item.url.length>500)return null;links.push({label:item.label,url:item.url.trim()});}
 return links;
}
export function readFounders(value:unknown):SolutionFounder[]|null{
 if(!Array.isArray(value)||value.length>3)return null;
 const founders:SolutionFounder[]=[];
 for(const item of value){if(!item||typeof item!=='object'||typeof item.name!=='string'||item.name.length>100||typeof item.role!=='string'||item.role.length>80||typeof item.bio!=='string'||item.bio.length>400)return null;const links=readPublicLinks(item.links,4);if(!links)return null;founders.push({name:item.name.trim(),role:item.role.trim(),bio:item.bio.trim(),links});}
 return founders;
}
