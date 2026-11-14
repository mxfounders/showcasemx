import { solutionsSql } from '@/lib/solutions/server';
import {
  canTransition,
  ContactError,
  consentVersion,
  contactSystemMessages,
  type ContactDetails,
  type ContactRequest,
  type ContactEvent,
  type ContactOutcome,
  type ContactStatus,
  type OutcomeValue,
} from './model';

/**
 * Whether the buyer did something (the request itself, a withdrawal) after the recipient
 * last opened or answered it. `r` must alias contact_requests (SHCWS-14).
 */
const unreadSql = `EXISTS(SELECT 1 FROM contact_events e WHERE e.request_id=r.id AND e.actor_id=r.buyer_id AND e.created_at>coalesce(r.recipient_read_at,'-infinity'::timestamptz))`;

export async function contactTarget(solutionId: string) {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT id,owner_id,published_data->>'name' AS name,published_data->'companySizes' AS company_sizes FROM founder_solutions WHERE id=${solutionId} AND published_data IS NOT NULL`;
  return rows[0] as
    { id: string; owner_id: string; name: string; company_sizes: unknown } | undefined;
}
export async function getContact(id: string, account: string) {
  const sql = solutionsSql();
  // Explicit columns: the outcome and read state are the recipient's own (SHCWS-14/22)
  // and come back empty whenever the buyer is the one reading.
  const rows = await sql.query(
    `SELECT r.id,r.buyer_id,r.recipient_id,r.solution_id,r.project_name,r.buyer_email,r.details,r.status,r.version,r.created_at,r.updated_at,
      a.email AS buyer_account_email,a.email_verified_at::text AS buyer_email_verified_at,
      CASE WHEN r.recipient_id=$2 THEN r.outcome END AS outcome,
      CASE WHEN r.recipient_id=$2 THEN r.outcome_value END AS outcome_value,
      (r.recipient_id=$2 AND ${unreadSql}) AS unread
    FROM contact_requests r LEFT JOIN auth_accounts a ON a.id=r.buyer_id
    WHERE r.id=$1 AND (r.buyer_id=$2 OR r.recipient_id=$2)`,
    [id, account],
  );
  return rows[0] as ContactRequest | undefined;
}
export async function findContact(buyer: string, solution: string) {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT id FROM contact_requests WHERE buyer_id=${buyer} AND solution_id=${solution}`;
  return rows[0]?.id as string | undefined;
}
export async function contactEvents(id: string, account: string) {
  const sql = solutionsSql();
  return (await sql`SELECT e.id::text,e.actor_id,e.status,e.message,e.kind,e.created_at::text FROM contact_events e JOIN contact_requests r ON r.id=e.request_id WHERE r.id=${id} AND (r.buyer_id=${account} OR r.recipient_id=${account}) ORDER BY e.id DESC`) as ContactEvent[];
}
export type ContactRow = {
  id: string;
  project_name: string;
  company: string;
  status: ContactStatus;
  updated_at: string;
  created_at: string;
  size: string;
  timeline: string;
  budget: string;
  /** The first 400 characters of the need; the card shortens it further. */
  need: string;
  buyer_email: string;
  buyer_account_email: string | null;
  buyer_email_verified_at: string | null;
  /** Incoming only: whether the buyer did something the recipient has not opened. */
  unread: boolean;
};
/**
 * One page of a person's requests. Incoming adds the read state, an «unread» filter and
 * puts unread opportunities first, so the founder sees what needs attention.
 */
