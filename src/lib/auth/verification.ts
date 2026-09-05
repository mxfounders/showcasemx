import { randomBytes } from 'node:crypto';
import { authSql } from './security';
import { hashToken } from './password';
import { recoveryConfig } from './recovery';
import { sendEmail } from '@/lib/notifications/server';
import { renderEmailHtml } from '@/lib/notifications/email-template';
export const validVerificationToken=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export async function requestVerification(account:{id:string;email:string}){
 const config=recoveryConfig();if(!config)throw Error('Email unavailable');const sql=authSql(),token=randomBytes(32).toString('hex');
 await sql`INSERT INTO auth_email_verifications(token_hash,account_id,email,expires_at) SELECT ${hashToken(token)},id,email,now()+interval '30 minutes' FROM auth_accounts WHERE id=${account.id} AND email=${account.email} AND email_verified_at IS NULL`;
 const link=`${config.origin}/verify-email#token=${token}`;
 const html=renderEmailHtml({origin:config.origin,preheader:'Confirma tu correo en shwcs',heading:'Confirma tu correo',paragraphs:['Confirma que este correo es tuyo para activar avisos y contacto en tu cuenta de shwcs.','El enlace caduca en 30 minutos.'],button:{label:'Confirmar correo',href:link},footerNote:'Si no lo solicitaste, ignora este correo.'});
 try{await sendEmail({to:account.email,subject:'Confirma tu correo en shwcs',text:`Confirma que este correo es tuyo:\n${link}\n\nEl enlace caduca en 30 minutos. Si no lo solicitaste, ignora este correo.`,html});}catch{await sql`DELETE FROM auth_email_verifications WHERE token_hash=${hashToken(token)}`;throw Error('Delivery unavailable');}
}
export async function consumeVerification(token:string){if(!validVerificationToken(token))return false;const sql=authSql();const rows=await sql`WITH changed AS (UPDATE auth_accounts a SET email_verified_at=now() FROM auth_email_verifications t WHERE t.token_hash=${hashToken(token)} AND t.account_id=a.id AND t.email=a.email AND t.expires_at>now() AND a.email_verified_at IS NULL RETURNING a.id), removed AS (DELETE FROM auth_email_verifications WHERE account_id IN(SELECT id FROM changed)) SELECT id FROM changed`;return rows.length>0;}
