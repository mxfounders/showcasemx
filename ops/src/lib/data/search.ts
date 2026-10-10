import { getDb } from '../db';
import { isUuid, likePattern } from '../http';

export interface SearchResult {
  type: 'account' | 'solution' | 'list' | 'inquiry';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const term = query.trim().slice(0, 200);
  if (term.length < 2) return [];
  const sql = getDb();
  const like = likePattern(term);
  const exactId = isUuid(term) ? term : null;
  const [accounts, solutions, lists, inquiries] = await sql.transaction(
    [
      sql`
        SELECT id, email, name, organization FROM auth_accounts
        WHERE id = ${exactId}::uuid OR lower(email) LIKE ${like} OR lower(COALESCE(name, '')) LIKE ${like}
          OR lower(COALESCE(organization, '')) LIKE ${like}
        ORDER BY (lower(email) = ${term.toLowerCase()}) DESC, created_at DESC LIMIT 6
      `,
      sql`
        SELECT id, status, COALESCE(NULLIF(data->>'name', ''), published_data->>'name', '(sin nombre)') AS name, data->>'website' AS website
        FROM founder_solutions
        WHERE id = ${exactId}::uuid OR lower(COALESCE(data->>'name', '')) LIKE ${like}
          OR lower(COALESCE(published_data->>'name', '')) LIKE ${like} OR lower(COALESCE(data->>'website', '')) LIKE ${like}
        ORDER BY updated_at DESC LIMIT 6
      `,
      sql`
        SELECT id, name, curator_name FROM buyer_lists
        WHERE visibility = 'public' AND (id = ${exactId}::uuid OR lower(name) LIKE ${like} OR lower(COALESCE(curator_name, '')) LIKE ${like})
        ORDER BY updated_at DESC LIMIT 4
      `,
      sql`
        SELECT id, name, email, handled_at FROM contact_inquiries
        WHERE id = ${exactId}::uuid OR lower(name) LIKE ${like} OR lower(email) LIKE ${like} OR lower(organization) LIKE ${like}
        ORDER BY created_at DESC LIMIT 4
      `,
    ],
    { readOnly: true },
  );
  return [
    ...accounts.map(a => ({
      type: 'account' as const,
      id: String(a.id),
      label: a.name ? String(a.name) : String(a.email),
      sublabel: [a.email, a.organization].filter(Boolean).join(' · '),
      href: `/panel/cuentas/${a.id}`,
    })),
    ...solutions.map(s => ({
      type: 'solution' as const,
      id: String(s.id),
      label: String(s.name),
      sublabel: [String(s.status), s.website].filter(Boolean).join(' · '),
      href: `/panel/postulaciones/${s.id}`,
    })),
    ...lists.map(l => ({
      type: 'list' as const,
      id: String(l.id),
      label: String(l.name),
      sublabel: l.curator_name ? `Lista pública · ${l.curator_name}` : 'Lista pública',
      href: `/panel/comunidad?q=${encodeURIComponent(String(l.name))}`,
    })),
    ...inquiries.map(i => ({
      type: 'inquiry' as const,
      id: String(i.id),
      label: String(i.name),
      sublabel: `${i.email} · ${i.handled_at ? 'atendido' : 'pendiente'}`,
      href: `/panel/mensajes?q=${encodeURIComponent(String(i.email))}&filtro=all`,
    })),
  ];
}
