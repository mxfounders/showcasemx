// Values only, in display order. Labels live in the dictionaries
// (`dict.newsletter.profiles` / `dict.newsletter.roles`), keyed by these values.
export const newsletterProfiles = [
  { value: 'founder' },
  { value: 'buyer' },
  { value: 'both' },
  { value: 'exploring' },
] as const;
export const newsletterRoles = [
  { value: 'leadership' },
  { value: 'product_tech' },
  { value: 'sales_marketing' },
  { value: 'operations' },
  { value: 'finance_procurement' },
  { value: 'other' },
] as const;
export type NewsletterProfile = (typeof newsletterProfiles)[number]['value'];
export type NewsletterRole = (typeof newsletterRoles)[number]['value'];
export function validateNewsletter(
  value: unknown,
): { email: string; profile: NewsletterProfile; role: NewsletterRole } | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.consent !== true || input.company || typeof input.email !== 'string') return null;
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const profile = newsletterProfiles.find(item => item.value === input.profile)?.value;
  const role = newsletterRoles.find(item => item.value === input.role)?.value;
  if (!profile || !role) return null;
  return { email, profile, role };
}
