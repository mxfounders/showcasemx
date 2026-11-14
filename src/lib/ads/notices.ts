import { authSql } from '@/lib/auth/security';
import { adTimeZone } from '@/lib/ads/model';

/**
 * Date-driven notices for sponsored slots (SHCWS-20): «starts tomorrow» and «ended, with
 * its numbers». Updates (paid, paused, dispute, canceled, refund) come from the
 * ad_campaigns trigger; these two depend only on the calendar, so the daily mail cron
 * creates them right before sending. listing_notice() keys each by campaign, so running
 * the cron twice never duplicates them, and «ended» looks back two days so a missed cron
 * still sends it. Days are natural days in Mexico City (§64); a booking serves
 * starts_on <= d < coalesce(served_until, ends_on), so it has ended on that last date.
 */
export async function createAdDateNotices() {
  const sql = authSql();
  const [starting, ended] = await sql.transaction([
    sql`WITH today AS (SELECT (now() AT TIME ZONE ${adTimeZone})::date AS d)
      SELECT listing_notice(c.owner_id, 'ad:'||c.id||':starts',
        'Tu espacio patrocinado para '||c.solution_name||' empieza mañana',
        CASE WHEN c.solution_id IS NULL THEN '/account' ELSE '/account/solutions/'||c.solution_id||'/promote' END)
      FROM ad_campaigns c, today
      WHERE c.status='paid' AND c.canceled_at IS NULL AND c.owner_id IS NOT NULL
        AND c.starts_on=today.d+1`,
    sql`WITH today AS (SELECT (now() AT TIME ZONE ${adTimeZone})::date AS d),
      totals AS (SELECT campaign_id,sum(impressions)::bigint AS impressions,sum(clicks)::bigint AS clicks,
          sum(visits)::bigint AS visits
        FROM ad_campaign_daily_metrics GROUP BY campaign_id),
      requests AS (SELECT campaign_id,count(*)::bigint AS n FROM ad_contact_attributions GROUP BY campaign_id)
      -- The summary at the end (SHCWS-70) links to the booking's report.
      SELECT listing_notice(c.owner_id, 'ad:'||c.id||':ended',
        'Terminó tu espacio patrocinado para '||c.solution_name||': '
          ||COALESCE(t.impressions,0)||' impresiones, '||COALESCE(t.clicks,0)||' clics, '
          ||COALESCE(t.visits,0)||' visitas y '||COALESCE(r.n,0)||' solicitudes',
        CASE WHEN c.solution_id IS NULL THEN '/account'
          ELSE '/account/solutions/'||c.solution_id||'/promote/'||c.id END)
      FROM ad_campaigns c CROSS JOIN today LEFT JOIN totals t ON t.campaign_id=c.id
        LEFT JOIN requests r ON r.campaign_id=c.id
      WHERE c.status='paid' AND c.owner_id IS NOT NULL
        AND coalesce(c.served_until,c.ends_on) BETWEEN today.d-2 AND today.d
        AND coalesce(c.served_until,c.ends_on)>c.starts_on`,
  ]);
  return { starting: starting.length, ended: ended.length };
}
