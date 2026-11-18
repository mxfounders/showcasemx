import { getDb } from '@/lib/db';

// The public profile of one account, for its page in ops (SHCWS-120). What the profile
// shows is public anyway; ops sees in addition whether it is on, why it is hidden, its
// previous handles and how many follow it (never who: ops does not need the followers).

export type OpsProfile = {
  handle: string;
  displayName: string;
  bio: string;
  links: { label: string; url: string }[];
  active: boolean;
  activatedAt: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  followers: number;
  previousHandles: string[];
  shownProjects: number;
  shownLists: number;
  updatedAt: string;
};

export async function accountProfile(id: string): Promise<OpsProfile | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT p.handle, p.display_name, p.bio, p.links, p.active, p.activated_at::text,
      p.hidden_at::text, p.hidden_reason, p.updated_at::text,
      (SELECT count(*)::int FROM profile_follows f WHERE f.profile_id = p.account_id) AS followers,
      COALESCE((SELECT array_agg(h.handle ORDER BY h.retired_at DESC) FROM profile_handle_history h
        WHERE h.account_id = p.account_id), '{}') AS previous_handles,
      (SELECT count(*)::int FROM founder_solutions s WHERE s.owner_id = p.account_id
        AND s.published_data IS NOT NULL AND NOT (s.id = ANY(p.hidden_solutions))) AS shown_projects,
      (SELECT count(*)::int FROM buyer_lists l WHERE l.owner_id = p.account_id
        AND l.visibility = 'public' AND NOT (l.id = ANY(p.hidden_lists))) AS shown_lists
    FROM public_profiles p WHERE p.account_id = ${id}
  `.catch(() => []);
  if (!row) return null;
  return {
    handle: String(row.handle),
    displayName: String(row.display_name),
    bio: String(row.bio ?? ''),
    links: Array.isArray(row.links)
      ? (row.links as { label: unknown; url: unknown }[]).map(link => ({
          label: String(link.label),
          url: String(link.url),
        }))
      : [],
    active: !!row.active,
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    hiddenAt: row.hidden_at ? String(row.hidden_at) : null,
    hiddenReason: row.hidden_reason ? String(row.hidden_reason) : null,
    followers: Number(row.followers),
    previousHandles: (row.previous_handles as string[]) ?? [],
    shownProjects: Number(row.shown_projects),
    shownLists: Number(row.shown_lists),
    updatedAt: String(row.updated_at),
  };
}
