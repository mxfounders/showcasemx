import { NextResponse } from 'next/server';
import { getOpsSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const user = await getOpsSession();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const { accountId } = body;
  if (!UUID_RE.test(String(accountId ?? ''))) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  if (accountId === user.id) return NextResponse.json({ error: 'No puedes revocar tu propia sesión desde aquí.' }, { status: 422 });

  try {
    const sql = getDb();
    const result = await sql`DELETE FROM auth_sessions WHERE account_id = ${String(accountId)} RETURNING token_hash`;
    return NextResponse.json({ ok: true, revokedCount: result.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[ops/revoke]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 503 });
  }
}
