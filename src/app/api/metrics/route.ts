import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql,requestIdentity,securityLimit } from '@/lib/auth/security';
import { isSolutionId } from '@/lib/solutions/model';
import { failure,solutionBody } from '@/lib/solutions/http';
import { visitorHash } from '@/lib/solutions/view-visitor';
export async function POST(request:NextRequest){if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Origin rejected',403);if(request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return new NextResponse(null,{status:204});try{const body=await solutionBody(request);if(typeof body?.solutionId!=='string'||!isSolutionId(body.solutionId)||!['view','click'].includes(String(body.event)))return failure('Invalid event',400);const sql=authSql();const account=await getSession(request.cookies.get(sessionCookie)?.value);const [solution]=await sql`SELECT owner_id FROM founder_solutions WHERE id=${body.solutionId} AND published_data IS NOT NULL`;if(!solution||solution.owner_id===account?.id)return new NextResponse(null,{status:204});if(!await securityLimit('public-metric',`${requestIdentity(request.headers)}:${body.solutionId}`,600,6000))return new NextResponse(null,{status:429});
 // Views dedupe to one per visitor per solution per day (see
 // src/lib/solutions/view-visitor.ts); clicks never dedupe — a visitor
 // clicking through to the site multiple times is a real, repeatable signal.
 // Without VIEW_HASH_SECRET configured, views keep the previous unthrottled
 // behavior rather than silently dropping — an optional hardening, not a
 // hard requirement, same pattern as AUTH_TOTP_KEY (§49).
 const today=new Date().toISOString().slice(0,10),hash=body.event==='view'?visitorHash(requestIdentity(request.headers),today):null;
 if(hash){await sql`WITH inserted AS (INSERT INTO solution_view_visitors(solution_id,day,visitor_hash) SELECT s.id,${today}::date,${hash} FROM founder_solutions s WHERE s.id=${body.solutionId} AND s.published_data IS NOT NULL ON CONFLICT DO NOTHING RETURNING solution_id)
  INSERT INTO solution_daily_metrics(solution_id,views,clicks) SELECT id,1,0 FROM founder_solutions WHERE id=${body.solutionId} AND published_data IS NOT NULL AND EXISTS(SELECT 1 FROM inserted) ON CONFLICT(solution_id,day) DO UPDATE SET views=solution_daily_metrics.views+EXCLUDED.views`;}
 else{await sql`INSERT INTO solution_daily_metrics(solution_id,views,clicks) SELECT id,${body.event==='view'?1:0},${body.event==='click'?1:0} FROM founder_solutions WHERE id=${body.solutionId} AND published_data IS NOT NULL ON CONFLICT(solution_id,day) DO UPDATE SET views=solution_daily_metrics.views+EXCLUDED.views,clicks=solution_daily_metrics.clicks+EXCLUDED.clicks`;}
 return new NextResponse(null,{status:204});}catch{return new NextResponse(null,{status:503});}}
