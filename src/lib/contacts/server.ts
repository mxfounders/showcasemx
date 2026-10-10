import { solutionsSql } from '@/lib/solutions/server';
import {
  canTransition,
  ContactError,
  consentVersion,
  contactSystemMessages,
  type ContactDetails,
  type ContactRequest,
  type ContactEvent,
  type ContactStatus,
} from './model';

export async function contactTarget(solutionId: string) {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT id,owner_id,published_data->>'name' AS name FROM founder_solutions WHERE id=${solutionId} AND published_data IS NOT NULL`;
  return rows[0] as { id: string; owner_id: string; name: string } | undefined;
}
export async function getContact(id: string, account: string) {
  const sql = solutionsSql();
  const rows =
    await sql`SELECT * FROM contact_requests WHERE id=${id} AND (buyer_id=${account} OR recipient_id=${account})`;
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
  return (await sql`SELECT e.id::text,e.actor_id,e.status,e.message,e.created_at::text FROM contact_events e JOIN contact_requests r ON r.id=e.request_id WHERE r.id=${id} AND (r.buyer_id=${account} OR r.recipient_id=${account}) ORDER BY e.id DESC`) as ContactEvent[];
}
export async function listContacts(
  account: string,
  incoming: boolean,
  status: string,
  page: number,
) {
  const sql = solutionsSql();
  return (await sql`SELECT id,project_name,details->>'company' AS company,status,updated_at::text FROM contact_requests WHERE (CASE WHEN ${incoming} THEN recipient_id ELSE buyer_id END)=${account} AND (${status}='' OR status=${status}) ORDER BY updated_at DESC,id LIMIT 21 OFFSET ${(page - 1) * 20}`) as {
    id: string;
    project_name: string;
    company: string;
    status: ContactStatus;
    updated_at: string;
  }[];
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
) {
  const sql = solutionsSql(),
    request = await getContact(id, account);
  if (!request) throw new ContactError(404, 'requestUnavailable');
  const actor = request.buyer_id === account ? 'buyer' : 'recipient';
  if (!canTransition(request.status, next, actor))
    throw new ContactError(409, 'transitionUnavailable');
  if (actor === 'recipient' && message.trim().length < 10)
    throw new ContactError(400, 'replyTooShort');
  const rows = await sql`WITH changed AS (
  UPDATE contact_requests SET status=${next},version=version+1,updated_at=now()
  WHERE id=${id} AND version=${version} AND status=${request.status} AND (buyer_id=${account} OR recipient_id=${account}) RETURNING id
 ) INSERT INTO contact_events(request_id,actor_id,status,message)
 SELECT id,${account},${next},${actor === 'buyer' ? contactSystemMessages.withdrawn : message.trim()} FROM changed RETURNING request_id`;
  if (!rows.length) throw new ContactError(409, 'stale');
  return id;
}
