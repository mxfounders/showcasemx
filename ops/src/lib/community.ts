// Public list signatures, ops side. The product keeps the same rule in
// src/lib/library/model.ts (reservedCurator, 60 characters); ops builds separately
// and cannot import from it, so the pieces it needs are copied here. Keep both in step.

/** buyer_lists.curator_name is varchar(60). */
export const CURATOR_MAX = 60;

// Letters from other scripts that look like the Latin ones in «shwcs».
const lookalikes: Record<string, string> = {
  а: 'a',
  с: 'c',
  е: 'e',
  һ: 'h',
  о: 'o',
  р: 'p',
  ѕ: 's',
  ԝ: 'w',
  х: 'x',
  ѡ: 'w',
};

/**
 * Signatures that would read as shwcs itself («shwcs», «Equipo SHWCS», lookalike
 * letters…). A list owned by someone else is never an editorial endorsement, so ops
 * does not sign one as the platform either.
 */
export function reservedCurator(name: unknown) {
  if (typeof name !== 'string') return false;
  const plain = Array.from(name.normalize('NFKD').toLowerCase())
    .map(char => lookalikes[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
  return plain.includes('shwcs') || plain.includes('showcase');
}

export type CuratorCheck =
  { ok: true; name: string } | { ok: false; error: 'empty' | 'too_long' | 'reserved' };

/** The new signature ops writes: same limits as the product, never empty. */
export function checkCuratorName(value: unknown): CuratorCheck {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!name) return { ok: false, error: 'empty' };
  if (name.length > CURATOR_MAX) return { ok: false, error: 'too_long' };
  if (reservedCurator(name)) return { ok: false, error: 'reserved' };
  return { ok: true, name };
}

export const CURATOR_ERROR: Record<'empty' | 'too_long' | 'reserved', string> = {
  empty: 'Escribe la firma nueva.',
  too_long: `La firma admite hasta ${CURATOR_MAX} caracteres.`,
  reserved: 'Una lista de otra cuenta no puede firmar como shwcs.',
};
