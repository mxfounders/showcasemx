import { NextRequest } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId, safeSolutionUrl } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { siteDraftAvailable } from '@/lib/solutions/site-draft';
import { reserveSiteDraft, runSiteDraft } from '@/lib/solutions/site-draft-server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';
// Reading up to five pages plus one model call; well under a minute in practice.
export const maxDuration = 180;

/**
 * The owner asks for a draft prepared from their own website. Answers with
 * newline-delimited JSON, one line per stage (reading → read → drafting → done or
 * error), so the page can show real progress instead of a spinner. Guards that can
 * fail before any work starts answer with an ordinary JSON error instead.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const locale = requestLocale(request);
  const t = (await getDictionary(locale)).solutionEditor.siteDraft.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useForm, 403);
  if (!isSolutionId(params.id)) return failure(t.notFound, 404);
  let attemptId: string | null;
  let website: string;
  let ownerId: string;
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.session, 401);
    ownerId = account.id;
    const body = await solutionBody(request);
    const url =
      typeof body?.url === 'string' && body.url.length <= 500
        ? safeSolutionUrl(body.url.trim())
        : null;
    if (!url) return failure(t.invalidUrl, 400);
    website = url;
    if (!siteDraftAvailable()) return failure(t.unavailable, 503);
    if (!(await securityLimit('solution-site-draft', account.id, 5, 20)))
      return failure(t.tooFast, 429);
    const [solution] =
      await solutionsSql()`SELECT status FROM founder_solutions WHERE id = ${params.id} AND owner_id = ${account.id}`;
    if (!solution) return failure(t.notFound, 404);
    if (!['draft', 'changes_requested'].includes(String(solution.status)))
      return failure(t.notEditable, 409);
    attemptId = await reserveSiteDraft(params.id, account.id, website);
    if (!attemptId) return failure(t.limit, 429);
  } catch {
    return failure(t.failed, 503);
  }
  const reserved = attemptId;
  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the founder closes the tab the draft is still written; they find it in
      // Mis soluciones. Only the progress lines stop.
      await runSiteDraft({
        attemptId: reserved,
        solutionId: params.id,
        ownerId,
        website,
        locale,
        send: event => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            open = false;
          }
        },
      });
      if (open) controller.close();
    },
    cancel() {
      open = false;
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
