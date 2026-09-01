import { newsletterProfiles, newsletterRoles } from './newsletter';
export type AccountProfile = { name: string; organization: string; profile: string; role: string };
export function validateAccount(value: unknown): AccountProfile | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || typeof input.organization !== 'string') return null;
  const name = input.name.trim(), organization = input.organization.trim();
  if (!name || name.length > 100 || organization.length > 120) return null;
  const profile = newsletterProfiles.find(item => item.value === input.profile)?.value;
  const role = newsletterRoles.find(item => item.value === input.role)?.value;
  return profile && role ? { name, organization, profile, role } : null;
}
