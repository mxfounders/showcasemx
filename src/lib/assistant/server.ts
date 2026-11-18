import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { guardedFetch, readCapped } from '@/lib/net/guarded-fetch';
import { storageEnabled } from '@/lib/storage/blob';
import { localizedCapabilityLabel } from '@/lib/taxonomy';
import { solutionChecklist } from '@/lib/solutions/completeness';
import {
  companySizes,
  getSolutionCategories,
  isSolutionId,
  latestDecision,
  readSolutionData,
  safeSolutionUrl,
  solutionCapabilities,
  solutionCategories,
  solutionCompliance,
  solutionErrors,
  solutionIndustries,
  solutionIntegrations,
  solutionPriceBands,
  solutionPriceUnits,
  solutionPricingModels,
  solutionSetupTimes,
  maxSolutionScreenshots,
  type FounderSolution,
  type SolutionData,
} from '@/lib/solutions/model';
import { publicLinkKinds } from '@/lib/solutions/profile';
import { questionPhase } from '@/lib/solutions/questions';
import { getEvents, getOwnedSolutions, getSolution, solutionsSql } from '@/lib/solutions/server';
import { siteDraftAvailable } from '@/lib/solutions/site-draft';
import {
  reserveSiteDraft,
  runSiteDraft,
  type SiteDraftEvent,
} from '@/lib/solutions/site-draft-server';
import {
  SCREENSHOT_FILE_LIMIT,
  SCREENSHOT_INPUT_LIMIT,
  prepareScreenshot,
  screenshotCount,
  storeScreenshot,
} from '@/lib/solutions/screenshots';
import { normalizeWebsite } from '@/lib/solutions/website';
import { applySolutionChanges, createDraft, saveSolution } from '@/lib/solutions/writes';
import { logTokenEvent, type AssistantIdentity } from './tokens';
import type { AssistantTool } from './tools';

/**
 * The MCP server a founder's assistant talks to (SHCWS-152, docs/assistant-mcp.md). One
 * instance per HTTP request, bound to the token's account: there is no state between
 * requests. Every tool works only on that account's own listings and goes through the same
 * functions as the editor (src/lib/solutions/writes.ts, screenshots.ts, site-draft-server.ts):
 * same validation, same `version` check, same per-account limits, never `catalog_key`, and
 * never a publication — a submission waits for the review team in ops.
 */

const AGENT = 'shwcs/1.0 (+https://shwcs.site; descarga una captura pedida por su fundador)';
const IMAGE_TIMEOUT = 8000;
const capabilityIds = solutionCapabilities.map(item => item.id) as [string, ...string[]];

/** A tool's outcome: what the assistant reads, and a short code for the token's log. */
type Outcome = {
  ok: boolean;
  code?: string;
  solutionId?: string | null;
  body: Record<string, unknown>;
};
const done = (body: Record<string, unknown>, solutionId?: string | null): Outcome => ({
  ok: true,
  solutionId,
  body,
});
const refused = (
  code: string,
  message: string,
  solutionId?: string | null,
  extra: Record<string, unknown> = {},
): Outcome => ({ ok: false, code, solutionId, body: { error: code, message, ...extra } });

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

