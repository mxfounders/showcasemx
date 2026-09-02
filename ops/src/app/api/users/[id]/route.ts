import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { id } = await props.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const sql = getDb();

    const accRows = await sql`
      SELECT a.id, a.email, a.created_at, a.email_verified_at,
        p.display_name, p.company, p.role, p.profile_type,
        EXISTS(SELECT 1 FROM solution_reviewers r WHERE r.account_id = a.id) AS is_reviewer,
        (SELECT count(*)::int FROM auth_sessions s WHERE s.account_id = a.id AND s.expires_at > now()) AS active_sessions,
        (SELECT count(*)::int FROM buyer_saved_projects WHERE owner_id = a.id) AS saved_count,
        (SELECT count(*)::int FROM buyer_lists WHERE owner_id = a.id) AS lists_count
      FROM auth_accounts a
      LEFT JOIN account_profiles p ON p.account_id = a.id
      WHERE a.id = ${id} LIMIT 1
    `;
    if (!accRows.length) return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
    const acc = accRows[0];

    const solutions = await sql`
      SELECT id, status, version, updated_at, created_at,
        data->>'name' AS name, data->>'category' AS category,
        published_data IS NOT NULL AS has_published
      FROM founder_solutions WHERE owner_id = ${id}
      ORDER BY updated_at DESC LIMIT 20
    `;

    const contactsSent = await sql`
      SELECT cr.id, cr.status, cr.project_name, cr.created_at, cr.updated_at
      FROM contact_requests cr WHERE cr.buyer_id = ${id}
      ORDER BY cr.created_at DESC LIMIT 10
    `;

    const contactsReceived = await sql`
      SELECT cr.id, cr.status, cr.project_name, cr.created_at, cr.buyer_email
      FROM contact_requests cr WHERE cr.recipient_id = ${id}
      ORDER BY cr.created_at DESC LIMIT 10
    `;

    return NextResponse.json({
      ok: true,
      account: {
        id: String(acc.id), email: String(acc.email),
        createdAt: String(acc.created_at),
        emailVerifiedAt: acc.email_verified_at ? String(acc.email_verified_at) : null,
        displayName: acc.display_name ?? null, company: acc.company ?? null,
        role: acc.role ?? null, profileType: acc.profile_type ?? null,
        isReviewer: Boolean(acc.is_reviewer),
        activeSessions: Number(acc.active_sessions),
        savedCount: Number(acc.saved_count),
        listsCount: Number(acc.lists_count),
      },
      solutions: solutions.map(s => ({
        id: String(s.id), name: s.name ?? '(sin nombre)', status: String(s.status),
        category: s.category ?? '', version: Number(s.version),
        updatedAt: String(s.updated_at), createdAt: String(s.created_at),
        hasPublished: Boolean(s.has_published),
      })),
      contactsSent: contactsSent.map(c => ({
        id: String(c.id), status: String(c.status), projectName: String(c.project_name),
        createdAt: String(c.created_at), updatedAt: String(c.updated_at),
      })),
      contactsReceived: contactsReceived.map(c => ({
        id: String(c.id), status: String(c.status), projectName: String(c.project_name),
        buyerEmail: String(c.buyer_email), createdAt: String(c.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/user]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 503 });
  }
}
