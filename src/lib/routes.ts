import { getBlogSlugs } from './blog';
import { infoSlugs } from './info-pages';
import { categories, collections, industries } from './taxonomy';

// What a path under /[locale] can be, checked by the middleware before anything
// renders. Bots and vulnerability scanners probe thousands of paths a day
// (/wp-login.php, /.env, /xmlrpc.php…); without this check each one rendered a full
// page and answered 200 (CLAUDE.md §73). Deeper checks that need the database (does
// this UUID exist?) stay in the pages; the closed slug sets below are checked here,
// because a page-level notFound() under a loading.tsx can only answer 200 (§53).
// tests/routes.test.ts walks src/app/[locale] so a new route cannot be left out.

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Rest = (rest: string[]) => boolean;
const leaf: Rest = rest => rest.length === 0;
const oneOf = (slugs: readonly string[]): Rest => {
  const known = new Set(slugs);
  return rest => rest.length === 1 && known.has(rest[0]);
};
const idPage: Rest = rest => rest.length === 1 && uuid.test(rest[0]);
const blogPost = oneOf(getBlogSlugs());

const routes = new Map<string, Rest>([
  ...infoSlugs.map((info): [string, Rest] => [info, leaf]),
  // Private tree: its own pages authenticate and send anonymous visitors to sign-in.
  ['account', () => true],
  ['blog', rest => leaf(rest) || blogPost(rest)],
  ['colecciones', oneOf(collections.map(item => item.slug))],
  ['comunidad', rest => leaf(rest) || idPage(rest)],
  ['contacto', leaf],
  ['explorar', oneOf(categories.map(item => item.slug))],
  ['forgot-password', leaf],
  ['industria', oneOf(industries.map(item => item.slug))],
  ['newsletter', rest => leaf(rest) || (rest.length === 1 && rest[0] === 'unsubscribe')],
  ['onboarding', leaf],
  ['reset-password', leaf],
  ['sign-in', leaf],
  ['sign-up', leaf],
  ['soluciones', idPage],
  ['verify-email', leaf],
]);

/**
 * Whether the segments after the locale (`['explorar', 'cobros']`; `[]` is the home)
 * can name a page. No page has a dot in its path, so anything file-like is rejected.
 */
export function isPagePath(segments: readonly string[]): boolean {
  if (segments.some(segment => segment.includes('.'))) return false;
  if (segments.length === 0) return true;
  const [first, ...rest] = segments;
  return routes.get(first)?.(rest) ?? false;
}
