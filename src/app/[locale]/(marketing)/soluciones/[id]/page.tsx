import { cookies } from 'next/headers';
import { verificationDomain } from '@/lib/trust/domain';
import { notFound } from 'next/navigation';
import { isSolutionId,getSolutionCategories,type SolutionData } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { getSolutionSocial,getSolutionComments } from '@/lib/solutions/social';
import { publicProducts } from '@/lib/solutions/public';
import type { Metadata } from 'next';
import { SolutionPresentation } from '@/components/solutions/solution-presentation';

export const dynamic='force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  if (!isSolutionId(params.id)) return {};
  const sql = solutionsSql();
  const [row] = await sql`SELECT published_data,
    EXISTS(SELECT 1 FROM solution_site_images i WHERE i.solution_id=founder_solutions.id AND i.content_base64 IS NOT NULL) AS has_site_image
    FROM founder_solutions WHERE id=${params.id} AND published_data IS NOT NULL`;
  if (!row) return {};
  const data = row.published_data as SolutionData;
  const imageUrl = row.has_site_image ? `https://shwcs.site/api/solutions/${params.id}/site-image` : "https://shwcs.site/og-image.png";
  const title = `${data.name} | shwcs`;
  const description = data.problem ? (data.problem.length > 150 ? data.problem.substring(0, 147) + '...' : data.problem) : "Descubre soluciones verificadas para tu empresa.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://shwcs.site/soluciones/${params.id}`,
      siteName: "shwcs",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicSolution(props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!isSolutionId(params.id))notFound();
 const sql=solutionsSql();const [row]=await sql`SELECT owner_id,catalog_key,published_data - 'contactEmail' AS published_data,published_at::text,
  EXISTS(SELECT 1 FROM solution_site_images i WHERE i.solution_id=founder_solutions.id AND i.content_base64 IS NOT NULL) AS has_site_image
  FROM founder_solutions WHERE id=${params.id} AND published_data IS NOT NULL`;
 if(!row)notFound();
 const data=row.published_data as SolutionData;
 const [proof]=await sql`SELECT p.domain FROM solution_domain_proofs p JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id WHERE p.solution_id=${params.id} AND p.domain=${verificationDomain(data.website)} AND p.verified_at IS NOT NULL AND p.expires_at>now()`;
 // The public ficha still renders when session/social storage is unavailable —
 // only the like/comments block is skipped, never the whole page.
 let viewer='',viewerName='';
 try{const account=await getSession((await cookies()).get(sessionCookie)?.value);if(account){viewer=account.id;const [profile]=await sql`SELECT name FROM auth_accounts WHERE id=${account.id}`;viewerName=String(profile?.name??'');}}catch{/* public ficha still works when account storage is unavailable */}
 let social:{likes:number;liked:boolean;commentsCount:number}|undefined,comments:Awaited<ReturnType<typeof getSolutionComments>>|undefined;
 try{[social,comments]=await Promise.all([getSolutionSocial(params.id,viewer),getSolutionComments(params.id,viewer)]);}catch{/* like/comments are optional; the ficha itself must still render */}
 // Up to three others sharing a category, already ordered by real interaction
 // (publicProducts() is the same cached call the catalogue pages use — no
 // extra query). The ficha used to be a dead end otherwise.
 let similar:Awaited<ReturnType<typeof publicProducts>>=[];
 try{const categories=getSolutionCategories(data);const catalog=await publicProducts();similar=catalog.filter(product=>product.detailUrl!==`/soluciones/${params.id}`&&product.categories.some(category=>categories.includes(category))).slice(0,3);}catch{/* optional */}
 return <SolutionPresentation verifiedDomain={proof?String(proof.domain):null} id={params.id} data={data} catalogKey={row.catalog_key as string|null} publishedAt={row.published_at as string|null} social={social} comments={comments} viewerName={viewerName} own={!!viewer&&viewer===String(row.owner_id)} hasSiteImage={Boolean(row.has_site_image)} similar={similar}/>;
}
