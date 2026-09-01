import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { securityLimit } from '@/lib/auth/security';
import { failure,solutionBody } from '@/lib/solutions/http';
import { isDashboardMode } from '@/lib/dashboard/model';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta.',403);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión.',401);const body=await solutionBody(request);if(!body||!isDashboardMode(body.mode))return failure('Selecciona una vista válida.',400);
 if(!await securityLimit('dashboard-mode',account.id,100))return failure('Demasiados cambios. Intenta más tarde.',429);
 const sql=solutionsSql();await sql`UPDATE auth_accounts SET dashboard_mode=${body.mode} WHERE id=${account.id}`;
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos guardar tu vista.',503);}
}
