// Public profile handles, ops side (SHCWS-120). The product keeps the same rules in
// src/lib/profiles/handle.ts and handle-shape.ts; ops builds separately and cannot import
// from them, so the pieces it needs are copied here. tests/profiles.test.ts checks both
// agree. Keep them in step.
import { reservedCurator } from './community';

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
const shape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const reservedWords = new Set([
  'about',
  'account',
  'acerca',
  'admin',
  'administrador',
  'administrator',
  'ads',
  'anunciate',
  'api',
  'app',
  'ayuda',
  'billing',
  'blog',
  'buscar',
  'changelog',
  'colecciones',
  'comunidad',
  'community',
  'contact',
  'contacto',
  'cookies',
  'correo',
  'criterios',
  'cuenta',
  'destacados',
  'editor',
  'editorial',
  'equipo',
  'explorar',
  'facturacion',
  'faq',
  'founders',
  'fundadores',
  'help',
  'hola',
  'industria',
  'legal',
  'login',
  'mail',
  'moderacion',
  'moderador',
  'moderator',
  'newsletter',
  'nuevo',
  'null',
  'official',
  'oficial',
  'onboarding',
  'ops',
  'perfil',
  'press',
  'prensa',
  'privacidad',
  'privacy',
  'proceso',
  'profile',
  'root',
  'security',
  'seguridad',
  'settings',
  'sign-in',
  'sign-up',
  'soluciones',
  'solutions',
  'soporte',
  'sponsor',
  'staff',
  'support',
  'system',
  'sistema',
  'team',
  'terminos',
  'terms',
  'undefined',
  'verificado',
  'verified',
  'www',
]);

export function reservedHandle(value: string): boolean {
  const plain = value.replace(/-/g, '');
  return (
    reservedWords.has(value) ||
    reservedWords.has(plain) ||
    reservedCurator(value) ||
    /^(?:opengraph|twitter)-image(?:-|$)/.test(value)
  );
}

/** «@Ana López_99» → `ana-lopez-99`, like the product does. */
export function normalizeHandle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/[łđ]/g, letter => (letter === 'ł' ? 'l' : 'd'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HANDLE_MAX)
    .replace(/-+$/, '');
}

export type HandleCheck =
  { ok: true; handle: string } | { ok: false; error: 'short' | 'long' | 'shape' | 'reserved' };

/** The handle ops writes when it forces a change: same rules as the product. */
export function checkHandle(value: unknown): HandleCheck {
  const handle = normalizeHandle(typeof value === 'string' ? value : '');
  if (handle.length < HANDLE_MIN) return { ok: false, error: 'short' };
  if (handle.length > HANDLE_MAX) return { ok: false, error: 'long' };
  if (!shape.test(handle)) return { ok: false, error: 'shape' };
  if (reservedHandle(handle)) return { ok: false, error: 'reserved' };
  return { ok: true, handle };
}

export const HANDLE_ERROR: Record<'short' | 'long' | 'shape' | 'reserved', string> = {
  short: `Usa al menos ${HANDLE_MIN} caracteres.`,
  long: `Usa como máximo ${HANDLE_MAX} caracteres.`,
  shape: 'Solo letras, números y guiones.',
  reserved: 'Ese enlace está reservado (shwcs, páginas del sitio o roles de autoridad).',
};
