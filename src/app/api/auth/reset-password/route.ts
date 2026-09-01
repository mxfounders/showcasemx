import { NextRequest,NextResponse } from 'next/server';
import { securityLimit } from '@/lib/auth/security';
import { consumeReset } from '@/lib/auth/recovery';
import { hashPassword } from '@/lib/auth/password';
import { credentialErrors } from '@/lib/auth/validation';
import { cookieOptions,sessionCookie } from '@/lib/auth/session';
import { failure,solutionBody } from '@/lib/solutions/http';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa el formulario de shwcs.',403);
 try {
  const body=await solutionBody(request);
  if(!body||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return failure('Este enlace no es válido. Solicita uno nuevo.',400);
  if(typeof body.password!=='string'||credentialErrors('valid@example.com',body.password).password||body.confirm!==body.password)return failure('Usa al menos 6 caracteres y confirma la misma contraseña.',400);
  if(!await securityLimit('reset',body.token))return failure('Demasiados intentos. Inténtalo más tarde.',429);
  if(!await consumeReset(body.token,await hashPassword(body.password)))return failure('El enlace caducó o ya se usó. Solicita uno nuevo.',400);
  const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});response.cookies.set(sessionCookie,'',{...cookieOptions,maxAge:0});return response;
 }catch{return failure('No pudimos confirmar el cambio. Intenta iniciar sesión antes de repetirlo.',503);}
}
