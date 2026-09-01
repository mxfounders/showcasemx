import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
export async function notificationPreferences(owner:string){const sql=authSql();const [row]=await sql`SELECT a.email_verified_at,COALESCE(p.contact_email,false) AS contact_email,COALESCE(p.solution_email,false) AS solution_email FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${owner}`;return {verified:!!row?.email_verified_at,contactEmail:!!row?.contact_email,solutionEmail:!!row?.solution_email,emailAvailable:!!recoveryConfig()};}
export async function sendEmail(to:string,subject:string,text:string,idempotencyKey?:string,replyTo?:string){const config=recoveryConfig();if(!config)throw Error('Email unavailable');const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from:config.from,to:[to],subject,text,...(replyTo?{reply_to:replyTo}:{})}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Delivery unavailable');const result=await response.json();return typeof result.id==='string'?result.id:null;}
export async function deliverNotifications(){
 const config=recoveryConfig();if(!config)return {available:false,sent:0};const sql=authSql();
 // Provider idempotency is bounded to 24h. Do not automatically retry uncertain older sends.
 await sql`UPDATE account_notifications SET email_state='failed' WHERE email_state IN('pending','sending') AND created_at<now()-interval '23 hours'`;
 const rows=await sql`WITH candidates AS (SELECT id FROM account_notifications WHERE attempts<5 AND next_attempt_at<=now() AND (email_state='pending' OR (email_state='sending' AND locked_at<now()-interval '5 minutes')) ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED) UPDATE account_notifications n SET email_state='sending',locked_at=now(),attempts=attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.*`;
 let sent=0;
 for(const row of rows){try{
 const [recipient]=await sql`SELECT a.email FROM auth_accounts a JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${row.owner_id} AND a.email_verified_at IS NOT NULL AND (CASE WHEN ${row.category}='contact' THEN p.contact_email ELSE p.solution_email END)`;
 if(!recipient){await sql`UPDATE account_notifications SET email_state='skipped',locked_at=NULL WHERE id=${row.id}`;continue;}
 const provider=await sendEmail(String(recipient.email),String(row.title),`${row.title}.\n\nAbre tu cuenta para consultar los detalles:\n${config.origin}${row.href}\n\nPreferencias de avisos: ${config.origin}/account/settings/notifications`,String(row.id));
 await sql`UPDATE account_notifications SET email_state='sent',provider_id=${provider},locked_at=NULL WHERE id=${row.id}`;sent++;
 }catch{await sql`UPDATE account_notifications SET email_state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+interval '5 minutes'*power(2,attempts),locked_at=NULL WHERE id=${row.id}`;}}
 return {available:true,sent};
}