export async function listContacts(
  account: string,
  incoming: boolean,
  status: string,
  page: number,
) {
  const sql = solutionsSql();
  const owner = incoming ? 'r.recipient_id' : 'r.buyer_id';
  const unread = incoming ? unreadSql : 'false';
  // Only fixed SQL is interpolated; every value travels as a parameter.
  const params: unknown[] = [account, (page - 1) * 20];
  const filter =
    status === 'unread'
      ? incoming
        ? unreadSql
        : 'true'
      : status
        ? `r.status=$${params.push(status)}`
        : 'true';
  return (await sql.query(
    `SELECT r.id,r.project_name,r.details->>'company' AS company,r.status,r.updated_at::text,r.created_at::text,
      coalesce(r.details->>'size','') AS size,coalesce(r.details->>'timeline','') AS timeline,
      coalesce(r.details->>'budget','') AS budget,left(coalesce(r.details->>'need',''),400) AS need,
      r.buyer_email,a.email AS buyer_account_email,a.email_verified_at::text AS buyer_email_verified_at,
      ${unread} AS unread
    FROM contact_requests r LEFT JOIN auth_accounts a ON a.id=r.buyer_id
    WHERE ${owner}=$1 AND ${filter}
    ORDER BY ${incoming ? 'unread DESC,' : ''}r.updated_at DESC,r.id LIMIT 21 OFFSET $2`,
    params,
  )) as ContactRow[];
}
/** How many opportunities the recipient has not opened since the buyer last acted. */
export async function unreadOpportunities(account: string) {
  const sql = solutionsSql();
  const rows = await sql.query(
    `SELECT count(*)::int AS n FROM contact_requests r WHERE r.recipient_id=$1 AND ${unreadSql}`,
    [account],
  );
  return Number(rows[0]?.n ?? 0);
}
/** The recipient opened the opportunity. Never touches status, version or updated_at. */
export async function markContactRead(id: string, account: string) {
  const sql = solutionsSql();
  const rows =
    await sql`UPDATE contact_requests SET recipient_read_at=now() WHERE id=${id} AND recipient_id=${account} RETURNING id`;
  if (!rows.length) throw new ContactError(404, 'requestUnavailable');
  return id;
}
export async function createContact(
  input: { id: string; solutionId: string; details: ContactDetails; recipientId: string },
  account: { id: string; email: string },
) {
  const sql = solutionsSql();
  const target = await contactTarget(input.solutionId);
  if (!target) throw new ContactError(404, 'projectUnavailable');
  if (target.owner_id === account.id) throw new ContactError(400, 'ownProject');
  if (target.owner_id !== input.recipientId) throw new ContactError(409, 'recipientChanged');
  // Lock the buyer to serialize quotas/retries; recheck recipient/publication in the INSERT.
  const result = await sql.transaction([
    sql`SELECT id FROM auth_accounts WHERE id=${account.id} FOR UPDATE`,
    sql`WITH inserted AS (
   INSERT INTO contact_requests(id,buyer_id,recipient_id,solution_id,project_name,buyer_email,details,consent_version)
   SELECT ${input.id},${account.id},s.owner_id,s.id,s.published_data->>'name',${account.email},${JSON.stringify(input.details)}::jsonb,${consentVersion}
   FROM founder_solutions s WHERE s.id=${input.solutionId} AND s.owner_id=${input.recipientId} AND s.owner_id<>${account.id} AND s.published_data IS NOT NULL
   AND (SELECT count(*) FROM contact_requests WHERE buyer_id=${account.id})<1000
   ON CONFLICT DO NOTHING RETURNING id,buyer_id
  ) INSERT INTO contact_events(request_id,actor_id,status,message) SELECT id,buyer_id,'new',${contactSystemMessages.created} FROM inserted`,
    sql`SELECT id FROM contact_requests WHERE buyer_id=${account.id} AND solution_id=${input.solutionId}`,
  ]);
  const id = result[2][0]?.id;
  if (!id) throw new ContactError(409, 'createFailed');
  return String(id);
}
export async function updateContact(
  id: string,
  account: string,
  next: ContactStatus,
  version: number,
  message: string,
  /** Recipient closing only: what came of it (SHCWS-22). Ignored for any other change. */
  result: { outcome: ContactOutcome; value: OutcomeValue | null } | null = null,
) {
  const sql = solutionsSql(),
    request = await getContact(id, account);
  if (!request) throw new ContactError(404, 'requestUnavailable');
  const actor = request.buyer_id === account ? 'buyer' : 'recipient';
  if (!canTransition(request.status, next, actor))
    throw new ContactError(409, 'transitionUnavailable');
  if (actor === 'recipient' && message.trim().length < 10)
    throw new ContactError(400, 'replyTooShort');
  // An outcome only lives on a closed request: reopening clears it in this same write.
  const outcome = actor === 'recipient' && next === 'closed' ? result : null;
  // Answering is reading: the recipient's own change marks what came before as read.
  const rows = await sql`WITH changed AS (
  UPDATE contact_requests SET status=${next},version=version+1,updated_at=now(),
   outcome=${outcome?.outcome ?? null},outcome_value=${outcome?.value ?? null},
   outcome_at=CASE WHEN ${outcome !== null} THEN now() END,
   recipient_read_at=CASE WHEN ${actor === 'recipient'} THEN now() ELSE recipient_read_at END
  WHERE id=${id} AND version=${version} AND status=${request.status} AND (buyer_id=${account} OR recipient_id=${account}) RETURNING id
 ) INSERT INTO contact_events(request_id,actor_id,status,message)
 SELECT id,${account},${next},${actor === 'buyer' ? contactSystemMessages.withdrawn : message.trim()} FROM changed RETURNING request_id`;
  if (!rows.length) throw new ContactError(409, 'stale');
  return id;
}
/**
 * Records or corrects the outcome of a closed opportunity. Recipient only, with the same
 * version check as any other change. Writes no contact event and leaves updated_at alone,
 * so the buyer sees nothing move: the outcome is the founder's private record.
 */
export async function setContactOutcome(
  id: string,
  account: string,
  version: number,
  result: { outcome: ContactOutcome; value: OutcomeValue | null },
) {
  const sql = solutionsSql(),
    request = await getContact(id, account);
  if (!request || request.recipient_id !== account)
    throw new ContactError(404, 'requestUnavailable');
  if (request.status !== 'closed') throw new ContactError(409, 'outcomeUnavailable');
  const rows =
    await sql`UPDATE contact_requests SET outcome=${result.outcome},outcome_value=${result.value},outcome_at=now(),version=version+1
   WHERE id=${id} AND recipient_id=${account} AND status='closed' AND version=${version} RETURNING id`;
  if (!rows.length) throw new ContactError(409, 'stale');
  return id;
}
