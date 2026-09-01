import { NextRequest,NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { failure } from '@/lib/solutions/http';
export const runtime='nodejs';
export async function GET(request:NextRequest, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!isSolutionId(params.id))return failure('Solución no disponible.',404);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión.',401);const sql=solutionsSql();
 const [solution]=await sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id}`;if(!solution)return failure('Solución no disponible.',404);
 const assets=await sql`SELECT m.id,m.width,m.height,(COALESCE(s.data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text)) OR COALESCE(s.published_data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text))) AS in_use FROM solution_media m JOIN founder_solutions s ON s.id=m.solution_id WHERE m.solution_id=${params.id} ORDER BY m.created_at DESC`;
 return NextResponse.json({assets},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos consultar las capturas.',503);}
}
export async function POST(request:NextRequest, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta para subir capturas.',403);
 if(!isSolutionId(params.id))return failure('Solución no disponible.',404);
 try{
 const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión.',401);const sql=solutionsSql();
 const [solution]=await sql`SELECT id,status FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id}`;if(!solution)return failure('Solución no disponible.',404);if(solution.status==='pending')return failure('Espera la revisión antes de subir nuevas capturas.',409);
 if(!(await securityLimit('solution-media',account.id,30)))return failure('Demasiadas subidas. Intenta más tarde.',429);
 if(!['image/jpeg','image/png','image/webp'].includes(request.headers.get('content-type')??''))return failure('Usa JPG, PNG o WebP.',415);
 const reader=request.body?.getReader();if(!reader)return failure('Selecciona una captura.',400);let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();return failure('La captura admite hasta 2 MB.',413);}chunks.push(value);}
 let buffer:Buffer,width:number,height:number;
 try{const input=sharp(Buffer.concat(chunks),{limitInputPixels:16000000,failOn:'warning'}),meta=await input.metadata();if(!['png','jpeg','webp'].includes(meta.format??'')||(meta.pages??1)>1)return failure('Usa una imagen estática; no SVG ni animaciones.',400);const result=await input.rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer({resolveWithObject:true});buffer=result.data;width=result.info.width;height=result.info.height;if(buffer.length>400*1024)return failure('La imagen tiene demasiado detalle. Reduce su tamaño e intenta otra vez.',413);}catch{return failure('No pudimos leer la captura. Usa una imagen de hasta 16 megapíxeles.',400);}
 const id=randomUUID(),results=await sql.transaction([sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,sql`INSERT INTO solution_media(id,solution_id,content_base64,width,height) SELECT ${id},id,${buffer.toString('base64')},${width},${height} FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND status<>'pending' AND (SELECT count(*) FROM solution_media WHERE solution_id=${params.id})<12 RETURNING id,width,height`]);
 if(!results[1].length)return failure('La solución cambió o tiene 12 archivos. Elimina archivos sin uso antes de subir más.',409);
 return NextResponse.json({asset:{...results[1][0],in_use:false}},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos confirmar la subida. Revisa los archivos antes de repetir.',503);}
}
