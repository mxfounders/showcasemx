import { authSql } from '@/lib/auth/security';
import { follows } from '@/i18n/dictionaries/es/follows';
import type { SolutionUpdateKind } from '@/lib/solutions/updates-model';
import { escapeHtml } from './email-template';

/**
 * The weekly summary of what someone follows (SHCWS-121): new projects in the lists they
 * follow, new lists from the curators they follow, updates of the listings they
 * follow (SHCWS-24) and what the public profiles they follow published (SHCWS-120), for the week named in the notice
 * (`follow:<account>:<monday>`, db/community-follows.sql). Sent the Monday after, only
 * with community emails on. Public lists and public signatures only; nothing about who
 * else follows them. Spanish until accounts store a language (SHCWS-25).
 */
export type FollowedListNews = { id: string; name: string; projects: string[] };
export type CuratorListNews = { id: string; name: string; curator: string };
/** Updates of a followed listing in the week (SHCWS-24), newest first. */
export type FollowedUpdateNews = {
  id: string;
  name: string;
  updates: Array<{ kind: SolutionUpdateKind; body: string }>;
};
/**
 * What a followed public profile published that week (SHCWS-120): listings approved for
 * the first time and lists that became visible, minus what the profile hides.
 */
export type FollowedProfileNews = {
  handle: string;
  name: string;
  projects: Array<{ path: string; name: string }>;
  lists: Array<{ id: string; name: string }>;
};

export function followDigestEmail({
  title,
  lists,
  curatorLists,
  projects = [],
  profiles = [],
  origin,
}: {
  title: string;
  lists: FollowedListNews[];
  curatorLists: CuratorListNews[];
  projects?: FollowedUpdateNews[];
  profiles?: FollowedProfileNews[];
  origin: string;
}) {
  const url = (id: string) => `${origin}/es/comunidad/${id}`;
  const link = (id: string, text: string) =>
    `<a href="${escapeHtml(url(id))}" style="color:#365DC4;">${escapeHtml(text)}</a>`;
  const names = (projects: string[]) =>
    projects.length > 3
      ? `${projects.slice(0, 3).join(', ')} y ${projects.length - 3} más`
      : projects.join(', ');
  const paragraphs: string[] = [];
  const text: string[] = [title, ''];
  if (lists.length) {
    paragraphs.push(
      `<strong>En las listas que sigues</strong><br>${lists
        .map(list => `${link(list.id, list.name)}: ${escapeHtml(names(list.projects))}`)
        .join('<br>')}`,
    );
    text.push(
      'En las listas que sigues:',
      ...lists.map(list => `- ${list.name}: ${names(list.projects)} (${url(list.id)})`),
      '',
    );
  }
  if (curatorLists.length) {
    paragraphs.push(
      `<strong>Listas nuevas de curadores que sigues</strong><br>${curatorLists
        .map(list => `${link(list.id, list.name)}, de ${escapeHtml(list.curator)}`)
        .join('<br>')}`,
    );
    text.push(
      'Listas nuevas de curadores que sigues:',
      ...curatorLists.map(list => `- ${list.name}, de ${list.curator} (${url(list.id)})`),
      '',
    );
  }
  if (projects.length) {
    const solutionUrl = (id: string) => `${origin}/es/soluciones/${id}`;
    const line = (update: { kind: SolutionUpdateKind; body: string }) =>
      `${follows.updates.kinds[update.kind]}: ${
        update.body.length > 200 ? `${update.body.slice(0, 199)}…` : update.body
      }`;
    paragraphs.push(
      `<strong>Novedades de proyectos que sigues</strong><br>${projects
        .map(
          project =>
            `<a href="${escapeHtml(solutionUrl(project.id))}" style="color:#365DC4;">${escapeHtml(project.name)}</a><br>${project.updates
              .map(update => escapeHtml(line(update)))
              .join('<br>')}`,
        )
        .join('<br><br>')}`,
    );
    text.push(
      'Novedades de proyectos que sigues:',
      ...projects.flatMap(project => [
        `- ${project.name} (${solutionUrl(project.id)})`,
        ...project.updates.map(update => `  ${line(update)}`),
      ]),
      '',
    );
  }
  if (profiles.length) {
    const profileUrl = (handle: string) => `${origin}/es/c/${handle}`;
    const items = (profile: FollowedProfileNews) => [
      ...profile.projects.map(project => ({
        url: `${origin}/es${project.path}`,
        text: `Proyecto: ${project.name}`,
      })),
      ...profile.lists.map(list => ({ url: url(list.id), text: `Lista: ${list.name}` })),
    ];
    paragraphs.push(
      `<strong>De los perfiles que sigues</strong><br>${profiles
        .map(
          profile =>
            `<a href="${escapeHtml(profileUrl(profile.handle))}" style="color:#365DC4;">${escapeHtml(profile.name)}</a><br>${items(
              profile,
            )
              .map(
                item =>
                  `<a href="${escapeHtml(item.url)}" style="color:#365DC4;">${escapeHtml(item.text)}</a>`,
              )
              .join('<br>')}`,
        )
        .join('<br><br>')}`,
    );
    text.push(
      'De los perfiles que sigues:',
      ...profiles.flatMap(profile => [
        `- ${profile.name} (${profileUrl(profile.handle)})`,
        ...items(profile).map(item => `  ${item.text} (${item.url})`),
      ]),
      '',
    );
  }
  if (!paragraphs.length) {
    paragraphs.push('Hubo novedades en lo que sigues.');
    text.push('Hubo novedades en lo que sigues.');
  }
  return {
    subject: 'Tu semana en lo que sigues en shwcs',
    heading: 'Tu semana en lo que sigues',
    paragraphs,
    text: text.join('\n'),
    button: { label: 'Ver lo que sigo', href: `${origin}/es/account/community` },
    footerNote:
      'Te escribimos una vez por semana porque activaste los correos de comunidad en Preferencias de avisos. Nadie ve a quién sigues.',
  };
}

