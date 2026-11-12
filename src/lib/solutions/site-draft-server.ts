import { randomUUID } from 'node:crypto';
import { solutionsSql } from './server';
import { readSolutionData, type SolutionData } from './model';
import { readSite, type SiteReadFailure, type SiteReading } from './site-reader';
import {
  SITE_DRAFT_MODEL,
  anthropicDraftGenerator,
  mergeSiteDraft,
  readDraftOutput,
  siteBasics,
  siteDraftSystem,
  siteDraftUser,
  type DraftGenerator,
  type DraftSources,
  type GeneratedDraft,
} from './site-draft';

/** Attempts that reached the model, per account and overall, in any 24 hours. */
export const SITE_DRAFT_DAILY_LIMIT = 5;
export const SITE_DRAFT_GLOBAL_DAILY_LIMIT = 300;
const editable = ['draft', 'changes_requested'];

export type SiteDraftEvent =
  | { stage: 'reading' }
  | { stage: 'read'; pages: number }
  | { stage: 'drafting' }
  | { stage: 'done'; filled: number; partial: boolean }
  | { stage: 'error'; code: SiteReadFailure | 'notEditable' | 'failed' };

/**
 * Reserves one attempt against the daily quota. Returns null when the account (or
 * the whole site) is over it. Two simultaneous requests can both pass the count by
 * one; the hourly securityLimit in the route keeps that window small.
 */
export async function reserveSiteDraft(solutionId: string, ownerId: string, website: string) {
  const sql = solutionsSql();
  const id = randomUUID();
  const rows = await sql`INSERT INTO solution_site_drafts (id, solution_id, owner_id, website)
    SELECT ${id}, ${solutionId}, ${ownerId}, ${website}
    WHERE (SELECT count(*) FROM solution_site_drafts WHERE owner_id = ${ownerId}
             AND created_at > now() - interval '1 day' AND (model IS NOT NULL OR status = 'running')) < ${SITE_DRAFT_DAILY_LIMIT}
      AND (SELECT count(*) FROM solution_site_drafts
             WHERE created_at > now() - interval '1 day' AND (model IS NOT NULL OR status = 'running')) < ${SITE_DRAFT_GLOBAL_DAILY_LIMIT}
    RETURNING id`;
  return rows.length ? id : null;
}

async function writeDraft(
  solutionId: string,
  ownerId: string,
  patch: Partial<SolutionData>,
): Promise<{ applied: Partial<SolutionData> } | 'notEditable'> {
  const sql = solutionsSql();
  // Optimistic concurrency, as in the editor's PATCH: if the founder saved in another
  // tab while the model was writing, merge again over their newer version once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const [row] =
      await sql`SELECT data, version, status FROM founder_solutions WHERE id = ${solutionId} AND owner_id = ${ownerId}`;
    if (!row || !editable.includes(String(row.status))) return 'notEditable';
    const current = readSolutionData(row.data) ?? (row.data as SolutionData);
    const { data, applied } = mergeSiteDraft(current, patch);
    const changed = await sql`WITH changed AS (
        UPDATE founder_solutions SET data = ${JSON.stringify(data)}::jsonb, version = version + 1,
          step = 0, editor_question = 'identity', updated_at = now()
        WHERE id = ${solutionId} AND owner_id = ${ownerId} AND version = ${Number(row.version)}
          AND status IN ('draft', 'changes_requested')
        RETURNING id, status),
      event AS (INSERT INTO solution_events (solution_id, status, message, actor_id)
        SELECT id, status, 'Borrador preparado con IA a partir del sitio.', ${ownerId} FROM changed)
      SELECT id FROM changed`;
    if (changed.length) return { applied };
  }
  return 'notEditable';
}

async function finish(
  attemptId: string,
  status: 'done' | 'partial' | 'failed',
  details: {
    failure?: string;
    suggested?: Partial<SolutionData>;
    sources?: DraftSources;
    generated?: GeneratedDraft;
  } = {},
) {
  const sql = solutionsSql();
  const generated = details.generated?.ok ? details.generated : null;
  await sql`UPDATE solution_site_drafts SET status = ${status}, failure = ${details.failure ?? null},
      suggested = ${JSON.stringify(details.suggested ?? {})}::jsonb, sources = ${JSON.stringify(details.sources ?? {})}::jsonb,
      model = COALESCE(${generated?.model ?? null}, model), input_tokens = ${generated?.inputTokens ?? null},
      output_tokens = ${generated?.outputTokens ?? null}, finished_at = now()
    WHERE id = ${attemptId}`;
}

