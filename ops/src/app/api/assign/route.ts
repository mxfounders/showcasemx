import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const { email, action } = body;
  if (typeof email !== 'string' || !email.trim()) return NextResponse.json({ error: 'Correo requerido.' }, { status: 400 });
  if (!['add', 'remove'].includes(String(action ?? ''))) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const sql = getDb();
    const targets = await sql`SELECT id FROM auth_accounts WHERE email = ${normalizedEmail} LIMIT 1`;
    if (!targets.length) return NextResponse.json({ error: 'No existe cuenta con ese correo.' }, { status: 404 });
    const targetId = String(targets[0].id);

    if (action === 'add') {
      await sql`INSERT INTO solution_reviewers (account_id) VALUES (${targetId}) ON CONFLICT DO NOTHING`;
      return NextResponse.json({ ok: true, message: `${normalizedEmail} ahora es revisor/a.` });
    } else {
      const count = await sql`SELECT count(*)::int AS n FROM solution_reviewers`;
      if (targetId === user.id && Number(count[0]?.n ?? 0) <= 1)
        return NextResponse.json({ error: 'No puedes quitarte si eres el único revisor activo.' }, { status: 422 });
      await sql`DELETE FROM solution_reviewers WHERE account_id = ${targetId}`;
      return NextResponse.json({ ok: true, message: `${normalizedEmail} ya no es revisor/a.` });
    }
  } catch (err) {
    console.error('[ops/assign]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 503 });
  }
}
