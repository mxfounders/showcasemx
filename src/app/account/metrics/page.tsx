import { requireFounder,solutionsSql } from '@/lib/solutions/server';
import { MetricsDashboard,type DailyMetric,type ProjectMetric } from '@/components/metrics/metrics-dashboard';

export const metadata={title:'Métricas | shwcs',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

export default async function MetricsPage(){
 const account=await requireFounder(),sql=solutionsSql();
 const [projectRows,dailyRows]=await Promise.all([
  sql`SELECT s.id::text,s.data->>'name' AS name,COALESCE(m.views,0)::int AS views,COALESCE(m.clicks,0)::int AS clicks,(SELECT count(*)::int FROM contact_requests r WHERE r.solution_id=s.id AND r.created_at>=current_date-29) AS requests FROM founder_solutions s LEFT JOIN (SELECT solution_id,sum(views) AS views,sum(clicks) AS clicks FROM solution_daily_metrics WHERE day>=current_date-29 GROUP BY solution_id) m ON m.solution_id=s.id WHERE s.owner_id=${account.id} ORDER BY COALESCE(m.views,0) DESC,COALESCE(m.clicks,0) DESC,s.updated_at DESC`,
  sql`WITH dates AS (SELECT generate_series(current_date-29,current_date,interval '1 day')::date AS day),activity AS (SELECT m.day,sum(m.views)::int AS views,sum(m.clicks)::int AS clicks FROM solution_daily_metrics m JOIN founder_solutions s ON s.id=m.solution_id WHERE s.owner_id=${account.id} AND m.day>=current_date-29 GROUP BY m.day),requests AS (SELECT r.created_at::date AS day,count(*)::int AS requests FROM contact_requests r JOIN founder_solutions s ON s.id=r.solution_id WHERE s.owner_id=${account.id} AND r.created_at>=current_date-29 GROUP BY r.created_at::date) SELECT d.day::text,COALESCE(a.views,0)::int AS views,COALESCE(a.clicks,0)::int AS clicks,COALESCE(r.requests,0)::int AS requests FROM dates d LEFT JOIN activity a ON a.day=d.day LEFT JOIN requests r ON r.day=d.day ORDER BY d.day`
 ]);
 const projects=projectRows.map(row=>({id:String(row.id),name:String(row.name||'Sin nombre'),views:Number(row.views),clicks:Number(row.clicks),requests:Number(row.requests)})) satisfies ProjectMetric[];
 const days=dailyRows.map(row=>({day:String(row.day),views:Number(row.views),clicks:Number(row.clicks),requests:Number(row.requests)})) satisfies DailyMetric[];
 return <MetricsDashboard projects={projects} days={days}/>;
}
