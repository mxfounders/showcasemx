/**
 * Fixed tagging conventions for links into shwcs (SHCWS-111, docs/attribution.md). Every
 * link shwcs builds or hands out uses these helpers, so a visit can say where it came
 * from without cookies. Pure: no '@/' imports, shared by the client, the server and tests.
 *
 *   Canal          utm_source                         utm_medium   utm_campaign            ref
 *   Newsletter     newsletter                         email        edición AAAA-MM-DD      —
 *   Avisos         shwcs                              email        tipo de aviso           —
 *   Redes (propias) linkedin | x | instagram | …      social       campaña libre           —
 *   Compartir      link | native | linkedin | whatsapp | x  share   listing | list | article —
 *   Insignia       —                                  —            —                       badge
 *   Invitación     —                                  —            —                       invite
 *   Referidos      —                                  —            —                       código del socio
 *
 * Links from a listing to the project's own site are the outbound side and live in
 * src/lib/solutions/outbound.ts (`utm_source=shwcs`, `utm_medium=listing|sponsored`).
 */

/** Where a visit came from, from the most specific signal to none. */
export const channels = [
  'direct',
  'organic',
  'ai',
  'social',
  'newsletter',
  'email',
  'badge',
  'share',
  'invitation',
  'referral',
  'paid',
  'campaign',
] as const;
export type Channel = (typeof channels)[number];

export const utm = {
  newsletter: { source: 'newsletter', medium: 'email' },
  notice: { source: 'shwcs', medium: 'email' },
  social: { medium: 'social' },
  share: { medium: 'share' },
} as const;

export const refs = { badge: 'badge', invite: 'invite' } as const;

/**
 * Links from a listing to the project's own site (SHCWS-19): shwcs is the source and the
 * medium says whether the visit came from a paid slot. Applied in outbound.ts.
 */
export const outbound = { source: 'shwcs', media: ['listing', 'sponsored'] } as const;

/** Where a shared link points: the campaign of a share. */
export type ShareKind = 'listing' | 'list' | 'article';

/** The tags a link carries. Empty values are left out. */
export type LinkTags = {
  source?: string;
  medium?: string;
  campaign?: string;
  ref?: string;
};

/**
 * Adds the tags to an absolute or root-relative URL. A URL that already carries `utm_*`
 * or `ref` keeps them: whoever tagged it chose how to read that visit. A fragment stays
 * at the end. Anything unparsable comes back as is.
 */
export function tagUrl(href: string, tags: LinkTags): string {
  let url: URL;
  const relative = href.startsWith('/') && !href.startsWith('//');
  try {
    url = new URL(href, relative ? 'https://shwcs.invalid' : undefined);
  } catch {
    return href;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return href;
  const keys = [...url.searchParams.keys()].map(key => key.toLowerCase());
  if (keys.some(key => key.startsWith('utm_') || key === 'ref')) return href;
  if (tags.source) url.searchParams.set('utm_source', tags.source);
  if (tags.medium) url.searchParams.set('utm_medium', tags.medium);
  if (tags.campaign) url.searchParams.set('utm_campaign', tags.campaign);
  if (tags.ref) url.searchParams.set('ref', tags.ref);
  return relative ? url.pathname + url.search + url.hash : url.href;
}

/** A link someone shares from shwcs: the platform is the source, `share` the medium. */
export function shareUrl(href: string, platform: string, kind: ShareKind): string {
  return tagUrl(href, { source: platform, medium: utm.share.medium, campaign: kind });
}

/** The link around the badge a founder embeds on their own site. */
export function badgeUrl(href: string): string {
  return tagUrl(href, { ref: refs.badge });
}

/** A link inside a notice email; the campaign is the kind of notice. */
export function noticeUrl(href: string, campaign: string): string {
  return tagUrl(href, { ...utm.notice, campaign });
}

/** A link inside a newsletter edition (YYYY-MM-DD, or the edition's slug). */
export function newsletterUrl(href: string, edition: string): string {
  return tagUrl(href, { ...utm.newsletter, campaign: edition });
}

/** A link posted on shwcs's own social profiles. */
export function socialUrl(href: string, network: string, campaign?: string): string {
  return tagUrl(href, { source: network, medium: utm.social.medium, campaign });
}
