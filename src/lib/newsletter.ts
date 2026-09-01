export const newsletterProfiles = [
  { value: 'founder', label: 'Soy fundador', detail: 'Construyo o vendo una solución.' },
  { value: 'buyer', label: 'Soy comprador', detail: 'Busco soluciones para mi empresa.' },
  { value: 'both', label: 'Un poco de ambos', detail: 'Construyo y también busco soluciones.' },
  { value: 'exploring', label: 'Estoy explorando', detail: 'Quiero conocer lo que se está creando.' },
] as const;
export const newsletterRoles = [
  { value: 'leadership', label: 'Fundador / Dirección' },
  { value: 'product_tech', label: 'Producto / Tecnología' },
  { value: 'sales_marketing', label: 'Ventas / Marketing' },
  { value: 'operations', label: 'Operaciones' },
  { value: 'finance_procurement', label: 'Finanzas / Compras' },
  { value: 'other', label: 'Otro rol' },
] as const;
export type NewsletterProfile = typeof newsletterProfiles[number]['value'];
export type NewsletterRole = typeof newsletterRoles[number]['value'];
export function validateNewsletter(value: unknown): { email: string; profile: NewsletterProfile; role: NewsletterRole } | null {
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
