import { getDatabaseUrl } from '@/lib/database-url';
import { getSolutionCategories, isSolutionId } from './model';
import { neon } from '@neondatabase/serverless';
import { unstable_cache } from 'next/cache';
import { previewCategories,type PreviewProduct } from '@/lib/catalog-preview';
import { solutionScore,rankingHalfLifeDays } from './ranking';
import { solutionCover } from './gallery';
// industries/companySizes stay optional, mirroring SolutionData: absent means
// the founder never declared them (excluded from a specific filter), while []
// means declared to fit any (matches every filter) — see src/lib/taxonomy.ts.
export type PublishedProduct=PreviewProduct & {category:string;categories:string[]};
// Order reflects real interaction (comments > saves > likes > views), decayed
// and — for the three account-linked signals — restricted to verified
// accounts acting on someone else's ficha; catalog_key only breaks ties, it
// is no longer the primary sort. See src/lib/solutions/ranking.ts and
// docs/solution-social.md.
//
// Each CTE below carries two aggregates: the raw, undecayed count (`n`,
// unaffected by verification or decay — this is what's actually shown on
// cards and the like button, because auto-hiding an unverified account's
// real activity would be exactly the fabrication CLAUDE.md forbids) and
// `decayed`, the sum used only for `score`/ORDER BY. `decayed` zeroes out
// any row from an unverified account or from the ficha's own owner, so that
// activity is visible everywhere but never moves the order — the plan's
// "se ve pero no cuenta". One pass over each table instead of a correlated
// subquery per row (still true, from Fase 1). `revalidateTag('catalog')`
// invalidates this after a like/comment/save/publish; see callers of that tag.
const fetchPublishedRows=unstable_cache(async()=>{
 const url=getDatabaseUrl();if(!url)return [];
 const sql=neon(url);
 return await sql`WITH likes AS (
  SELECT sl.solution_id,count(*)::int AS n,
   sum(CASE WHEN a.email_verified_at IS NOT NULL AND sl.owner_id<>s.owner_id
    THEN exp(-ln(2)*extract(epoch FROM now()-sl.created_at)/${rankingHalfLifeDays*86400}) ELSE 0 END) AS decayed
   FROM solution_likes sl JOIN auth_accounts a ON a.id=sl.owner_id JOIN founder_solutions s ON s.id=sl.solution_id
   GROUP BY sl.solution_id),
 comments AS (
  SELECT sc.solution_id,count(*)::int AS n,
   sum(CASE WHEN a.email_verified_at IS NOT NULL AND sc.author_id<>s.owner_id
    THEN exp(-ln(2)*extract(epoch FROM now()-sc.created_at)/${rankingHalfLifeDays*86400}) ELSE 0 END) AS decayed
   FROM solution_comments sc JOIN auth_accounts a ON a.id=sc.author_id JOIN founder_solutions s ON s.id=sc.solution_id
   GROUP BY sc.solution_id),
 views AS (
  SELECT solution_id,sum(views)::int AS n,
   sum(views*exp(-ln(2)*(current_date-day)/${rankingHalfLifeDays})) AS decayed
   FROM solution_daily_metrics GROUP BY solution_id),
 saves AS (
  SELECT s.id AS solution_id,count(*)::int AS n,
   sum(CASE WHEN a.email_verified_at IS NOT NULL AND b.owner_id<>s.owner_id
    THEN exp(-ln(2)*extract(epoch FROM now()-b.created_at)/${rankingHalfLifeDays*86400}) ELSE 0 END) AS decayed
   FROM founder_solutions s JOIN buyer_saved_projects b
    ON b.project_key='solution:'||s.id::text OR (s.catalog_key IS NOT NULL AND b.project_key='catalog:'||s.catalog_key)
   JOIN auth_accounts a ON a.id=b.owner_id
   GROUP BY s.id)
 SELECT s.id,s.catalog_key,s.published_data->>'name' AS name,s.published_data->>'kind' AS kind,
  s.published_data->>'category' AS category,s.published_data->'categories' AS categories,
  s.published_data->'industries' AS industries,s.published_data->'companySizes' AS company_sizes,
  s.published_data->>'problem' AS problem,s.published_data->>'audience' AS audience,
  s.published_data->>'website' AS website,
  s.published_data->'screenshots'->0->>'id' AS cover_id,
  COALESCE(l.n,0) likes,COALESCE(c.n,0) comments,COALESCE(sv.n,0) saves,COALESCE(v.n,0) views,
  COALESCE(l.decayed,0) likes_score,COALESCE(c.decayed,0) comments_score,COALESCE(sv.decayed,0) saves_score,COALESCE(v.decayed,0) views_score,
  EXISTS(SELECT 1 FROM solution_site_images i WHERE i.solution_id=s.id AND i.content_base64 IS NOT NULL) has_site_image
 FROM founder_solutions s
 LEFT JOIN likes l ON l.solution_id=s.id LEFT JOIN comments c ON c.solution_id=s.id
 LEFT JOIN saves sv ON sv.solution_id=s.id LEFT JOIN views v ON v.solution_id=s.id
 WHERE s.published_data IS NOT NULL
 ORDER BY (COALESCE(l.decayed,0)+COALESCE(c.decayed,0)*3+COALESCE(sv.decayed,0)*2+ln(1+COALESCE(v.decayed,0))*0.1) DESC,
  CASE s.catalog_key WHEN 'cord' THEN 0 WHEN 'flouvia' THEN 1 ELSE 2 END,s.published_at DESC NULLS LAST,s.id`;
},['public-products'],{tags:['catalog'],revalidate:300});
export async function publicProducts():Promise<PublishedProduct[]>{
 try{const rows=await fetchPublishedRows();return rows.map(row=>{const staticProduct=previewCategories.flatMap(category=>category.products).find(product=>product.catalogId===row.catalog_key);
 // See src/lib/solutions/gallery.ts: screenshot the founder curated, then the
 // site's own og:image, then the local art shipped for Cord/Flouvia.
 const ogImage=solutionCover(String(row.id),{coverScreenshotId:isSolutionId(String(row.cover_id))?String(row.cover_id):undefined,hasSiteImage:Boolean(row.has_site_image),staticArt:staticProduct?.ogImage});
 return {...staticProduct,ogImage,catalogId:row.catalog_key?String(row.catalog_key):undefined,name:String(row.name),description:String(row.problem),feature:String(row.audience),website:String(row.website),provider:row.catalog_key==='cord'?'Flouvia':String(row.name),offering:row.kind as 'Software'|'Agencia'|'Servicio',category:String(row.category),categories:getSolutionCategories({category:String(row.category??''),categories:Array.isArray(row.categories)?row.categories as string[]:undefined}),industries:Array.isArray(row.industries)?row.industries as string[]:undefined,companySizes:Array.isArray(row.company_sizes)?row.company_sizes as string[]:undefined,detailUrl:`/soluciones/${row.id}`,likes:Number(row.likes),saves:Number(row.saves),comments:Number(row.comments),views:Number(row.views),score:solutionScore(Number(row.likes_score),Number(row.saves_score),Number(row.comments_score),Number(row.views_score))};});
 }catch(error){
  // A transient failure is never cached: unstable_cache only stores what it
  // successfully returns, so the empty result here is retried on the next call
  // instead of serving a cached blank catalogue for the revalidate window.
  console.error('Public catalogue unavailable',error instanceof Error?error.name:'UnknownError');return [];
 }
}
