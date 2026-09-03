import { getDatabaseUrl } from '@/lib/database-url';
import { getSolutionCategories } from './model';
import { neon } from '@neondatabase/serverless';
import { previewCategories,type PreviewProduct } from '@/lib/catalog-preview';
import { solutionScore } from './ranking';
export type PublishedProduct=PreviewProduct & {category:string;categories:string[]};
// Order reflects real interaction (comments > saves > likes > views); catalog_key
// only breaks ties, it is no longer the primary sort. See src/lib/solutions/ranking.ts
// and docs/solution-social.md.
export async function publicProducts():Promise<PublishedProduct[]>{const url=getDatabaseUrl();if(!url)return [];try{const sql=neon(url,{fetchOptions:{cache:'no-store'}});const rows=await sql`SELECT s.id,s.catalog_key,s.published_data->>'name' AS name,s.published_data->>'kind' AS kind,s.published_data->>'category' AS category,s.published_data->'categories' AS categories,s.published_data->>'problem' AS problem,s.published_data->>'audience' AS audience,s.published_data->>'website' AS website,
 (SELECT count(*)::int FROM solution_likes x WHERE x.solution_id=s.id) likes,
 (SELECT count(*)::int FROM solution_comments x WHERE x.solution_id=s.id) comments,
 (SELECT count(*)::int FROM buyer_saved_projects x WHERE x.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND x.project_key='catalog:'||s.catalog_key)) saves,
 COALESCE((SELECT sum(views)::int FROM solution_daily_metrics x WHERE x.solution_id=s.id),0) views
 FROM founder_solutions s WHERE s.published_data IS NOT NULL
 ORDER BY (
  (SELECT count(*)::int FROM solution_likes x WHERE x.solution_id=s.id)
  +(SELECT count(*)::int FROM solution_comments x WHERE x.solution_id=s.id)*3
  +(SELECT count(*)::int FROM buyer_saved_projects x WHERE x.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND x.project_key='catalog:'||s.catalog_key))*2
  +COALESCE((SELECT sum(views)::int FROM solution_daily_metrics x WHERE x.solution_id=s.id),0)*0.1
 ) DESC,
 CASE s.catalog_key WHEN 'cord' THEN 0 WHEN 'flouvia' THEN 1 ELSE 2 END,s.published_at DESC NULLS LAST,s.id`;return rows.map(row=>({...previewCategories.flatMap(category=>category.products).find(product=>product.catalogId===row.catalog_key),catalogId:row.catalog_key?String(row.catalog_key):undefined,name:String(row.name),description:String(row.problem),feature:String(row.audience),website:String(row.website),provider:row.catalog_key==='cord'?'Flouvia':String(row.name),offering:row.kind as 'Software'|'Agencia'|'Servicio',category:String(row.category),categories:getSolutionCategories({category:String(row.category??''),categories:Array.isArray(row.categories)?row.categories as string[]:undefined}),detailUrl:`/soluciones/${row.id}`,likes:Number(row.likes),saves:Number(row.saves),comments:Number(row.comments),views:Number(row.views),score:solutionScore(Number(row.likes),Number(row.saves),Number(row.comments),Number(row.views))}));}catch(error){console.error('Public catalogue unavailable',error instanceof Error?error.name:'UnknownError');return [];}}
