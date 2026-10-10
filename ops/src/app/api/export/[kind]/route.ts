import { NextResponse } from 'next/server';
import { opsRoute } from '@/lib/api';
import { audit } from '@/lib/audit';
import { failure } from '@/lib/http';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';

const KINDS = ['accounts', 'solutions', 'newsletter', 'contacts', 'inquiries', 'audit'] as const;
type Kind = (typeof KINDS)[number];
const MAX_ROWS = 20000;

/**
 * Bulk exports leave the database with personal data, so they are admin-only,
 * need modo seguro, are rate limited and every one is written to the audit log
 * with its row count. Private columns (notes, purposes, contact messages) are
 * never part of any export.
 */
export const POST = opsRoute<{ kind: string }>(
  { admin: true, elevated: true, limit: ['export', 20, 60] },
  async ({ params, user, sql, ip }) => {
    const kind = (KINDS as readonly string[]).includes(params.kind) ? (params.kind as Kind) : null;
    if (!kind) return failure('Exportación no disponible.', 404);

    let headers: string[];
    let rows: unknown[][];
    if (kind === 'accounts') {
      headers = [
        'id',
        'correo',
        'nombre',
        'empresa',
        'perfil',
        'rol',
        'registrada',
        'correo_verificado',
        'suspendida',
        '2fa',
        'fichas',
        'publicadas',
        'ops',
      ];
      const data = await sql`
        SELECT a.id, a.email, a.name, a.organization, a.profile, a.role, a.created_at, a.email_verified_at, a.suspended_at,
          (a.totp_confirmed_at IS NOT NULL) AS two_factor,
          (SELECT count(*) FROM founder_solutions fs WHERE fs.owner_id = a.id) AS solutions,
          (SELECT count(*) FROM founder_solutions fs WHERE fs.owner_id = a.id AND fs.published_data IS NOT NULL) AS published,
          r.level AS ops
        FROM auth_accounts a LEFT JOIN solution_reviewers r ON r.account_id = a.id AND r.disabled_at IS NULL
        ORDER BY a.created_at LIMIT ${MAX_ROWS}
      `;
      rows = data.map(r => [
        r.id,
        r.email,
        r.name,
        r.organization,
        r.profile,
        r.role,
        r.created_at,
        r.email_verified_at,
        r.suspended_at,
        r.two_factor ? 'sí' : 'no',
        r.solutions,
        r.published,
        r.ops,
      ]);
    } else if (kind === 'solutions') {
      headers = [
        'id',
        'nombre',
        'estado',
        'version',
        'categoria',
        'sitio',
        'propietario',
        'catalog_key',
        'creada',
        'actualizada',
        'publicada',
      ];
      const data = await sql`
        SELECT fs.id, COALESCE(fs.data->>'name', fs.published_data->>'name') AS name, fs.status, fs.version,
          COALESCE(fs.data->'categories'->>0, fs.data->>'category') AS category, fs.data->>'website' AS website,
          a.email, fs.catalog_key, fs.created_at, fs.updated_at, fs.published_at
        FROM founder_solutions fs JOIN auth_accounts a ON a.id = fs.owner_id ORDER BY fs.created_at LIMIT ${MAX_ROWS}
      `;
      rows = data.map(r => [
        r.id,
        r.name,
        r.status,
        r.version,
        r.category,
        r.website,
        r.email,
        r.catalog_key,
        r.created_at,
        r.updated_at,
        r.published_at,
      ]);
    } else if (kind === 'newsletter') {
      headers = ['correo', 'perfil', 'rol', 'consentimiento', 'alta', 'baja'];
      const data = await sql`
        SELECT email, profile, role, consent_version, created_at, unsubscribed_at FROM newsletter_subscribers
        ORDER BY created_at LIMIT ${MAX_ROWS}
      `;
      rows = data.map(r => [
        r.email,
        r.profile,
        r.role,
        r.consent_version,
        r.created_at,
        r.unsubscribed_at,
      ]);
    } else if (kind === 'contacts') {
      headers = [
        'id',
        'proyecto',
        'estado',
        'comprador',
        'destinatario',
        'creada',
        'actualizada',
        'eventos',
      ];
      const data = await sql`
        SELECT cr.id, cr.project_name, cr.status, COALESCE(b.email, cr.buyer_email) AS buyer, r.email AS recipient,
          cr.created_at, cr.updated_at, (SELECT count(*) FROM contact_events ce WHERE ce.request_id = cr.id) AS events
        FROM contact_requests cr LEFT JOIN auth_accounts b ON b.id = cr.buyer_id LEFT JOIN auth_accounts r ON r.id = cr.recipient_id
        ORDER BY cr.created_at LIMIT ${MAX_ROWS}
      `;
      rows = data.map(r => [
        r.id,
        r.project_name,
        r.status,
        r.buyer,
        r.recipient,
        r.created_at,
        r.updated_at,
        r.events,
      ]);
    } else if (kind === 'inquiries') {
      headers = [
        'id',
        'motivo',
        'nombre',
        'correo',
        'empresa',
        'rol',
        'sitio',
        'urgencia',
        'mensaje',
        'recibido',
        'atendido',
      ];
      const data = await sql`
        SELECT id, reason, name, email, organization, role, website, urgency, message, created_at, handled_at
        FROM contact_inquiries ORDER BY created_at LIMIT ${MAX_ROWS}
      `;
      rows = data.map(r => [
        r.id,
        r.reason,
        r.name,
        r.email,
        r.organization,
        r.role,
        r.website,
        r.urgency,
        r.message,
        r.created_at,
        r.handled_at,
      ]);
    } else {
      headers = [
        'seq',
        'id',
        'fecha',
        'actor',
        'accion',
        'tipo',
        'sujeto',
        'motivo',
        'ip',
        'metadata',
        'row_hash',
        'prev_hash',
      ];
      const data = await sql`
        SELECT chain_seq, id, created_at, actor_email, action, subject_type, subject_id, reason, ip, metadata, row_hash, prev_hash
        FROM ops_audit_log ORDER BY chain_seq NULLS FIRST, id LIMIT ${MAX_ROWS * 5}
      `;
      rows = data.map(r => [
        r.chain_seq,
        r.id,
        r.created_at,
        r.actor_email,
        r.action,
        r.subject_type,
        r.subject_id,
        r.reason,
        r.ip,
        JSON.stringify(r.metadata ?? {}),
        r.row_hash,
        r.prev_hash,
      ]);
    }

    const logged = await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: `export_${kind}`,
      subjectType: 'export',
      subjectId: kind,
      metadata: { rows: rows.length },
      ip,
    });
    if (!logged)
      return failure(
        'No se pudo registrar la exportación en la bitácora; no se entregó el archivo.',
        503,
      );

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shwcs-${kind}-${stamp}.csv"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
);
