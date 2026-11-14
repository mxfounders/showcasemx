// Named URLs for published listings (SHCWS-101): /soluciones/cord instead of
// /soluciones/<uuid>. The UUID stays the listing's identity everywhere else (saved
// projects, contacts, APIs, media); the slug only names its public page.
//
// founder_solutions.slug is assigned once, when ops first approves the listing, and an
// admin can change it in ops. Every slug a listing had before lives on in
// solution_slug_history and redirects (301) to the current one (db/solution-slugs.sql).
// ops/src/lib/slug.ts keeps a copy of the derivation (ops builds separately and cannot
// import from here); tests/solution-slug.test.ts checks both agree.

/** founder_solutions.slug never exceeds this (the column's CHECK says the same). */
export const solutionSlugMax = 60;

const shape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Any UUID, not only v4: a slug must never be mistaken for the id it replaces.
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Next serves a page's generated share image as /…/opengraph-image(-hash); a listing
// called that would be read as the share image of /soluciones (src/lib/routes.ts).
const reserved = /^(?:opengraph|twitter)-image(?:-|$)/;

/** Fallback when a name has no Latin letters or digits to build a slug from. */
const fallbackBase = 'solucion';

/**
 * Whether a value can be a listing slug: lowercase ASCII letters and digits in
 * hyphen-separated words, at most 60 characters, never UUID-shaped. The middleware
 * checks this before anything touches the database.
 */
export function isSolutionSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= solutionSlugMax &&
    shape.test(value) &&
    !uuidShape.test(value) &&
    !reserved.test(value)
  );
}

/** «Cómo Cobrar Más — S.A.» → `como-cobrar-mas-s-a`. */
export function solutionSlugBase(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/[łđ]/g, letter => (letter === 'ł' ? 'l' : 'd'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = words.slice(0, solutionSlugMax).replace(/-+$/, '');
  if (!base) return fallbackBase;
  return isSolutionSlug(base) ? base : trim(`${fallbackBase}-${base}`);
}

/**
 * The slugs to try for a name, in order: `cord`, `cord-2`, `cord-3`… The database
 * decides which one is free (a current slug or a retired one of another listing is taken).
 */
export function solutionSlugCandidates(name: string, count = 50): string[] {
  const base = solutionSlugBase(name);
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return base;
    const suffix = `-${index + 1}`;
    return `${trim(base.slice(0, solutionSlugMax - suffix.length))}${suffix}`;
  });
}

/** The public path of a listing: its slug when it has one, else its UUID. */
export function solutionPath(listing: { id: string; slug?: string | null }): string {
  return `/soluciones/${isSolutionSlug(listing.slug) ? listing.slug : listing.id}`;
}

function trim(value: string) {
  return value.slice(0, solutionSlugMax).replace(/-+$/, '');
}
