import { reservedCurator } from '@/lib/library/model';
import { handleMax, handleMin, handleShape, isHandleShape } from './handle-shape';

export { handleMax, handleMin, isHandleShape };

// The name of a public profile's page, /c/<handle> (SHCWS-120). Lowercase ASCII letters
// and digits in hyphen-separated words, 3 to 30 characters: the same shape the database
// CHECK enforces (db/public-profiles.sql). Pure, so the middleware, the API and the
// tests share it. ops/src/lib/profiles.ts keeps a copy (ops builds separately);
// tests/profiles.test.ts checks both agree.

// Words that would read as a page of the site, as shwcs itself or as someone with
// authority over others. Anything containing «shwcs» or «showcase» (lookalike letters
// included) is refused separately by reservedCurator(), the rule public list signatures
// already follow (SHCWS-116).
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

/** A handle nobody can claim: a page of the site, the platform or an authority. */
export function reservedHandle(value: string): boolean {
  const plain = value.replace(/-/g, '');
  return (
    reservedWords.has(value) ||
    reservedWords.has(plain) ||
    reservedCurator(value) ||
    // Next serves a page's share image as /…/opengraph-image(-hash).
    /^(?:opengraph|twitter)-image(?:-|$)/.test(value)
  );
}

/** Whether a value can be claimed as a handle: the shape and not reserved. */
export function isProfileHandle(value: unknown): value is string {
  return isHandleShape(value) && !reservedHandle(value);
}

/**
 * What someone typed, as a handle: «@Ana López_99» → `ana-lopez-99`. The person sees the
 * result before saving; the server normalizes again and checks it.
 */
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
    .slice(0, handleMax)
    .replace(/-+$/, '');
}

export type HandleProblem = 'short' | 'long' | 'shape' | 'reserved';

/** Why a normalized handle can't be used, or null when it can (availability aside). */
export function handleProblem(value: string): HandleProblem | null {
  if (value.length < handleMin) return 'short';
  if (value.length > handleMax) return 'long';
  if (!handleShape.test(value)) return 'shape';
  if (reservedHandle(value)) return 'reserved';
  return null;
}

/** The public path of a profile. */
export function profilePath(handle: string): string {
  return `/c/${handle}`;
}
