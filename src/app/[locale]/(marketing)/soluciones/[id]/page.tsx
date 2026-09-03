import { cookies } from 'next/headers';
import { verificationDomain } from '@/lib/trust/domain';
import { notFound } from 'next/navigation';
import { isSolutionId,type SolutionData } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { getSolutionSocial,getSolutionComments } from '@/lib/solutions/social';
import { SolutionPresentation } from '@/components/solutions/solution-presentation';
export const dynamic='force-dynamic';
export default async function PublicSolution(props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!isSolutionId(params.id))notFound();
 const sql=solutionsSql();const [row]=await sql`SELECT owner_id,catalog_key,published_data - 'contactEmail' AS published_data,published_at::text FROM founder_solutions WHERE id=${params.id} AND published_data IS NOT NULL`;
 if(!row)notFound();
 const [proof]=await sql`SELECT p.domain FROM solution_domain_proofs p JOIN founder_solutions s ON s.id=p.solution_id AND s.owner_id=p.owner_id WHERE p.solution_id=${params.id} AND p.domain=${verificationDomain((row.published_data as SolutionData).website)} AND p.verified_at IS NOT NULL AND p.expires_at>now()`;
 // The public ficha still renders when session/social storage is unavailable —
 // only the like/comments block is skipped, never the whole page.
 let viewer='',viewerName='';
 try{const account=await getSession((await cookies()).get(sessionCookie)?.value);if(account){viewer=account.id;const [profile]=await sql`SELECT name FROM auth_accounts WHERE id=${account.id}`;viewerName=String(profile?.name??'');}}catch{/* public ficha still works when account storage is unavailable */}
 let social:{likes:number;liked:boolean;commentsCount:number}|undefined,comments:Awaited<ReturnType<typeof getSolutionComments>>|undefined;
 try{[social,comments]=await Promise.all([getSolutionSocial(params.id,viewer),getSolutionComments(params.id,viewer)]);}catch{/* like/comments are optional; the ficha itself must still render */}
 return <SolutionPresentation verifiedDomain={proof?String(proof.domain):null} id={params.id} data={row.published_data as SolutionData} catalogKey={row.catalog_key as string|null} publishedAt={row.published_at as string|null} social={social} comments={comments} viewerName={viewerName} own={!!viewer&&viewer===String(row.owner_id)}/>;
}
