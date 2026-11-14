import { solutionsSql } from '@/lib/solutions/server';
import {
  ContactError,
  type ContactDetails,
  type ContactErrorCode,
  type ContactStatus,
} from './model';
import { createContact } from './server';
import { createdOutcome, planBatch, type BatchInput } from './batch';

/**
 * Proposals to several projects at once (SHCWS-62). Each project gets an ordinary
 * contact request through `createContact`, the same function the single form uses, so
 * every rule of §9 holds per recipient: email from the session, recipient checked against
 * the listing's owner, only while published, never one's own listing, consent recorded,
 * one request per buyer and project with retries returning the one on file, and the
 * 1000-request quota under the buyer's row lock. This file only adds the grouping
 * (db/contact-batches.sql), which the recipients never see.
 */

export type BatchErrorCode = 'listUnavailable' | 'notInList' | 'consentMissing' | 'createLimit';

/** A failure of the whole batch, raised before any request is written. */
export class BatchError extends Error {
  constructor(
    public status: number,
    public code: BatchErrorCode,
  ) {
    super(code);
    this.name = 'BatchError';
  }
}

export type BatchResult = {
  solutionId: string;
  position: number;
  /**
   * sent: a request created by this batch (now or on an earlier attempt of it).
   * existing: the buyer had already written to this project; nothing new was sent.
   * failed: nothing was sent to this project; `error` says why.
   */
  outcome: 'sent' | 'existing' | 'failed';
  requestId?: string;
  error?: ContactErrorCode | 'unavailable';
};

/**
 * The projects a buyer's list holds, as solution ids, or null when the list is not
 * theirs. `catalog:cord` and the like resolve through catalog_key, never by slicing the
 * key; publication is checked later, per recipient, by `createContact`.
 */
export async function listSolutionIds(owner: string, listId: string) {
  const sql = solutionsSql();
  const [list, items] = await Promise.all([
    sql`SELECT id FROM buyer_lists WHERE owner_id=${owner} AND id=${listId}`,
    sql`SELECT project_key FROM buyer_list_items WHERE owner_id=${owner} AND list_id=${listId}`,
  ]);
  if (!list.length) return null;
  const keys = items.map(item => String(item.project_key));
  const ids = new Set(
    keys.filter(key => key.startsWith('solution:')).map(key => key.slice('solution:'.length)),
  );
  const catalogKeys = keys
    .filter(key => key.startsWith('catalog:'))
    .map(key => key.slice('catalog:'.length));
  if (catalogKeys.length) {
    const rows =
      await sql`SELECT id FROM founder_solutions WHERE catalog_key=ANY(${catalogKeys}::text[])`;
    for (const row of rows) ids.add(String(row.id));
  }
  return ids;
}

/**
 * Sends one request per consented recipient and groups them. A failure for one project
 * never undoes or hides the others: each result says exactly what happened.
 *
 * `allowAttempt` is the per-buyer creation limit. It is asked once per request this batch
 * will actually try to create (not for projects already written to, nor for retries of a
 * request this batch already created), all before writing, so a batch over the limit
 * sends nothing.
 */
export async function createContactBatch(
  input: BatchInput,
  account: { id: string; email: string },
  allowAttempt: () => Promise<boolean>,
): Promise<{ grouped: boolean; results: BatchResult[] }> {
  const sql = solutionsSql();
  const members = await listSolutionIds(account.id, input.listId);
  if (!members) throw new BatchError(404, 'listUnavailable');
  if (input.recipients.some(recipient => !members.has(recipient.solutionId)))
    throw new BatchError(400, 'notInList');
  const solutionIds = input.recipients.map(recipient => recipient.solutionId);
  const onFile =
    await sql`SELECT id,solution_id FROM contact_requests WHERE buyer_id=${account.id} AND solution_id=ANY(${solutionIds}::uuid[])`;
  const plan = planBatch(
    input.recipients,
    new Map(onFile.map(row => [String(row.solution_id), String(row.id)])),
  );
  if (!plan) throw new BatchError(400, 'consentMissing');
  for (const step of plan)
    if (step.action === 'create' && !(await allowAttempt()))
      throw new BatchError(429, 'createLimit');

  const results: BatchResult[] = [];
  for (const step of plan) {
    const base = { solutionId: step.recipient.solutionId, position: step.position };
    if (step.action !== 'create') {
      results.push({
        ...base,
        outcome: step.action === 'retry' ? 'sent' : 'existing',
        requestId: step.requestId,
      });
      continue;
    }
    try {
      const id = await createContact(
        {
          id: step.recipient.id,
          solutionId: step.recipient.solutionId,
          recipientId: step.recipient.recipientId,
          details: input.details,
        },
        account,
      );
      results.push({ ...base, outcome: createdOutcome(step.recipient.id, id), requestId: id });
    } catch (error) {
      if (!(error instanceof ContactError))
        console.error(
          JSON.stringify({ event: 'contact_batch_item_failed', requestId: crypto.randomUUID() }),
        );
      results.push({
        ...base,
        outcome: 'failed',
        error: error instanceof ContactError ? error.code : 'unavailable',
      });
    }
  }

  const items = results.filter(result => result.outcome !== 'failed' && result.requestId);
  if (!items.length) return { grouped: false, results };
  try {
    // The list may have been deleted meanwhile: then the batch keeps no list.
    const written = await sql.transaction([
      sql`INSERT INTO contact_batches(id,buyer_id,list_id)
        VALUES(${input.id},${account.id},(SELECT id FROM buyer_lists WHERE owner_id=${account.id} AND id=${input.listId}))
        ON CONFLICT (id) DO NOTHING`,
      sql`INSERT INTO contact_batch_items(batch_id,buyer_id,request_id,created,position)
        SELECT ${input.id},${account.id},x.request_id,x.created,x.position
        FROM unnest(${items.map(item => item.requestId)}::uuid[],${items.map(item => item.outcome === 'sent')}::boolean[],${items.map(item => item.position)}::smallint[]) AS x(request_id,created,position)
        WHERE EXISTS(SELECT 1 FROM contact_batches b WHERE b.id=${input.id} AND b.buyer_id=${account.id})
        ON CONFLICT DO NOTHING`,
      sql`SELECT count(*)::int AS n FROM contact_batch_items WHERE batch_id=${input.id} AND buyer_id=${account.id}`,
    ]);
    return { grouped: Number(written[2][0]?.n ?? 0) > 0, results };
  } catch {
    // The requests are sent and in «Mis contactos»; only the side-by-side view is missing,
    // and the caller says so. Retrying the same batch writes it.
    console.error(
      JSON.stringify({ event: 'contact_batch_group_failed', requestId: crypto.randomUUID() }),
    );
    return { grouped: false, results };
  }
}

