import { solutionsSql } from '@/lib/solutions/server';
import { publicProducts, type PublishedProduct } from '@/lib/solutions/public';
import { getPublicCollections, type PublicCollection } from '@/lib/library/community';
import type { PublicLink } from '@/lib/solutions/profile';
import { publicProfileLinks, type ProfileInput } from './model';

// Public creator and curator profiles (SHCWS-120, db/public-profiles.sql).
//
// The account id behind a profile never leaves the server: pages get the handle, the name
// the person typed, their bio and links, and what they already published (approved
// listings and visible public lists) minus what they hid here. No email, organization,
// avatar, saved projects, notes or private activity, ever (CLAUDE.md §19, §23).

/** A handle the account used before stays its own (it redirects); at most this many. */
export const retiredHandlesMax = 10;

export type OwnProfile = {
  handle: string;
  displayName: string;
  bio: string;
  links: PublicLink[];
  hiddenSolutions: string[];
  hiddenLists: string[];
  active: boolean;
  hiddenByOps: { reason: string } | null;
  version: number;
};

/** What the account could show: its published listings and its public lists. */
export type ProfileItems = {
  solutions: { id: string; name: string }[];
  lists: { id: string; name: string; curator: string; visible: boolean }[];
};

export async function getOwnProfile(account: string): Promise<OwnProfile | null> {
  const sql = solutionsSql();
  const [row] =
    await sql`SELECT handle, display_name, bio, links, hidden_solutions::text[] AS hidden_solutions,
      hidden_lists::text[] AS hidden_lists, active, hidden_at IS NOT NULL AS hidden, hidden_reason, version
    FROM public_profiles WHERE account_id = ${account}`;
  if (!row) return null;
  return {
    handle: String(row.handle),
    displayName: String(row.display_name),
    bio: String(row.bio ?? ''),
    links: publicProfileLinks(row.links),
    hiddenSolutions: (row.hidden_solutions as string[]) ?? [],
    hiddenLists: (row.hidden_lists as string[]) ?? [],
    active: !!row.active,
    hiddenByOps: row.hidden ? { reason: String(row.hidden_reason ?? '') } : null,
    version: Number(row.version),
  };
}

export async function getProfileItems(account: string): Promise<ProfileItems> {
  const sql = solutionsSql();
  const [solutions, lists] = await Promise.all([
    sql`SELECT id::text, published_data->>'name' AS name FROM founder_solutions
      WHERE owner_id = ${account} AND published_data IS NOT NULL ORDER BY published_at DESC NULLS LAST, id`,
    sql`SELECT id::text, name, curator_name, community_list_visible(id) AS visible FROM buyer_lists
      WHERE owner_id = ${account} AND visibility = 'public' ORDER BY created_at DESC, id`,
  ]);
  return {
    solutions: solutions.map(row => ({ id: String(row.id), name: String(row.name ?? '') })),
    lists: lists.map(row => ({
      id: String(row.id),
      name: String(row.name),
      curator: String(row.curator_name ?? ''),
      visible: !!row.visible,
    })),
  };
}

export type SaveResult =
  { ok: true; version: number } | { ok: false; reason: 'taken' | 'conflict' | 'too-many-changes' };

const uniqueViolation = (error: unknown) =>
  !!error && typeof error === 'object' && (error as { code?: string }).code === '23505';

/**
 * Creates (version 0) or updates the account's profile. The handle is locked for the
 * transaction, so two accounts can't take it at once and a handle being retired can't be
 * claimed by someone else in between. The previous handle moves to the account's history
 * (it redirects); taking back one's own previous handle removes it from there.
 */
