import { NextRequest, NextResponse } from 'next/server';
import { getSession,sessionCookie,cookieOptions } from '@/lib/auth/session';
import { hashPassword,verifyPassword } from '@/lib/auth/password';
import { credentialErrors } from '@/lib/auth/validation';
import { authSql,securityLimit } from '@/lib/auth/security';
import { failure,solutionBody } from '@/lib/solutions/http';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa el formulario de tu cuenta.',403);
 try {
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Vuelve a iniciar sesión.',401);
  const body=await solutionBody(request);
  if(!body||typeof body.currentPassword!=='string'||body.currentPassword.length>4096||typeof body.password!=='string'||credentialErrors(account.email,body.password).password||body.confirm!==body.password)return failure('Revisa las contraseñas. La nueva debe tener al menos 6 caracteres y coincidir con la confirmación.',400);
  if(!await securityLimit('change-password',account.id))return failure('Demasiados intentos. Intenta más tarde.',429);
  const sql=authSql();const rows=await sql`SELECT password_hash FROM auth_accounts WHERE id=${account.id}`;
  if(!rows.length||!await verifyPassword(body.currentPassword,String(rows[0].password_hash)))return failure('La contraseña actual no es correcta.',400);
  if(body.currentPassword===body.password)return failure('Elige una contraseña diferente a la actual.',400);
  const hash=await hashPassword(body.password);
  const changed=await sql`WITH changed AS (UPDATE auth_accounts SET password_hash=${hash} WHERE id=${account.id} AND password_hash=${rows[0].password_hash} RETURNING id), sessions AS (DELETE FROM auth_sessions WHERE account_id IN(SELECT id FROM changed)), tokens AS (DELETE FROM auth_password_resets WHERE account_id IN(SELECT id FROM changed)) SELECT id FROM changed`;
  if(!changed.length)return failure('Tu acceso cambió. Vuelve a iniciar sesión.',409);
  const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});response.cookies.set(sessionCookie,'',{...cookieOptions,maxAge:0});return response;
 }catch{return failure('No pudimos confirmar el cambio. Intenta iniciar sesión antes de repetirlo.',503);}
}