/** Reads the week of one follow notice (`follow:<account>:<YYYY-MM-DD>`). */
export async function loadFollowDigestEmail({
  title,
  sourceKey,
  owner,
  origin,
}: {
  title: string;
  sourceKey: string;
  owner: string;
  origin: string;
}) {
  const week = /^follow:[0-9a-f-]{36}:(\d{4}-\d{2}-\d{2})$/.exec(sourceKey)?.[1] ?? null;
  const sql = authSql();
  const [lists, curatorLists, projects, profiles] = week
    ? await Promise.all([
        sql`SELECT l.id::text, l.name, jsonb_agg(DISTINCT s.published_data->>'name') AS projects
          FROM community_list_follows f
          JOIN buyer_lists l ON l.id = f.list_id AND l.visibility = 'public'
          JOIN buyer_list_items i ON i.list_id = l.id AND i.owner_id = l.owner_id
           AND i.created_at >= ${week}::date::timestamp AT TIME ZONE 'UTC'
           AND i.created_at < (${week}::date + 7)::timestamp AT TIME ZONE 'UTC'
           AND i.created_at >= f.created_at
          JOIN founder_solutions s
            ON (i.project_key = 'solution:' || s.id::text
                OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
           AND s.published_data IS NOT NULL
          WHERE f.follower_id = ${owner} AND community_list_visible(l.id)
          GROUP BY l.id, l.name ORDER BY count(DISTINCT s.id) DESC, l.name LIMIT 10`,
        sql`SELECT l.id::text, l.name, l.curator_name
          FROM community_curator_follows c
          JOIN community_list_announcements a
            ON a.curator_id = c.curator_id AND a.curator_key = c.curator_key
           AND a.announced_at >= ${week}::date::timestamp AT TIME ZONE 'UTC'
           AND a.announced_at < (${week}::date + 7)::timestamp AT TIME ZONE 'UTC'
           AND a.announced_at >= c.created_at
          JOIN buyer_lists l ON l.id = a.list_id AND l.visibility = 'public'
          WHERE c.follower_id = ${owner}
          ORDER BY a.announced_at DESC LIMIT 10`,
        // Updates of followed listings that week (SHCWS-24), never hidden or deleted ones.
        sql`SELECT s.id::text, s.published_data->>'name' AS name,
            jsonb_agg(jsonb_build_object('kind', u.kind, 'body', u.body) ORDER BY u.created_at DESC) AS updates
          FROM solution_follows f
          JOIN founder_solutions s ON s.id = f.solution_id AND s.published_data IS NOT NULL
           AND s.owner_id <> f.follower_id
          JOIN solution_updates u ON u.solution_id = s.id AND u.hidden_at IS NULL AND u.deleted_at IS NULL
           AND u.created_at >= ${week}::date::timestamp AT TIME ZONE 'UTC'
           AND u.created_at < (${week}::date + 7)::timestamp AT TIME ZONE 'UTC'
           AND u.created_at >= f.created_at
          WHERE f.follower_id = ${owner}
          GROUP BY s.id, name ORDER BY max(u.created_at) DESC LIMIT 10`.catch(() => []),
        // Followed public profiles (SHCWS-120), only while visible, minus what they hide.
        sql`SELECT p.handle, p.display_name,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'slug', s.slug, 'name', s.published_data->>'name')
                ORDER BY a.announced_at DESC)
              FROM profile_project_announcements a JOIN founder_solutions s ON s.id = a.solution_id
               AND s.owner_id = p.account_id AND s.published_data IS NOT NULL AND NOT (s.id = ANY (p.hidden_solutions))
              WHERE a.account_id = p.account_id
                AND a.announced_at >= ${week}::date::timestamp AT TIME ZONE 'UTC'
                AND a.announced_at < (${week}::date + 7)::timestamp AT TIME ZONE 'UTC'
                AND a.announced_at >= f.created_at), '[]'::jsonb) AS projects,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name) ORDER BY a.announced_at DESC)
              FROM community_list_announcements a JOIN buyer_lists l ON l.id = a.list_id
               AND l.visibility = 'public' AND NOT (l.id = ANY (p.hidden_lists))
              WHERE a.curator_id = p.account_id
                AND a.announced_at >= ${week}::date::timestamp AT TIME ZONE 'UTC'
                AND a.announced_at < (${week}::date + 7)::timestamp AT TIME ZONE 'UTC'
                AND a.announced_at >= f.created_at), '[]'::jsonb) AS lists
          FROM profile_follows f JOIN public_profiles p ON p.account_id = f.profile_id
          WHERE f.follower_id = ${owner} AND profile_visible(p.account_id)
          ORDER BY f.created_at DESC LIMIT 20`.catch(() => []),
      ])
    : [[], [], [], []];
  // A list already listed under the curators followed isn't repeated under the profile.
  const curatorListIds = new Set(curatorLists.map(row => String(row.id)));
  return followDigestEmail({
    title,
    lists: lists.map(row => ({
      id: String(row.id),
      name: String(row.name),
      projects: (row.projects as unknown[]).map(String),
    })),
    curatorLists: curatorLists.map(row => ({
      id: String(row.id),
      name: String(row.name),
      curator: String(row.curator_name),
    })),
    projects: projects.map(row => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      updates: (row.updates as Array<{ kind: SolutionUpdateKind; body: string }>).slice(0, 3),
    })),
    profiles: profiles
      .map(row => ({
        handle: String(row.handle),
        name: String(row.display_name),
        projects: (row.projects as Array<{ id: string; slug: string | null; name: string }>)
          .slice(0, 5)
          .map(project => ({
            path: `/soluciones/${project.slug || project.id}`,
            name: String(project.name ?? ''),
          })),
        lists: (row.lists as Array<{ id: string; name: string }>)
          .filter(list => !curatorListIds.has(String(list.id)))
          .slice(0, 5)
          .map(list => ({ id: String(list.id), name: String(list.name) })),
      }))
      .filter(profile => profile.projects.length || profile.lists.length),
    origin,
  });
}
