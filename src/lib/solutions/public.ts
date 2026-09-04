import { getDatabaseUrl } from '@/lib/database-url';
import { getSolutionCategories, isSolutionId } from './model';
import { neon } from '@neondatabase/serverless';
import { unstable_cache } from 'next/cache';
import { previewCategories,type PreviewProduct } from '@/lib/catalog-preview';
import { solutionScore } from './ranking';
import { solutionCover } from './gallery';
export type PublishedProduct=PreviewProduct & {category:string;categories:string[]};
// Order reflects real interaction (comments > saves > likes > views); catalog_key
// only breaks ties, it is no longer the primary sort. See src/lib/solutions/ranking.ts
// and docs/solution-social.md.
//
// The four signals are pre-aggregated in their own CTE (one GROUP BY pass each)
// instead of correlated subqueries repeated per row and again in ORDER BY — same
// numbers, one pass over each table instead of up to 9 per row. `revalidateTag('catalog')`
// invalidates this after a like/comment/save/publish; see callers of that tag.
const fetchPublishedRows=unstable_cache(async()=>{
 const url=getDatabaseUrl();if(!url)return [];
 const sql=neon(url);
 return await sql`WITH likes AS (SELECT solution_id,count(*)::int AS n FROM solution_likes GROUP BY solution_id),
 comments AS (SELECT solution_id,count(*)::int AS n FROM solution_comments GROUP BY solution_id),
 views AS (SELECT solution_id,sum(views)::int AS n FROM solution_daily_metrics GROUP BY solution_id),
 saves AS (SELECT s.id AS solution_id,count(*)::int AS n FROM founder_solutions s JOIN buyer_saved_projects b
   ON b.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND b.project_key='catalog:'||s.catalog_key)
   GROUP BY s.id)
 SELECT s.id,s.catalog_key,s.published_data->>'name' AS name,s.published_data->>'kind' AS kind,
  s.published_data->>'category' AS category,s.published_data->'categories' AS categories,
  s.published_data->>'problem' AS problem,s.published_data->>'audience' AS audience,
  s.published_data->>'website' AS website,
  s.published_data->'screenshots'->0->>'id' AS cover_id,
  COALESCE(l.n,0) likes,COALESCE(c.n,0) comments,COALESCE(sv.n,0) saves,COALESCE(v.n,0) views,
  EXISTS(SELECT 1 FROM solution_site_images i WHERE i.solution_id=s.id AND i.content_base64 IS NOT NULL) has_site_image
 FROM founder_solutions s
 LEFT JOIN likes l ON l.solution_id=s.id LEFT JOIN comments c ON c.solution_id=s.id
 LEFT JOIN saves sv ON sv.solution_id=s.id LEFT JOIN views v ON v.solution_id=s.id
 WHERE s.published_data IS NOT NULL
 ORDER BY (COALESCE(l.n,0)+COALESCE(c.n,0)*3+COALESCE(sv.n,0)*2+COALESCE(v.n,0)*0.1) DESC,
  CASE s.catalog_key WHEN 'cord' THEN 0 WHEN 'flouvia' THEN 1 ELSE 2 END,s.published_at DESC NULLS LAST,s.id`;
},['public-products'],{tags:['catalog'],revalidate:300});
export async function publicProducts():Promise<PublishedProduct[]>{
 try{const rows=await fetchPublishedRows();return rows.map(row=>{const staticProduct=previewCategories.flatMap(category=>category.products).find(product=>product.catalogId===row.catalog_key);
 // See src/lib/solutions/gallery.ts: screenshot the founder curated, then the
 // site's own og:image, then the local art shipped for Cord/Flouvia.
 const ogImage=solutionCover(String(row.id),{coverScreenshotId:isSolutionId(String(row.cover_id))?String(row.cover_id):undefined,hasSiteImage:Boolean(row.has_site_image),staticArt:staticProduct?.ogImage});
 return {...staticProduct,ogImage,catalogId:row.catalog_key?String(row.catalog_key):undefined,name:String(row.name),description:String(row.problem),feature:String(row.audience),website:String(row.website),provider:row.catalog_key==='cord'?'Flouvia':String(row.name),offering:row.kind as 'Software'|'Agencia'|'Servicio',category:String(row.category),categories:getSolutionCategories({category:String(row.category??''),categories:Array.isArray(row.categories)?row.categories as string[]:undefined}),detailUrl:`/soluciones/${row.id}`,likes:Number(row.likes),saves:Number(row.saves),comments:Number(row.comments),views:Number(row.views),score:solutionScore(Number(row.likes),Number(row.saves),Number(row.comments),Number(row.views))};});
 }catch(error){
  // A transient failure is never cached: unstable_cache only stores what it
  // successfully returns, so the empty result here is retried on the next call
  // instead of serving a cached blank catalogue for the revalidate window.
  console.error('Public catalogue unavailable',error instanceof Error?error.name:'UnknownError');return [];
 }
}
