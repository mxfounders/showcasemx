import { createHash, randomBytes } from 'node:crypto';
import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { renderEmailHtml, escapeHtml } from '@/lib/notifications/email-template';
import { sendEmail } from '@/lib/notifications/server';
import { getDictionary } from '@/i18n/get-dictionary';
import type { NewsletterProfile, NewsletterRole } from '@/lib/newsletter';
import { newsletterRecipientAllowed } from './guard';

/**
 * Double opt-in (SHCWS-124). The public form never changes an existing subscriber: it only
 * asks the owner of the address to confirm, and what they asked for (profile, role,
 * language, consent version) travels on the token until they do. A token is 32 random
 * bytes; only its SHA-256 is stored, it lasts seven days and is consumed once.
 */
export const newsletterConsentVersion = 'newsletter-v3';
export const confirmationDays = 7;
/** At most one confirmation email per address in this window, whoever fills the form. */
export const confirmationResendMinutes = 10;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function confirmationEmail({
  origin,
  locale,
  token,
  copy,
}: {
  origin: string;
  locale: 'es' | 'en';
  token: string;
  copy: {
    subject: string;
    heading: string;
    paragraphs: readonly string[];
    button: string;
    footer: string;
  };
}) {
  // The fragment keeps the token out of server logs and referrers (same as the password reset).
  const link = `${origin}/${locale}/newsletter/confirm#token=${token}`;
  return {
    subject: copy.subject,
    text: [...copy.paragraphs, '', `${copy.button}: ${link}`, '', copy.footer].join('\n'),
    html: renderEmailHtml({
      origin,
      lang: locale,
      preheader: copy.subject,
      heading: copy.heading,
      paragraphs: copy.paragraphs.map(escapeHtml),
      button: { label: copy.button, href: link },
      footerNote: copy.footer,
      footerLinks: [],
    }),
  };
}

async function deliver(
  email: string,
  locale: 'es' | 'en',
  token: string,
  purpose: 'subscribe' | 'reconfirm',
) {
  const config = recoveryConfig();
  if (!config) throw Error('Email unavailable');
  const mail = (await getDictionary(locale)).newsletter.mail;
  const message = confirmationEmail({
    origin: config.origin,
    locale,
    token,
    copy: purpose === 'reconfirm' ? mail.reconfirm : mail.confirm,
  });
  await sendEmail({
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    idempotencyKey: `nl-confirm:${hash(token).slice(0, 40)}`,
  });
}

/**
 * Sends a confirmation unless the address is already confirmed and active, or one was sent in
 * the last ten minutes. The caller answers the same in every case, so the form never tells
 * whether an address is on the list. Throws when the email could not be sent: the claim is
 * released so the person can try again.
 */
export async function requestNewsletterConfirmation({
  email,
  profile,
  role,
  locale,
}: {
  email: string;
  profile: NewsletterProfile;
  role: NewsletterRole;
  locale: 'es' | 'en';
}): Promise<'sent' | 'skipped'> {
  if (!recoveryConfig()) throw Error('Email unavailable');
  const sql = authSql();
  const token = randomBytes(32).toString('base64url');
  // A new address starts unconfirmed with what it asked for; an existing one is untouched.
  await sql`INSERT INTO newsletter_subscribers (email, consent_version, profile, role, locale)
    VALUES (${email}, ${newsletterConsentVersion}, ${profile}, ${role}, ${locale})
    ON CONFLICT (email) DO NOTHING`;
  // The claim is what makes two quick submissions send one email.
  const claimed = await sql`UPDATE newsletter_subscribers SET confirm_sent_at = now()
    WHERE email = ${email} AND NOT (confirmed_at IS NOT NULL AND unsubscribed_at IS NULL)
      AND (confirm_sent_at IS NULL OR confirm_sent_at < now() - make_interval(mins => ${confirmationResendMinutes}))
    RETURNING email`;
  if (!claimed.length) return 'skipped';
  await sql`INSERT INTO newsletter_confirmations (token_hash, email, purpose, profile, role, locale, consent_version, expires_at)
    VALUES (${hash(token)}, ${email}, 'subscribe', ${profile}, ${role}, ${locale}, ${newsletterConsentVersion}, now() + make_interval(days => ${confirmationDays}))`;
  try {
    await deliver(email, locale, token, 'subscribe');
    return 'sent';
  } catch (error) {
    await sql.transaction([
      sql`DELETE FROM newsletter_confirmations WHERE token_hash = ${hash(token)}`,
      sql`UPDATE newsletter_subscribers SET confirm_sent_at = NULL WHERE email = ${email}`,
    ]);
    throw error;
  }
}

