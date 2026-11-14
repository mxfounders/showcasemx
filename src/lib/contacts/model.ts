import { companySizes as solutionCompanySizes } from '@/lib/solutions/model';
import { localizedCompanySizes } from '@/lib/taxonomy';
import { isWorkEmailDomain } from '@/lib/reviews/model';
/**
 * Team-size and timeline values are stored verbatim in `contact_requests.details`, so they
 * never change. Each one has a stable key that the dictionary uses for its displayed label.
 */
export const companySizeOptions = {
  solo: 'Solo yo',
  small: '2–10 personas',
  medium: '11–50 personas',
  large: '51–200 personas',
  enterprise: 'Más de 200 personas',
} as const;
export type CompanySizeKey = keyof typeof companySizeOptions;
export const companySizes = Object.values(companySizeOptions);
/**
 * Team size on new requests uses the same scale listings declare (micro, pyme, mediana,
 * corporativo; SHCWS-64), so a buyer can see whether a listing is meant for them. Older
 * requests keep the legacy label they were sent with: «51–200 personas» straddles two
 * listing sizes, so they are shown as sent, never re-mapped.
 */
export const contactCompanySizes = solutionCompanySizes;
export function isContactCompanySize(value: string) {
  return (contactCompanySizes as readonly string[]).includes(value);
}
/** A stored size as people read it: the listing scale's label and range, or the legacy label. */
export function contactSizeLabel(
  value: string,
  locale: string,
  legacyLabels: Readonly<Record<CompanySizeKey, string>>,
) {
  const size = localizedCompanySizes(locale).find(item => item.value === value);
  return size
    ? `${size.label} (${size.range})`
    : storedOptionLabel(value, companySizeOptions, legacyLabels);
}
/** How a listing's declared sizes relate to the buyer's: the tri-state of §54. */
export function sizeFit(
  buyerSize: string,
  listingSizes: readonly string[] | undefined,
): 'declared' | 'any' | 'other' | 'unknown' {
  if (!isContactCompanySize(buyerSize) || listingSizes === undefined) return 'unknown';
  if (listingSizes.length === 0) return 'any';
  return listingSizes.includes(buyerSize) ? 'declared' : 'other';
}
export const timelineOptions = {
  exploring: 'Estoy explorando',
  month: 'Este mes',
  quarter: 'En 1–3 meses',
  later: 'Más adelante',
} as const;
export type TimelineKey = keyof typeof timelineOptions;
export const timelines = Object.values(timelineOptions);
/** Displayed label of a stored option value; an unknown legacy value is shown as stored. */
export function storedOptionLabel<Key extends string>(
  value: string,
  options: Readonly<Record<Key, string>>,
  labels: Readonly<Record<Key, string>>,
) {
  const key = (Object.keys(options) as Key[]).find(option => options[option] === value);
  return key ? labels[key] : value;
}
export const contactStatuses = ['new', 'conversation', 'closed', 'withdrawn'] as const;
export type ContactStatus = (typeof contactStatuses)[number];
export const consentVersion = 'contact-v1';
/**
 * Fixed messages stored in `contact_events` for the buyer's own actions. They stay in
 * Spanish in the database; the history shows them through the dictionary.
 */
export const contactSystemMessages = {
  created: 'Solicitud enviada con consentimiento.',
  withdrawn: 'El comprador retiró la solicitud.',
} as const;
export type ContactDetails = {
  name: string;
  company: string;
  size: string;
  timeline: string;
  budget: string;
  need: string;
};
const contactFields = {
  name: 100,
  company: 150,
  size: 40,
  timeline: 40,
  budget: 200,
  need: 2000,
} as const;
export function readContact(value: Record<string, unknown>): ContactDetails | null {
  const result = {} as ContactDetails;
  for (const key of Object.keys(contactFields) as (keyof ContactDetails)[]) {
    if (typeof value[key] !== 'string' || value[key].length > contactFields[key]) return null;
    result[key] = value[key].trim();
  }
  return result.name.length >= 2 &&
    result.company.length >= 2 &&
    result.need.length >= 20 &&
    isContactCompanySize(result.size) &&
    timelines.some(x => x === result.timeline)
    ? result
    : null;
}
export function isContactStatus(value: unknown): value is ContactStatus {
  return contactStatuses.some(status => status === value);
}
export function canTransition(
  current: ContactStatus,
  next: ContactStatus,
  actor: 'buyer' | 'recipient',
) {
  if (actor === 'buyer')
    return next === 'withdrawn' && (current === 'new' || current === 'conversation');
  return (
    (current === 'new' && (next === 'conversation' || next === 'closed')) ||
    (current === 'conversation' && next === 'closed') ||
    (current === 'closed' && next === 'conversation')
  );
}
export type ContactRequest = {
  id: string;
  buyer_id: string;
  recipient_id: string;
  solution_id: string;
  project_name: string;
  buyer_email: string;
  details: ContactDetails;
  status: ContactStatus;
  version: number;
  created_at: string;
  updated_at: string;
  /** The buyer account's current address and its verification, read with the request. */
  buyer_account_email: string | null;
  buyer_email_verified_at: string | null;
  /** Recipient-only: null whenever the buyer reads the request (SHCWS-22). */
  outcome: ContactOutcome | null;
  outcome_value: OutcomeValue | null;
  /** Recipient-only: whether the buyer did something the recipient has not opened yet. */
  unread: boolean;
};
/**
 * What came of a closed opportunity (SHCWS-22). Private to the recipient: never shown to
 * the buyer, never written as a contact event (events are visible to both and alert the
 * other side), and ops only reads aggregates.
 */
