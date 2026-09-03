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

    const rows = await sql`
      SELECT
        fs.id, fs.status, fs.version, fs.step, fs.data, fs.published_data, fs.catalog_key,
        fs.created_at, fs.updated_at, fs.published_at,
        a.id AS owner_id, a.email AS owner_email, a.created_at AS owner_created_at,
        a.email_verified_at AS owner_verified_at
      FROM founder_solutions fs
      JOIN auth_accounts a ON a.id = fs.owner_id
      WHERE fs.id = ${id}
      LIMIT 1
    `;

    if (!rows.length) return failure('No encontrada.', 404);
    const s = rows[0];

    const events = await sql`
      SELECT se.id, se.status, se.message, se.created_at, a.email AS actor_email
      FROM solution_events se
      LEFT JOIN auth_accounts a ON a.id = se.actor_id
      WHERE se.solution_id = ${id}
      ORDER BY se.created_at ASC
    `;

    const media = await sql`
      SELECT id, width, height, created_at FROM solution_media
      WHERE solution_id = ${id} ORDER BY created_at ASC
    `;

    const domainProof = await sql`
      SELECT domain, token, expires_at, verified_at FROM solution_domain_proofs
      WHERE solution_id = ${id} LIMIT 1
    `;

    const reports = await sql`
      SELECT id, reason, status, created_at FROM solution_reports
      WHERE solution_id = ${id} ORDER BY created_at DESC LIMIT 20
    `;

    return NextResponse.json({
      ok: true,
      solution: {
        id: String(s.id), status: String(s.status), version: Number(s.version),
        step: Number(s.step), createdAt: String(s.created_at), updatedAt: String(s.updated_at),
        publishedAt: s.published_at ? String(s.published_at) : null,
        catalogKey: s.catalog_key ?? null,
        data: s.data ?? {}, publishedData: s.published_data ?? null,
        ownerEmail: String(s.owner_email), ownerId: String(s.owner_id),
        ownerCreatedAt: String(s.owner_created_at),
        ownerVerifiedAt: s.owner_verified_at ? String(s.owner_verified_at) : null,
      },
      events: events.map(e => ({
        id: String(e.id), status: String(e.status),
        message: String(e.message), createdAt: String(e.created_at),
        actorEmail: e.actor_email ?? null,
      })),
      media: media.map(m => ({
        id: String(m.id), width: m.width !== null ? Number(m.width) : null,
        height: m.height !== null ? Number(m.height) : null, createdAt: String(m.created_at),
      })),
      domainProof: domainProof.length ? {
        domain: String(domainProof[0].domain),
        expiresAt: String(domainProof[0].expires_at),
        verifiedAt: domainProof[0].verified_at ? String(domainProof[0].verified_at) : null,
      } : null,
      reports: reports.map(r => ({
        id: String(r.id), reason: String(r.reason), status: String(r.status), createdAt: String(r.created_at),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/solution]', err);
    return failure('Error interno.', 503);
  }
}
