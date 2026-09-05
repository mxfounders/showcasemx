import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { renderEmailHtml } from '@/lib/notifications/email-template';
export async function notificationPreferences(owner:string){const sql=authSql();const [row]=await sql`SELECT a.email_verified_at,COALESCE(p.contact_email,false) AS contact_email,COALESCE(p.solution_email,false) AS solution_email FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${owner}`;return {verified:!!row?.email_verified_at,contactEmail:!!row?.contact_email,solutionEmail:!!row?.solution_email,emailAvailable:!!recoveryConfig()};}
// Options object, not positional params: four call sites already needed
// different subsets of idempotencyKey/replyTo/html, which made positional
// args error-prone (easy to shift an argument into the wrong slot).
export async function sendEmail(opts:{to:string;subject:string;text:string;html?:string;idempotencyKey?:string;replyTo?:string}){const config=recoveryConfig();if(!config)throw Error('Email unavailable');const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json',...(opts.idempotencyKey?{'Idempotency-Key':opts.idempotencyKey}:{})},body:JSON.stringify({from:config.from,to:[opts.to],subject:opts.subject,text:opts.text,...(opts.html?{html:opts.html}:{}),...(opts.replyTo?{reply_to:opts.replyTo}:{})}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Delivery unavailable');const result=await response.json();return typeof result.id==='string'?result.id:null;}
export async function deliverNotifications(){
 const config=recoveryConfig();if(!config)return {available:false,processed:0,sent:0,skipped:0,pending:0,failed:0};const sql=authSql();
 // Provider idempotency is bounded to 24h. Do not automatically retry uncertain older sends.
 await sql`UPDATE account_notifications SET email_state='failed' WHERE (email_state='sending' OR (email_state='pending' AND attempts>0)) AND created_at<now()-interval '23 hours'`;
 // Hobby runs this worker daily, so drain a useful bounded batch per invocation.
 const rows=await sql`WITH candidates AS (SELECT id FROM account_notifications WHERE attempts<5 AND next_attempt_at<=now() AND (email_state='pending' OR (email_state='sending' AND locked_at<now()-interval '5 minutes')) ORDER BY created_at LIMIT 25 FOR UPDATE SKIP LOCKED) UPDATE account_notifications n SET email_state='sending',locked_at=now(),attempts=attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.*`;
 let sent=0,skipped=0;
 for(const row of rows){try{
 const [recipient]=await sql`SELECT a.email FROM auth_accounts a JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${row.owner_id} AND a.email_verified_at IS NOT NULL AND (CASE WHEN ${row.category}='contact' THEN p.contact_email ELSE p.solution_email END)`;
 if(!recipient){await sql`UPDATE account_notifications SET email_state='skipped',locked_at=NULL WHERE id=${row.id}`;skipped++;continue;}
 const title=String(row.title),href=`${config.origin}${row.href}`,prefs=`${config.origin}/account/settings/notifications`;
 const html=renderEmailHtml({origin:config.origin,preheader:title,heading:title,paragraphs:['Hay novedades en tu cuenta de shwcs. Abre tu cuenta para consultar los detalles.'],button:{label:'Ver detalles',href},footerNote:'Puedes ajustar qué avisos te llegan por correo desde Preferencias de avisos.'});
 const provider=await sendEmail({to:String(recipient.email),subject:title,text:`${title}.\n\nAbre tu cuenta para consultar los detalles:\n${href}\n\nPreferencias de avisos: ${prefs}`,html,idempotencyKey:String(row.id)});
 await sql`UPDATE account_notifications SET email_state='sent',provider_id=${provider},locked_at=NULL WHERE id=${row.id}`;sent++;
 }catch{await sql`UPDATE account_notifications SET email_state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+interval '5 minutes'*power(2,attempts),locked_at=NULL WHERE id=${row.id}`;}}
 const [totals]=await sql`SELECT count(*) FILTER(WHERE email_state='pending')::int AS pending,count(*) FILTER(WHERE email_state='failed')::int AS failed FROM account_notifications`;
 return {available:true,processed:rows.length,sent,skipped,pending:Number(totals?.pending??0),failed:Number(totals?.failed??0)};
}
