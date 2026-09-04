import { NextRequest,NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure,solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { validProjectKey,listDetails,listPublicationDetails } from '@/lib/library/model';
import { resolveProjects } from '@/lib/library/server';
const ok=(data:Record<string,unknown>={})=>NextResponse.json({ok:true,...data},{headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión para ver tus guardados.',401);const key=request.nextUrl.searchParams.get('project');if(!validProjectKey(key))return failure('Proyecto no válido.',400);const sql=solutionsSql();const rows=await sql`SELECT project_key FROM buyer_saved_projects WHERE owner_id=${account.id} AND project_key=${key}`;return ok({saved:rows.length>0});}catch{return failure('No pudimos consultar tus guardados.',503);}
}
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta de shwcs.',403);
 try{
  const account=await getSession(request.cookies.get(sessionCookie)?.value);if(!account)return failure('Inicia sesión para guardar proyectos.',401);
  const body=await solutionBody(request);if(!body||typeof body.action!=='string')return failure('Solicitud no válida.',400);
  const sql=solutionsSql(),owner=account.id;
  if(!await securityLimit('library',owner,300))return failure('Demasiados cambios. Intenta de nuevo más tarde.',429);
  if(body.action==='create-list'){
   const details=listDetails(body),publication=listPublicationDetails(body);if(!publication||!details||typeof body.id!=='string'||!isSolutionId(body.id))return failure('Revisa el nombre y los datos de publicación de la lista.',400);
   const results=await sql.transaction([sql`SELECT id FROM auth_accounts WHERE id=${owner} FOR UPDATE`,sql`INSERT INTO buyer_lists(id,owner_id,name,purpose,visibility,categories,public_description,curator_name) SELECT ${body.id},${owner},${details.name},${details.purpose},${publication.visibility},${publication.categories}::text[],${publication.publicDescription},${publication.curatorName} WHERE (SELECT count(*) FROM buyer_lists WHERE owner_id=${owner})<30 ON CONFLICT(id) DO NOTHING`,sql`SELECT id FROM buyer_lists WHERE id=${body.id} AND owner_id=${owner}`]);
   if(!results[2].length)return failure('No se pudo crear la lista. Puedes tener hasta 30 listas.',409);return ok({id:body.id});
  }
  if(['update-list','delete-list'].includes(body.action)){
   if(typeof body.listId!=='string'||!isSolutionId(body.listId))return failure('Lista no válida.',400);
   if(body.action==='delete-list'){const rows=await sql`DELETE FROM buyer_lists WHERE id=${body.listId} AND owner_id=${owner} RETURNING id`;return rows.length?ok():failure('Lista no disponible.',404);}
   const details=listDetails(body),publication=listPublicationDetails(body);if(!publication||!details||!Number.isInteger(body.version))return failure('Revisa los datos, las categorías y la confirmación de publicación.',400);
   const rows=await sql`UPDATE buyer_lists SET name=${details.name},purpose=${details.purpose},visibility=${publication.visibility},categories=${publication.categories}::text[],public_description=${publication.publicDescription},curator_name=${publication.curatorName},version=version+1,updated_at=now() WHERE id=${body.listId} AND owner_id=${owner} AND version=${body.version} RETURNING id`;
   return rows.length?ok():failure('La lista cambió o no está disponible. Recarga antes de continuar.',409);
  }
  const key=body.projectKey;if(!validProjectKey(key))return failure('Proyecto no válido.',400);
  if(body.action==='save'){
   const projects=await resolveProjects([key]);if(!projects[key])return failure('Este proyecto ya no está disponible para guardar.',404);
   const results=await sql.transaction([sql`SELECT id FROM auth_accounts WHERE id=${owner} FOR UPDATE`,sql`INSERT INTO buyer_saved_projects(owner_id,project_key) SELECT ${owner},${key} WHERE (SELECT count(*) FROM buyer_saved_projects WHERE owner_id=${owner})<200 ON CONFLICT DO NOTHING`,sql`SELECT project_key FROM buyer_saved_projects WHERE owner_id=${owner} AND project_key=${key}`]);
   if(!results[2].length)return failure('Puedes guardar hasta 200 proyectos. Quita alguno antes de añadir otro.',409);revalidateTag('catalog');return ok({saved:true});
  }
  if(body.action==='unsave'){await sql`DELETE FROM buyer_saved_projects WHERE owner_id=${owner} AND project_key=${key}`;revalidateTag('catalog');return ok({saved:false});}
  if(!['add-to-list','remove-from-list','update-note'].includes(body.action))return failure('Acción no disponible.',400);
  if(typeof body.listId!=='string'||!isSolutionId(body.listId))return failure('Lista no válida.',400);
  if(body.action==='add-to-list'){
   const rows=await sql`INSERT INTO buyer_list_items(owner_id,list_id,project_key) SELECT ${owner},l.id,s.project_key FROM buyer_lists l JOIN buyer_saved_projects s ON s.owner_id=l.owner_id WHERE l.id=${body.listId} AND l.owner_id=${owner} AND s.project_key=${key} ON CONFLICT(owner_id,list_id,project_key) DO UPDATE SET project_key=EXCLUDED.project_key RETURNING list_id`;
   return rows.length?ok():failure('Guarda el proyecto primero y elige una lista de tu cuenta.',404);
  }
  if(body.action==='remove-from-list'){const rows=await sql`DELETE FROM buyer_list_items WHERE owner_id=${owner} AND list_id=${body.listId} AND project_key=${key} RETURNING list_id`;return rows.length?ok():failure('El proyecto no está en esta lista.',404);}
  if(typeof body.note!=='string'||body.note.length>2000||!Number.isInteger(body.version))return failure('La nota admite hasta 2000 caracteres.',400);
  const rows=await sql`UPDATE buyer_list_items SET note=${body.note.trim()},version=version+1 WHERE owner_id=${owner} AND list_id=${body.listId} AND project_key=${key} AND version=${body.version} RETURNING version`;
  return rows.length?ok():failure('La nota cambió o no está disponible. Recarga para revisar la última versión.',409);
 }catch{return failure('No pudimos confirmar el cambio. Recarga para comprobarlo antes de repetir.',503);}
}
