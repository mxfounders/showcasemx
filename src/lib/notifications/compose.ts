import { renderEmailHtml } from './email-template';
import { createNoticeUnsubscribeToken, isUnsubscribable } from './unsubscribe-token';

/** What a notice says, before the shared shell: built per kind in server.ts. */
export type NoticeEmail = {
  subject: string;
  heading: string;
  button: string;
  paragraphs: string[];
  text: string;
};

/**
 * The final message for one notice: the branded HTML, the plain-text version and, for
 * notices that can be turned off, the one-click unsubscribe headers (RFC 8058) that
 * switch off that kind of notice for that account (SHCWS-161). Security notices link
 * nowhere but to the password reset: they cannot be turned off.
 */
export function composeNotice({
  origin,
  email,
  buttonHref,
  footerNote,
  category,
  accountId,
  secret,
}: {
  origin: string;
  email: NoticeEmail;
  buttonHref: string;
  footerNote: string;
  category: string;
  accountId: string;
  /** Tests pass one; the sender uses NEWSLETTER_UNSUBSCRIBE_SECRET. */
  secret?: string;
}): { html: string; text: string; headers?: Record<string, string> } {
  const preferences =
    category === 'security' ? undefined : `${origin}/es/account/settings/notifications`;
  const token = isUnsubscribable(category)
    ? createNoticeUnsubscribeToken(accountId, category, secret)
    : null;
  return {
    html: renderEmailHtml({
      origin,
      preheader: email.subject,
      heading: email.heading,
      paragraphs: email.paragraphs,
      button: { label: email.button, href: buttonHref },
      footerNote,
      preferencesHref: preferences,
    }),
    text: [
      email.text,
      `${email.button}: ${buttonHref}`,
      ...(preferences ? [`Preferencias de avisos: ${preferences}`] : []),
    ].join('\n\n'),
    ...(token
      ? {
          headers: {
            'List-Unsubscribe': `<${origin}/api/notifications/unsubscribe?token=${token}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      : {}),
  };
}
