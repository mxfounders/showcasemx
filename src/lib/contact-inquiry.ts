/**
 * Option values stored in `contact_inquiries`. Their labels live in the `contactForm`
 * dictionary, keyed by value, so the form and the staff email stay consistent.
 */
export const inquiryReasons = [
  { value: 'find' },
  { value: 'submit' },
  { value: 'partnership' },
  { value: 'press' },
  { value: 'support' },
  { value: 'other' },
] as const;

export const inquiryUrgencies = [
  { value: 'exploring' },
  { value: 'month' },
  { value: 'soon' },
] as const;

export type InquiryReason = (typeof inquiryReasons)[number]['value'];
export type InquiryUrgency = (typeof inquiryUrgencies)[number]['value'];
export type ContactInquiry = {
  reason: InquiryReason;
  name: string;
  email: string;
  organization: string;
  role: string;
  website: string;
  message: string;
  urgency: InquiryUrgency;
};

function text(value: unknown, maximum: number) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\r\n/g, '\n');
  return normalized.length <= maximum ? normalized : '';
}

export function validateContactInquiry(input: unknown): ContactInquiry | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (value.companyFax) return null;
  const reason = inquiryReasons.find(item => item.value === value.reason)?.value;
  const urgency = inquiryUrgencies.find(item => item.value === value.urgency)?.value;
  const name = text(value.name, 80);
  const email = text(value.email, 254).toLowerCase();
  const organization = text(value.organization, 120);
  const role = text(value.role, 100);
  const message = text(value.message, 2400);
  let website = text(value.website, 500);
  if (
    !reason ||
    !urgency ||
    name.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    organization.length < 2 ||
    message.length < 20 ||
    value.consent !== true
  )
    return null;
  if (website) {
    try {
      const url = new URL(website);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname.includes('.')
      )
        return null;
      website = url.href;
    } catch {
      return null;
    }
  }
  return { reason, name, email, organization, role, website, message, urgency };
}
