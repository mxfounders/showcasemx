import { NextRequest,NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql,securityLimit } from '@/lib/auth/security';
import { failure } from '@/lib/solutions/http';
export const runtime='nodejs';
export async function PUT(request:NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta para cambiar la foto.',403);
 try {
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);
  if(!await securityLimit('avatar',account.id,20))return failure('Demasiados cambios. Inténtalo más tarde.',429);
  const type=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(type??''))return failure('Elige una imagen JPG, PNG o WebP.',415);
  const reader=request.body?.getReader();if(!reader)return failure('Selecciona una foto.',400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();return failure('La foto debe pesar menos de 2 MB.',413);}chunks.push(value);}
  let output:Buffer;
  try {const input=sharp(Buffer.concat(chunks),{limitInputPixels:16000000,failOn:'warning'});const meta=await input.metadata();if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)>1)return failure('Usa una imagen estática JPG, PNG o WebP.',400);output=await input.rotate().resize(256,256,{fit:'cover'}).webp({quality:80}).toBuffer();}catch{return failure('No pudimos leer la imagen. Prueba otra de hasta 16 megapíxeles.',400);}
  const avatar=`data:image/webp;base64,${output.toString('base64')}`;const sql=authSql();await sql`UPDATE auth_accounts SET avatar_data=${avatar} WHERE id=${account.id}`;
  return NextResponse.json({ok:true,avatar},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos guardar tu foto. Inténtalo de nuevo.',503);}
}
export async function DELETE(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta para cambiar la foto.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);if(!await securityLimit('avatar',account.id,20))return failure('Demasiados cambios. Inténtalo más tarde.',429);const sql=authSql();await sql`UPDATE auth_accounts SET avatar_data=NULL WHERE id=${account.id}`;return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return failure('No pudimos quitar la foto.',503);}
}
