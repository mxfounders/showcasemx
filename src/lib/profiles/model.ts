import { reservedCurator } from '@/lib/library/model';
import { isSolutionId, safeSolutionUrl } from '@/lib/solutions/model';
import { readPublicLinks, type PublicLink } from '@/lib/solutions/profile';
import { handleProblem, normalizeHandle, type HandleProblem } from './handle';

// What a person writes on their public profile (SHCWS-120, db/public-profiles.sql). Pure:
// the API validates with it and the tests exercise it. Everything here is public once the
// profile is on, so it never takes anything from the private account (email, organization,
// avatar): the person types it.

export const profileNameMax = 80;
export const profileBioMax = 600;
export const profileLinksMax = 6;
/** Hidden items per kind; far above the account limits (30 lists, listings). */
const hiddenMax = 200;

export type ProfileInput = {
  handle: string;
  displayName: string;
  bio: string;
  links: PublicLink[];
  hiddenSolutions: string[];
  hiddenLists: string[];
  active: boolean;
  /** The version the form loaded; 0 creates the profile. */
  version: number;
};

export type ProfileInputError =
  | { field: 'handle'; problem: HandleProblem }
  | { field: 'displayName'; problem: 'empty' | 'long' | 'reserved' }
  | { field: 'bio' | 'links' | 'hidden' | 'version' | 'active'; problem: 'invalid' };

export type ProfileInputResult =
  { ok: true; value: ProfileInput } | { ok: false; error: ProfileInputError };

function readIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > hiddenMax) return null;
  if (value.some(id => typeof id !== 'string' || !isSolutionId(id))) return null;
  return Array.from(new Set(value.map(id => String(id).toLowerCase())));
}

/** Validates and normalizes a profile save. The handle is normalized, then checked. */
export function readProfileInput(body: Record<string, unknown>): ProfileInputResult {
  const handle = normalizeHandle(typeof body.handle === 'string' ? body.handle : '');
  const problem = handleProblem(handle);
  if (problem) return { ok: false, error: { field: 'handle', problem } };

  const displayName =
    typeof body.displayName === 'string' ? body.displayName.replace(/\s+/g, ' ').trim() : '';
  if (!displayName) return { ok: false, error: { field: 'displayName', problem: 'empty' } };
  if (displayName.length > profileNameMax)
    return { ok: false, error: { field: 'displayName', problem: 'long' } };
  if (reservedCurator(displayName))
    return { ok: false, error: { field: 'displayName', problem: 'reserved' } };

  const bio = typeof body.bio === 'string' ? body.bio.replace(/\r\n?/g, '\n').trim() : null;
  if (bio === null || bio.length > profileBioMax)
    return { ok: false, error: { field: 'bio', problem: 'invalid' } };

  const read = readPublicLinks(body.links ?? [], profileLinksMax);
  const links: PublicLink[] = [];
  for (const link of read ?? []) {
    const url = safeSolutionUrl(link.url);
    if (!url) return { ok: false, error: { field: 'links', problem: 'invalid' } };
    links.push({ label: link.label, url });
  }
  if (!read) return { ok: false, error: { field: 'links', problem: 'invalid' } };

  const hiddenSolutions = readIds(body.hiddenSolutions),
    hiddenLists = readIds(body.hiddenLists);
  if (!hiddenSolutions || !hiddenLists)
    return { ok: false, error: { field: 'hidden', problem: 'invalid' } };

  if (typeof body.active !== 'boolean')
    return { ok: false, error: { field: 'active', problem: 'invalid' } };
  const version = body.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0)
    return { ok: false, error: { field: 'version', problem: 'invalid' } };

  return {
    ok: true,
    value: {
      handle,
      displayName,
      bio,
      links,
      hiddenSolutions,
      hiddenLists,
      active: body.active,
      version,
    },
  };
}

/** Links read back from the database, kept only while they still pass today's rules. */
export function publicProfileLinks(value: unknown): PublicLink[] {
  const links = readPublicLinks(Array.isArray(value) ? value : [], profileLinksMax) ?? [];
  return links.flatMap(link => {
    const url = safeSolutionUrl(link.url);
    return url ? [{ label: link.label, url }] : [];
  });
}