export async function saveProfile(account: string, input: ProfileInput): Promise<SaveResult> {
  const sql = solutionsSql();
  const [current] = await sql`SELECT handle FROM public_profiles WHERE account_id = ${account}`;
  const previous = current ? String(current.handle) : null;
  if (input.version === 0 && previous) return { ok: false, reason: 'conflict' };
  if (input.version > 0 && !previous) return { ok: false, reason: 'conflict' };
  const handles = Array.from(new Set([input.handle, previous ?? input.handle])).sort();
  const locks = handles.map(
    handle => sql`SELECT pg_advisory_xact_lock(hashtext(${'profile-handle:' + handle}))`,
  );
  // Only ids of what the account owns are kept as hidden: the rest means nothing here.
  const hiddenSolutions = sql`SELECT COALESCE(array_agg(id), '{}') FROM founder_solutions
    WHERE owner_id = ${account} AND id = ANY(${input.hiddenSolutions}::uuid[])`;
  const hiddenLists = sql`SELECT COALESCE(array_agg(id), '{}') FROM buyer_lists
    WHERE owner_id = ${account} AND id = ANY(${input.hiddenLists}::uuid[])`;
  const links = JSON.stringify(input.links);
  try {
    if (!previous) {
      const results = await sql.transaction([
        ...locks,
        sql`INSERT INTO public_profiles (account_id, handle, display_name, bio, links,
            hidden_solutions, hidden_lists, active, activated_at)
          SELECT ${account}, ${input.handle}, ${input.displayName}, ${input.bio}, ${links}::jsonb,
            (${hiddenSolutions}), (${hiddenLists}), ${input.active}, CASE WHEN ${input.active} THEN now() END
          WHERE NOT EXISTS (SELECT 1 FROM profile_handle_history h WHERE h.handle = ${input.handle} AND h.account_id <> ${account})
            AND NOT EXISTS (SELECT 1 FROM profile_handle_blocks b WHERE b.handle = ${input.handle})
          ON CONFLICT (account_id) DO NOTHING RETURNING version`,
      ]);
      const [row] = results.at(-1) as { version: number }[];
      if (row) return { ok: true, version: Number(row.version) };
      const [again] = await sql`SELECT 1 FROM public_profiles WHERE account_id = ${account}`;
      return { ok: false, reason: again ? 'conflict' : 'taken' };
    }
    const changing = previous !== input.handle;
    const results = await sql.transaction([
      ...locks,
      sql`WITH changed AS (
          UPDATE public_profiles p SET handle = ${input.handle}, display_name = ${input.displayName},
            bio = ${input.bio}, links = ${links}::jsonb, hidden_solutions = (${hiddenSolutions}),
            hidden_lists = (${hiddenLists}), active = ${input.active},
            activated_at = CASE WHEN ${input.active} AND NOT p.active THEN now() ELSE p.activated_at END,
            version = p.version + 1, updated_at = now()
          WHERE p.account_id = ${account} AND p.version = ${input.version} AND p.handle = ${previous}
            AND (NOT ${changing} OR (
              NOT EXISTS (SELECT 1 FROM profile_handle_history h WHERE h.handle = ${input.handle} AND h.account_id <> ${account})
              AND NOT EXISTS (SELECT 1 FROM profile_handle_blocks b WHERE b.handle = ${input.handle})
              AND (SELECT count(*) FROM profile_handle_history h WHERE h.account_id = ${account}
                AND h.handle <> ${input.handle}) < ${retiredHandlesMax}))
          RETURNING p.version
        ), retired AS (
          INSERT INTO profile_handle_history (handle, account_id)
          SELECT ${previous}, ${account} FROM changed WHERE ${changing}
          ON CONFLICT (handle) DO UPDATE SET account_id = EXCLUDED.account_id, retired_at = now()
        ), reclaimed AS (
          DELETE FROM profile_handle_history
           WHERE handle = ${input.handle} AND account_id = ${account} AND EXISTS (SELECT 1 FROM changed)
        )
        SELECT version FROM changed`,
    ]);
    const [row] = results.at(-1) as { version: number }[];
    if (row) return { ok: true, version: Number(row.version) };
    const [again] =
      await sql`SELECT version, (SELECT count(*)::int FROM profile_handle_history h WHERE h.account_id = ${account}) AS retired
        FROM public_profiles WHERE account_id = ${account}`;
    if (!again || Number(again.version) !== input.version) return { ok: false, reason: 'conflict' };
    if (changing && Number(again.retired) >= retiredHandlesMax)
      return { ok: false, reason: 'too-many-changes' };
    return { ok: false, reason: 'taken' };
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false, reason: 'taken' };
    throw error;
  }
}

