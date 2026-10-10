import { companySizes } from '@/lib/solutions/model';
import { isCountryCode } from '@/lib/countries';

/**
 * Verified reviews of a published solution (docs/reviews.md).
 *
 * Shared by the API, the server queries and the form: validation returns stable error
 * codes that the `reviews` dictionary translates, the same pattern as the other
 * validators (§63). Nothing here is tied to one market — the reviewer's country is a
 * plain ISO 3166-1 code and the verification levels work for any email.
 */

export const reviewUsageDurations = ['trial', 'lt6m', '6to12m', '1to2y', 'gt2y'] as const;
export type ReviewUsageDuration = (typeof reviewUsageDurations)[number];

export const reviewReportReasons = ['fake', 'conflict', 'abuse', 'spam', 'other'] as const;
export type ReviewReportReason = (typeof reviewReportReasons)[number];

export const reviewLimits = {
  name: 60,
  headline: [5, 120],
  useCase: [20, 600],
  pros: [20, 1500],
  cons: [20, 1500],
  reply: 1500,
  reportDetails: [10, 2000],
} as const;

export type ReviewInput = {
  name: string;
  rating: number;
  recommends: boolean;
  headline: string;
  useCase: string;
  pros: string;
  cons: string;
  usageDuration: ReviewUsageDuration;
  companySize: (typeof companySizes)[number] | null;
  country: string | null;
};

export type ReviewField = keyof ReviewInput;
export type ReviewError = { field: ReviewField; code: 'required' | 'length' | 'invalid' };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : null);

export function readReview(
  input: unknown,
): { ok: true; review: ReviewInput } | { ok: false; error: ReviewError } {
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const fail = (field: ReviewField, code: ReviewError['code']) =>
    ({ ok: false, error: { field, code } }) as const;
  const sized = (field: ReviewField, [min, max]: readonly [number, number]) => {
    const value = text(body[field]);
    if (!value) return fail(field, 'required');
    if (value.length < min || value.length > max) return fail(field, 'length');
    return value;
  };

  const name = text(body.name);
  if (!name) return fail('name', 'required');
  if (name.length > reviewLimits.name) return fail('name', 'length');
  if (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5)
    return fail('rating', 'required');
  if (typeof body.recommends !== 'boolean') return fail('recommends', 'required');
  const headline = sized('headline', reviewLimits.headline);
  if (typeof headline !== 'string') return headline;
  const useCase = sized('useCase', reviewLimits.useCase);
  if (typeof useCase !== 'string') return useCase;
  const pros = sized('pros', reviewLimits.pros);
  if (typeof pros !== 'string') return pros;
  const cons = sized('cons', reviewLimits.cons);
  if (typeof cons !== 'string') return cons;
  const usageDuration = body.usageDuration;
  if (!reviewUsageDurations.some(value => value === usageDuration))
    return fail('usageDuration', 'required');
  const companySize = body.companySize === '' || body.companySize == null ? null : body.companySize;
  if (companySize !== null && !companySizes.some(value => value === companySize))
    return fail('companySize', 'invalid');
  const country = body.country === '' || body.country == null ? null : body.country;
  if (country !== null && (typeof country !== 'string' || !isCountryCode(country)))
    return fail('country', 'invalid');

  return {
    ok: true,
    review: {
      name,
      rating: Number(body.rating),
      recommends: body.recommends,
      headline,
      useCase,
      pros,
      cons,
      usageDuration: usageDuration as ReviewUsageDuration,
      companySize: companySize as ReviewInput['companySize'],
      country: country as string | null,
    },
  };
}

/** A founder's public answer; an empty string removes it. */
export function readReply(value: unknown): string | null | undefined {
  if (typeof value !== 'string') return undefined;
  const reply = value.trim();
  if (!reply) return null;
  return reply.length <= reviewLimits.reply ? reply : undefined;
}

export function readReviewReport(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const details = text(body.details);
  const [min, max] = reviewLimits.reportDetails;
  if (!reviewReportReasons.some(reason => reason === body.reason)) return null;
  if (!details || details.length < min || details.length > max) return null;
  return { reason: body.reason as ReviewReportReason, details };
}

/*
 * Verification levels. Computed when reading — from the author's account, never stored
 * on the review — so verifying an email later upgrades every review that person wrote.
 *
 * - unverified: saved, visible only to its author until the email is confirmed.
 * - email: confirmed address (the minimum for a public review).
 * - work: confirmed address on a company domain rather than a free mailbox.
 * - customer: confirmed address plus a receipt from the vendor checked with a public
 *   authority (in Mexico, a CFDI the SAT reports as vigente; docs/compliance.md).
 */
export const reviewLevels = ['email', 'work', 'customer'] as const;
export type ReviewLevel = (typeof reviewLevels)[number];

/** How much one review moves the ranking per star, by level. Published in /criterios. */
export const reviewWeights: Record<ReviewLevel, number> = { email: 1, work: 1.5, customer: 3 };

/**
 * Free mailbox providers, matched on the full domain. The pattern catches the country
 * variants of the big ones (hotmail.co.uk, yahoo.com.mx, outlook.es…).
 */
export const freeEmailDomains = [
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'mail.com',
  'zoho.com',
  'zohomail.com',
  'tutanota.com',
  'tuta.io',
  'hey.com',
  'fastmail.com',
  'ymail.com',
  'rocketmail.com',
  'prodigy.net.mx',
  'qq.com',
  '163.com',
  '126.com',
  'naver.com',
  'web.de',
  't-online.de',
  'orange.fr',
  'free.fr',
  'libero.it',
  'uol.com.br',
  'bol.com.br',
  'terra.com.br',
] as const;
export const freeEmailPattern = '^(hotmail|outlook|live|yahoo|gmx|yandex)\\.[a-z.]+$';
const freePattern = new RegExp(freeEmailPattern);

export function isWorkEmailDomain(domain: string) {
  const value = domain.toLowerCase();
  return !(freeEmailDomains as readonly string[]).includes(value) && !freePattern.test(value);
}

export function reviewLevel(
  emailDomain: string,
  verified: boolean,
  proven = false,
): ReviewLevel | 'unverified' {
  if (!verified) return 'unverified';
  if (proven) return 'customer';
  return isWorkEmailDomain(emailDomain) ? 'work' : 'email';
}

/**
 * Someone writing from the vendor's own domain (cordhq.app reviewing cordhq.app, or a
 * subdomain of it) has a conflict of interest. Free mailboxes never match.
 */
export function conflictsWithWebsite(emailDomain: string, websiteHost: string | null) {
  if (!websiteHost || !isWorkEmailDomain(emailDomain)) return false;
  const email = emailDomain.toLowerCase();
  const site = websiteHost.toLowerCase().replace(/^www\./, '');
  return email === site || email.endsWith(`.${site}`) || site.endsWith(`.${email}`);
}
