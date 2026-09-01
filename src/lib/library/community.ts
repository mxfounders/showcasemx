import { solutionsSql } from '@/lib/solutions/server';
import { resolveProjects } from './server';
import { communityScore,type CommunitySort } from './community-model';
import type { BuyerProject } from './model';
export type PublicCollection={id:string;name:string;description:string;curator:string;categories:string[];count:number;likes:number;saves:number;comments:number;score:number;liked:boolean;saved:boolean;own:boolean;covers:Pick<BuyerProject,'key'|'name'|'image'>[];projects:BuyerProject[];visibility:'public'};
export type PublicComment={id:string;name:string;body:string;createdAt:string;mine:boolean};
export const communityPageSize=24;
export async function getPublicCollections({id='',category='',query='',page=1,sort='recent',viewer='',savedBy=''}:{id?:string;category?:string;query?:string;page?:number;sort?:CommunitySort;viewer?:string;savedBy?:string}={}):Promise<{collections:PublicCollection[];hasMore:boolean}>{
 const sql=solutionsSql(),offset=(Math.max(1,Math.min(1000,page))-1)*communityPageSize,popular=sort==='popular';
 const rows=await sql`SELECT l.id,l.name,l.public_description,l.curator_name,l.categories,
 (SELECT count(*)::int FROM community_list_likes x WHERE x.list_id=l.id) likes,
 (SELECT count(*)::int FROM community_saved_lists x WHERE x.list_id=l.id) saves,
 (SELECT count(*)::int FROM community_list_comments x WHERE x.list_id=l.id) comments,
 EXISTS(SELECT 1 FROM community_list_likes x WHERE x.list_id=l.id AND x.owner_id=${viewer||null}::uuid) liked,
 EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=l.id AND x.owner_id=${viewer||null}::uuid) saved,l.owner_id=${viewer||null}::uuid own,
 COALESCE((SELECT jsonb_agg(available.project_key ORDER BY available.created_at DESC,available.project_key) FROM (
 SELECT i.project_key,i.created_at FROM buyer_list_items i JOIN founder_solutions s ON (i.project_key='solution:'||s.id::text OR i.project_key='catalog:'||s.catalog_key)
 WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL
 ) available),'[]'::jsonb) AS project_keys
 FROM buyer_lists l WHERE l.visibility='public' AND (${id}='' OR l.id::text=${id})
 AND (${category}='' OR ${category}=ANY(l.categories)) AND (${savedBy}='' OR EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=l.id AND x.owner_id=${savedBy||null}::uuid))
 AND (${query}='' OR strpos(lower(l.name||' '||l.public_description||' '||l.curator_name),lower(${query}))>0)
 ORDER BY CASE WHEN ${popular} THEN ((SELECT count(*) FROM community_list_likes x WHERE x.list_id=l.id)+(SELECT count(*)*2 FROM community_saved_lists x WHERE x.list_id=l.id)+(SELECT count(*)*3 FROM community_list_comments x WHERE x.list_id=l.id)) END DESC,l.created_at DESC,l.id
 LIMIT ${id?1:communityPageSize+1} OFFSET ${id?0:offset}`;
 const visible=rows.slice(0,communityPageSize),keys=Array.from(new Set(visible.flatMap(row=>row.project_keys as string[]))),projects=await resolveProjects(keys);
 return {hasMore:rows.length>communityPageSize,collections:visible.map(row=>{const items=(row.project_keys as string[]).flatMap(key=>projects[key]?[projects[key]]:[]),likes=Number(row.likes),saves=Number(row.saves),comments=Number(row.comments);return {id:String(row.id),name:String(row.name),description:String(row.public_description),curator:String(row.curator_name),categories:row.categories as string[],visibility:'public',count:items.length,likes,saves,comments,score:communityScore(likes,saves,comments),liked:!!row.liked,saved:!!row.saved,own:!!row.own,covers:items.slice(0,4).map(({key,name,image})=>({key,name,image})),projects:items};})};
}
export async function getPublicComments(listId:string,viewer=''):Promise<PublicComment[]>{const sql=solutionsSql();const rows=await sql`SELECT c.id,c.author_name,c.body,c.created_at,(c.author_id=${viewer||null}::uuid OR l.owner_id=${viewer||null}::uuid) mine FROM community_list_comments c JOIN buyer_lists l ON l.id=c.list_id WHERE c.list_id=${listId} AND l.visibility='public' ORDER BY c.created_at DESC,c.id LIMIT 100`;return rows.map(row=>({id:String(row.id),name:String(row.author_name),body:String(row.body),createdAt:new Date(row.created_at).toISOString(),mine:!!row.mine}));}
