export const inquiryReasons = [
  { value: 'find', label: 'Encontrar una solución', detail: 'Busco software, una agencia o un servicio para mi empresa.' },
  { value: 'submit', label: 'Presentar un proyecto', detail: 'Quiero publicar o mejorar la presencia de lo que construyo.' },
  { value: 'partnership', label: 'Alianza o comunidad', detail: 'Tengo una colaboración, evento o iniciativa que proponer.' },
  { value: 'press', label: 'Prensa o contenido', detail: 'Quiero conversar, investigar o contar una historia.' },
  { value: 'support', label: 'Ayuda con mi cuenta', detail: 'Necesito resolver algo dentro de shwcs.' },
  { value: 'other', label: 'Otra conversación', detail: 'Mi mensaje no encaja en las opciones anteriores.' },
] as const;

export const inquiryUrgencies = [
  { value: 'exploring', label: 'Solo estoy explorando' },
  { value: 'month', label: 'Quiero resolverlo este mes' },
  { value: 'soon', label: 'Me gustaría hablar pronto' },
] as const;

export type InquiryReason = typeof inquiryReasons[number]['value'];
export type InquiryUrgency = typeof inquiryUrgencies[number]['value'];
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
  if (!reason || !urgency || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || organization.length < 2 || message.length < 20 || value.consent !== true) return null;
  if (website) {
    try {
      const url = new URL(website);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return null;
      website = url.href;
    } catch { return null; }
  }
  return { reason, name, email, organization, role, website, message, urgency };
}
