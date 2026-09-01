import { NextRequest,NextResponse } from 'next/server';
import { authSql,securityLimit } from '@/lib/auth/security';
import { recoveryConfig,issueReset,deliverReset } from '@/lib/auth/recovery';
import { credentialErrors } from '@/lib/auth/validation';
import { failure,solutionBody } from '@/lib/solutions/http';
export const runtime='nodejs';
export async function POST(request:NextRequest) {
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa el formulario de shwcs.',403);
 if(!recoveryConfig())return failure('La recuperación por correo todavía no está habilitada.',503);
 try {
  const body=await solutionBody(request);const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(credentialErrors(email,'unused-password').email)return failure('Escribe un correo válido.',400);
  if(!await securityLimit('recovery',email,3))return failure('Ya solicitaste varios enlaces. Espera una hora antes de intentar de nuevo.',429);
  const sql=authSql();const rows=await sql`SELECT id,password_hash FROM auth_accounts WHERE email=${email}`;
  // Consistent response floor covers the bounded mail request, including nonexistent accounts.
  const start=Date.now();
  try {if(rows.length){const token=await issueReset(String(rows[0].id),String(rows[0].password_hash));await deliverReset(email,token);}}catch{console.error('Password recovery delivery failed');}
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,8500-(Date.now()-start))));
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos procesar la solicitud. Inténtalo más tarde.',503);}
}