/**
 * Consumes a token once: confirms the address (re-subscribing it if it had left), applies the
 * profile, role and language it was requested with, and burns any other pending token for the
 * same address. Null when the token is unknown, used or expired.
 */
export async function confirmNewsletterToken(token: unknown) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = hash(token);
  const rows = await authSql()`WITH used AS (
      UPDATE newsletter_confirmations SET consumed_at = now()
      WHERE token_hash = ${tokenHash} AND consumed_at IS NULL AND expires_at > now()
      RETURNING email, profile, role, locale, consent_version
    ), confirmed AS (
      UPDATE newsletter_subscribers s SET confirmed_at = now(), unsubscribed_at = NULL,
        unsubscribe_reason = NULL, profile = COALESCE(u.profile, s.profile),
        role = COALESCE(u.role, s.role), locale = u.locale, consent_version = u.consent_version
      FROM used u WHERE s.email = u.email RETURNING s.email, s.locale
    ), others AS (
      UPDATE newsletter_confirmations SET consumed_at = now()
      WHERE email IN (SELECT email FROM used) AND consumed_at IS NULL AND token_hash <> ${tokenHash}
    )
    SELECT email, locale FROM confirmed`;
  return rows.length ? { email: String(rows[0].email), locale: String(rows[0].locale) } : null;
}

/**
 * Subscribers from before double opt-in (confirmed_at NULL, never asked): one email asking
 * them to confirm. Started by an ops admin, never by the cron. Outside production only
 * @resend.dev test addresses are written to (guard.ts).
 */
export async function sendReconfirmations({ limit = 200 }: { limit?: number } = {}) {
  if (!recoveryConfig()) return { available: false, sent: 0, failed: 0, remaining: 0 };
  const sql = authSql();
  const candidates =
    await sql`SELECT email, COALESCE(locale, 'es') AS locale FROM newsletter_subscribers
    WHERE confirmed_at IS NULL AND unsubscribed_at IS NULL AND confirm_sent_at IS NULL
    ORDER BY created_at LIMIT ${Math.min(Math.max(limit, 1), 500)}`;
  let sent = 0,
    failed = 0;
  for (const row of candidates) {
    const email = String(row.email);
    if (!newsletterRecipientAllowed(email)) continue;
    const locale = row.locale === 'en' ? 'en' : 'es';
    const token = randomBytes(32).toString('base64url');
    const [claimed] = await sql`WITH claimed AS (
        UPDATE newsletter_subscribers SET confirm_sent_at = now()
        WHERE email = ${email} AND confirmed_at IS NULL AND unsubscribed_at IS NULL AND confirm_sent_at IS NULL
        RETURNING email
      )
      INSERT INTO newsletter_confirmations (token_hash, email, purpose, locale, consent_version, expires_at)
      SELECT ${hash(token)}, email, 'reconfirm', ${locale}, ${newsletterConsentVersion}, now() + make_interval(days => ${confirmationDays})
      FROM claimed RETURNING email`;
    if (!claimed) continue;
    try {
      await deliver(email, locale, token, 'reconfirm');
      sent++;
    } catch {
      failed++;
      await sql.transaction([
        sql`DELETE FROM newsletter_confirmations WHERE token_hash = ${hash(token)}`,
        sql`UPDATE newsletter_subscribers SET confirm_sent_at = NULL WHERE email = ${email}`,
      ]);
    }
  }
  const [{ remaining }] =
    await sql`SELECT count(*)::int AS remaining FROM newsletter_subscribers WHERE confirmed_at IS NULL AND unsubscribed_at IS NULL AND confirm_sent_at IS NULL`;
  return { available: true, sent, failed, remaining: Number(remaining) };
}