/**
 * Reads the site, asks the model and writes the result into the draft, reporting
 * each stage through `send`. Never throws: a failure becomes an `error` event and
 * a `failed` row. The reader and the generator are parameters so tests can run the
 * whole path without the network or the API.
 */
export async function runSiteDraft(options: {
  attemptId: string;
  solutionId: string;
  ownerId: string;
  website: string;
  locale: string;
  send: (event: SiteDraftEvent) => void;
  reader?: (website: string) => ReturnType<typeof readSite>;
  generator?: DraftGenerator;
}) {
  const { attemptId, solutionId, ownerId, website, locale, send } = options;
  const reader = options.reader ?? readSite;
  const generator = options.generator ?? anthropicDraftGenerator;
  try {
    send({ stage: 'reading' });
    const reading = await reader(website);
    if (!reading.ok) {
      await finish(attemptId, 'failed', { failure: reading.failure });
      send({ stage: 'error', code: reading.failure });
      return;
    }
    const site: SiteReading = reading.site;
    send({ stage: 'read', pages: site.pages.length });
    // From here the attempt counts towards the daily quota.
    await solutionsSql()`UPDATE solution_site_drafts SET model = ${SITE_DRAFT_MODEL} WHERE id = ${attemptId}`;
    send({ stage: 'drafting' });
    const generated = await generator({
      system: siteDraftSystem(locale),
      user: siteDraftUser(site),
    });
    const basics = siteBasics(site);
    const fromModel = generated.ok
      ? readDraftOutput(generated.output, site)
      : { patch: {}, sources: {} };
    const patch: Partial<SolutionData> = { ...basics.patch, ...fromModel.patch, website };
    const written = await writeDraft(solutionId, ownerId, patch);
    if (written === 'notEditable') {
      await finish(attemptId, 'failed', { failure: 'notEditable', generated });
      send({ stage: 'error', code: 'notEditable' });
      return;
    }
    // The website is what the founder typed, not a suggestion: it never gets the mark.
    const suggested = Object.fromEntries(
      Object.entries(written.applied).filter(([field]) => field !== 'website'),
    ) as Partial<SolutionData>;
    const allSources: DraftSources = { ...basics.sources, ...fromModel.sources };
    const sources = Object.fromEntries(
      Object.entries(allSources).filter(([field]) => field in suggested),
    ) as DraftSources;
    const partial = !generated.ok;
    await finish(attemptId, partial ? 'partial' : 'done', {
      failure: generated.ok ? undefined : generated.failure,
      suggested,
      sources,
      generated,
    });
    // `category` mirrors `categories`; count the question once.
    const filled = Object.keys(suggested).filter(field => field !== 'category').length;
    send({ stage: 'done', filled, partial });
  } catch {
    await finish(attemptId, 'failed', { failure: 'failed' }).catch(() => undefined);
    send({ stage: 'error', code: 'failed' });
  }
}

/** The latest draft prepared for a solution, for the editor's "from your site" marks. */
export async function getSiteDraftMarks(solutionId: string, ownerId: string) {
  const sql = solutionsSql();
  const [row] = await sql`SELECT website, suggested, sources, status FROM solution_site_drafts
    WHERE solution_id = ${solutionId} AND owner_id = ${ownerId} AND status IN ('done', 'partial')
    ORDER BY created_at DESC LIMIT 1`;
  if (!row) return null;
  return {
    website: String(row.website),
    partial: row.status === 'partial',
    suggested: (row.suggested ?? {}) as Partial<SolutionData>,
    sources: (row.sources ?? {}) as Record<string, string>,
  };
}
export type SiteDraftMarks = NonNullable<Awaited<ReturnType<typeof getSiteDraftMarks>>>;