/** Removes the profile, its handle history and who followed it. Lists and listings stay. */
export async function deleteProfile(account: string): Promise<boolean> {
  const sql = solutionsSql();
  const [, gone] = await sql.transaction([
    sql`DELETE FROM profile_handle_history WHERE account_id = ${account}`,
    sql`DELETE FROM public_profiles WHERE account_id = ${account} RETURNING account_id`,
  ]);
  return gone.length > 0;
}

/** Whether a handle is free for this account (its own current or previous ones are). */
export async function handleAvailable(account: string, handle: string): Promise<boolean> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT
      NOT EXISTS (SELECT 1 FROM public_profiles WHERE handle = ${handle} AND account_id <> ${account})
      AND NOT EXISTS (SELECT 1 FROM profile_handle_history WHERE handle = ${handle} AND account_id <> ${account})
      AND NOT EXISTS (SELECT 1 FROM profile_handle_blocks WHERE handle = ${handle}) AS free`;
  return !!row?.free;
}

export type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string;
  links: PublicLink[];
  since: string | null;
  updatedAt: string;
  projects: PublishedProduct[];
  lists: PublicCollection[];
  /** The viewer follows this profile; false without a session. */
  following: boolean;
  /** The viewer is the person behind it. */
  own: boolean;
};

/**
 * A visible profile by its current handle, with what it shows, or null. The handle is
 * the only key: a previous handle redirects before this runs (the middleware).
 */
export async function getPublicProfile(handle: string, viewer = ''): Promise<PublicProfile | null> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT p.account_id, p.handle, p.display_name, p.bio, p.links,
      p.hidden_lists::text[] AS hidden_lists, p.activated_at::text, p.updated_at::text,
      COALESCE((SELECT array_agg(s.id::text) FROM founder_solutions s
        WHERE s.owner_id = p.account_id AND s.published_data IS NOT NULL
          AND NOT (s.id = ANY(p.hidden_solutions))), '{}') AS solution_ids,
      EXISTS (SELECT 1 FROM profile_follows f WHERE f.profile_id = p.account_id
        AND f.follower_id = ${viewer || null}::uuid) AS following
    FROM public_profiles p WHERE p.handle = ${handle} AND profile_visible(p.account_id)`;
  if (!row) return null;
  const account = String(row.account_id);
  const ids = new Set(row.solution_ids as string[]);
  const [products, { collections }] = await Promise.all([
    ids.size ? publicProducts() : Promise.resolve([] as PublishedProduct[]),
    getPublicCollections({
      ownedBy: account,
      exclude: row.hidden_lists as string[],
      viewer,
      sort: 'popular',
    }),
  ]);
  return {
    handle: String(row.handle),
    displayName: String(row.display_name),
    bio: String(row.bio ?? ''),
    links: publicProfileLinks(row.links),
    since: row.activated_at ? String(row.activated_at) : null,
    updatedAt: String(row.updated_at),
    projects: products.filter(product => product.solutionId && ids.has(product.solutionId)),
    lists: collections,
    following: !!row.following,
    own: !!viewer && viewer === account,
  };
}

/**
 * The profile that a published listing links to: its owner's, only while visible and
 * showing that listing. Declared creators in the listing (§17) are never matched to
 * an account.
 */
