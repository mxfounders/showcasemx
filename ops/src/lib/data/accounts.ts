import { getDb } from '../db';
import { iso, likePattern } from '../http';
import { deviceLabel } from '../device';

export const ACCOUNT_FILTERS = [
  'all',
  'recent',
  'founders',
  'buyers',
  'unverified',
  'suspended',
  'ops',
  'twofactor',
] as const;
export type AccountFilter = (typeof ACCOUNT_FILTERS)[number];
export const ACCOUNT_SORTS = ['created', 'email', 'seen', 'solutions'] as const;
export type AccountSort = (typeof ACCOUNT_SORTS)[number];

export interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  profile: string | null;
  createdAt: string | null;
  emailVerifiedAt: string | null;
  suspendedAt: string | null;
  twoFactor: boolean;
  google: boolean;
  solutionCount: number;
  publishedCount: number;
  pendingCount: number;
  contactsSent: number;
  contactsReceived: number;
  activeSessions: number;
  lastSeenAt: string | null;
  isOps: boolean;
  opsLevel: string | null;
}

export async function listAccounts(options: {
  filter?: AccountFilter;
  q?: string;
  sort?: AccountSort;
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}) {
  const sql = getDb();
  const pageSize = options.pageSize ?? 30;
  const page = options.page ?? 1;
  const filter = options.filter ?? 'all';
  const like = likePattern(options.q ?? '');
  const sort = options.sort ?? 'created';
  const dir = options.dir ?? (sort === 'email' ? 'asc' : 'desc');

  const [rows, counts] = await sql.transaction(
    [
      sql`
        WITH base AS (
          SELECT a.id, a.email, a.name, a.organization, a.profile, a.created_at, a.email_verified_at, a.suspended_at,
            (a.totp_confirmed_at IS NOT NULL) AS two_factor,
            EXISTS (SELECT 1 FROM auth_google_identities g WHERE g.account_id = a.id) AS google,
            (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id) AS solution_count,
            (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.published_data IS NOT NULL) AS published_count,
            (SELECT count(*)::int FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.status = 'pending') AS pending_count,
            (SELECT count(*)::int FROM contact_requests cr WHERE cr.buyer_id = a.id) AS contacts_sent,
            (SELECT count(*)::int FROM contact_requests cr WHERE cr.recipient_id = a.id) AS contacts_received,
            (SELECT count(*)::int FROM auth_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS active_sessions,
            (SELECT max(s.last_seen_at) FROM auth_sessions s WHERE s.account_id = a.id) AS last_seen_at,
            (SELECT count(*)::int FROM buyer_saved_projects sp WHERE sp.owner_id = a.id) AS saved_count,
            r.level AS ops_level, (r.account_id IS NOT NULL AND r.disabled_at IS NULL) AS is_ops
          FROM auth_accounts a
          LEFT JOIN solution_reviewers r ON r.account_id = a.id
          WHERE (${like}::text IS NULL
            OR lower(a.email) LIKE ${like}
            OR lower(COALESCE(a.name, '')) LIKE ${like}
            OR lower(COALESCE(a.organization, '')) LIKE ${like}
            OR a.id::text = ${options.q?.trim() ?? ''})
        )
        SELECT *, count(*) OVER () AS total FROM base
        WHERE CASE ${filter}
          WHEN 'recent' THEN created_at > now() - interval '7 days'
          WHEN 'founders' THEN solution_count > 0
          WHEN 'buyers' THEN saved_count > 0 OR contacts_sent > 0
          WHEN 'unverified' THEN email_verified_at IS NULL
          WHEN 'suspended' THEN suspended_at IS NOT NULL
          WHEN 'ops' THEN is_ops
          WHEN 'twofactor' THEN two_factor
          ELSE true END
        ORDER BY
          CASE WHEN ${sort} = 'email' AND ${dir} = 'asc' THEN email END ASC,
          CASE WHEN ${sort} = 'email' AND ${dir} = 'desc' THEN email END DESC,
          CASE WHEN ${sort} = 'seen' AND ${dir} = 'asc' THEN last_seen_at END ASC NULLS FIRST,
          CASE WHEN ${sort} = 'seen' AND ${dir} = 'desc' THEN last_seen_at END DESC NULLS LAST,
          CASE WHEN ${sort} = 'solutions' AND ${dir} = 'asc' THEN solution_count END ASC,
          CASE WHEN ${sort} = 'solutions' AND ${dir} = 'desc' THEN solution_count END DESC,
          CASE WHEN ${sort} = 'created' AND ${dir} = 'asc' THEN created_at END ASC,
          created_at DESC, id
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`
        SELECT
          count(*)::int AS all,
          count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS recent,
          count(*) FILTER (WHERE email_verified_at IS NULL)::int AS unverified,
          count(*) FILTER (WHERE suspended_at IS NOT NULL)::int AS suspended,
          count(*) FILTER (WHERE totp_confirmed_at IS NOT NULL)::int AS twofactor,
          (SELECT count(DISTINCT owner_id)::int FROM founder_solutions) AS founders,
          (SELECT count(*)::int FROM solution_reviewers WHERE disabled_at IS NULL) AS ops
        FROM auth_accounts
      `,
    ],
    { readOnly: true },
  );

  const c = counts[0] ?? {};
  return {
    items: rows.slice(0, pageSize).map((r): AccountRow => ({
      id: String(r.id),
      email: String(r.email),
      name: r.name ? String(r.name) : null,
      organization: r.organization ? String(r.organization) : null,
      profile: r.profile ? String(r.profile) : null,
      createdAt: iso(r.created_at),
      emailVerifiedAt: iso(r.email_verified_at),
      suspendedAt: iso(r.suspended_at),
      twoFactor: Boolean(r.two_factor),
      google: Boolean(r.google),
      solutionCount: Number(r.solution_count),
      publishedCount: Number(r.published_count),
      pendingCount: Number(r.pending_count),
      contactsSent: Number(r.contacts_sent),
      contactsReceived: Number(r.contacts_received),
      activeSessions: Number(r.active_sessions),
      lastSeenAt: iso(r.last_seen_at),
      isOps: Boolean(r.is_ops),
      opsLevel: r.ops_level ? String(r.ops_level) : null,
    })),
    hasMore: rows.length > pageSize,
    total: rows.length ? Number(rows[0].total) : 0,
    page,
    pageSize,
    sort,
    dir,
    counts: {
      all: Number(c.all ?? 0),
      recent: Number(c.recent ?? 0),
      unverified: Number(c.unverified ?? 0),
      suspended: Number(c.suspended ?? 0),
      twofactor: Number(c.twofactor ?? 0),
      founders: Number(c.founders ?? 0),
      ops: Number(c.ops ?? 0),
    } as Record<string, number>,
  };
}

/**
 * Everything ops may know about one account. Privacy boundary (CLAUDE.md §44):
 * never buyer_lists.purpose, buyer_list_items.note, contact_requests.details or
 * contact_events.message — only names, counts, statuses and dates.
 */
export async function accountDetail(id: string) {
  const sql = getDb();
  const [
    accRows,
    productSessions,
    opsSessions,
    solutions,
    lists,
    saved,
    contactsSent,
    contactsReceived,
    listLikes,
    savedLists,
    listComments,
    solutionLikes,
    solutionComments,
    notifications,
    pending,
    audit,
  ] = await sql.transaction(
    [
      sql`
        SELECT a.id, a.email, a.name, a.organization, a.profile, a.role, a.created_at, a.email_verified_at,
          a.dashboard_mode, (a.avatar_key IS NOT NULL OR a.avatar_data IS NOT NULL) AS has_avatar,
          a.suspended_at, a.suspended_reason, suspender.email AS suspended_by_email,
          a.totp_confirmed_at, COALESCE(cardinality(a.backup_codes), 0) AS backup_codes_left,
          g.email AS google_email, g.created_at AS google_linked_at,
          r.level AS ops_level, r.created_at AS ops_since, r.disabled_at AS ops_disabled_at,
          r.totp_confirmed_at AS ops_totp_at, r.enroll_by AS ops_enroll_by,
          COALESCE(cardinality(r.backup_codes), 0) AS ops_backup_codes_left, granter.email AS ops_granted_by,
          np.contact_email AS pref_contact_email, np.solution_email AS pref_solution_email,
          ns.created_at AS newsletter_since, ns.unsubscribed_at AS newsletter_unsubscribed_at,
          ns.profile AS newsletter_profile, ns.role AS newsletter_role
        FROM auth_accounts a
        LEFT JOIN auth_accounts suspender ON suspender.id = a.suspended_by
        LEFT JOIN auth_google_identities g ON g.account_id = a.id
        LEFT JOIN solution_reviewers r ON r.account_id = a.id
        LEFT JOIN auth_accounts granter ON granter.id = r.granted_by
        LEFT JOIN notification_preferences np ON np.owner_id = a.id
        LEFT JOIN newsletter_subscribers ns ON ns.email = a.email
        WHERE a.id = ${id} LIMIT 1
      `,
      sql`
        SELECT token_hash, created_at, last_seen_at, expires_at, user_agent
        FROM auth_sessions WHERE account_id = ${id} AND expires_at > now()
        ORDER BY last_seen_at DESC LIMIT 20
      `,
      sql`
        SELECT token_hash, created_at, last_seen_at, expires_at, ip, user_agent, elevated_until
        FROM ops_sessions WHERE account_id = ${id} AND expires_at > now()
        ORDER BY last_seen_at DESC
      `,
      sql`
        SELECT fs.id, fs.status, fs.version, fs.published_at, fs.catalog_key, fs.updated_at, fs.created_at,
          COALESCE(NULLIF(fs.data->>'name', ''), '(sin nombre)') AS name,
          COALESCE(fs.data->'categories'->>0, fs.data->>'category', '') AS category,
          (fs.published_data IS NOT NULL) AS has_published,
          (SELECT count(*)::int FROM solution_media m WHERE m.solution_id = fs.id) AS media_count,
          (SELECT count(*)::int FROM solution_reports rp WHERE rp.solution_id = fs.id AND rp.status = 'open') AS open_reports,
          (SELECT COALESCE(sum(views), 0)::int FROM solution_daily_metrics dm WHERE dm.solution_id = fs.id AND dm.day >= current_date - 29) AS views_30d
        FROM founder_solutions fs WHERE fs.owner_id = ${id} ORDER BY fs.updated_at DESC LIMIT 50
      `,
      sql`
        SELECT l.id, l.name, l.visibility, l.categories, l.updated_at, l.created_at,
          (SELECT count(*)::int FROM buyer_list_items i WHERE i.owner_id = ${id} AND i.list_id = l.id) AS item_count,
          (SELECT count(*)::int FROM community_list_likes cl WHERE cl.list_id = l.id) AS likes,
          (SELECT count(*)::int FROM community_list_comments cc WHERE cc.list_id = l.id) AS comments
        FROM buyer_lists l WHERE l.owner_id = ${id} ORDER BY l.updated_at DESC LIMIT 50
      `,
      // Which projects a buyer saved stays private; ops only sees how many.
      sql`SELECT count(*)::int AS n FROM buyer_saved_projects WHERE owner_id = ${id}`,
      sql`
        SELECT cr.id, cr.status, cr.project_name, cr.solution_id, cr.created_at, cr.updated_at,
          recipient.email AS counterpart_email,
          (SELECT count(*)::int FROM contact_events ce WHERE ce.request_id = cr.id) AS event_count
        FROM contact_requests cr LEFT JOIN auth_accounts recipient ON recipient.id = cr.recipient_id
        WHERE cr.buyer_id = ${id} ORDER BY cr.created_at DESC LIMIT 30
      `,
      sql`
        SELECT cr.id, cr.status, cr.project_name, cr.solution_id, cr.buyer_email AS counterpart_email,
          cr.created_at, cr.updated_at,
          (SELECT count(*)::int FROM contact_events ce WHERE ce.request_id = cr.id) AS event_count
        FROM contact_requests cr WHERE cr.recipient_id = ${id} ORDER BY cr.created_at DESC LIMIT 30
      `,
      sql`
        SELECT l.id, l.name, cl.created_at FROM community_list_likes cl JOIN buyer_lists l ON l.id = cl.list_id
        WHERE cl.owner_id = ${id} ORDER BY cl.created_at DESC LIMIT 30
      `,
      sql`
        SELECT l.id, l.name, cs.created_at FROM community_saved_lists cs JOIN buyer_lists l ON l.id = cs.list_id
        WHERE cs.owner_id = ${id} ORDER BY cs.created_at DESC LIMIT 30
      `,
      sql`
        SELECT c.id, c.list_id, l.name AS target_name, c.author_name, c.body, c.created_at
        FROM community_list_comments c JOIN buyer_lists l ON l.id = c.list_id
        WHERE c.author_id = ${id} ORDER BY c.created_at DESC LIMIT 30
      `,
      sql`
        SELECT sl.solution_id, COALESCE(fs.published_data->>'name', fs.data->>'name') AS name, sl.created_at
        FROM solution_likes sl JOIN founder_solutions fs ON fs.id = sl.solution_id
        WHERE sl.owner_id = ${id} ORDER BY sl.created_at DESC LIMIT 30
      `,
      sql`
        SELECT c.id, c.solution_id, COALESCE(fs.published_data->>'name', fs.data->>'name') AS target_name,
          c.author_name, c.body, c.created_at
        FROM solution_comments c JOIN founder_solutions fs ON fs.id = c.solution_id
        WHERE c.author_id = ${id} ORDER BY c.created_at DESC LIMIT 30
      `,
      sql`
        SELECT id, category, title, email_state, attempts, read_at, created_at
        FROM account_notifications WHERE owner_id = ${id} ORDER BY created_at DESC LIMIT 40
      `,
      sql`
        SELECT
          (SELECT count(*)::int FROM auth_password_resets WHERE account_id = ${id} AND expires_at > now()) AS password_resets,
          (SELECT count(*)::int FROM auth_email_verifications WHERE account_id = ${id} AND expires_at > now()) AS email_verifications,
          (SELECT count(*)::int FROM auth_login_challenges WHERE account_id = ${id} AND expires_at > now()) AS login_challenges,
          (SELECT count(*)::int FROM ops_login_challenges WHERE account_id = ${id} AND expires_at > now()) AS ops_challenges
      `,
      sql`
        SELECT id, actor_email, action, subject_type, subject_id, reason, metadata, ip, created_at,
          (actor_id = ${id}) AS by_this_account
        FROM ops_audit_log
        WHERE (subject_type IN ('account', 'session') AND subject_id IN (${id}, (SELECT email FROM auth_accounts WHERE id = ${id})))
           OR actor_id = ${id}
        ORDER BY chain_seq DESC NULLS LAST, id DESC LIMIT 60
      `,
    ],
    { readOnly: true },
  );

  if (!accRows.length) return null;
  const a = accRows[0];
  const p = pending[0] ?? {};
  const contactRow = (c: Record<string, unknown>) => ({
    id: String(c.id),
    status: String(c.status),
    projectName: String(c.project_name),
    solutionId: String(c.solution_id),
    counterpartEmail: c.counterpart_email ? String(c.counterpart_email) : null,
    eventCount: Number(c.event_count ?? 0),
    createdAt: iso(c.created_at),
    updatedAt: iso(c.updated_at),
  });
  const comment = (c: Record<string, unknown>, kind: 'list' | 'solution') => ({
    id: String(c.id),
    kind,
    targetId: String(kind === 'list' ? c.list_id : c.solution_id),
    targetName: c.target_name ? String(c.target_name) : '(sin nombre)',
    authorName: String(c.author_name),
    body: String(c.body),
    createdAt: iso(c.created_at),
  });

  return {
    account: {
      id: String(a.id),
      email: String(a.email),
      name: a.name ? String(a.name) : null,
      organization: a.organization ? String(a.organization) : null,
      profile: a.profile ? String(a.profile) : null,
      role: a.role ? String(a.role) : null,
      createdAt: iso(a.created_at),
      emailVerifiedAt: iso(a.email_verified_at),
      dashboardMode: a.dashboard_mode ? String(a.dashboard_mode) : null,
      hasAvatar: Boolean(a.has_avatar),
      suspendedAt: iso(a.suspended_at),
      suspendedReason: a.suspended_reason ? String(a.suspended_reason) : null,
      suspendedByEmail: a.suspended_by_email ? String(a.suspended_by_email) : null,
      twoFactorAt: iso(a.totp_confirmed_at),
      backupCodesLeft: Number(a.backup_codes_left ?? 0),
      googleEmail: a.google_email ? String(a.google_email) : null,
      googleLinkedAt: iso(a.google_linked_at),
      isOps: Boolean(a.ops_level) && !a.ops_disabled_at,
      productSessions: productSessions.length,
      savedCount: Number(saved[0]?.n ?? 0),
      ops: a.ops_level
        ? {
            level: String(a.ops_level),
            since: iso(a.ops_since),
            disabledAt: iso(a.ops_disabled_at),
            totpAt: iso(a.ops_totp_at),
            enrollBy: iso(a.ops_enroll_by),
            backupCodesLeft: Number(a.ops_backup_codes_left ?? 0),
            grantedBy: a.ops_granted_by ? String(a.ops_granted_by) : null,
          }
        : null,
      preferences:
        a.pref_contact_email === null && a.pref_solution_email === null
          ? null
          : {
              contactEmail: Boolean(a.pref_contact_email),
              solutionEmail: Boolean(a.pref_solution_email),
            },
      newsletter: a.newsletter_since
        ? {
            since: iso(a.newsletter_since),
            unsubscribedAt: iso(a.newsletter_unsubscribed_at),
            profile: a.newsletter_profile ? String(a.newsletter_profile) : null,
            role: a.newsletter_role ? String(a.newsletter_role) : null,
          }
        : null,
    },
    pendingTokens: {
      passwordResets: Number(p.password_resets ?? 0),
      emailVerifications: Number(p.email_verifications ?? 0),
      loginChallenges: Number(p.login_challenges ?? 0),
      opsChallenges: Number(p.ops_challenges ?? 0),
    },
    productSessionList: productSessions.map(s => ({
      id: String(s.token_hash).slice(0, 12),
      device: deviceLabel(s.user_agent as string | null),
      createdAt: iso(s.created_at),
      lastSeenAt: iso(s.last_seen_at),
      expiresAt: iso(s.expires_at),
    })),
    opsSessions: opsSessions.map(s => ({
      id: String(s.token_hash).slice(0, 12),
      device: deviceLabel(s.user_agent as string | null),
      ip: s.ip ? String(s.ip) : null,
      userAgent: s.user_agent ? String(s.user_agent) : null,
      createdAt: iso(s.created_at),
      lastSeenAt: iso(s.last_seen_at),
      expiresAt: iso(s.expires_at),
      elevatedUntil: iso(s.elevated_until),
    })),
    solutions: solutions.map(s => ({
      id: String(s.id),
      status: String(s.status),
      version: Number(s.version),
      publishedAt: iso(s.published_at),
      catalogKey: s.catalog_key ? String(s.catalog_key) : null,
      updatedAt: iso(s.updated_at),
      createdAt: iso(s.created_at),
      name: String(s.name),
      category: String(s.category ?? ''),
      hasPublished: Boolean(s.has_published),
      mediaCount: Number(s.media_count),
      openReports: Number(s.open_reports),
      views30d: Number(s.views_30d),
    })),
    lists: lists.map(l => ({
      id: String(l.id),
      name: String(l.name),
      visibility: String(l.visibility),
      categories: Array.isArray(l.categories) ? (l.categories as string[]) : [],
      itemCount: Number(l.item_count),
      likes: Number(l.likes),
      comments: Number(l.comments),
      updatedAt: iso(l.updated_at),
      createdAt: iso(l.created_at),
    })),
    contactsSent: contactsSent.map(contactRow),
    contactsReceived: contactsReceived.map(contactRow),
    community: {
      likes: listLikes.map(l => ({
        id: String(l.id),
        name: String(l.name),
        createdAt: iso(l.created_at),
      })),
      savedLists: savedLists.map(l => ({
        id: String(l.id),
        name: String(l.name),
        createdAt: iso(l.created_at),
      })),
      solutionLikes: solutionLikes.map(l => ({
        id: String(l.solution_id),
        name: l.name ? String(l.name) : '(sin nombre)',
        createdAt: iso(l.created_at),
      })),
      comments: [
        ...listComments.map(c => comment(c, 'list')),
        ...solutionComments.map(c => comment(c, 'solution')),
      ].sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt))),
    },
    notifications: notifications.map(n => ({
      id: String(n.id),
      category: String(n.category),
      title: String(n.title),
      emailState: String(n.email_state),
      attempts: Number(n.attempts ?? 0),
      readAt: iso(n.read_at),
      createdAt: iso(n.created_at),
    })),
    audit: audit.map(e => ({
      id: String(e.id),
      actorEmail: String(e.actor_email),
      action: String(e.action),
      subjectType: String(e.subject_type),
      subjectId: String(e.subject_id),
      reason: String(e.reason ?? ''),
      metadata: (e.metadata ?? {}) as Record<string, unknown>,
      ip: e.ip ? String(e.ip) : null,
      createdAt: iso(e.created_at),
      byThisAccount: Boolean(e.by_this_account),
    })),
  };
}

export type AccountDetail = NonNullable<Awaited<ReturnType<typeof accountDetail>>>;
