import { authSql } from '@/lib/auth/security';
import { escapeHtml } from './email-template';

/**
 * The weekly summary of what someone follows (SHCWS-121): new projects in the lists they
 * follow and new lists from the curators they follow, for the week named in the notice
 * (`follow:<account>:<monday>`, db/community-follows.sql). Sent the Monday after, only
 * with community emails on. Public lists and public signatures only; nothing about who
 * else follows them. Spanish until accounts store a language (SHCWS-25).
 */
export type FollowedListNews = { id: string; name: string; projects: string[] };
export type CuratorListNews = { id: string; name: string; curator: string };

export function followDigestEmail({
  title,
  lists,
  curatorLists,
  origin,
}: {
  title: string;
  lists: FollowedListNews[];
  curatorLists: CuratorListNews[];
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
  if (!paragraphs.length) {
    paragraphs.push('Hubo novedades en las listas y curadores que sigues.');
    text.push('Hubo novedades en las listas y curadores que sigues.');
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
  const [lists, curatorLists] = week
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
      ])
    : [[], []];
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
    origin,
  });
}
