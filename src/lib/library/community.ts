import { solutionsSql } from '@/lib/solutions/server';
import { resolveProjects } from './server';
import { communityScore,escapeLikeTerm,type CommunitySort } from './community-model';
import type { BuyerProject } from './model';
export type PublicCollection={id:string;name:string;description:string;curator:string;categories:string[];count:number;likes:number;saves:number;comments:number;score:number;liked:boolean;saved:boolean;own:boolean;covers:Pick<BuyerProject,'key'|'name'|'image'>[];projects:BuyerProject[];visibility:'public'};
export type PublicComment={id:string;name:string;body:string;createdAt:string;mine:boolean};
export const communityPageSize=24;
// Filters run in SQL because pagination (OFFSET) and `total` do — a client-side
// pass over one page would count and paginate wrong. `categories` filters the
// list's own declared categories (array overlap); `industries`/`sizes` filter
// the *contained projects'* declared facets, respecting the tri-state from
// src/lib/solutions/model.ts ([] = fits any). `query` now also matches the
// name of a project inside the list, not only the list's own text. See §19/§56.
export async function getPublicCollections({id='',categories=[],industries=[],sizes=[],query='',page=1,sort='recent',viewer='',savedBy=''}:{id?:string;categories?:readonly string[];industries?:readonly string[];sizes?:readonly string[];query?:string;page?:number;sort?:CommunitySort;viewer?:string;savedBy?:string}={}):Promise<{collections:PublicCollection[];hasMore:boolean;total:number}>{
 const sql=solutionsSql(),offset=(Math.max(1,Math.min(1000,page))-1)*communityPageSize,popular=sort==='popular',searchPattern=query?'%'+escapeLikeTerm(query)+'%':'';
 const cats=[...categories],inds=[...industries],szs=[...sizes];
 const rows=await sql`WITH matched AS (
  SELECT l.id,l.owner_id,l.name,l.public_description,l.curator_name,l.categories,l.created_at,
   ((SELECT count(*) FROM community_list_likes x WHERE x.list_id=l.id)
    +(SELECT count(*) FROM community_saved_lists x WHERE x.list_id=l.id)*2
    +(SELECT count(*) FROM community_list_comments x WHERE x.list_id=l.id)*3) AS rank_score
  FROM buyer_lists l
  WHERE l.visibility='public'
   AND (${id}='' OR l.id::text=${id})
   AND (cardinality(${cats}::text[])=0 OR l.categories && ${cats}::text[])
   AND (${savedBy}='' OR EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=l.id AND x.owner_id=${savedBy||null}::uuid))
   AND (${query}='' OR (l.name||' '||l.public_description||' '||l.curator_name) ILIKE ${searchPattern}
     OR EXISTS(SELECT 1 FROM buyer_list_items i JOIN founder_solutions s
       ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
       WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL AND (s.published_data->>'name') ILIKE ${searchPattern}))
   AND (cardinality(${inds}::text[])=0 OR EXISTS(SELECT 1 FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL
      AND jsonb_typeof(s.published_data->'industries')='array'
      AND (s.published_data->'industries'='[]'::jsonb OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.published_data->'industries') e WHERE e = ANY(${inds}::text[])))))
   AND (cardinality(${szs}::text[])=0 OR EXISTS(SELECT 1 FROM buyer_list_items i JOIN founder_solutions s
     ON (i.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND i.project_key='catalog:'||s.catalog_key))
     WHERE i.list_id=l.id AND i.owner_id=l.owner_id AND s.published_data IS NOT NULL
      AND jsonb_typeof(s.published_data->'companySizes')='array'
      AND (s.published_data->'companySizes'='[]'::jsonb OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.published_data->'companySizes') e WHERE e = ANY(${szs}::text[])))))
 ),counted AS (SELECT m.*,count(*) OVER ()::int AS total FROM matched m)
 SELECT c.id,c.name,c.public_description,c.curator_name,c.categories,c.total,
  (SELECT count(*)::int FROM community_list_likes x WHERE x.list_id=c.id) likes,
  (SELECT count(*)::int FROM community_saved_lists x WHERE x.list_id=c.id) saves,
  (SELECT count(*)::int FROM community_list_comments x WHERE x.list_id=c.id) comments,
  EXISTS(SELECT 1 FROM community_list_likes x WHERE x.list_id=c.id AND x.owner_id=${viewer||null}::uuid) liked,
  EXISTS(SELECT 1 FROM community_saved_lists x WHERE x.list_id=c.id AND x.owner_id=${viewer||null}::uuid) saved,
  c.owner_id=${viewer||null}::uuid own,
  COALESCE((SELECT jsonb_agg(available.project_key ORDER BY available.created_at DESC,available.project_key) FROM (
   SELECT i.project_key,i.created_at FROM buyer_list_items i JOIN founder_solutions s ON (i.project_key='solution:'||s.id::text OR i.project_key='catalog:'||s.catalog_key)
   WHERE i.list_id=c.id AND i.owner_id=c.owner_id AND s.published_data IS NOT NULL
  ) available),'[]'::jsonb) AS project_keys
 FROM counted c
 ORDER BY CASE WHEN ${popular} THEN c.rank_score END DESC,c.created_at DESC,c.id
 LIMIT ${id?1:communityPageSize} OFFSET ${id?0:offset}`;
 const total=Number(rows[0]?.total??0),keys=Array.from(new Set(rows.flatMap(row=>row.project_keys as string[]))),projects=await resolveProjects(keys);
 return {total,hasMore:offset+rows.length<total,collections:rows.map(row=>{const items=(row.project_keys as string[]).flatMap(key=>projects[key]?[projects[key]]:[]),likes=Number(row.likes),saves=Number(row.saves),comments=Number(row.comments);return {id:String(row.id),name:String(row.name),description:String(row.public_description),curator:String(row.curator_name),categories:row.categories as string[],visibility:'public',count:items.length,likes,saves,comments,score:communityScore(likes,saves,comments),liked:!!row.liked,saved:!!row.saved,own:!!row.own,covers:items.slice(0,4).map(({key,name,image})=>({key,name,image})),projects:items};})};
}
export async function getPublicComments(listId:string,viewer=''):Promise<PublicComment[]>{const sql=solutionsSql();const rows=await sql`SELECT c.id,c.author_name,c.body,c.created_at,(c.author_id=${viewer||null}::uuid OR l.owner_id=${viewer||null}::uuid) mine FROM community_list_comments c JOIN buyer_lists l ON l.id=c.list_id WHERE c.list_id=${listId} AND l.visibility='public' ORDER BY c.created_at DESC,c.id LIMIT 100`;return rows.map(row=>({id:String(row.id),name:String(row.author_name),body:String(row.body),createdAt:new Date(row.created_at).toISOString(),mine:!!row.mine}));}
