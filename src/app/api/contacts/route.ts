import { NextRequest,NextResponse } from 'next/server';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { authSql,securityLimit } from '@/lib/auth/security';
import { failure,solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readContact,ContactError,consentVersion,isContactStatus } from '@/lib/contacts/model';
import { createContact,updateContact } from '@/lib/contacts/server';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return failure('Usa tu cuenta de shwcs.',403);
 try{
  const account=await getSession(request.cookies.get(sessionCookie)?.value);
  if(!account)return failure('Inicia sesión para continuar.',401);
  const body=await solutionBody(request);
  if(!body||typeof body.id!=='string'||!isSolutionId(body.id))return failure('Solicitud no válida.',400);
  let id:string;
  if(body.action==='create'){
   if(process.env.AUTH_REQUIRE_VERIFIED_EMAIL==='true'){const sql=authSql();const [verified]=await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;if(!verified?.email_verified_at)return failure('Verifica tu correo desde Seguridad antes de enviar solicitudes.',403);}
   const details=readContact(body);
   if(!details||typeof body.solutionId!=='string'||!isSolutionId(body.solutionId)||typeof body.recipientId!=='string'||!isSolutionId(body.recipientId)||body.consent!==true||body.consentVersion!==consentVersion)return failure('Completa los datos y autoriza compartirlos con el proyecto.',400);
   if(!await securityLimit('contact-create',account.id,20))return failure('Has enviado demasiadas solicitudes. Intenta más tarde.',429);
   id=await createContact({id:body.id,solutionId:body.solutionId,recipientId:body.recipientId,details},account);
  }else if(body.action==='update'){
   if(!isContactStatus(body.status)||!Number.isSafeInteger(body.version)||Number(body.version)<0||Number(body.version)>2147483646||typeof body.message!=='string'||body.message.length>2000)return failure('Revisa el estado y la respuesta (hasta 2000 caracteres).',400);
   if(!await securityLimit('contact-update',account.id,100))return failure('Demasiados cambios. Intenta más tarde.',429);
   id=await updateContact(body.id,account.id,body.status,Number(body.version),body.message);
  }else return failure('Acción no válida.',400);
  return NextResponse.json({ok:true,id},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof ContactError)return failure(error.message,error.status);
  console.error(JSON.stringify({event:'contact_request_failed',requestId:crypto.randomUUID()}));
  return failure('No pudimos confirmar el cambio. Revisa tu bandeja antes de repetir.',503);
 }
}
