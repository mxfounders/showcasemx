import { solutionsSql } from '@/lib/solutions/server';
export async function dashboardData(owner:string){
 const sql=solutionsSql();
 const [profiles,requests]=await Promise.all([
  sql`SELECT name,profile,dashboard_mode FROM auth_accounts WHERE id=${owner}`,
  sql`SELECT id,project_name,status,outgoing,updated_at::text FROM (SELECT id,project_name,status,buyer_id=${owner} AS outgoing,updated_at,row_number() OVER(PARTITION BY buyer_id=${owner} ORDER BY updated_at DESC,id) AS position FROM contact_requests WHERE buyer_id=${owner} OR recipient_id=${owner}) ranked WHERE position<=4 ORDER BY updated_at DESC`
 ]);
 return {profile:profiles[0] as {name:string|null;profile:string|null;dashboard_mode:string|null},requests:requests as {id:string;project_name:string;status:'new'|'conversation'|'closed'|'withdrawn';outgoing:boolean;updated_at:string}[]};
}
