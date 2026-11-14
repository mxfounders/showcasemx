import { isSolutionId, solutionCategories } from '@/lib/solutions/model';
const staticProjectIds = ['cord', 'flouvia'] as const;
export function validProjectKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (staticProjectIds.some(id => value === `catalog:${id}`) ||
      (value.startsWith('solution:') && isSolutionId(value.slice(9))))
  );
}
export function projectKey(product: { catalogId?: string; detailUrl?: string }) {
  if (product.catalogId && staticProjectIds.some(id => id === product.catalogId))
    return `catalog:${product.catalogId}`;
  if (product.detailUrl?.startsWith('/soluciones/')) {
    const key = `solution:${product.detailUrl.slice(12)}`;
    if (validProjectKey(key)) return key;
  }
  const key = `catalog:${product.catalogId}`;
  return validProjectKey(key) ? key : null;
}
export function listDetails(body: Record<string, unknown>) {
  if (typeof body.name !== 'string' || typeof body.purpose !== 'string') return null;
  const name = body.name.trim(),
    purpose = body.purpose.trim();
  return name.length > 0 && name.length <= 100 && purpose.length <= 400 ? { name, purpose } : null;
}
export type BuyerList = {
  id: string;
  name: string;
  purpose: string;
  version: number;
  count: number;
  visibility?: 'private' | 'public';
  categories?: string[];
  public_description?: string;
  curator_name?: string;
};
export type SavedReference = { project_key: string };
export type ListItem = SavedReference & { list_id: string; note: string; version: number };
export type BuyerProject = {
  key: string;
  name: string;
  description: string;
  kind: string;
  categories: string[];
  industries?: string[];
  companySizes?: string[];
  href: string;
  external: boolean;
  solutionId?: string;
  image?: string;
  pricing?: string;
  scope?: string;
  implementation?: string;
  audience?: string;
  integrations?: string;
  support?: string;
  evidence?: string;
  evidenceUrl?: string;
};

export function comparisonKeys(value: unknown, members: string[]): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.length > 3 ||
    value.some(key => !validProjectKey(key))
  )
    return null;
  const keys = Array.from(new Set(value as string[]));
  return keys.length === value.length && keys.every(key => members.includes(key)) ? keys : null;
}

export type BuyerBoard = BuyerList & { covers: Pick<BuyerProject, 'key' | 'name' | 'image'>[] };

/**
 * A public list shows only once it holds this many available (published) projects:
 * the server refuses to make a smaller one public, and Comunidad hides a public list
 * that drops below it after withdrawals until it is completed again (SHCWS-116).
 */
export const minPublicListProjects = 3;

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
 * Signatures that would read as shwcs itself («shwcs», «shwcs editorial», «Equipo
 * SHWCS», «s.h.w.c.s», lookalike letters…). A public list is never an editorial
 * endorsement, so nobody signs as the platform; shwcs's own lists come from ops.
 */
export function reservedCurator(name: unknown) {
  if (typeof name !== 'string') return false;
  const plain = Array.from(name.normalize('NFKD').toLowerCase())
    .map(char => lookalikes[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
  return plain.includes('shwcs') || plain.includes('showcase');
}

// Public copy is deliberately separate from the buyer's private purpose and notes.
export function listPublicationDetails(body: Record<string, unknown>) {
  const visibility = body.visibility ?? 'private',
    categories = body.categories ?? [];
  const description = body.publicDescription ?? '',
    curator = body.curatorName ?? '';
  if (
    !['private', 'public'].includes(String(visibility)) ||
    !Array.isArray(categories) ||
    categories.length > solutionCategories.length ||
    categories.some(value => !solutionCategories.some(category => category === value))
  )
    return null;
  if (
    typeof description !== 'string' ||
    description.length > 400 ||
    typeof curator !== 'string' ||
    curator.length > 60 ||
    reservedCurator(curator)
  )
    return null;
  if (
    visibility === 'public' &&
    (body.publishConfirmed !== true || !categories.length || !curator.trim())
  )
    return null;
  return {
    visibility: visibility as 'private' | 'public',
    categories: Array.from(new Set(categories)) as string[],
    publicDescription: description.trim(),
    curatorName: curator.trim(),
  };
}
