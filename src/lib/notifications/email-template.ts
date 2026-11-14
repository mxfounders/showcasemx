// Shared branded shell for every transactional email (password reset, email
// verification, account/solution/contact avisos). Table-based layout, inline
// styles only, no external stylesheet or custom @font-face: Gmail/Outlook/
// Apple Mail strip or ignore most of that, so the system sans-serif stack and
// brand color are what actually survive across clients — not the site's
// literal typeface. Every send still ships a plain-text version alongside
// this (Resend `text` field); this is additive, not a replacement.

const BRAND_BLUE = '#365DC4';
const BRAND_BLUE_SOFT = '#E4EBFC';
const BG = '#f5f5f4';
const TEXT = '#1c1917';
const MUTED = '#78716c';
const BORDER = '#e7e5e4';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type EmailButton = { label: string; href: string };

// `paragraphs` are trusted HTML fragments written by callers in this codebase
// (may contain inline links); any interpolated value from the database or a
// request body must be run through escapeHtml() before being placed inside
// one. `heading` and `footerNote` are escaped here since they are almost
// always plain copy, not markup.
//
// The header is the official wordmark (CLAUDE.md §35) as a PNG served from the site,
// sized for 2x screens. Its alt text is styled as the old text logo, so a client that
// blocks images still shows «shwcs» in the brand blue.
export const CONTACT_ADDRESS = 'hola@shwcs.site';
const LOGO_PATH = '/brand/shwcs-logo-1.png'; // 961×298
const LOGO_HEIGHT = 26;
const LOGO_WIDTH = Math.round((961 / 298) * LOGO_HEIGHT);

export function renderEmailHtml(opts: {
  origin: string;
  preheader?: string;
  heading: string;
  paragraphs: string[];
  button?: EmailButton;
  footerNote?: string;
  /** «Preferencias de avisos»: every notice that can be turned off links to it (SHCWS-161). */
  preferencesHref?: string;
  /** The <html lang>; the copy itself is still Spanish until accounts store a language (SHCWS-25). */
  lang?: 'es' | 'en';
}): string {
  const { origin, preheader, heading, paragraphs, button, footerNote, preferencesHref } = opts;
  const host = origin.replace(/^https?:\/\//, '');
  const footerLink = `color:${MUTED};text-decoration:underline;`;
  return `<!doctype html>
<html lang="${opts.lang === 'en' ? 'en' : 'es'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>shwcs</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;">
<a href="${origin}" style="text-decoration:none;"><img src="${origin}${LOGO_PATH}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="shwcs" style="display:block;border:0;outline:none;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;font-size:20px;line-height:${LOGO_HEIGHT}px;font-weight:700;letter-spacing:-0.02em;color:${BRAND_BLUE};"></a>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:24px;padding:36px 32px;">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.35;font-weight:600;letter-spacing:-0.02em;color:${TEXT};">${escapeHtml(heading)}</h1>
${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${p}</p>`).join('')}
${button ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td style="border-radius:9999px;background:${BRAND_BLUE_SOFT};"><a href="${button.href}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:${BRAND_BLUE};text-decoration:none;border-radius:9999px;">${escapeHtml(button.label)}</a></td></tr></table>` : ''}
</td></tr>
<tr><td style="padding:20px 6px 0;">
<p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">${footerNote ? `${escapeHtml(footerNote)}<br>` : ''}${preferencesHref ? `<a href="${preferencesHref}" style="${footerLink}">Preferencias de avisos</a> · ` : ''}<a href="mailto:${CONTACT_ADDRESS}" style="${footerLink}">${CONTACT_ADDRESS}</a><br>shwcs · <a href="${origin}" style="color:${MUTED};">${host}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