/** The fields an assistant may write: the editor's own lists, never `catalog_key`. */
function changesSchema(text: Record<string, string>) {
  const link = z.object({ label: z.enum(publicLinkKinds), url: z.string() });
  const optional = <T extends z.ZodType>(schema: T, description: string) =>
    schema.nullable().optional().describe(description);
  return z
    .strictObject({
      name: z.string().optional().describe(text.name),
      kind: z.enum(['Software', 'Agencia', 'Servicio']).optional().describe(text.kind),
      categories: z.array(z.enum(solutionCategories)).optional().describe(text.categories),
      problem: z.string().optional().describe(text.problem),
      audience: z.string().optional().describe(text.audience),
      website: z.string().optional().describe(text.website),
      contactEmail: z.string().optional().describe(text.contactEmail),
      capabilities: optional(z.array(z.enum(capabilityIds)), text.capabilities),
      industries: optional(z.array(z.enum(solutionIndustries)), text.industries),
      companySizes: optional(z.array(z.enum(companySizes)), text.companySizes),
      scope: optional(z.string(), text.scope),
      notFor: optional(z.string(), text.notFor),
      pricing: optional(z.string(), text.pricing),
      pricingModel: optional(z.array(z.enum(solutionPricingModels)), text.pricingModel),
      priceFrom: optional(z.number(), text.priceFrom),
      priceCurrency: optional(z.string(), text.priceCurrency),
      priceUnit: optional(z.enum(solutionPriceUnits), text.priceUnit),
      priceBand: optional(z.enum(solutionPriceBands), text.priceBand),
      setupTime: optional(z.enum(solutionSetupTimes), text.setupTime),
      implementation: optional(z.string(), text.implementation),
      integrationKeys: optional(z.array(z.enum(solutionIntegrations)), text.integrationKeys),
      integrations: optional(z.string(), text.integrations),
      support: optional(z.string(), text.support),
      compliance: optional(z.array(z.enum(solutionCompliance)), text.compliance),
      evidence: optional(z.string(), text.evidence),
      evidenceUrl: optional(z.string(), text.evidenceUrl),
      demoUrl: optional(z.string(), text.demoUrl),
      screenshots: optional(
        z.array(z.object({ id: z.string(), caption: z.string() })),
        text.screenshots,
      ),
      founders: optional(
        z.array(
          z.object({
            name: z.string(),
            role: z.string(),
            bio: z.string(),
            links: z.array(link),
          }),
        ),
        text.founders,
      ),
      projectLinks: optional(z.array(link), text.projectLinks),
      hideSiteImage: optional(z.boolean(), text.hideSiteImage),
      coverSource: optional(z.enum(['site', 'screenshot']), text.coverSource),
      otherCategory: optional(z.string(), text.otherCategory),
    })
    .describe(text.changes);
}

