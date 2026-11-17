import { solutionsSql } from '@/lib/solutions/server';
import { unreadOpportunities } from '@/lib/contacts/server';
export async function dashboardData(owner: string) {
  const sql = solutionsSql();
  const [profiles, requests] = await Promise.all([
    sql`SELECT name,profile,dashboard_mode,email_verified_at IS NOT NULL AS email_verified FROM auth_accounts WHERE id=${owner}`,
    // Whose turn it is comes from who spoke last: an open request whose last event is
    // the other person's is waiting on this account (SHCWS-169/168).
    sql`SELECT id,project_name,company,status,outgoing,updated_at::text,waiting,last_at::text FROM (
      SELECT r.id,r.project_name,r.details->>'company' AS company,r.status,r.buyer_id=${owner} AS outgoing,r.updated_at,
        (r.status IN ('new','conversation') AND last.actor_id IS DISTINCT FROM ${owner}::uuid) AS waiting,
        last.created_at AS last_at,
        row_number() OVER(PARTITION BY r.buyer_id=${owner} ORDER BY r.updated_at DESC,r.id) AS position
      FROM contact_requests r
      LEFT JOIN LATERAL (SELECT e.actor_id,e.created_at FROM contact_events e WHERE e.request_id=r.id ORDER BY e.id DESC LIMIT 1) last ON true
      WHERE r.buyer_id=${owner} OR r.recipient_id=${owner}) ranked
      WHERE position<=6 ORDER BY updated_at DESC`,
  ]);
  return {
    profile: profiles[0] as {
      name: string | null;
      profile: string | null;
      dashboard_mode: string | null;
      email_verified: boolean;
    },
    requests: requests as {
      id: string;
      project_name: string;
      company: string | null;
      status: 'new' | 'conversation' | 'closed' | 'withdrawn';
      outgoing: boolean;
      updated_at: string;
      /** Open, and the last word was the other person's: this account should answer. */
      waiting: boolean;
      last_at: string | null;
    }[],
  };
}

/**
 * What a founder can do next to get leads (SHCWS-16). Each signal is independent: one
 * that can't be read (an environment without the ads tables, say) just yields nothing.
 */
export async function founderSignals(owner: string) {
  const sql = solutionsSql();
  const [opportunities, unread, alerts, domains, promotion] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM contact_requests WHERE recipient_id=${owner} AND status='new'`.catch(
      () => [],
    ),
    // Same count as the sidebar badge (SHCWS-14).
    unreadOpportunities(owner).catch(() => 0),
    sql`SELECT a.email_verified_at IS NOT NULL AS verified,COALESCE(p.contact_email,true) AS contact
      FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${owner}`.catch(
      () => [],
    ),
    // Published listings and their TXT proof: missing, or about to lapse (it lasts 90 days).
    sql`SELECT s.id,s.published_data->>'name' AS name,
        COALESCE(p.verified_at IS NOT NULL AND p.expires_at>now(),false) AS verified,
        COALESCE(p.verified_at IS NOT NULL AND p.expires_at>now() AND p.expires_at<now()+interval '14 days',false) AS expiring
      FROM founder_solutions s LEFT JOIN solution_domain_proofs p ON p.solution_id=s.id
      WHERE s.owner_id=${owner} AND s.published_data IS NOT NULL
      ORDER BY s.published_at DESC NULLS LAST,s.id LIMIT 3`.catch(() => []),
    // Only while sponsored slots are on sale, and for a listing without a running campaign.
    sql`SELECT s.id,s.published_data->>'name' AS name FROM founder_solutions s
      WHERE s.owner_id=${owner} AND s.published_data IS NOT NULL
        AND EXISTS(SELECT 1 FROM ad_placements p JOIN ad_rates r ON r.placement=p.id WHERE p.enabled)
        AND NOT EXISTS(SELECT 1 FROM ad_campaigns c WHERE c.solution_id=s.id AND c.status='paid' AND c.ends_on>current_date)
      ORDER BY s.published_at DESC NULLS LAST,s.id LIMIT 1`.catch(() => []),
  ]);
  return {
    newOpportunities: Number(opportunities[0]?.n ?? 0),
    unreadOpportunities: unread,
    alertsOff: Boolean(alerts[0]?.verified) && alerts[0]?.contact === false,
    domains: domains
      .filter(row => !row.verified || row.expiring)
      .map(row => ({
        id: String(row.id),
        name: String(row.name),
        expiring: Boolean(row.verified && row.expiring),
      })),
    promote: promotion[0] ? { id: String(promotion[0].id), name: String(promotion[0].name) } : null,
  };
}
export type FounderSignals = Awaited<ReturnType<typeof founderSignals>>;
