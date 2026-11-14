import { solutionsSql } from '@/lib/solutions/server';

/**
 * Writing in a contact request's conversation (SHCWS-168). Either participant can write
 * while it is new or in conversation; the recipient's first message moves a new request
 * to «en conversación». One statement checks participation and status, bumps the
 * version and inserts the event, so a message and a simultaneous close or withdrawal
 * cannot both win: once it is closed, the UPDATE matches nothing.
 *
 * Returns the request's new version and status, or why it could not be sent.
 */
export async function sendContactMessage(
  id: string,
  account: string,
  text: string,
): Promise<
  { ok: true; version: number; status: string } | { ok: false; reason: 'unavailable' | 'closed' }
> {
  const sql = solutionsSql();
  const rows = await sql`WITH changed AS (
      UPDATE contact_requests SET
        status = CASE WHEN recipient_id = ${account} AND status = 'new' THEN 'conversation' ELSE status END,
        version = version + 1,
        updated_at = now()
      WHERE id = ${id} AND (buyer_id = ${account} OR recipient_id = ${account})
        AND status IN ('new', 'conversation')
      RETURNING id, status, version
    ), event AS (
      INSERT INTO contact_events (request_id, actor_id, status, message, kind)
      SELECT id, ${account}, status, ${text}, 'message' FROM changed
    )
    SELECT status, version FROM changed`;
  if (rows.length)
    return { ok: true, version: Number(rows[0].version), status: String(rows[0].status) };
  const [exists] =
    await sql`SELECT 1 FROM contact_requests WHERE id = ${id} AND (buyer_id = ${account} OR recipient_id = ${account})`;
  return { ok: false, reason: exists ? 'closed' : 'unavailable' };
}
