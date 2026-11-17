/**
 * Reading and classifying where a visit came from (SHCWS-111, docs/attribution.md). The
 * browser sends only the raw signals of the page a visit started on — `utm_*`, `ref`,
 * the host (never the path) of the page that linked here and the kind of landing page —
 * and the server normalizes and classifies them here. Pure: no '@/' imports.
 */
import { channels, refs, utm, type Channel } from './conventions';

export const funnelSteps = ['visit', 'browse', 'listing', 'apply'] as const;
export type FunnelStep = (typeof funnelSteps)[number];

export const landingKinds = [
  'home',
  'catalog',
  'listing',
  'community',
  'blog',
  'apply',
  'review',
  'account',
  'auth',
  'info',
  'other',
] as const;
export type LandingKind = (typeof landingKinds)[number];

/** What a browser reports about the page its visit started on. */
export type RawTouch = {
  source?: string;
  medium?: string;
  campaign?: string;
  ref?: string;
  /** Host of the external page that linked here, never its path. */
  referrer?: string;
  landing?: LandingKind;
};

/** The normalized, classified origin of a visit: what is stored. */
export type Touch = {
  channel: Channel;
  source: string;
  medium: string;
  campaign: string;
  site: string;
  landing: LandingKind | '';
};

/**
 * A tag as stored: lowercase, no accents, only letters, digits, dot, dash and underscore,
 * 60 characters at most. Anything that looks like an email, a phone number or a link is
 * dropped, so a hand-made URL can never put a person in the counts.
 */
export function normalizeTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || raw.length > 200) return '';
  if (/@|:\/\/|\/|\\/.test(raw)) return '';
  // Ten digits in one run (spaces, dashes or dots between them) is a phone number; a date
  // such as a newsletter edition (2026-11-17) has eight.
  const runs = raw.match(/\d[\d\s().+-]*\d/g) ?? [];
  if (runs.some(run => run.replace(/\D/g, '').length >= 10)) return '';
  const tag = raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s+]+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return tag.slice(0, 60);
}

/** A hostname as stored: lowercase, no port, no leading www., never an IP address. */
export function normalizeHost(value: unknown): string {
  if (typeof value !== 'string') return '';
  const host = value.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!host || host.length > 100) return '';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return '';
  if (/^\d+(\.\d+){3}$/.test(host)) return '';
  if (!/[a-z]{2,}$/.test(host)) return '';
  return host.replace(/^www\./, '').replace(/^(m|l|lm)\.(?=[a-z0-9-]+\.[a-z]+)/, '');
}

/** The kind of page a path (with or without its locale) is. */
export function landingKind(path: string): LandingKind {
  const bare = path.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
  if (bare === '/') return 'home';
  if (/^\/(buscar|explorar|industria|colecciones)(\/|$)/.test(bare)) return 'catalog';
  if (/^\/soluciones\//.test(bare)) return 'listing';
  if (/^\/comunidad(\/|$)/.test(bare)) return 'community';
  if (/^\/(blog|changelog|nuevo)(\/|$)/.test(bare)) return 'blog';
  if (/^\/aplicar(\/|$)/.test(bare)) return 'apply';
  if (/^\/resenar\//.test(bare)) return 'review';
  if (/^\/account(\/|$)/.test(bare)) return 'account';
  if (
    /^\/(sign-in|sign-up|forgot-password|reset-password|verify-email|onboarding)(\/|$)/.test(bare)
  )
    return 'auth';
  if (
    /^\/(el-proyecto|faq|proceso|criterios|terminos|privacidad|cookies|contacto|anunciate|newsletter)(\/|$)/.test(
      bare,
    )
  )
    return 'info';
  return 'other';
}

/** A ref a page implies without one in its URL: a review invitation is an invitation. */
export function impliedRef(path: string): string | undefined {
  return landingKind(path) === 'review' ? refs.invite : undefined;
}

/** The steps a page counts for the funnels, besides the visit itself. */
export function pageSteps(path: string): FunnelStep[] {
  const kind = landingKind(path);
  return kind === 'catalog' ? ['browse'] : kind === 'apply' ? ['apply'] : [];
}

/** Validates what a browser sent. Unknown fields and malformed values are dropped. */
export function readTouch(value: unknown): RawTouch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const landing = landingKinds.includes(input.landing as LandingKind)
    ? (input.landing as LandingKind)
    : undefined;
  return {
    source: normalizeTag(input.source) || undefined,
    medium: normalizeTag(input.medium) || undefined,
    campaign: normalizeTag(input.campaign) || undefined,
    ref: normalizeTag(input.ref) || undefined,
    referrer: normalizeHost(input.referrer) || undefined,
    landing,
  };
}

/** Steps and touch of a funnel beacon, or null. Steps are deduplicated and known. */
export function readFunnel(value: unknown): { steps: FunnelStep[]; touch: RawTouch } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.steps)) return null;
  const steps = funnelSteps.filter(step => (input.steps as unknown[]).includes(step));
  const touch = readTouch(input.touch);
  if (!steps.length || !touch) return null;
  return { steps, touch };
}

