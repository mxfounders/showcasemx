import { NextRequest, NextResponse, after } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { getDatabaseUrl } from '@/lib/database-url';
import { validateAccount } from '@/lib/account';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { deliverNotifications } from '@/lib/notifications/server';
export async function PATCH(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).settings.errors;
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return fail(t.useAccountProfile, 403);
  try {
    const user = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!user) return fail(t.sessionEnded, 401);
    if (!(await securityLimit('account-profile', user.id, 60))) return fail(t.tooManyChanges, 429);
    if (!request.headers.get('content-type')?.includes('application/json'))
      return fail(t.invalidFormat, 415);
    const reader = request.body?.getReader();
    if (!reader) return fail(t.missingData, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return fail(t.dataTooLong, 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return fail(t.checkData, 400);
    }
    const profile = validateAccount(body);
    if (!profile) return fail(t.profileInvalid, 400);
    const sql = neon(getDatabaseUrl()!);
    // Identity always comes from the session, never a client account ID/email.
    // The first save of a name is the end of onboarding: it records the account's single
    // welcome email (SHCWS-153) in the same statement. The unique source_key makes it
    // once per account, whatever is edited later. Read already, so it doesn't add to the bell.
    const welcome = await sql`WITH previous AS (
        SELECT COALESCE(btrim(name),'')='' AS first FROM auth_accounts WHERE id=${user.id}
      ), changed AS (
        UPDATE auth_accounts SET name=${profile.name}, organization=${profile.organization}, profile=${profile.profile}, role=${profile.role} WHERE id=${user.id} RETURNING id
      ), queued AS (
        INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state,read_at)
        SELECT id,'account','welcome:'||id::text,'Bienvenido a shwcs','/account','pending',now()
        FROM changed WHERE (SELECT first FROM previous) AND btrim(${profile.name})<>''
        ON CONFLICT (source_key) DO NOTHING RETURNING id
      ) SELECT id::text FROM queued`;
    if (welcome.length)
      after(() => deliverNotifications({ ids: [String(welcome[0].id)] }).catch(() => undefined));
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(t.profileUnavailable, 503);
  }
}
