import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { emptySolution,isSolutionId } from '@/lib/solutions/model';
import { failure,solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa el formulario de shwcs.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión para postular.',401);if(!await securityLimit('solution-create',account.id,20))return failure('Demasiados borradores. Intenta más tarde.',429);const body=await solutionBody(request);if(typeof body?.id!=='string'||!isSolutionId(body.id))return failure('Solicitud no válida.',400);
 const sql=solutionsSql();await sql`INSERT INTO founder_solutions(id,owner_id,data) VALUES(${body.id},${account.id},${JSON.stringify({...emptySolution,contactEmail:account.email})}::jsonb) ON CONFLICT(id) DO NOTHING`;
 const rows=await sql`SELECT id FROM founder_solutions WHERE id=${body.id} AND owner_id=${account.id}`;if(!rows.length)return failure('Solicitud no disponible.',409);return NextResponse.json({ok:true,id:rows[0].id},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos crear el borrador. Vuelve a intentarlo.',503);}
}
