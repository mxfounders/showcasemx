// Listing slugs, ops side (SHCWS-101): /soluciones/cord instead of /soluciones/<uuid>.
// The product keeps the same rules in src/lib/solutions/slug.ts; ops builds separately
// and cannot import from it, so the pieces it needs are copied here. Keep both in step
// (tests/solution-slug.test.ts compares them). The column's CHECK in
// db/solution-slugs.sql enforces the shape whatever either side does.

export const SLUG_MAX = 60;

const shape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reserved = /^(?:opengraph|twitter)-image(?:-|$)/;
const fallbackBase = 'solucion';

export function isSolutionSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= SLUG_MAX &&
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
  const base = words.slice(0, SLUG_MAX).replace(/-+$/, '');
  if (!base) return fallbackBase;
  return isSolutionSlug(base) ? base : trim(`${fallbackBase}-${base}`);
}

/** `cord`, `cord-2`, `cord-3`…: the publish statement takes the first one that is free. */
export function solutionSlugCandidates(name: string, count = 50): string[] {
  const base = solutionSlugBase(name);
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return base;
    const suffix = `-${index + 1}`;
    return `${trim(base.slice(0, SLUG_MAX - suffix.length))}${suffix}`;
  });
}

export type SlugCheck = { ok: true; slug: string } | { ok: false; error: 'empty' | 'shape' };

/**
 * The slug an admin types. Spaces become hyphens and capitals lowercase, so «Cord HQ»
 * works; anything else that is not a slug is refused rather than silently rewritten.
 */
export function checkSlugInput(value: unknown): SlugCheck {
  const slug = typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, '-') : '';
  if (!slug) return { ok: false, error: 'empty' };
  return isSolutionSlug(slug) ? { ok: true, slug } : { ok: false, error: 'shape' };
}

export const SLUG_ERROR: Record<'empty' | 'shape', string> = {
  empty: 'Escribe el nombre de la dirección.',
  shape: `Solo minúsculas sin acentos, números y guiones entre palabras, hasta ${SLUG_MAX} caracteres. No puede parecer un UUID.`,
};

function trim(value: string) {
  return value.slice(0, SLUG_MAX).replace(/-+$/, '');
}
