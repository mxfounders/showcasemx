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
    companySizes.some(x => x === result.size) &&
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
};
export type ContactEvent = {
  id: string;
  actor_id: string;
  status: ContactStatus;
  message: string;
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