// Hosts are matched on their last labels: `google.com.mx` and `www.google.es` are Google.
const ai: [RegExp, string][] = [
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
  [/(^|\.)claude\.ai$/, 'claude'],
  [/(^|\.)(gemini|bard)\.google\.com$/, 'gemini'],
  [/(^|\.)(copilot\.microsoft\.com|copilot\.cloud\.microsoft|edgeservices\.bing\.com)$/, 'copilot'],
  [/(^|\.)(deepseek\.com)$/, 'deepseek'],
  [/(^|\.)(grok\.com|x\.ai)$/, 'grok'],
  [/(^|\.)mistral\.ai$/, 'mistral'],
  [/(^|\.)meta\.ai$/, 'meta-ai'],
  [/(^|\.)(you\.com|phind\.com|poe\.com)$/, 'other-ai'],
];
const search: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'yahoo'],
  [/(^|\.)yandex\.[a-z.]+$/, 'yandex'],
  [/(^|\.)baidu\.com$/, 'baidu'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)search\.brave\.com$/, 'brave'],
  [/(^|\.)(startpage\.com|qwant\.com|kagi\.com|naver\.com|seznam\.cz)$/, 'other-search'],
];
const social: [RegExp, string][] = [
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/(^|\.)(threads\.net|threads\.com)$/, 'threads'],
  [/(^|\.)bsky\.app$/, 'bluesky'],
  [/(^|\.)producthunt\.com$/, 'producthunt'],
  [/(^|\.)news\.ycombinator\.com$/, 'hackernews'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'telegram'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest'],
];
const webmail: [RegExp, string][] = [
  [/(^|\.)mail\.google\.com$/, 'gmail'],
  [/(^|\.)(outlook\.live\.com|outlook\.office\.com|outlook\.office365\.com)$/, 'outlook'],
  [/(^|\.)mail\.yahoo\.com$/, 'yahoo-mail'],
  [/(^|\.)mail\.proton\.me$/, 'proton'],
];
// Sources some assistants add themselves (ChatGPT tags its links utm_source=chatgpt.com).
const aiSources: [RegExp, string][] = [
  [/^(chatgpt(\.com)?|openai(\.com)?)$/, 'chatgpt'],
  [/^perplexity(\.ai)?$/, 'perplexity'],
  [/^claude(\.ai)?$/, 'claude'],
  [/^(gemini|bard)(\.google\.com)?$/, 'gemini'],
  [/^copilot(\.microsoft\.com)?$/, 'copilot'],
];
const socialSources = new Set([
  'linkedin',
  'x',
  'twitter',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'reddit',
  'threads',
  'bluesky',
  'producthunt',
  'whatsapp',
  'telegram',
]);
const paidMedia = new Set([
  'cpc',
  'ppc',
  'paid',
  'paid-social',
  'paid_social',
  'display',
  'cpm',
  'ads',
]);
const socialMedia = new Set(['social', 'social-organic', 'organic-social', 'social-media']);
const ownHosts = new Set(['shwcs.site', 'ops.shwcs.site']);

const match = (list: [RegExp, string][], value: string) =>
  list.find(([pattern]) => pattern.test(value))?.[1];

/**
 * The channel of a visit, from the most specific signal to none:
 * `ref` (badge, invite or a partner's code) → `utm_*` (share, newsletter, email, paid,
 * AI sources, social, any other campaign) → the linking host (AI, webmail, search,
 * social, any other site) → direct.
 */
