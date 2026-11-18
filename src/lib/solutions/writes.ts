import { after } from 'next/server';
import { notifyReviewersOfSubmission, reviewAlertsEnabled } from '@/lib/review-queue/alerts';
import { solutionsSql } from './server';
import {
  emptySolution,
  readSolutionData,
  solutionErrors,
  solutionSystemMessages,
  type SolutionData,
} from './model';
import { questionPhase } from './questions';

/**
 * The writes a founder makes on their own listing, shared by the editor's API
 * (POST /api/solutions, PATCH /api/solutions/[id]) and the assistant's MCP tools
 * (src/lib/assistant/server.ts). Ownership always comes from the caller's identity,
 * never from the request body, and every write keeps the `version` check.
 */

/**
 * Creates an empty draft owned by `ownerId` and returns its id, or null when that id
 * already belongs to someone else. Retrying with the same id is harmless.
 */
export async function createDraft(options: {
  id: string;
  ownerId: string;
  email: string;
  website: string;
}): Promise<string | null> {
  const sql = solutionsSql();
  await sql`INSERT INTO founder_solutions(id,owner_id,data,editor_question) VALUES(${options.id},${options.ownerId},${JSON.stringify({ ...emptySolution, website: options.website, contactEmail: options.email })}::jsonb,'basics') ON CONFLICT(id) DO NOTHING`;
  const rows =
    await sql`SELECT id FROM founder_solutions WHERE id=${options.id} AND owner_id=${options.ownerId}`;
  return rows.length ? String(rows[0].id) : null;
}

export type SaveOutcome =
  | { ok: true; version: number; status: string }
  | { ok: false; code: 'incomplete' | 'stepMismatch' | 'invalidQuestion' | 'conflict' };

/**
 * Saves the data of a listing, or saves and submits it to review. The data must already
 * have passed `readSolutionData`. Submitting needs every required field
 * (`solutionErrors`); a submission is reviewed only in ops, never approved here.
 * A conflict means the version moved, the listing is pending review, or a screenshot id
 * does not belong to it.
 */
export async function saveSolution(options: {
  id: string;
  ownerId: string;
  version: number;
  data: SolutionData;
  step: number;
  question: string | null;
  submit: boolean;
}): Promise<SaveOutcome> {
  const { id, ownerId, version, data, step, submit } = options;
  if (options.question !== null && questionPhase(options.question) === undefined)
    return { ok: false, code: 'invalidQuestion' };
  if (submit && Object.keys(solutionErrors(data)).length) return { ok: false, code: 'incomplete' };
  if (options.question !== null && questionPhase(options.question) !== step)
    return { ok: false, code: 'stepMismatch' };
  const sql = solutionsSql();
  const status = submit ? 'pending' : 'draft';
  // Stored in solution_events and read by the Spanish-only ops backoffice too, so it
  // is persisted in the source locale rather than the requester's language.
  const message = submit ? solutionSystemMessages.submitted : 'Borrador guardado.';
  const imageIds = (data.screenshots ?? []).map(image => image.id);
  const result = await sql.transaction([
    sql`SELECT id FROM founder_solutions WHERE id=${id} AND owner_id=${ownerId} FOR UPDATE`,
    sql`WITH changed AS (UPDATE founder_solutions SET data=${JSON.stringify(data)}::jsonb,status=${status},step=${step},editor_question=${options.question},version=version+1,updated_at=now() WHERE id=${id} AND owner_id=${ownerId} AND version=${version} AND status IN ('draft','changes_requested','published','rejected') AND (SELECT count(*) FROM solution_media WHERE solution_id=${id} AND id=ANY(${imageIds}::uuid[]))=${imageIds.length} RETURNING *), event AS (INSERT INTO solution_events(solution_id,status,message,actor_id) SELECT id,status,${message},${ownerId} FROM changed WHERE ${submit} RETURNING id) SELECT * FROM changed`,
  ]);
  const rows = result[1];
  if (!rows.length) return { ok: false, code: 'conflict' };
  // The review team hears about a submission right away (SHCWS-139).
  if (submit && reviewAlertsEnabled())
    after(() => notifyReviewersOfSubmission(id).catch(() => undefined));
  return { ok: true, version: Number(rows[0].version), status: String(rows[0].status) };
}

/**
 * Applies a partial change to a listing's current data and validates the result exactly
 * as a save from the editor would (`readSolutionData`). `null` removes an optional field.
 * When the result is invalid, says which of the changed fields made it so, by trying each
 * one alone on top of the current data.
 */
export function applySolutionChanges(
  current: SolutionData,
  changes: Record<string, unknown>,
): { data: SolutionData } | { invalid: string[] } {
  const merge = (patch: Record<string, unknown>) => {
    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) delete next[key];
      else next[key] = value;
    }
    // `category` mirrors the first of `categories`, as in the editor.
    if (Array.isArray(patch.categories)) next.category = patch.categories[0] ?? '';
    return next;
  };
  const data = readSolutionData(merge(changes));
  if (data) return { data };
  const invalid = Object.keys(changes).filter(
    key => !readSolutionData(merge({ [key]: changes[key] })),
  );
  return { invalid: invalid.length ? invalid : Object.keys(changes) };
}
