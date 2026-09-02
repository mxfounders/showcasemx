import {isSolutionQuestion,solutionQuestions} from '@/lib/solutions/questions';
import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId,readSolutionData,solutionErrors } from '@/lib/solutions/model';
import { failure,solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
export async function DELETE(request:NextRequest, props:{params:Promise<{id:string}>}) {
 const params=await props.params;
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta de shwcs.',403);
 if(!isSolutionId(params.id))return failure('Borrador no encontrado.',404);
 try{
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Tu sesión terminó. Inicia sesión y vuelve a intentar.',401);if(!await securityLimit('solution-delete',account.id,20))return failure('Demasiados cambios. Intenta más tarde.',429);
  const sql=solutionsSql();
  const result=await sql.transaction([
   sql`SELECT id,status,published_data IS NOT NULL AS was_published FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,
   sql`DELETE FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND status='draft' AND published_data IS NULL RETURNING id`
  ]);
  if(!result[0].length)return failure('Borrador no encontrado.',404);
  if(!result[1].length)return failure('Solo puedes eliminar borradores que nunca hayan sido aprobados.',409);
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos eliminar el borrador. Inténtalo de nuevo.',503);}
}
export async function PATCH(request:NextRequest, props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa el formulario de shwcs.',403);
 if(!isSolutionId(params.id))return failure('Postulación no encontrada.',404);
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Tu sesión terminó. Inicia sesión y vuelve a intentar.',401);if(!await securityLimit('solution-update',account.id,180))return failure('Demasiados cambios. Intenta más tarde.',429);const body=await solutionBody(request);if(!body||!Number.isSafeInteger(body.version)||Number(body.version)<0)return failure('Solicitud no válida.',400);
 const sql=solutionsSql();let rows;
 if(body.action==='save'||body.action==='submit'){
 if(body.question!==undefined&&!isSolutionQuestion(body.question))return failure('Pregunta no válida.',400);
 const data=readSolutionData(body.data);if(!data||!Number.isInteger(body.step)||Number(body.step)<0||Number(body.step)>3)return failure('Revisa los campos y su longitud.',400);
 if(body.action==='submit'&&Object.keys(solutionErrors(data)).length)return failure('Completa los datos antes de enviar a revisión.',400);
 const question=body.question===undefined?null:String(body.question);
 if(question&&solutionQuestions.find(item=>item.id===question)?.phase!==Number(body.step))return failure('El paso no corresponde a la pregunta.',400);
 const status=body.action==='submit'?'pending':'draft';const message=body.action==='submit'?'Postulación enviada a revisión.':'Borrador guardado.';
 const imageIds=(data.screenshots??[]).map(image=>image.id);
 const result=await sql.transaction([sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,sql`WITH changed AS (UPDATE founder_solutions SET data=${JSON.stringify(data)}::jsonb,status=${status},step=${Number(body.step)},editor_question=${question},version=version+1,updated_at=now() WHERE id=${params.id} AND owner_id=${account.id} AND version=${Number(body.version)} AND status IN ('draft','changes_requested','published','rejected') AND (SELECT count(*) FROM solution_media WHERE solution_id=${params.id} AND id=ANY(${imageIds}::uuid[]))=${imageIds.length} RETURNING *), event AS (INSERT INTO solution_events(solution_id,status,message) SELECT id,status,${message} FROM changed WHERE ${body.action==='submit'} RETURNING id) SELECT * FROM changed`]);rows=result[1];
 }else if(body.action==='review'){
 if(!['published','changes_requested','rejected'].includes(String(body.decision))||typeof body.message!=='string'||body.message.trim().length<10||body.message.length>2000)return failure('Selecciona una decisión y explica el motivo (mínimo 10 caracteres).',400);
 const authorized=await sql`SELECT account_id FROM solution_reviewers WHERE account_id=${account.id}`;if(!authorized.length)return failure('No tienes permiso para revisar postulaciones.',403);
 rows=await sql`WITH changed AS (UPDATE founder_solutions SET status=${String(body.decision)},published_at=CASE WHEN ${body.decision==='published'} THEN now() ELSE published_at END,published_data=CASE WHEN ${body.decision==='published'} THEN data ELSE published_data END,version=version+1,updated_at=now() WHERE id=${params.id} AND version=${Number(body.version)} AND status='pending' AND EXISTS(SELECT 1 FROM solution_reviewers WHERE account_id=${account.id}) RETURNING *), event AS (INSERT INTO solution_events(solution_id,status,message) SELECT id,status,${body.message.trim()} FROM changed RETURNING id) SELECT * FROM changed`;
 }else return failure('Acción no válida.',400);
 if(!rows.length)return failure('La postulación cambió o no admite esta acción. Recarga antes de continuar.',409);
 return NextResponse.json({ok:true,version:rows[0].version,status:rows[0].status},{headers:{'Cache-Control':'no-store'}});
 }catch{return failure('No pudimos guardar. Tus cambios siguen en el formulario.',503);}
}
