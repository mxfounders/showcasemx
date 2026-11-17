import { authSql } from '@/lib/auth/security';

/**
 * Housekeeping for the daily monitor (SHCWS-12). Each step is independent and
 * best-effort: a failure leaves its rows for the next run and is reported as null.
 * The retention periods are the ones the privacy policy promises; change both together.
 */
export const maintenancePolicy = {
  /** Messages from the /contacto form (contact_inquiries). */
  contactInquiryMonths: 24,
  /** Screenshots uploaded to a listing and never placed in its draft or published version. */
  unusedScreenshotDays: 30,
  /** Aggregate search counts (search_demand, SHCWS-107): no person in them, kept for trends. */
  searchDemandDays: 400,
} as const;

async function count(run: () => Promise<Record<string, unknown>[]>) {
  try {
    const [row] = await run();
    return Number(row?.n ?? 0);
  } catch {
    return null;
  }
}

export async function runMaintenance() {
  const sql = authSql();
  const [sessions, loginChallenges, screenshots, contactInquiries, searchDemand] =
    await Promise.all([
      count(
        () =>
          sql`WITH gone AS (DELETE FROM auth_sessions WHERE expires_at<now() RETURNING 1) SELECT count(*)::int AS n FROM gone`,
      ),
      count(
        () =>
          sql`WITH gone AS (DELETE FROM auth_login_challenges WHERE expires_at<now() RETURNING 1) SELECT count(*)::int AS n FROM gone`,
      ),
      // Unused uploads: not in the draft nor in the approved version. Listings under review
      // are skipped (their draft is frozen) and rows being edited right now are skipped too
      // (SKIP LOCKED), so this never races a save. The AFTER DELETE trigger queues each
      // blob, renditions included, for the storage sweep.
      count(
        () => sql`WITH listings AS (
        SELECT s.id,s.data,s.published_data FROM founder_solutions s
        WHERE s.status<>'pending' AND EXISTS(SELECT 1 FROM solution_media m WHERE m.solution_id=s.id
          AND m.created_at<now()-make_interval(days => ${maintenancePolicy.unusedScreenshotDays}))
        FOR UPDATE SKIP LOCKED
      ), gone AS (
        DELETE FROM solution_media m USING listings s
        WHERE m.solution_id=s.id
          AND m.created_at<now()-make_interval(days => ${maintenancePolicy.unusedScreenshotDays})
          AND NOT COALESCE(s.data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text))
          AND NOT COALESCE(s.published_data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text))
        RETURNING 1
      ) SELECT count(*)::int AS n FROM gone`,
      ),
      count(
        () =>
          sql`WITH gone AS (DELETE FROM contact_inquiries WHERE created_at<now()-make_interval(months => ${maintenancePolicy.contactInquiryMonths}) RETURNING 1) SELECT count(*)::int AS n FROM gone`,
      ),
      count(
        () =>
          sql`WITH gone AS (DELETE FROM search_demand WHERE day<current_date-${maintenancePolicy.searchDemandDays}::int RETURNING 1) SELECT count(*)::int AS n FROM gone`,
      ),
    ]);
  return { sessions, loginChallenges, screenshots, contactInquiries, searchDemand };
}
