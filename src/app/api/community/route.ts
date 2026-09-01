import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { solutionBody,failure } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { communityComment } from '@/lib/library/community-model';
const ok=(data:Record<string,unknown>={})=>NextResponse.json({ok:true,...data},{headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa shwcs.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión para participar.',401);const body=await solutionBody(request);if(!body||typeof body.listId!=='string'||!isSolutionId(body.listId)||typeof body.action!=='string')return failure('Solicitud inválida.',400);const sql=solutionsSql(),id=body.listId;
 if(!await securityLimit('community',account.id,60))return failure('Demasiadas acciones. Intenta más tarde.',429);
 if(body.action==='like'||body.action==='save'){
  const rows=body.action==='like'?await sql`WITH deleted AS (DELETE FROM community_list_likes WHERE list_id=${id} AND owner_id=${account.id} RETURNING false active),inserted AS (INSERT INTO community_list_likes(list_id,owner_id) SELECT id,${account.id} FROM buyer_lists WHERE id=${id} AND visibility='public' AND owner_id<>${account.id} AND NOT EXISTS(SELECT 1 FROM deleted) ON CONFLICT DO NOTHING RETURNING true active) SELECT active FROM inserted UNION ALL SELECT active FROM deleted`:await sql`WITH deleted AS (DELETE FROM community_saved_lists WHERE list_id=${id} AND owner_id=${account.id} RETURNING false active),inserted AS (INSERT INTO community_saved_lists(list_id,owner_id) SELECT id,${account.id} FROM buyer_lists WHERE id=${id} AND visibility='public' AND owner_id<>${account.id} AND NOT EXISTS(SELECT 1 FROM deleted) ON CONFLICT DO NOTHING RETURNING true active) SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
  if(!rows.length)return failure('No puedes interactuar con tu propia lista o ya no está pública.',409);const [{count}]=body.action==='like'?await sql`SELECT count(*)::int count FROM community_list_likes WHERE list_id=${id}`:await sql`SELECT count(*)::int count FROM community_saved_lists WHERE list_id=${id}`;return ok({active:!!rows[0].active,count:Number(count)});
 }
 if(body.action==='comment'){const details=communityComment(body);if(typeof body.commentId!=='string'||!isSolutionId(body.commentId))return failure('Comentario inválido.',400);if(!details)return failure('Escribe un nombre o alias y un comentario de hasta 500 caracteres.',400);if(!await securityLimit('community-comment',account.id,10))return failure('Espera antes de comentar otra vez.',429);const rows=await sql`WITH target AS (SELECT id FROM buyer_lists WHERE id=${id} AND visibility='public'),inserted AS (INSERT INTO community_list_comments(id,list_id,author_id,author_name,body) SELECT ${body.commentId},id,${account.id},${details.name},${details.comment} FROM target ON CONFLICT(id) DO NOTHING RETURNING id,created_at) SELECT id,created_at,true created FROM inserted UNION ALL SELECT c.id,c.created_at,false created FROM community_list_comments c JOIN target t ON t.id=c.list_id WHERE c.id=${body.commentId} AND c.author_id=${account.id} LIMIT 1`;if(!rows.length)return failure('La lista ya no está pública.',404);return ok({id:rows[0].id,createdAt:rows[0].created_at,created:!!rows[0].created});}
 if(body.action==='delete-comment'){if(typeof body.commentId!=='string'||!isSolutionId(body.commentId))return failure('Comentario inválido.',400);const rows=await sql`DELETE FROM community_list_comments c USING buyer_lists l WHERE c.id=${body.commentId} AND c.list_id=l.id AND (c.author_id=${account.id} OR l.owner_id=${account.id}) RETURNING c.id`;return rows.length?ok():failure('No puedes eliminar este comentario.',404);}
 return failure('Acción inválida.',400);
 }catch{return failure('No pudimos guardar el cambio.',503);}
}
