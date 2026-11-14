import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { hashToken } from '@/lib/auth/password';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { cookieOptions, readUserAgent, sessionCookie, sessionSeconds } from '@/lib/auth/session';
import { credentialErrors } from '@/lib/auth/validation';
import { recoveryConfig } from '@/lib/auth/recovery';
import { rememberDevice, signInNotice } from '@/lib/auth/security-notices';
import {
  consumeMagicLink,
  forgetMagicLink,
  issueMagicLink,
  magicLinkMinutes,
  validMagicToken,
} from '@/lib/auth/magic-link';
import { resolveReviewInvite } from '@/lib/reviews/invitations';
import { sendEmail } from '@/lib/notifications/server';
import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';
import { failure, solutionBody } from '@/lib/solutions/http';
import { captureServerEvent } from '@/lib/analytics/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export const runtime = 'nodejs';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * Sign-in by email from a review invitation (SHCWS-132; rules in src/lib/auth/magic-link.ts).
 *
 * - send { email, invite }: emails a link back to the invitation page. The answer is the
 *   same whether or not the address has an account, so the form never reveals one.
 * - consume { token }: posted by the invitation page with the token from the link's
 *   fragment. Opens a session, creating the account (already verified) if there was none.
 */
export async function POST(request: NextRequest) {
  const locale = requestLocale(request);
  const dict = (await getDictionary(locale)).reviews;
  const t = dict.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const body = await solutionBody(request);
    if (!body) return failure(t.invalidRequest, 400);

    if (body.action === 'send') {
      const config = recoveryConfig();
      if (!config) return failure(t.magicUnavailable, 503);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (credentialErrors(email, 'placeholder').email) return failure(t.magicEmail, 400);
      const invite =
        typeof body.invite === 'string' ? await resolveReviewInvite(body.invite) : null;
      if (!invite) return failure(t.inviteInvalid, 409);
      // Same shape as recovery (SHCWS-171), plus a cap per invitation link: spraying one
      // shared link at many inboxes runs out on that link, not on everyone's invitations.
      const network = requestIdentity(request.headers);
      if (
        !(await securityLimit('magic-link-address', network, 10)) ||
        !(await securityLimit('magic-link-pair', `${email}|${network}`, 3)) ||
        !(await securityLimit('magic-link', email, 10)) ||
        !(await securityLimit('magic-link-invite', String(body.invite), 30))
      )
        return failure(t.magicRateLimited, 429);
      const token = await issueMagicLink(email, invite.solutionId);
      // A suspended account gets the same answer and no email.
      if (!token) return ok();
      const link = `${config.origin}/${locale}/resenar/${encodeURIComponent(String(body.invite))}#acceso=${token}`;
      const text = dict.invite.email;
      const name = invite.name;
      try {
        await sendEmail({
          to: email,
          subject: text.subject.replace('{name}', name),
          text: [
            text.heading.replace('{name}', name),
            '',
            text.body.replace('{name}', name),
            link,
            '',
            text.expires.replace('{minutes}', String(magicLinkMinutes)),
            text.ignore,
          ].join('\n'),
          html: renderEmailHtml({
            origin: config.origin,
            preheader: text.subject.replace('{name}', name),
            heading: text.heading.replace('{name}', name),
            paragraphs: [
              escapeHtml(text.body.replace('{name}', name)),
              escapeHtml(text.expires.replace('{minutes}', String(magicLinkMinutes))),
            ],
            button: { label: text.button, href: link },
            footerNote: text.ignore,
          }),
        });
      } catch {
        await forgetMagicLink(token).catch(() => undefined);
        return failure(t.magicUnavailable, 503);
      }
      return ok();
    }

    if (body.action === 'consume') {
      if (!validMagicToken(body.token)) return failure(t.magicInvalid, 400);
      if (!(await securityLimit('magic-link-consume', requestIdentity(request.headers), 20)))
        return failure(t.rateLimited, 429);
      const result = await consumeMagicLink(body.token);
      if (result.status === 'totp') return failure(t.magicTotp, 409);
      if (result.status === 'password') return failure(t.magicPassword, 409);
      if (result.status === 'invalid') return failure(t.magicInvalid, 400);

      // Same shape as a password sign-in: the session is tied to the password hash read
      // above, so a password change in between leaves nothing open.
      const sql = authSql();
      const session = randomBytes(32).toString('hex');
      const previous = request.cookies.get(sessionCookie)?.value ?? '';
      const userAgent = readUserAgent(request.headers);
      const opened = await sql.transaction([
        sql`SELECT id FROM auth_accounts WHERE id=${result.accountId} FOR UPDATE`,
        sql`DELETE FROM auth_sessions WHERE token_hash=${hashToken(previous)} OR (account_id=${result.accountId} AND expires_at<=now())`,
        sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at,user_agent)
          SELECT ${hashToken(session)},id,now()+${sessionSeconds}*interval '1 second',${userAgent}
          FROM auth_accounts WHERE id=${result.accountId} AND password_hash=${result.passwordHash} AND suspended_at IS NULL
          RETURNING account_id`,
      ]);
      if (!opened[2].length) return failure(t.magicInvalid, 400);
      const accountId = result.accountId;
      captureServerEvent(request, accountId, result.created ? 'account_registered' : 'signed_in', {
        method: 'magic_link',
      });
      // A new account's first device is not news; an existing one hears about a new device.
      after(async () => {
        if (result.created) await rememberDevice(accountId, userAgent).catch(() => undefined);
        else await signInNotice(accountId, userAgent).catch(() => undefined);
      });
      const response = ok({ created: result.created });
      response.cookies.set(sessionCookie, session, cookieOptions);
      return response;
    }

    return failure(t.invalidRequest, 400);
  } catch {
    return failure(t.magicFailed, 503);
  }
}
