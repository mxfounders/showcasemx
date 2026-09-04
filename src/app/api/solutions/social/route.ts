import { NextRequest,NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { solutionBody,failure } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { communityComment } from '@/lib/library/community-model';
const ok=(data:Record<string,unknown>={})=>NextResponse.json({ok:true,...data},{headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa shwcs.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión para participar.',401);const body=await solutionBody(request);if(!body||typeof body.solutionId!=='string'||!isSolutionId(body.solutionId)||typeof body.action!=='string')return failure('Solicitud inválida.',400);const sql=solutionsSql(),id=body.solutionId;
 if(!await securityLimit('solution-social',account.id,60))return failure('Demasiadas acciones. Intenta más tarde.',429);
 if(body.action==='like'){
  const rows=await sql`WITH deleted AS (DELETE FROM solution_likes WHERE solution_id=${id} AND owner_id=${account.id} RETURNING false active),inserted AS (INSERT INTO solution_likes(solution_id,owner_id) SELECT id,${account.id} FROM founder_solutions WHERE id=${id} AND published_data IS NOT NULL AND owner_id<>${account.id} AND NOT EXISTS(SELECT 1 FROM deleted) ON CONFLICT DO NOTHING RETURNING true active) SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
  if(!rows.length)return failure('No puedes interactuar con tu propia ficha o ya no está publicada.',409);const [{count}]=await sql`SELECT count(*)::int count FROM solution_likes WHERE solution_id=${id}`;revalidateTag('catalog');return ok({active:!!rows[0].active,count:Number(count)});
 }
 if(body.action==='comment'){const details=communityComment(body);if(typeof body.commentId!=='string'||!isSolutionId(body.commentId))return failure('Comentario inválido.',400);if(!details)return failure('Escribe un nombre o alias y un comentario de hasta 500 caracteres.',400);if(!await securityLimit('solution-comment',account.id,10))return failure('Espera antes de comentar otra vez.',429);
  // owner_id<>account.id matches the like guard above: a founder cannot
  // comment on their own ficha at all, not just be excluded from the score
  // (src/lib/solutions/ranking.ts already assumed this was impossible — it
  // wasn't, until this line).
  const rows=await sql`WITH target AS (SELECT id FROM founder_solutions WHERE id=${id} AND published_data IS NOT NULL AND owner_id<>${account.id}),inserted AS (INSERT INTO solution_comments(id,solution_id,author_id,author_name,body) SELECT ${body.commentId},id,${account.id},${details.name},${details.comment} FROM target ON CONFLICT(id) DO NOTHING RETURNING id,created_at) SELECT id,created_at,true created FROM inserted UNION ALL SELECT c.id,c.created_at,false created FROM solution_comments c JOIN target t ON t.id=c.solution_id WHERE c.id=${body.commentId} AND c.author_id=${account.id} LIMIT 1`;if(!rows.length)return failure('No puedes comentar tu propia ficha o ya no está publicada.',409);if(rows[0].created)revalidateTag('catalog');return ok({id:rows[0].id,createdAt:rows[0].created_at,created:!!rows[0].created});}
 if(body.action==='delete-comment'){if(typeof body.commentId!=='string'||!isSolutionId(body.commentId))return failure('Comentario inválido.',400);const rows=await sql`DELETE FROM solution_comments WHERE id=${body.commentId} AND author_id=${account.id} RETURNING id`;if(!rows.length)return failure('No puedes eliminar este comentario.',404);revalidateTag('catalog');return ok();}
 return failure('Acción inválida.',400);
 }catch{return failure('No pudimos guardar el cambio.',503);}
}
