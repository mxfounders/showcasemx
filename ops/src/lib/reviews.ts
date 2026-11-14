// Review verification levels, ops side. The product computes them in
// src/lib/reviews/model.ts (reviewLevel, freeEmailDomains); ops builds separately and
// cannot import from it, so the pieces it needs are copied here. Keep both in step:
// tests/ops-reviews.test.ts compares them. No '@/' imports: root tests import this file.

export type ReviewLevel = 'unverified' | 'email' | 'work' | 'contact' | 'customer';

/** Same wording as the product's `reviews.levels` (es). */
export const REVIEW_LEVEL_LABEL: Record<ReviewLevel, string> = {
  unverified: 'Sin verificar',
  email: 'Correo verificado',
  work: 'Correo de empresa',
  contact: 'Contactó vía shwcs',
  customer: 'Compra comprobada',
};

export const REVIEW_LEVEL_TONE: Record<
  ReviewLevel,
  'neutral' | 'blue' | 'sage' | 'lavender' | 'terracotta' | 'amber'
> = {
  unverified: 'neutral',
  email: 'blue',
  work: 'blue',
  contact: 'lavender',
  customer: 'sage',
};

const freeEmailDomains = [
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
];
const freePattern = /^(hotmail|outlook|live|yahoo|gmx|yandex)\.[a-z.]+$/;

export function isWorkEmailDomain(domain: string) {
  const value = domain.toLowerCase();
  return !freeEmailDomains.includes(value) && !freePattern.test(value);
}

/** Copy of the product's reviewLevel: proof beats contact, contact beats the domain. */
export function reviewLevel(
  email: string | null,
  verified: boolean,
  proven: boolean,
  contacted: boolean,
): ReviewLevel {
  if (!verified) return 'unverified';
  if (proven) return 'customer';
  if (contacted) return 'contact';
  const domain = (email ?? '').split('@')[1] ?? '';
  return isWorkEmailDomain(domain) ? 'work' : 'email';
}
