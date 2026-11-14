import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { responseMinimumRequests, responseWindowDays, type ResponseSignal } from './response-model';

// The pure rules and wording live in response-model.ts so client components can format a
// signal without bundling the database driver.
export * from './response-model';

/** One aggregated row to a signal, or null below the minimum. Exported for the tests. */
export function signalFromRow(row: Record<string, unknown>): ResponseSignal | null {
  const requests = Number(row.requests);
  const answered = Number(row.answered);
  if (requests < responseMinimumRequests) return null;
  return {
    medianHours: answered && row.median_hours != null ? Number(row.median_hours) : null,
    answered,
    requests,
  };
}

/**
 * The signal for every published listing (no argument) or for one (`solutionId`). An
 * environment without the contact tables yields nothing rather than failing the page.
 */
export async function responseSignals(solutionId?: string): Promise<Map<string, ResponseSignal>> {
  const url = getDatabaseUrl();
  if (!url) return new Map();
  const sql = neon(url);
  const rows =
    await sql`SELECT r.solution_id,count(*)::int AS requests,count(f.first_at)::int AS answered,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM f.first_at-r.created_at)/3600.0) AS median_hours
    FROM contact_requests r
    JOIN auth_accounts b ON b.id=r.buyer_id AND b.email_verified_at IS NOT NULL
    LEFT JOIN LATERAL (SELECT min(e.created_at) AS first_at FROM contact_events e
      WHERE e.request_id=r.id AND e.actor_id=r.recipient_id) f ON true
    WHERE r.created_at>now()-make_interval(days=>${responseWindowDays})
      AND r.buyer_id<>r.recipient_id
      AND (${solutionId ?? null}::uuid IS NULL OR r.solution_id=${solutionId ?? null}::uuid)
      AND (f.first_at IS NOT NULL OR r.unanswered_at IS NOT NULL
        OR (r.status<>'withdrawn' AND r.created_at<now()-interval '72 hours'))
    GROUP BY r.solution_id`.catch(() => []);
  const signals = new Map<string, ResponseSignal>();
  for (const row of rows) {
    const signal = signalFromRow(row);
    if (signal) signals.set(String(row.solution_id), signal);
  }
  return signals;
}

/** For the public ficha: the same signal as the catalog card, or null below the minimum. */
export async function solutionResponseSignal(solutionId: string) {
  return (await responseSignals(solutionId)).get(solutionId) ?? null;
}