export async function assistantServer(options: { identity: AssistantIdentity; origin: string }) {
  const { identity, origin } = options;
  const locale = identity.locale;
  const dict = await getDictionary(locale);
  const text = dict.assistant.server;
  const m = text.messages;
  const validation = dict.solutionEditor.validation;
  const statuses = dict.solutionEditor.statuses;
  const editUrl = (id: string) => `${origin}/${locale}/account/solutions/${id}`;

  const server = new McpServer(
    { name: 'shwcs', title: 'shwcs', version: '1.0.0' },
    { instructions: text.instructions },
  );

  /** Runs a tool, writes the token's log line and turns the outcome into a tool result. */
  const run =
    <A>(tool: AssistantTool, handler: (args: A) => Promise<Outcome>) =>
    async (args: A): Promise<CallToolResult> => {
      let outcome: Outcome;
      try {
        outcome = await handler(args);
      } catch {
        outcome = refused('failed', m.failed);
      }
      await logTokenEvent(identity, {
        tool,
        solutionId: outcome.solutionId,
        outcome: outcome.ok ? 'ok' : 'error',
        code: outcome.code,
      }).catch(() => undefined);
      return {
        content: [{ type: 'text', text: JSON.stringify(outcome.body, null, 2) }],
        structuredContent: outcome.body,
        isError: !outcome.ok,
      };
    };

  /** Errors that keep a listing from being submitted, in the token's language. */
  const missing = (data: SolutionData) =>
    Object.entries(solutionErrors(data)).map(([field, code]) => ({
      field,
      message: validation[code as keyof typeof validation],
    }));

  /** One of the account's own listings, or null. Never anyone else's. */
  const own = async (id: string) => (isSolutionId(id) ? getSolution(id, identity.accountId) : null);
  const current = (row: FounderSolution) =>
    readSolutionData(row.data) ?? (row.data as SolutionData);

  server.registerTool(
    'estado_de_mis_fichas',
    {
      title: text.tools.estado_de_mis_fichas.title,
      description: text.tools.estado_de_mis_fichas.description,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run('estado_de_mis_fichas', async () => {
      const rows = await getOwnedSolutions(identity.accountId);
      const listings = await Promise.all(
        rows.map(async row => {
          const data = current(row);
          const decision = ['changes_requested', 'rejected'].includes(row.status)
            ? latestDecision(row.status, await getEvents(row.id))
            : null;
          return {
            id: row.id,
            name: data.name || null,
            status: row.status,
            statusLabel: statuses[row.status].label,
            version: Number(row.version),
            updatedAt: row.updated_at,
            readyToSubmit: Object.keys(solutionErrors(data)).length === 0,
            missingBlocks: solutionChecklist(data, locale)
              .filter(item => !item.done)
              .map(item => item.label),
            reviewComment: decision?.message ?? null,
            editUrl: editUrl(row.id),
            publicUrl:
              row.published_data && row.slug ? `${origin}/${locale}/soluciones/${row.slug}` : null,
          };
        }),
      );
      return done({ message: listings.length ? m.list : m.empty, listings });
    }),
  );

  server.registerTool(
    'crear_borrador',
    {
      title: text.tools.crear_borrador.title,
      description: text.tools.crear_borrador.description,
      inputSchema: {
        sitio_web: z.string().max(500).optional().describe(text.tools.crear_borrador.website),
        preparar_con_ia: z.boolean().optional().describe(text.tools.crear_borrador.useAi),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    run('crear_borrador', async ({ sitio_web, preparar_con_ia }) => {
      let website = '';
      if (sitio_web?.trim()) {
        website = safeSolutionUrl(normalizeWebsite(sitio_web) ?? undefined) ?? '';
        if (!website) return refused('invalidWebsite', m.invalidWebsite);
      }
      if (!(await securityLimit('solution-create', identity.accountId, 20)))
        return refused('rateLimited', m.rateLimited);
      const id = await createDraft({
        id: randomUUID(),
        ownerId: identity.accountId,
        email: identity.email,
        website,
      });
      if (!id) return refused('failed', m.failed);
      let message: string = m.created;
      let site: Record<string, unknown> | null = null;
      if (website && preparar_con_ia !== false) {
        const errors = dict.solutionEditor.siteDraft.errors;
        const outcome = await draftFromSite(id, website, locale);
        if (outcome.stage === 'done') {
          message = outcome.partial
            ? m.createdPartial
            : fill(m.createdFromSite, { filled: outcome.filled });
          site = { read: true, filled: outcome.filled, partial: outcome.partial };
        } else {
          const reason = errors[outcome.code];
          message = fill(m.siteNotRead, { reason });
          site = { read: false, reason: outcome.code };
        }
      }
      const row = await own(id);
      return done(
        {
          message,
          id,
          version: row ? Number(row.version) : 0,
          status: 'draft',
          site,
          editUrl: editUrl(id),
          next: 'ver_lo_que_falta',
        },
        id,
      );
    }),
  );

  /**
   * The same path as POST /api/solutions/[id]/site-draft, without the progress stream:
   * the same hourly limit, the same daily quota and the same writer.
   */
  async function draftFromSite(
    solutionId: string,
    website: string,
    lang: 'es' | 'en',
  ): Promise<
    | Extract<SiteDraftEvent, { stage: 'done' }>
    | {
        stage: 'error';
        code:
          Extract<SiteDraftEvent, { stage: 'error' }>['code'] | 'unavailable' | 'tooFast' | 'limit';
      }
  > {
    if (!siteDraftAvailable()) return { stage: 'error', code: 'unavailable' };
    if (!(await securityLimit('solution-site-draft', identity.accountId, 5, 20)))
      return { stage: 'error', code: 'tooFast' };
    const attemptId = await reserveSiteDraft(solutionId, identity.accountId, website);
    if (!attemptId) return { stage: 'error', code: 'limit' };
    const seen: { last: SiteDraftEvent | null } = { last: null };
    await runSiteDraft({
      attemptId,
      solutionId,
      ownerId: identity.accountId,
      website,
      locale: lang,
      send: event => {
        seen.last = event;
      },
    });
    const final = seen.last;
    if (final?.stage === 'done' || final?.stage === 'error') return final;
    return { stage: 'error', code: 'failed' };
  }

  server.registerTool(
    'ver_lo_que_falta',
    {
      title: text.tools.ver_lo_que_falta.title,
      description: text.tools.ver_lo_que_falta.description,
      inputSchema: {
        ficha_id: z.string().describe(text.tools.ver_lo_que_falta.solution),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run('ver_lo_que_falta', async ({ ficha_id }) => {
      const row = await own(ficha_id);
      if (!row) return refused('notFound', m.notFound);
      const data = current(row);
      const errors = missing(data);
      const categories = getSolutionCategories(data);
      const [events, media] = await Promise.all([
        getEvents(row.id),
        solutionsSql()`SELECT m.id::text, m.width, m.height,
            COALESCE(s.data->'screenshots','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('id',m.id::text)) AS in_listing
          FROM solution_media m JOIN founder_solutions s ON s.id = m.solution_id
          WHERE m.solution_id = ${row.id} AND s.owner_id = ${identity.accountId} ORDER BY m.created_at`,
      ]);
      const decision = latestDecision(row.status, events);
      return done(
        {
          message: errors.length ? m.missing : m.ready,
          id: row.id,
          status: row.status,
          statusLabel: statuses[row.status].label,
          version: Number(row.version),
          editable: row.status !== 'pending',
          readyToSubmit: errors.length === 0,
          missingToSubmit: errors,
          checklist: solutionChecklist(data, locale).map(item => ({
            block: item.key,
            label: item.label,
            hint: item.hint,
            done: item.done,
          })),
          validCapabilities: solutionCapabilities
            .filter(item => categories.includes(item.category))
            .map(item => ({
              id: item.id,
              category: item.category,
              label: localizedCapabilityLabel(item.id, locale),
            })),
          uploadedScreenshots: media.map(item => ({
            id: String(item.id),
            width: Number(item.width),
            height: Number(item.height),
            inListing: Boolean(item.in_listing),
          })),
          reviewComment: decision?.message ?? null,
          publishedVersionLive: Boolean(row.published_data),
          data,
          editUrl: editUrl(row.id),
        },
        row.id,
      );
    }),
  );

  /** Saves new data on top of the version the assistant read, keeping the editor's place. */
  async function save(row: FounderSolution, version: number, data: SolutionData, submit: boolean) {
    const question =
      submit || row.editor_question === null || row.editor_question === undefined
        ? null
        : String(row.editor_question);
    const keep = question !== null && questionPhase(question) === Number(row.step);
    return saveSolution({
      id: row.id,
      ownerId: identity.accountId,
      version,
      data,
      // Submitting lands on the review screen, as from the editor.
      step: submit ? 3 : Number(row.step),
      question: submit ? 'review' : keep ? question : null,
      submit,
    });
  }

  const conflict = async (id: string, solutionId: string) => {
    const latest = await own(id);
    if (latest?.status === 'pending') return refused('pending', m.pending, solutionId);
    return refused(
      'conflict',
      fill(m.conflict, { version: latest ? Number(latest.version) : '?' }),
      solutionId,
      { currentVersion: latest ? Number(latest.version) : null },
    );
  };

  server.registerTool(
    'actualizar_borrador',
    {
      title: text.tools.actualizar_borrador.title,
      description: text.tools.actualizar_borrador.description,
      inputSchema: {
        ficha_id: z.string().describe(text.tools.actualizar_borrador.solution),
        version: z.number().int().min(0).describe(text.tools.actualizar_borrador.version),
        cambios: changesSchema({
          ...text.tools.actualizar_borrador.fields,
          changes: text.tools.actualizar_borrador.changes,
        }),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    run('actualizar_borrador', async ({ ficha_id, version, cambios }) => {
      const row = await own(ficha_id);
      if (!row) return refused('notFound', m.notFound);
      if (row.status === 'pending') return refused('pending', m.pending, row.id);
      if (!(await securityLimit('solution-update', identity.accountId, 180)))
        return refused('rateLimited', m.rateLimited, row.id);
      const changed = applySolutionChanges(current(row), cambios as Record<string, unknown>);
      if ('invalid' in changed)
        return refused(
          'invalidFields',
          fill(m.invalidFields, { fields: changed.invalid.join(', ') }),
          row.id,
          { fields: changed.invalid },
        );
      const saved = await save(row, version, changed.data, false);
      if (!saved.ok) return conflict(row.id, row.id);
      const errors = missing(changed.data);
      return done(
        {
          message: fill(m.updated, { version: saved.version }),
          id: row.id,
          version: saved.version,
          status: saved.status,
          readyToSubmit: errors.length === 0,
          missingToSubmit: errors,
        },
        row.id,
      );
    }),
  );

  server.registerTool(
    'subir_captura',
    {
      title: text.tools.subir_captura.title,
      description: text.tools.subir_captura.description,
      inputSchema: {
        ficha_id: z.string().describe(text.tools.subir_captura.solution),
        url_imagen: z.string().max(2000).describe(text.tools.subir_captura.url),
        descripcion: z.string().max(180).optional().describe(text.tools.subir_captura.caption),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    run('subir_captura', async ({ ficha_id, url_imagen, descripcion }) => {
      const row = await own(ficha_id);
      if (!row) return refused('notFound', m.notFound);
      if (row.status === 'pending') return refused('pending', m.pending, row.id);
      if (!(await securityLimit('solution-media', identity.accountId, 30)))
        return refused('rateLimited', m.rateLimited, row.id);
      if (!storageEnabled()) return refused('storageUnavailable', m.storageUnavailable, row.id);
      if ((await screenshotCount(row.id)) >= SCREENSHOT_FILE_LIMIT)
        return refused('fileLimit', m.fileLimit, row.id);
      // The same SSRF rules as the site's cover: public http(s) only, every redirect
      // re-checked, no private or metadata addresses (src/lib/net/guarded-fetch.ts).
      const url = safeSolutionUrl(url_imagen.trim());
      const fetched = url
        ? await guardedFetch(
            url,
            'image/png,image/jpeg,image/webp,image/*;q=0.8',
            IMAGE_TIMEOUT,
            AGENT,
          )
        : null;
      const input = fetched ? await readCapped(fetched.response, SCREENSHOT_INPUT_LIMIT) : null;
      if (!input) return refused('imageUnreachable', m.imageUnreachable, row.id);
      const prepared = await prepareScreenshot(input);
      if (prepared === 'staticImageOnly') return refused(prepared, m.staticImageOnly, row.id);
      if (prepared === 'imageTooDetailed') return refused(prepared, m.imageTooDetailed, row.id);
      if (prepared === 'unreadable') return refused(prepared, m.unreadable, row.id);
      const stored = await storeScreenshot({
        solutionId: row.id,
        ownerId: identity.accountId,
        input,
        prepared,
      });
      if (stored === 'uploadConflict') return refused(stored, m.uploadConflict, row.id);
      if (stored === 'uploadUnconfirmed') return refused(stored, m.uploadUnconfirmed, row.id);
      const screenshot = { id: stored.id, width: stored.width, height: stored.height };
      const caption = descripcion?.trim();
      if (!caption)
        return done({ message: m.uploadedOnly, screenshot, addedToListing: false }, row.id);
      // Adding it is a save like any other, on the version just read.
      const fresh = await own(row.id);
      const data = fresh ? current(fresh) : null;
      if (!fresh || !data || fresh.status === 'pending')
        return done({ message: m.uploadedNotAttached, screenshot, addedToListing: false }, row.id);
      if ((data.screenshots?.length ?? 0) >= maxSolutionScreenshots)
        return done({ message: m.uploadedFull, screenshot, addedToListing: false }, row.id);
      const changed = applySolutionChanges(data, {
        screenshots: [...(data.screenshots ?? []), { id: stored.id, caption }],
      });
      const saved =
        'data' in changed ? await save(fresh, Number(fresh.version), changed.data, false) : null;
      if (!saved?.ok)
        return done({ message: m.uploadedNotAttached, screenshot, addedToListing: false }, row.id);
      return done(
        {
          message: fill(m.uploaded, { version: saved.version }),
          screenshot,
          addedToListing: true,
          version: saved.version,
        },
        row.id,
      );
    }),
  );

  server.registerTool(
    'enviar_a_revision',
    {
      title: text.tools.enviar_a_revision.title,
      description: text.tools.enviar_a_revision.description,
      inputSchema: {
        ficha_id: z.string().describe(text.tools.enviar_a_revision.solution),
        version: z.number().int().min(0).describe(text.tools.enviar_a_revision.version),
        confirmo: z.literal(true).describe(text.tools.enviar_a_revision.confirm),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    run('enviar_a_revision', async ({ ficha_id, version }) => {
      const row = await own(ficha_id);
      if (!row) return refused('notFound', m.notFound);
      if (row.status === 'pending') return refused('pending', m.pending, row.id);
      if (!(await securityLimit('solution-update', identity.accountId, 180)))
        return refused('rateLimited', m.rateLimited, row.id);
      const data = current(row);
      const errors = missing(data);
      if (errors.length)
        return refused('incomplete', m.incomplete, row.id, { missingToSubmit: errors });
      const saved = await save(row, version, data, true);
      if (!saved.ok)
        return saved.code === 'incomplete'
          ? refused('incomplete', m.incomplete, row.id, { missingToSubmit: missing(data) })
          : conflict(row.id, row.id);
      return done(
        {
          message: m.submitted,
          id: row.id,
          version: saved.version,
          status: saved.status,
          statusLabel: statuses.pending.label,
          editUrl: editUrl(row.id),
        },
        row.id,
      );
    }),
  );

  return server;
}
