import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { getDatabaseUrl } from '@/lib/database-url';
import { validateAccount } from '@/lib/account';
import { securityLimit } from '@/lib/auth/security';
export async function PATCH(request: NextRequest) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail('Guarda desde tu cuenta de shwcs.',403);
  try {
    const user = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!user) return fail('Tu sesión terminó. Vuelve a iniciar sesión.',401);
    if (!await securityLimit('account-profile', user.id, 60)) return fail('Demasiados cambios. Intenta más tarde.', 429);
    if (!request.headers.get('content-type')?.includes('application/json')) return fail('Formato no válido.',415);
    const reader=request.body?.getReader();
    if (!reader) return fail('Faltan tus datos.',400);
    let size=0; const chunks: Uint8Array[]=[];
    while(true) { const {value,done}=await reader.read(); if(done) break; size+=value.byteLength; if(size>4096) {await reader.cancel();return fail('Datos demasiado largos.',413);} chunks.push(value); }
    let body: unknown;
    try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch{return fail('Revisa tus datos.',400);}
    const profile=validateAccount(body);
    if(!profile) return fail('Completa tu nombre, perfil y rol. Revisa la longitud de los campos.',400);
    const sql=neon(getDatabaseUrl()!);
    // Identity always comes from the session, never a client account ID/email.
    await sql`UPDATE auth_accounts SET name=${profile.name}, organization=${profile.organization}, profile=${profile.profile}, role=${profile.role} WHERE id=${user.id}`;
    return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch {return fail('No pudimos guardar los cambios. Tus datos siguen en el formulario.',503);}
}
