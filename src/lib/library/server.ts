import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { previewCategories } from '@/lib/catalog-preview';
import { getSolutionCategories,isSolutionId } from '@/lib/solutions/model';
import { solutionCover } from '@/lib/solutions/gallery';
import { projectKey,validProjectKey,type BuyerProject,type BuyerList,type SavedReference,type ListItem,type BuyerBoard } from './model';
export async function requireBuyer(returnTo='/account/saved'){
 const account=await getSession((await cookies()).get(sessionCookie)?.value);
 if(!account)redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
 return account;
}
export async function resolveProjects(keys:string[]):Promise<Record<string,BuyerProject>>{
 const result:Record<string,BuyerProject>={};
 for(const category of previewCategories)for(const product of category.products){const key=projectKey(product);if(!key||!keys.includes(key)||!product.website)continue;if(result[key]){if(!result[key].categories.includes(category.label))result[key].categories.push(category.label);continue;}result[key]={key,name:product.name,description:product.description,kind:product.offering??'Solución',categories:[category.label],href:product.website,external:true,image:product.ogImage};}
 const ids=keys.filter(key=>validProjectKey(key)&&key.startsWith('solution:')).map(key=>key.slice(9));
 const catalogKeys=keys.filter(key=>key.startsWith('catalog:')).map(key=>key.slice(8));
 if(ids.length||catalogKeys.length){const sql=solutionsSql();const rows=await sql`SELECT id,catalog_key,published_data->'screenshots'->0->>'id' AS cover_id,published_data->>'name' AS name,published_data->>'problem' AS description,published_data->>'kind' AS kind,published_data->>'category' AS category,published_data->'categories' AS categories,published_data->'industries' AS industries,published_data->'companySizes' AS company_sizes,published_data->>'pricing' AS pricing,published_data->>'scope' AS scope,published_data->>'implementation' AS implementation,published_data->>'audience' AS audience,published_data->>'integrations' AS integrations,published_data->>'support' AS support,published_data->>'evidence' AS evidence,published_data->>'evidenceUrl' AS evidence_url,EXISTS(SELECT 1 FROM solution_site_image_ready r WHERE r.solution_id=founder_solutions.id) AS has_site_image FROM founder_solutions WHERE (id=ANY(${ids}::uuid[]) OR catalog_key=ANY(${catalogKeys}::text[])) AND published_data IS NOT NULL`;
 for(const key of catalogKeys)if(!rows.some(row=>row.catalog_key===key))delete result['catalog:'+key];
 for(const row of rows){const resolvedKeys=keys.filter(key=>key===`solution:${row.id}`||(row.catalog_key&&key===`catalog:${row.catalog_key}`));for(const key of resolvedKeys){result[key]={key,name:String(row.name),description:String(row.description),kind:String(row.kind),categories:getSolutionCategories({category:String(row.category??''),categories:Array.isArray(row.categories)?row.categories as string[]:undefined}),industries:Array.isArray(row.industries)?row.industries as string[]:undefined,companySizes:Array.isArray(row.company_sizes)?row.company_sizes as string[]:undefined,href:`/soluciones/${row.id}`,external:false,solutionId:String(row.id),image:solutionCover(String(row.id),{coverScreenshotId:isSolutionId(row.cover_id)?String(row.cover_id):undefined,hasSiteImage:Boolean(row.has_site_image),staticArt:result[key]?.image}),pricing:row.pricing?String(row.pricing):undefined,scope:row.scope?String(row.scope):undefined,implementation:row.implementation?String(row.implementation):undefined,audience:row.audience?String(row.audience):undefined,integrations:row.integrations?String(row.integrations):undefined,support:row.support?String(row.support):undefined,evidence:row.evidence?String(row.evidence):undefined,evidenceUrl:row.evidence_url?String(row.evidence_url):undefined};}}}
 return result;
}
export async function getSaved(owner:string){const sql=solutionsSql();return await sql`SELECT project_key FROM buyer_saved_projects WHERE owner_id=${owner} ORDER BY created_at DESC,project_key` as SavedReference[];}
export async function getLists(owner:string){const sql=solutionsSql();return await sql`SELECT l.id,l.name,l.purpose,l.version,l.visibility,l.categories,l.public_description,l.curator_name,count(i.project_key)::int AS count FROM buyer_lists l LEFT JOIN buyer_list_items i ON i.owner_id=l.owner_id AND i.list_id=l.id WHERE l.owner_id=${owner} GROUP BY l.id ORDER BY l.updated_at DESC,l.id` as BuyerList[];}
export async function getMemberships(owner:string){const sql=solutionsSql();return await sql`SELECT list_id,project_key,note,version FROM buyer_list_items WHERE owner_id=${owner} ORDER BY created_at DESC` as ListItem[];}

// Only resolve public snapshots for board covers; never expose a founder draft here.
export async function getBoards(owner:string):Promise<BuyerBoard[]>{
 const sql=solutionsSql();
 const [lists,items]=await Promise.all([getLists(owner),sql`SELECT list_id,project_key FROM (SELECT list_id,project_key,row_number() OVER(PARTITION BY list_id ORDER BY created_at DESC,project_key) AS position FROM buyer_list_items WHERE owner_id=${owner}) ranked WHERE position<=4 ORDER BY list_id,position`]);
 const projects=await resolveProjects(Array.from(new Set(items.map(item=>String(item.project_key)))));
 return lists.map(list=>({...list,covers:items.filter(item=>item.list_id===list.id).flatMap(item=>{const project=projects[String(item.project_key)];return project?[{key:project.key,name:project.name,image:project.image}]:[];})}));
}
