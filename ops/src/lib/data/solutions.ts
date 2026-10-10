import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const SOLUTION_STATUSES = [
  'all',
  'pending',
  'changes_requested',
  'published',
  'rejected',
  'draft',
] as const;
export type SolutionStatusFilter = (typeof SOLUTION_STATUSES)[number];
export const SOLUTION_SORTS = ['updated', 'created', 'name', 'waiting'] as const;
export type SolutionSort = (typeof SOLUTION_SORTS)[number];

export interface SolutionRow {
  id: string;
  status: string;
  version: number;
  updatedAt: string | null;
  createdAt: string | null;
  publishedAt: string | null;
  catalogKey: string | null;
  name: string;
  category: string;
  website: string | null;
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  ownerVerified: boolean;
  ownerNew: boolean;
  hasPublished: boolean;
  unpublishedChanges: boolean;
  openReports: number;
  mediaCount: number;
  eventCount: number;
}

export async function listSolutions(options: {
  status: SolutionStatusFilter;
  q?: string;
  catalog?: string;
  category?: string;
  sort?: SolutionSort;
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}) {
  const sql = getDb();
  const pageSize = options.pageSize ?? 25;
  const page = options.page ?? 1;
  const like = likePattern(options.q ?? '');
  const catalog =
    options.catalog === 'cord' || options.catalog === 'flouvia' ? options.catalog : null;
  const category = options.category?.trim() ? options.category.trim().slice(0, 60) : null;
  const sort = options.sort ?? (options.status === 'pending' ? 'waiting' : 'updated');
  const dir = options.dir ?? (sort === 'name' || sort === 'waiting' ? 'asc' : 'desc');

  const [rows, counts] = await sql.transaction(
    [
      sql`
        SELECT fs.id, fs.status, fs.version, fs.updated_at, fs.created_at, fs.published_at, fs.catalog_key,
          COALESCE(NULLIF(fs.data->>'name', ''), fs.published_data->>'name', '(sin nombre)') AS name,
          COALESCE(fs.data->'categories'->>0, fs.data->>'category', '') AS category,
          fs.data->>'website' AS website,
          a.id AS owner_id, a.email AS owner_email, a.name AS owner_name,
          (a.email_verified_at IS NOT NULL) AS owner_verified,
          (a.created_at > now() - interval '7 days') AS owner_new,
          (fs.published_data IS NOT NULL) AS has_published,
          (fs.published_data IS NOT NULL AND fs.data IS DISTINCT FROM fs.published_data) AS unpublished_changes,
          (SELECT count(*)::int FROM solution_reports r WHERE r.solution_id = fs.id AND r.status = 'open') AS open_reports,
          (SELECT count(*)::int FROM solution_media m WHERE m.solution_id = fs.id) AS media_count,
          (SELECT count(*)::int FROM solution_events e WHERE e.solution_id = fs.id) AS event_count,
          count(*) OVER () AS total
        FROM founder_solutions fs
        JOIN auth_accounts a ON a.id = fs.owner_id
        WHERE (${options.status}::text = 'all' OR fs.status = ${options.status})
          AND (${like}::text IS NULL
            OR lower(COALESCE(fs.data->>'name', '')) LIKE ${like}
            OR lower(COALESCE(fs.published_data->>'name', '')) LIKE ${like}
            OR lower(a.email) LIKE ${like}
            OR lower(COALESCE(fs.data->>'website', '')) LIKE ${like}
            OR fs.id::text = ${options.q?.trim() ?? ''})
          AND (${catalog}::text IS NULL OR fs.catalog_key = ${catalog})
          AND (${category}::text IS NULL OR fs.data->'categories' ? ${category} OR fs.data->>'category' = ${category})
        ORDER BY
          CASE WHEN ${sort} = 'name' AND ${dir} = 'asc' THEN lower(COALESCE(fs.data->>'name', '')) END ASC,
          CASE WHEN ${sort} = 'name' AND ${dir} = 'desc' THEN lower(COALESCE(fs.data->>'name', '')) END DESC,
          CASE WHEN ${sort} = 'created' AND ${dir} = 'asc' THEN fs.created_at END ASC,
          CASE WHEN ${sort} = 'created' AND ${dir} = 'desc' THEN fs.created_at END DESC,
          CASE WHEN ${sort} IN ('updated', 'waiting') AND ${dir} = 'asc' THEN fs.updated_at END ASC,
          CASE WHEN ${sort} IN ('updated', 'waiting') AND ${dir} = 'desc' THEN fs.updated_at END DESC,
          fs.id
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`SELECT status, count(*)::int AS n FROM founder_solutions GROUP BY status`,
    ],
    { readOnly: true },
  );

  const statusCounts: Record<string, number> = { all: 0 };
  for (const row of counts) {
    statusCounts[String(row.status)] = Number(row.n);
    statusCounts.all += Number(row.n);
  }

  return {
    items: rows.slice(0, pageSize).map((r): SolutionRow => ({
      id: String(r.id),
      status: String(r.status),
      version: Number(r.version),
      updatedAt: iso(r.updated_at),
      createdAt: iso(r.created_at),
      publishedAt: iso(r.published_at),
      catalogKey: r.catalog_key ? String(r.catalog_key) : null,
      name: String(r.name),
      category: String(r.category ?? ''),
      website: r.website ? String(r.website) : null,
      ownerId: String(r.owner_id),
      ownerEmail: String(r.owner_email),
      ownerName: r.owner_name ? String(r.owner_name) : null,
      ownerVerified: Boolean(r.owner_verified),
      ownerNew: Boolean(r.owner_new),
      hasPublished: Boolean(r.has_published),
      unpublishedChanges: Boolean(r.unpublished_changes),
      openReports: Number(r.open_reports),
      mediaCount: Number(r.media_count),
      eventCount: Number(r.event_count),
    })),
    hasMore: rows.length > pageSize,
    total: rows.length ? Number(rows[0].total) : 0,
    page,
    pageSize,
    sort,
    dir,
    statusCounts,
  };
}

export async function solutionCategories(): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT DISTINCT value FROM (
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(data->'categories') = 'array' THEN data->'categories' ELSE '[]'::jsonb END) AS value
      FROM founder_solutions
      UNION SELECT data->>'category' FROM founder_solutions
    ) c WHERE value IS NOT NULL AND value <> '' ORDER BY value
  `;
  return rows.map(r => String(r.value));
}

export type SolutionData = Record<string, unknown>;

export async function solutionDetail(id: string) {
  const sql = getDb();
  const [
    main,
    events,
    media,
    siteImage,
    domain,
    reports,
    metrics,
    totals,
    comments,
    audit,
    neighbours,
  ] = await sql.transaction(
    [
      sql`
          SELECT fs.id, fs.status, fs.version, fs.step, fs.editor_question, fs.data, fs.published_data, fs.catalog_key,
            fs.created_at, fs.updated_at, fs.published_at,
            a.id AS owner_id, a.email AS owner_email, a.name AS owner_name, a.organization AS owner_org,
            a.created_at AS owner_created_at, a.email_verified_at AS owner_verified_at, a.suspended_at AS owner_suspended_at,
            (SELECT count(*)::int FROM founder_solutions o WHERE o.owner_id = a.id) AS owner_solutions
          FROM founder_solutions fs JOIN auth_accounts a ON a.id = fs.owner_id
          WHERE fs.id = ${id} LIMIT 1
        `,
      sql`
          SELECT se.id, se.status, se.message, se.created_at, a.email AS actor_email,
            (se.actor_id IS NOT NULL AND EXISTS (SELECT 1 FROM solution_reviewers r WHERE r.account_id = se.actor_id)) AS actor_is_ops
          FROM solution_events se LEFT JOIN auth_accounts a ON a.id = se.actor_id
          WHERE se.solution_id = ${id} ORDER BY se.created_at DESC, se.id DESC LIMIT 100
        `,
      sql`
          SELECT m.id, m.width, m.height, m.bytes, m.created_at,
            (SELECT count(*)::int FROM solution_media_files f WHERE f.media_id = m.id) AS renditions
          FROM solution_media m WHERE m.solution_id = ${id} ORDER BY m.created_at ASC
        `,
      sql`
          SELECT source_url, image_url, width, height, failure, fetched_at, bytes, (storage_key IS NOT NULL) AS stored
          FROM solution_site_images WHERE solution_id = ${id} LIMIT 1
        `,
      sql`
          SELECT domain, expires_at, verified_at FROM solution_domain_proofs WHERE solution_id = ${id} LIMIT 1
        `,
      sql`
          SELECT r.id, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
            reporter.email AS reporter_email, reviewer.email AS reviewer_email
          FROM solution_reports r
          LEFT JOIN auth_accounts reporter ON reporter.id = r.reporter_id
          LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
          WHERE r.solution_id = ${id} ORDER BY r.created_at DESC LIMIT 50
        `,
      sql`
          WITH days AS (SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day)
          SELECT d.day::text AS day, COALESCE(m.views, 0)::int AS views, COALESCE(m.clicks, 0)::int AS clicks
          FROM days d LEFT JOIN solution_daily_metrics m ON m.day = d.day AND m.solution_id = ${id}
          ORDER BY d.day
        `,
      sql`
          SELECT
            (SELECT COALESCE(sum(views), 0)::int FROM solution_daily_metrics WHERE solution_id = ${id}) AS views_all,
            (SELECT COALESCE(sum(clicks), 0)::int FROM solution_daily_metrics WHERE solution_id = ${id}) AS clicks_all,
            (SELECT count(*)::int FROM solution_likes WHERE solution_id = ${id}) AS likes,
            (SELECT count(*)::int FROM buyer_saved_projects sp
              WHERE sp.project_key = 'solution:' || ${id}
                 OR sp.project_key = (SELECT 'catalog:' || catalog_key FROM founder_solutions WHERE id = ${id} AND catalog_key IS NOT NULL)) AS saves,
            (SELECT count(*)::int FROM contact_requests WHERE solution_id = ${id}) AS contacts,
            (SELECT count(*)::int FROM contact_requests WHERE solution_id = ${id} AND status = 'new') AS contacts_new
        `,
      sql`
          SELECT c.id, c.author_name, c.body, c.created_at, a.email AS author_email
          FROM solution_comments c LEFT JOIN auth_accounts a ON a.id = c.author_id
          WHERE c.solution_id = ${id} ORDER BY c.created_at DESC LIMIT 50
        `,
      sql`
          SELECT id, actor_email, action, reason, metadata, created_at FROM ops_audit_log
          WHERE subject_type = 'solution' AND subject_id = ${id}
          ORDER BY chain_seq DESC NULLS LAST, id DESC LIMIT 30
        `,
      sql`
          WITH me AS (SELECT updated_at FROM founder_solutions WHERE id = ${id})
          SELECT
            (SELECT fs.id FROM founder_solutions fs, me WHERE fs.status = 'pending' AND fs.id <> ${id}
              AND (fs.updated_at, fs.id) < (me.updated_at, ${id}::uuid) ORDER BY fs.updated_at DESC, fs.id DESC LIMIT 1) AS prev_id,
            (SELECT fs.id FROM founder_solutions fs, me WHERE fs.status = 'pending' AND fs.id <> ${id}
              AND (fs.updated_at, fs.id) > (me.updated_at, ${id}::uuid) ORDER BY fs.updated_at ASC, fs.id ASC LIMIT 1) AS next_id,
            (SELECT count(*)::int FROM founder_solutions WHERE status = 'pending') AS pending_total,
            (SELECT count(*)::int FROM founder_solutions fs, me WHERE fs.status = 'pending'
              AND (fs.updated_at, fs.id) <= (me.updated_at, ${id}::uuid)) AS position
        `,
    ],
    { readOnly: true },
  );

  if (!main.length) return null;
  const s = main[0];
  const t = totals[0] ?? {};
  const n = neighbours[0] ?? {};
  return {
    solution: {
      id: String(s.id),
      status: String(s.status),
      version: Number(s.version),
      step: Number(s.step ?? 0),
      editorQuestion: s.editor_question ? String(s.editor_question) : null,
      createdAt: iso(s.created_at),
      updatedAt: iso(s.updated_at),
      publishedAt: iso(s.published_at),
      catalogKey: s.catalog_key ? String(s.catalog_key) : null,
      data: (s.data ?? {}) as SolutionData,
      publishedData: (s.published_data ?? null) as SolutionData | null,
      ownerId: String(s.owner_id),
      ownerEmail: String(s.owner_email),
      ownerName: s.owner_name ? String(s.owner_name) : null,
      ownerOrganization: s.owner_org ? String(s.owner_org) : null,
      ownerCreatedAt: iso(s.owner_created_at),
      ownerVerifiedAt: iso(s.owner_verified_at),
      ownerSuspendedAt: iso(s.owner_suspended_at),
      ownerSolutions: Number(s.owner_solutions ?? 0),
    },
    events: events.map(e => ({
      id: String(e.id),
      status: String(e.status),
      message: String(e.message ?? ''),
      createdAt: iso(e.created_at),
      actorEmail: e.actor_email ? String(e.actor_email) : null,
      actorIsOps: Boolean(e.actor_is_ops),
    })),
    media: media.map(m => ({
      id: String(m.id),
      width: m.width !== null ? Number(m.width) : null,
      height: m.height !== null ? Number(m.height) : null,
      bytes: m.bytes !== null ? Number(m.bytes) : null,
      renditions: Number(m.renditions ?? 0),
      createdAt: iso(m.created_at),
    })),
    siteImage: siteImage.length
      ? {
          sourceUrl: siteImage[0].source_url ? String(siteImage[0].source_url) : null,
          imageUrl: siteImage[0].image_url ? String(siteImage[0].image_url) : null,
          width: siteImage[0].width !== null ? Number(siteImage[0].width) : null,
          height: siteImage[0].height !== null ? Number(siteImage[0].height) : null,
          failure: siteImage[0].failure ? String(siteImage[0].failure) : null,
          fetchedAt: iso(siteImage[0].fetched_at),
          bytes: siteImage[0].bytes !== null ? Number(siteImage[0].bytes) : null,
          stored: Boolean(siteImage[0].stored),
        }
      : null,
    domainProof: domain.length
      ? {
          domain: String(domain[0].domain),
          expiresAt: iso(domain[0].expires_at),
          verifiedAt: iso(domain[0].verified_at),
        }
      : null,
    reports: reports.map(r => ({
      id: String(r.id),
      reason: String(r.reason),
      details: String(r.details ?? ''),
      status: String(r.status),
      decision: r.decision ? String(r.decision) : null,
      createdAt: iso(r.created_at),
      resolvedAt: iso(r.resolved_at),
      version: Number(r.version),
      reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
      reviewerEmail: r.reviewer_email ? String(r.reviewer_email) : null,
    })),
    metrics: {
      days: metrics.map(r => ({
        day: String(r.day),
        views: Number(r.views),
        clicks: Number(r.clicks),
      })),
      viewsAll: Number(t.views_all ?? 0),
      clicksAll: Number(t.clicks_all ?? 0),
      likes: Number(t.likes ?? 0),
      saves: Number(t.saves ?? 0),
      contacts: Number(t.contacts ?? 0),
      contactsNew: Number(t.contacts_new ?? 0),
    },
    comments: comments.map(c => ({
      id: String(c.id),
      authorName: String(c.author_name),
      authorEmail: c.author_email ? String(c.author_email) : null,
      body: String(c.body),
      createdAt: iso(c.created_at),
    })),
    audit: audit.map(a => ({
      id: String(a.id),
      actorEmail: String(a.actor_email),
      action: String(a.action),
      reason: String(a.reason ?? ''),
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
      createdAt: iso(a.created_at),
    })),
    queue: {
      prevId: n.prev_id ? String(n.prev_id) : null,
      nextId: n.next_id ? String(n.next_id) : null,
      pendingTotal: Number(n.pending_total ?? 0),
      position: Number(n.position ?? 0),
    },
  };
}

export type SolutionDetail = NonNullable<Awaited<ReturnType<typeof solutionDetail>>>;