export type BatchItem = {
  id: string;
  solution_id: string;
  project_name: string;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
  /** false: the buyer had written to this project before the batch. */
  created: boolean;
  details: ContactDetails;
  /** The recipient's latest words (a message or the reason given with a status change). */
  reply: string | null;
  reply_at: string | null;
  /** The latest event of the conversation, for whose turn it is. */
  last_id: string | null;
  last_actor: string | null;
  last_at: string | null;
};

/** A batch of the buyer's own, with each request's status and latest reply; else null. */
export async function getContactBatch(id: string, account: string) {
  const sql = solutionsSql();
  const [batches, items] = await Promise.all([
    sql`SELECT b.id,b.created_at::text,b.list_id,l.name AS list_name
      FROM contact_batches b LEFT JOIN buyer_lists l ON l.owner_id=b.buyer_id AND l.id=b.list_id
      WHERE b.id=${id} AND b.buyer_id=${account}`,
    sql`SELECT r.id,r.solution_id,r.project_name,r.status,r.created_at::text,r.updated_at::text,r.details,i.created,
        reply.message AS reply,reply.created_at AS reply_at,
        last.id AS last_id,last.actor_id AS last_actor,last.created_at AS last_at
      FROM contact_batch_items i
      JOIN contact_requests r ON r.buyer_id=i.buyer_id AND r.id=i.request_id
      LEFT JOIN LATERAL (SELECT e.message,e.created_at::text FROM contact_events e
        WHERE e.request_id=r.id AND e.actor_id=r.recipient_id AND e.message<>'' ORDER BY e.id DESC LIMIT 1) reply ON true
      LEFT JOIN LATERAL (SELECT e.id::text,e.actor_id,e.created_at::text FROM contact_events e
        WHERE e.request_id=r.id ORDER BY e.id DESC LIMIT 1) last ON true
      WHERE i.batch_id=${id} AND i.buyer_id=${account}
      ORDER BY i.position`,
  ]);
  const batch = batches[0];
  if (!batch || !items.length) return null;
  return {
    id: String(batch.id),
    created_at: String(batch.created_at),
    list_id: batch.list_id ? String(batch.list_id) : null,
    list_name: batch.list_name ? String(batch.list_name) : null,
    items: items as BatchItem[],
  };
}

export type BatchSummary = {
  id: string;
  created_at: string;
  projects: { name: string; status: ContactStatus; replied: boolean }[];
};

/** The buyer's most recent batches, for «Mis contactos». */
export async function listContactBatches(account: string, limit = 5) {
  const sql = solutionsSql();
  return (await sql`SELECT b.id,b.created_at::text,
      json_agg(json_build_object('name',r.project_name,'status',r.status,
        'replied',EXISTS(SELECT 1 FROM contact_events e WHERE e.request_id=r.id AND e.actor_id=r.recipient_id))
        ORDER BY i.position) AS projects
    FROM contact_batches b
    JOIN contact_batch_items i ON i.batch_id=b.id AND i.buyer_id=b.buyer_id
    JOIN contact_requests r ON r.buyer_id=i.buyer_id AND r.id=i.request_id
    WHERE b.buyer_id=${account}
    GROUP BY b.id ORDER BY b.created_at DESC,b.id LIMIT ${limit}`) as BatchSummary[];
}

/** The latest batch of the buyer's own that includes this request, if any. */
export async function batchForRequest(requestId: string, account: string) {
  const sql = solutionsSql();
  const rows = await sql`SELECT b.id FROM contact_batch_items i
    JOIN contact_batches b ON b.id=i.batch_id AND b.buyer_id=i.buyer_id
    WHERE i.request_id=${requestId} AND i.buyer_id=${account}
    ORDER BY b.created_at DESC,b.id LIMIT 1`;
  return rows[0] ? String(rows[0].id) : null;
}
