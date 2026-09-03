import { NextRequest, NextResponse } from 'next/server';
import { requireOpsApi, isUuid } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { failure } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const user = await requireOpsApi();
  if (user instanceof Response) return user;

  const { id } = await props.params;
  if (!isUuid(id)) return failure('ID inválido.', 400);

  try {
    const sql = getDb();

    const accRows = await sql`
      SELECT a.id, a.email, a.name, a.organization, a.profile, a.role, a.created_at, a.email_verified_at,
        a.dashboard_mode, (a.avatar_data IS NOT NULL) AS has_avatar,
        a.suspended_at, a.suspended_reason, suspender.email AS suspended_by_email,
        g.email AS google_email,
        EXISTS(SELECT 1 FROM solution_reviewers r WHERE r.account_id = a.id AND r.disabled_at IS NULL) AS is_ops,
        (SELECT count(*)::int FROM auth_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS product_sessions,
        (SELECT count(*)::int FROM buyer_saved_projects WHERE owner_id = a.id) AS saved_count
      FROM auth_accounts a
      LEFT JOIN auth_accounts suspender ON suspender.id = a.suspended_by
      LEFT JOIN auth_google_identities g ON g.account_id = a.id
      WHERE a.id = ${id} LIMIT 1
    `;
    if (!accRows.length) return failure('Cuenta no encontrada.', 404);
    const acc = accRows[0];

    const [solutions, lists, contactsSent, contactsReceived, opsSessions, likes, savedLists, comments, notifications] = await sql.transaction([
      sql`
        SELECT fs.id, fs.status, fs.version, fs.published_at, fs.catalog_key, fs.updated_at,
          fs.data->>'name' AS name, fs.data->>'category' AS category,
          (fs.published_data IS NOT NULL) AS has_published,
          (SELECT count(*)::int FROM solution_media m WHERE m.solution_id = fs.id) AS media_count,
          (SELECT count(*)::int FROM solution_reports rp WHERE rp.solution_id = fs.id AND rp.status = 'open') AS open_reports
        FROM founder_solutions fs WHERE fs.owner_id = ${id} ORDER BY fs.updated_at DESC LIMIT 50
      `,
      sql`
        SELECT id, name, visibility, updated_at,
          (SELECT count(*)::int FROM buyer_list_items i WHERE i.owner_id = ${id} AND i.list_id = buyer_lists.id) AS item_count
        FROM buyer_lists WHERE owner_id = ${id} ORDER BY updated_at DESC LIMIT 50
      `,
      sql`
        SELECT cr.id, cr.status, cr.project_name, cr.solution_id, cr.created_at, cr.updated_at
        FROM contact_requests cr WHERE cr.buyer_id = ${id} ORDER BY cr.created_at DESC LIMIT 30
      `,
      sql`
        SELECT cr.id, cr.status, cr.project_name, cr.solution_id, cr.buyer_email, cr.created_at, cr.updated_at
        FROM contact_requests cr WHERE cr.recipient_id = ${id} ORDER BY cr.created_at DESC LIMIT 30
      `,
      sql`
        SELECT token_hash, created_at, last_seen_at, expires_at, ip, user_agent
        FROM ops_sessions WHERE account_id = ${id} AND expires_at > now() ORDER BY last_seen_at DESC
      `,
      sql`
        SELECT l.id, l.name FROM community_list_likes cl JOIN buyer_lists l ON l.id = cl.list_id
        WHERE cl.owner_id = ${id} ORDER BY cl.created_at DESC LIMIT 30
      `,
      sql`
        SELECT l.id, l.name FROM community_saved_lists cs JOIN buyer_lists l ON l.id = cs.list_id
        WHERE cs.owner_id = ${id} ORDER BY cs.created_at DESC LIMIT 30
      `,
      sql`
        SELECT c.id, c.list_id, l.name AS list_name, c.body, c.created_at
        FROM community_list_comments c JOIN buyer_lists l ON l.id = c.list_id
        WHERE c.author_id = ${id} ORDER BY c.created_at DESC LIMIT 30
      `,
      sql`
        SELECT category, title, email_state, read_at, created_at
        FROM account_notifications WHERE owner_id = ${id} ORDER BY created_at DESC LIMIT 30
      `,
    ]);

    return NextResponse.json({
      ok: true,
      account: {
        id: String(acc.id), email: String(acc.email), name: acc.name ?? null, organization: acc.organization ?? null,
        profile: acc.profile ?? null, role: acc.role ?? null,
        createdAt: String(acc.created_at), emailVerifiedAt: acc.email_verified_at ? String(acc.email_verified_at) : null,
        dashboardMode: acc.dashboard_mode ?? null, hasAvatar: Boolean(acc.has_avatar),
        suspendedAt: acc.suspended_at ? String(acc.suspended_at) : null,
        suspendedReason: acc.suspended_reason ?? null, suspendedByEmail: acc.suspended_by_email ?? null,
        googleEmail: acc.google_email ?? null, isOps: Boolean(acc.is_ops),
        productSessions: Number(acc.product_sessions), savedCount: Number(acc.saved_count),
      },
      solutions: solutions.map(s => ({
        id: String(s.id), status: String(s.status), version: Number(s.version),
        publishedAt: s.published_at ? String(s.published_at) : null, catalogKey: s.catalog_key ?? null,
        updatedAt: String(s.updated_at), name: s.name ?? '(sin nombre)', category: s.category ?? '',
        hasPublished: Boolean(s.has_published), mediaCount: Number(s.media_count), openReports: Number(s.open_reports),
      })),
      lists: lists.map(l => ({
        id: String(l.id), name: String(l.name), visibility: String(l.visibility),
        updatedAt: String(l.updated_at), itemCount: Number(l.item_count),
      })),
      contactsSent: contactsSent.map(c => ({
        id: String(c.id), status: String(c.status), projectName: String(c.project_name), solutionId: String(c.solution_id),
        createdAt: String(c.created_at), updatedAt: String(c.updated_at),
      })),
      contactsReceived: contactsReceived.map(c => ({
        id: String(c.id), status: String(c.status), projectName: String(c.project_name), solutionId: String(c.solution_id),
        buyerEmail: String(c.buyer_email), createdAt: String(c.created_at), updatedAt: String(c.updated_at),
      })),
      opsSessions: opsSessions.map(s => ({
        id: String(s.token_hash).slice(0, 12), createdAt: String(s.created_at), lastSeenAt: String(s.last_seen_at),
        expiresAt: String(s.expires_at), ip: s.ip ?? null, userAgent: s.user_agent ?? null,
      })),
      community: {
        likes: likes.map(l => ({ id: String(l.id), name: String(l.name) })),
        savedLists: savedLists.map(l => ({ id: String(l.id), name: String(l.name) })),
        comments: comments.map(c => ({
          id: String(c.id), listId: String(c.list_id), listName: String(c.list_name),
          body: String(c.body), createdAt: String(c.created_at),
        })),
      },
      notifications: notifications.map(n => ({
        category: String(n.category), title: String(n.title), emailState: String(n.email_state),
        readAt: n.read_at ? String(n.read_at) : null, createdAt: String(n.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/account]', err);
    return failure('Error interno.', 503);
  }
}
