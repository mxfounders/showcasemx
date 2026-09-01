import { randomBytes } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql,securityLimit } from '@/lib/auth/security';
import { isSolutionId } from '@/lib/solutions/model';
import { verificationDomain } from '@/lib/trust/domain';
import { failure,solutionBody } from '@/lib/solutions/http';
export async function POST(request:NextRequest, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa shwcs.',403);if(!isSolutionId(params.id))return failure('No disponible.',404);try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión.',401);const body=await solutionBody(request);if(!['issue','verify'].includes(String(body?.action)))return failure('Acción inválida.',400);const sql=authSql();const [solution]=await sql`SELECT published_data->>'website' AS website FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND published_data IS NOT NULL`;if(!solution)return failure('Solo puedes verificar una publicación propia.',404);const domain=verificationDomain(solution.website);if(!domain)return failure('Publica primero un sitio HTTPS con dominio válido.',400);if(!(await securityLimit('domain-verify',account.id,10)))return failure('Demasiados intentos. Intenta más tarde.',429);
  if(body?.action==='issue'){const token=randomBytes(24).toString('hex');await sql`INSERT INTO solution_domain_proofs(solution_id,owner_id,domain,token,expires_at) VALUES(${params.id},${account.id},${domain},${token},now()+interval '7 days') ON CONFLICT(solution_id) DO UPDATE SET owner_id=EXCLUDED.owner_id,domain=EXCLUDED.domain,token=EXCLUDED.token,expires_at=EXCLUDED.expires_at,verified_at=NULL`;return NextResponse.json({ok:true,name:`_showcasemx.${domain}`,value:`showcasemx-verification=${token}`},{headers:{'Cache-Control':'no-store'}});}
  const [proof]=await sql`SELECT token FROM solution_domain_proofs WHERE solution_id=${params.id} AND owner_id=${account.id} AND domain=${domain} AND expires_at>now()`;if(!proof)return failure('Genera un registro nuevo; el anterior caducó o cambió el dominio.',400);
  const resolver=new Resolver({timeout:2000,tries:1});let records:string[][];try{records=await resolver.resolveTxt(`_showcasemx.${domain}`);}catch{return failure('Todavía no encontramos el registro TXT. Revisa el DNS y vuelve a intentar.',400);}
  if(!records.some(record=>record.join('')===`showcasemx-verification=${proof.token}`))return failure('El TXT no coincide con el registro solicitado.',400);
  const updated=await sql`UPDATE solution_domain_proofs p SET verified_at=now(),expires_at=now()+interval '90 days' FROM founder_solutions s WHERE p.solution_id=s.id AND p.solution_id=${params.id} AND p.owner_id=${account.id} AND s.owner_id=${account.id} AND p.token=${proof.token} AND s.published_data->>'website'=${solution.website} AND p.expires_at>now() RETURNING p.solution_id`;if(!updated.length)return failure('La ficha cambió durante la verificación. Recarga.',409);return NextResponse.json({ok:true,verified:true},{headers:{'Cache-Control':'no-store'}});
  }catch{return failure('No pudimos comprobar el dominio.',503);}
}