export function classifyTouch(raw: RawTouch | null | undefined): Touch {
  const touch = readTouch(raw ?? {}) ?? {};
  const site = touch.referrer && !ownHosts.has(touch.referrer) ? touch.referrer : '';
  const base = { site, landing: touch.landing ?? ('' as const) };
  const source = touch.source ?? '',
    medium = touch.medium ?? '',
    campaign = touch.campaign ?? '';
  const tagged = (channel: Channel, src = source) => ({
    channel,
    source: src,
    medium,
    campaign,
    ...base,
  });

  // A badge's site is the page that showed it: `site`, from the browser's referrer.
  if (touch.ref === refs.badge) return { ...tagged('badge', ''), medium: '', campaign: '' };
  if (touch.ref === refs.invite) return { ...tagged('invitation', 'invite') };
  if (touch.ref) return { ...tagged('referral', touch.ref) };

  if (source || medium || campaign) {
    // Links shared before the conventions were fixed said `utm_source=share` and the
    // platform as medium; both forms count as a share.
    if (medium === utm.share.medium) return tagged('share');
    if (source === 'share') return { ...tagged('share', medium), medium: utm.share.medium };
    if (source === utm.newsletter.source) return tagged('newsletter');
    if (medium === 'email' || medium === 'e-mail') return tagged('email');
    if (paidMedia.has(medium)) return tagged('paid');
    const assistant = match(aiSources, source);
    if (assistant) return tagged('ai', assistant);
    if (socialMedia.has(medium) || socialSources.has(source)) return tagged('social');
    if (medium === 'organic') return tagged('organic');
    return tagged('campaign');
  }

  if (site) {
    const empty = { medium: '', campaign: '', ...base };
    // Assistants and webmail first: gemini.google.com and mail.google.com are not search.
    const assistant = match(ai, site);
    if (assistant) return { channel: 'ai', source: assistant, ...empty };
    const mail = match(webmail, site);
    if (mail) return { channel: 'email', source: mail, ...empty };
    const engine = match(search, site);
    if (engine) return { channel: 'organic', source: engine, ...empty };
    const network = match(social, site);
    if (network) return { channel: 'social', source: network, ...empty };
    return { channel: 'referral', source: site, ...empty };
  }
  return { channel: 'direct', source: '', medium: '', campaign: '', ...base };
}

export function isChannel(value: unknown): value is Channel {
  return channels.includes(value as Channel);
}

/**
 * Why an account was created, from where its sign-up leads and whether its visit went
 * through /aplicar: 'founder' to publish, 'buyer' to save, contact or review.
 */
export function signupIntent(next: unknown, applied: boolean): 'founder' | 'buyer' | '' {
  const path = typeof next === 'string' ? next : '';
  if (applied || /^\/account\/solutions(\/new)?$/.test(path)) return 'founder';
  if (/^\/(account\/(contacts|saved|lists|alerts|reviews)|soluciones|resenar)(\/|\?|$)/.test(path))
    return 'buyer';
  return '';
}

/** A sign-up's origin as the form sends it, normalized and classified, or null. */
export function readSignupOrigin(
  value: unknown,
): (Touch & { intent: 'founder' | 'buyer' | '' }) | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const touch = readTouch(input.touch);
  if (!touch) return null;
  return { ...classifyTouch(touch), intent: signupIntent(input.next, input.applied === true) };
}

/** Bots that run scripts still say so in their user agent; their beacons are dropped. */
export function likelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|prerender|puppeteer|playwright|phantom|python-requests|curl|wget|httpclient|go-http/i.test(
    userAgent,
  );
}

/**
 * A sign-up origin kept for later, as Google's OAuth state stores it: the validated raw
 * form (a JSON string from the start link, or an object read back), or null.
 */
export function storableSignupOrigin(
  value: unknown,
): { touch: RawTouch; applied: boolean; next: string } | null {
  let input = value;
  if (typeof value === 'string') {
    if (value.length > 2000) return null;
    try {
      input = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const touch = readTouch(record.touch);
  if (!touch) return null;
  return {
    touch,
    applied: record.applied === true,
    next: typeof record.next === 'string' ? record.next.slice(0, 200) : '',
  };
}
