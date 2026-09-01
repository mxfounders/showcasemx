import { authorizedCron } from '@/lib/notifications/cron';
import { NextRequest,NextResponse } from 'next/server';
import { deliverNotifications } from '@/lib/notifications/server';
import { authSql } from '@/lib/auth/security';
export const maxDuration=60;
export async function GET(request:NextRequest){if(!authorizedCron(request.headers.get('authorization')))return NextResponse.json({error:'Unauthorized'},{status:401});try{const result=await deliverNotifications();const sql=authSql();await sql.transaction([sql`DELETE FROM auth_email_verifications WHERE expires_at<now()`,sql`DELETE FROM auth_google_states WHERE expires_at<now()`,sql`DELETE FROM auth_password_resets WHERE expires_at<now()`,sql`DELETE FROM auth_rate_limits WHERE window_start<now()-interval '2 days'`]);return NextResponse.json(result,{headers:{'Cache-Control':'no-store'},status:result.available?200:503});}catch{return NextResponse.json({error:'Mail processing failed'},{status:503});}}
