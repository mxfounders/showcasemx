import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
type Params={id:string;assetId:string};
export const runtime='nodejs';
export async function GET(request:NextRequest, props:{params:Promise<Params>}) {
 const params = await props.params;
 if(!isSolutionId(params.id)||!isSolutionId(params.assetId))return failure('Captura no disponible.',404);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value),sql=solutionsSql();
 // Public if the approved snapshot references it, otherwise owner only. Reviewers
 // read screenshots through the ops backoffice, which has its own media route.
 const [asset]=await sql`SELECT m.content_base64,COALESCE(s.published_data->'screenshots','[]'::jsonb) @> ${JSON.stringify([{id:params.assetId}])}::jsonb AS is_public FROM solution_media m JOIN founder_solutions s ON s.id=m.solution_id WHERE m.id=${params.assetId} AND s.id=${params.id} AND (
 COALESCE(s.published_data->'screenshots','[]'::jsonb) @> ${JSON.stringify([{id:params.assetId}])}::jsonb
 OR s.owner_id=${account?.id??null}::uuid)`;
 if(!asset)return failure('Captura no disponible.',404);
 // A published asset's bytes never change (there is no "replace" endpoint, only
 // delete-then-reupload with a new id) — safe to cache hard and cut repeated
 // Neon reads for every catalogue grid. A draft stays private and uncached.
 const cacheControl=asset.is_public?'public, max-age=3600, immutable':'private, no-store';
 return new NextResponse(new Uint8Array(Buffer.from(String(asset.content_base64),'base64')),{headers:{'Content-Type':'image/webp','Cache-Control':cacheControl,'X-Content-Type-Options':'nosniff'}});
 }catch{return failure('No pudimos cargar la captura.',503);}
}
export async function DELETE(request:NextRequest, props:{params:Promise<Params>}) {
 const params = await props.params;
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta.',403);
 if(!isSolutionId(params.id)||!isSolutionId(params.assetId))return failure('Captura no disponible.',404);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión.',401);const sql=solutionsSql();
 const result=await sql.transaction([sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,sql`DELETE FROM solution_media m USING founder_solutions s WHERE m.id=${params.assetId} AND m.solution_id=s.id AND s.id=${params.id} AND s.owner_id=${account.id} AND s.status<>'pending' AND NOT (COALESCE(s.data->'screenshots','[]'::jsonb) @> ${JSON.stringify([{id:params.assetId}])}::jsonb) AND NOT (COALESCE(s.published_data->'screenshots','[]'::jsonb) @> ${JSON.stringify([{id:params.assetId}])}::jsonb) RETURNING m.id`]);
 if(!result[1].length)return failure('No se puede eliminar: aún está guardada, publicada, en revisión o no pertenece a tu solución.',409);
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos eliminar la captura.',503);}
}