export const contactOutcomes = ['won', 'lost', 'not_fit'] as const;
export type ContactOutcome = (typeof contactOutcomes)[number];
/** Approximate value of a won deal, in US dollars, so totals compare across markets. */
export const outcomeValues = ['under_1k', '1k_5k', '5k_25k', '25k_100k', 'over_100k'] as const;
export type OutcomeValue = (typeof outcomeValues)[number];
/**
 * Reads an outcome sent with a close or a later correction. A value range is optional
 * and only makes sense for a won deal. Returns null when nothing usable was sent.
 */
export function readOutcome(
  outcome: unknown,
  value: unknown,
): { outcome: ContactOutcome; value: OutcomeValue | null } | null {
  if (!contactOutcomes.some(item => item === outcome)) return null;
  const chosen = outcome as ContactOutcome;
  if (value === undefined || value === null || value === '')
    return { outcome: chosen, value: null };
  if (chosen !== 'won' || !outcomeValues.some(item => item === value)) return null;
  return { outcome: chosen, value: value as OutcomeValue };
}
/**
 * How much the founder can trust the address that came with a request, with the same
 * levels as reviews: unverified, a verified address, or a verified address at a company
 * domain (not a free mailbox). It says nothing about the person's role or intent.
 */
export type BuyerSignal = 'unverified' | 'email' | 'work';
export function buyerSignal(
  request: Pick<ContactRequest, 'buyer_email' | 'buyer_account_email' | 'buyer_email_verified_at'>,
): BuyerSignal {
  if (!isBuyerEmailVerified(request)) return 'unverified';
  return isWorkEmailDomain(request.buyer_email.split('@').pop() ?? '') ? 'work' : 'email';
}
/** The first lines of a need for an inbox card: whitespace collapsed, cut at a word. */
export function needPreview(need: string, limit = 180) {
  const text = need.replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return (space > limit * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:–-]+$/, '') + '…';
}
/**
 * Whether the address sent with the request is proven to belong to the buyer: the account
 * verified its email and it is still the same address the request carried. A request whose
 * snapshot differs from the verified address says nothing about the one the founder sees.
 */
export function isBuyerEmailVerified(
  request: Pick<ContactRequest, 'buyer_email' | 'buyer_account_email' | 'buyer_email_verified_at'>,
) {
  return Boolean(
    request.buyer_email_verified_at &&
    request.buyer_account_email &&
    request.buyer_account_email.trim().toLowerCase() === request.buyer_email.trim().toLowerCase(),
  );
}
export type ContactEvent = {
  id: string;
  actor_id: string;
  status: ContactStatus;
  message: string;
  /** 'message' for a message in the conversation, 'status' for a status change (SHCWS-168). */
  kind: string;
  created_at: string;
};
/** Expected contact failures; the API maps each code to a message in the caller's locale. */
export type ContactErrorCode =
  | 'projectUnavailable'
  | 'ownProject'
  | 'recipientChanged'
  | 'createFailed'
  | 'requestUnavailable'
  | 'transitionUnavailable'
  | 'replyTooShort'
  | 'outcomeInvalid'
  | 'outcomeUnavailable'
  | 'stale';
export class ContactError extends Error {
  constructor(
    public status: number,
    public code: ContactErrorCode,
  ) {
    super(code);
    this.name = 'ContactError';
  }
}
