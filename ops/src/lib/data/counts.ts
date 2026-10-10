import { getDb } from '../db';
import type { CountKey } from '@/components/shell/nav';

/** Live badges for the sidebar. One round trip; failures degrade to zeros. */
export async function navCounts(): Promise<Record<CountKey, number>> {
  try {
    const sql = getDb();
    const [row] = await sql`
      SELECT
        (SELECT count(*) FROM founder_solutions WHERE status = 'pending')::int AS reviews,
        ((SELECT count(*) FROM solution_reports WHERE status = 'open')
          + (SELECT count(*) FROM community_reports WHERE status = 'open')
          + (SELECT count(*) FROM solution_review_reports WHERE status = 'open'))::int AS reports,
        (SELECT count(*) FROM contact_inquiries WHERE handled_at IS NULL)::int AS inquiries,
        (SELECT count(*) FROM account_notifications WHERE email_state = 'failed')::int AS mail
    `;
    return {
      reviews: Number(row?.reviews ?? 0),
      reports: Number(row?.reports ?? 0),
      inquiries: Number(row?.inquiries ?? 0),
      mail: Number(row?.mail ?? 0),
    };
  } catch (err) {
    console.error('[ops/counts]', err);
    return { reviews: 0, reports: 0, inquiries: 0, mail: 0 };
  }
}
