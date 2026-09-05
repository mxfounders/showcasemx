import { NextRequest,NextResponse } from 'next/server';
import sharp from 'sharp';
import { randomUUID,createHash } from 'node:crypto';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql,securityLimit } from '@/lib/auth/security';
import { failure } from '@/lib/solutions/http';
import { storageEnabled,putObject,getObject } from '@/lib/storage/blob';
import { avatarKey } from '@/lib/storage/keys';
export const runtime='nodejs';

// Serves the session owner's own avatar. No id in the path: it is always the
// caller's. Private and uncached — a tiny image not worth a staleness window.
export async function GET(request:NextRequest) {
 try{
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);
  const sql=authSql();const [row]=await sql`SELECT avatar_key,avatar_checksum,avatar_data FROM auth_accounts WHERE id=${account.id}`;
  if(!row?.avatar_key&&!row?.avatar_data)return failure('Sin foto.',404);
  const etag=row.avatar_checksum?`"${String(row.avatar_checksum)}"`:null;
  if(etag&&request.headers.get('if-none-match')===etag)return new NextResponse(null,{status:304,headers:{'Cache-Control':'private, no-store',ETag:etag}});
  let bytes:Buffer|null=null;
  if(row.avatar_key){const obj=await getObject(String(row.avatar_key));if(obj&&obj!=='not-modified')bytes=obj.bytes;}
  else{const uri=String(row.avatar_data);const comma=uri.indexOf(',');bytes=Buffer.from(comma>=0?uri.slice(comma+1):uri,'base64');} // legacy data URI (dual-read window)
  if(!bytes)return failure('Sin foto.',404);
  return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(etag?{ETag:etag}:{})}});
 }catch{return failure('No pudimos cargar la foto.',503);}
}

export async function PUT(request:NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta para cambiar la foto.',403);
 try {
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);
  if(!await securityLimit('avatar',account.id,20))return failure('Demasiados cambios. Inténtalo más tarde.',429);
  const type=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(type??''))return failure('Elige una imagen JPG, PNG o WebP.',415);
  if(!storageEnabled())return failure('El almacenamiento de imágenes no está disponible ahora.',503);
  const reader=request.body?.getReader();if(!reader)return failure('Selecciona una foto.',400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();return failure('La foto debe pesar menos de 2 MB.',413);}chunks.push(value);}
  let output:Buffer;
  try {const input=sharp(Buffer.concat(chunks),{limitInputPixels:16000000,failOn:'warning'});const meta=await input.metadata();if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)>1)return failure('Usa una imagen estática JPG, PNG o WebP.',400);output=await input.rotate().resize(256,256,{fit:'cover'}).webp({quality:80}).toBuffer();}catch{return failure('No pudimos leer la imagen. Prueba otra de hasta 16 megapíxeles.',400);}
  const key=avatarKey(account.id,randomUUID()),checksum=createHash('sha256').update(output).digest('hex');
  await putObject(key,output);
  const sql=authSql();
  // The AFTER UPDATE OF avatar_key trigger orphans the previous key.
  try{await sql`UPDATE auth_accounts SET avatar_key=${key},avatar_checksum=${checksum} WHERE id=${account.id}`;}
  catch{try{await sql`INSERT INTO storage_orphans(key) VALUES(${key}) ON CONFLICT(key) DO NOTHING`;}catch{}return failure('No pudimos guardar tu foto. Inténtalo de nuevo.',503);}
  return NextResponse.json({ok:true,avatar:`/api/account/avatar?v=${checksum.slice(0,12)}`},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos guardar tu foto. Inténtalo de nuevo.',503);}
}

export async function DELETE(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta para cambiar la foto.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);if(!await securityLimit('avatar',account.id,20))return failure('Demasiados cambios. Inténtalo más tarde.',429);const sql=authSql();await sql`UPDATE auth_accounts SET avatar_key=NULL,avatar_checksum=NULL WHERE id=${account.id}`;return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return failure('No pudimos quitar la foto.',503);}
}
