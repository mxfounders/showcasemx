import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { BriefError, briefConsentVersion, readBrief, readProposal } from '@/lib/briefs/model';
import {
  chooseExisting,
  closeBrief,
  createBrief,
  createProposal,
  matchBriefs,
} from '@/lib/briefs/server';
import { deliverNotifications } from '@/lib/notifications/server';
import { captureServerEvent } from '@/lib/analytics/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * «Publica tu necesidad» (SHCWS-58). `create` and `close` belong to the buyer, `propose`
 * to a founder whose listing matched, `choose-existing` to the buyer choosing a founder
 * they already talk to (a new conversation opens through /api/contacts with `briefId`).
 * Same origin and a session; the account is always the session, never the body.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).briefs.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  const json = (body: Record<string, unknown>) =>
    NextResponse.json({ ok: true, ...body }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.id !== 'string' || !isSolutionId(body.id))
      return failure(t.invalid, 400);
    const id = body.id;
    if (body.action === 'create') {
      const brief = readBrief(body);
      if (!brief || body.consent !== true || body.consentVersion !== briefConsentVersion)
        return failure(t.incomplete, 400);
      // A brief is sent to several founders at once: only from a confirmed address.
      const [row] =
        await authSql()`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
      if (!row?.email_verified_at) return failure(t.verifyEmail, 403);
      if (!(await securityLimit('brief-create', account.id, 10))) return failure(t.limit, 429);
      const status = await createBrief(id, brief, account.id);
      if (status === 'created') {
        const notices = await matchBriefs([id]);
        // Founders hear now, not at the next daily cron; the cron still retries.
        if (notices.length)
          after(() => deliverNotifications({ ids: notices }).catch(() => undefined));
        captureServerEvent(request, account.id, 'brief_created', {
          categories: brief.categories.length,
          matches: notices.length,
        });
      }
      return json({ id });
    }
    if (body.action === 'close') {
      if (!(await securityLimit('brief-update', account.id, 60))) return failure(t.limit, 429);
      await closeBrief(id, account.id);
      return json({ id });
    }
    if (body.action === 'propose') {
      const proposal = readProposal(body);
      if (!proposal || typeof body.briefId !== 'string' || !isSolutionId(body.briefId))
        return failure(t.proposalIncomplete, 400);
      if (!(await securityLimit('brief-propose', account.id, 30))) return failure(t.limit, 429);
      const notices = await createProposal(id, body.briefId, proposal, account.id);
      if (notices.length)
        after(() => deliverNotifications({ ids: notices }).catch(() => undefined));
      captureServerEvent(request, account.id, 'brief_proposal_sent', {});
      return json({ id });
    }
    if (body.action === 'choose-existing') {
      if (typeof body.proposalId !== 'string' || !isSolutionId(body.proposalId))
        return failure(t.invalid, 400);
      if (!(await securityLimit('brief-update', account.id, 60))) return failure(t.limit, 429);
      const contact = await chooseExisting(id, body.proposalId, account.id);
      return json({ id, contactId: contact });
    }
    return failure(t.invalid, 400);
  } catch (error) {
    if (error instanceof BriefError) return failure(t[error.code], error.status);
    return failure(t.unavailable, 503);
  }
}