export async function listingPublisher(
  solutionId: string,
): Promise<{ handle: string; name: string } | null> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT p.handle, p.display_name FROM founder_solutions s
    JOIN public_profiles p ON p.account_id = s.owner_id
    WHERE s.id = ${solutionId} AND s.published_data IS NOT NULL
      AND profile_visible(p.account_id) AND NOT (s.id = ANY(p.hidden_solutions))`;
  return row ? { handle: String(row.handle), name: String(row.display_name) } : null;
}

/** Visible profiles with at least one listing or visible public list they show. */
export async function indexableProfiles(): Promise<{ handle: string; updatedAt: string }[]> {
  const sql = solutionsSql();
  const rows = await sql`SELECT p.handle, p.updated_at::text FROM public_profiles p
    WHERE profile_visible(p.account_id) AND (
      EXISTS (SELECT 1 FROM founder_solutions s WHERE s.owner_id = p.account_id
        AND s.published_data IS NOT NULL AND NOT (s.id = ANY(p.hidden_solutions)))
      OR EXISTS (SELECT 1 FROM buyer_lists l WHERE l.owner_id = p.account_id
        AND l.visibility = 'public' AND NOT (l.id = ANY(p.hidden_lists)) AND community_list_visible(l.id)))
    ORDER BY p.handle`;
  return rows.map(row => ({ handle: String(row.handle), updatedAt: String(row.updated_at) }));
}

export type DirectoryEntry = {
  handle: string;
  displayName: string;
  bio: string;
  projects: Pick<PublishedProduct, 'name' | 'favicon' | 'detailUrl'>[];
};

export const directoryPageSize = 24;

/**
 * The founders directory (/fundadores): visible profiles that show at least one
 * published listing, the most recently turned on first. Curators without listings are in
 * Comunidad through their lists.
 */
export async function profileDirectory(
  page = 1,
): Promise<{ entries: DirectoryEntry[]; total: number; hasMore: boolean }> {
  const sql = solutionsSql();
  const offset = (Math.max(1, Math.min(1000, page)) - 1) * directoryPageSize;
  const rows = await sql`WITH shown AS (
      SELECT p.handle, p.display_name, p.bio, p.activated_at,
        array_agg(s.id::text ORDER BY s.published_at DESC NULLS LAST) AS solution_ids
      FROM public_profiles p JOIN founder_solutions s ON s.owner_id = p.account_id
       AND s.published_data IS NOT NULL AND NOT (s.id = ANY(p.hidden_solutions))
      WHERE profile_visible(p.account_id)
      GROUP BY p.account_id, p.handle, p.display_name, p.bio, p.activated_at)
    SELECT *, count(*) OVER ()::int AS total FROM shown
    ORDER BY activated_at DESC NULLS LAST, handle LIMIT ${directoryPageSize} OFFSET ${offset}`;
  const total = Number(rows[0]?.total ?? 0);
  const products = rows.length ? await publicProducts() : [];
  const byId = new Map(products.map(product => [product.solutionId, product]));
  return {
    total,
    hasMore: offset + rows.length < total,
    entries: rows.map(row => ({
      handle: String(row.handle),
      displayName: String(row.display_name),
      bio: String(row.bio ?? ''),
      projects: (row.solution_ids as string[]).flatMap(id => {
        const product = byId.get(id);
        return product
          ? [{ name: product.name, favicon: product.favicon, detailUrl: product.detailUrl }]
          : [];
      }),
    })),
  };
}

export type FollowedProfile = {
  /** The follower's own follow row: enough to unfollow, says nothing about the account. */
  id: string;
  /** Null once the profile is off or hidden: the follow stays, the page does not. */
  handle: string | null;
  name: string | null;
};

export async function followedProfiles(owner: string): Promise<FollowedProfile[]> {
  const sql = solutionsSql();
  const rows = await sql`SELECT f.id::text,
      CASE WHEN profile_visible(p.account_id) THEN p.handle END AS handle,
      CASE WHEN profile_visible(p.account_id) THEN p.display_name END AS name
    FROM profile_follows f JOIN public_profiles p ON p.account_id = f.profile_id
    WHERE f.follower_id = ${owner} ORDER BY f.created_at DESC LIMIT 100`;
  return rows.map(row => ({
    id: String(row.id),
    handle: row.handle ? String(row.handle) : null,
    name: row.name ? String(row.name) : null,
  }));
}

/** How many follow the account's profile: a number for its owner only, never who. */
export async function profileFollowerCount(owner: string): Promise<number | null> {
  const sql = solutionsSql();
  const [row] =
    await sql`SELECT (SELECT count(*)::int FROM profile_follows f WHERE f.profile_id = p.account_id) AS count
    FROM public_profiles p WHERE p.account_id = ${owner}`;
  return row ? Number(row.count) : null;
}
