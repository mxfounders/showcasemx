// Opt-in integration test for the founder's AI assistant over MCP (SHCWS-152,
// docs/assistant-mcp.md). Drives a running server with the official MCP client: a token
// created from Ajustes → Conexiones creates a draft, reads what is missing, updates it and
// submits it; a revoked token and one from before a password change stop working on the
// next call; a token never reaches another account's listing.
//
// Two temporary accounts: the token owner gets a security notice, so its address is a
// Resend test sink (delivered+…@resend.dev); the other one is @example.invalid. Everything
// is removed in `finally`, including the uploaded screenshot's files and the limit counters.
//
//   RUN_ASSISTANT_MCP_INTEGRATION=1 APP_ORIGIN=http://localhost:3107 npx tsx tests/integration/assistant-mcp.ts
//   (IMAGE_URL=<public png> to change the screenshot downloaded by subir_captura)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { parse } from 'dotenv';

if (process.env.RUN_ASSISTANT_MCP_INTEGRATION !== '1') {
  console.log('Set RUN_ASSISTANT_MCP_INTEGRATION=1 to run against a running server.');
  process.exit(0);
}
Object.assign(process.env, parse(fs.readFileSync(process.env.ENV_FILE ?? '.env.local')));
const origin = process.env.APP_ORIGIN ?? 'http://localhost:3107';

(async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/streamableHttp.js'
  );
  const { authSql } = await import('../../src/lib/auth/security');
  const { hashPassword, hashToken } = await import('../../src/lib/auth/password');
  const { deleteObjects } = await import('../../src/lib/storage/blob');
  const sql = authSql();

  const tag = randomUUID().slice(0, 8);
  const password = `mcp-${randomBytes(6).toString('hex')}`;
  const owner = { id: randomUUID(), email: `delivered+mcp-${tag}@resend.dev` };
  const other = { id: randomUUID(), email: `mcp-other-${tag}@example.invalid` };
  const sessions: Record<string, string> = {};
  const tokens: string[] = [];
  const tokenIds: string[] = [];
  const blobKeys: string[] = [];

  const api = async (path: string, account: string, body: unknown) => {
    const response = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        cookie: `showcasemx-session=${sessions[account]}`,
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const connect = async (token: string) => {
    const client = new Client({ name: 'shwcs-integration', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${origin}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );
    return client;
  };
  type Result = { isError?: boolean; structuredContent?: Record<string, unknown> };
  const call = async (client: InstanceType<typeof Client>, name: string, args = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as Result;
    return { error: Boolean(result.isError), body: result.structuredContent ?? {}, raw: result };
  };

  try {
    const hash = await hashPassword(password);
    for (const account of [owner, other]) {
      await sql`INSERT INTO auth_accounts (id, email, password_hash, name) VALUES (${account.id}, ${account.email}, ${hash}, 'Prueba MCP')`;
      const session = randomBytes(32).toString('hex');
      sessions[account.id] = session;
      await sql`INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent) VALUES (${hashToken(session)}, ${account.id}, now() + interval '1 hour', 'integration')`;
    }

    // Creating a token needs the password again; the secret comes back once.
    const wrong = await api('/api/account/assistant-tokens', owner.id, {
      action: 'create',
      name: 'Claude',
      days: 30,
      password: 'otra-cosa',
    });
    assert.equal(wrong.status, 400);
    const created = await api('/api/account/assistant-tokens', owner.id, {
      action: 'create',
      name: 'Claude de prueba',
      days: 30,
      password,
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const token = String(created.body.token);
    tokens.push(token);
    tokenIds.push(String(created.body.id));
    assert.match(token, /^shwcs_mcp_/);
    const [stored] =
      await sql`SELECT token_hash, scope, expires_at > now() + interval '29 days' AS lives FROM assistant_tokens WHERE id = ${created.body.id}`;
    assert.equal(stored.token_hash, hashToken(token), 'only the hash is stored');
    assert.equal(stored.scope, 'solutions');
    assert.ok(stored.lives);
    const [notice] =
      await sql`SELECT href FROM account_notifications WHERE owner_id = ${owner.id} AND category = 'security'`;
    assert.equal(notice?.href, '/account/settings/connections', 'a security notice is written');

    // The other account's draft, created from its own session.
    const foreignId = randomUUID();
    const foreign = await api('/api/solutions', other.id, {
      id: foreignId,
      website: 'https://ajeno.example.com',
    });
    assert.equal(foreign.status, 200);

    const client = await connect(token);
    const tools = (await client.listTools()).tools.map(tool => tool.name).sort();
    assert.deepEqual(tools, [
      'actualizar_borrador',
      'crear_borrador',
      'enviar_a_revision',
      'estado_de_mis_fichas',
      'subir_captura',
      'ver_lo_que_falta',
    ]);

    // 1. Create a draft (without the AI, so it costs nothing and keeps the daily quota).
    const draft = await call(client, 'crear_borrador', {
      sitio_web: 'atlas-mcp.example.com',
      preparar_con_ia: false,
    });
    assert.equal(draft.error, false, JSON.stringify(draft.body));
    const id = String(draft.body.id);
    let version = Number(draft.body.version);
    const [row] = await sql`SELECT owner_id, data FROM founder_solutions WHERE id = ${id}`;
    assert.equal(row.owner_id, owner.id);
    assert.equal(row.data.website, 'https://atlas-mcp.example.com/');
    assert.equal(row.data.contactEmail, owner.email);

    // 2. What's missing.
    const before = await call(client, 'ver_lo_que_falta', { ficha_id: id });
    assert.equal(before.error, false);
    assert.equal(before.body.readyToSubmit, false);
    assert.ok((before.body.missingToSubmit as unknown[]).length >= 5);

    // 3. Updates: a stale version, an invalid value and a field outside the editor fail.
    const stale = await call(client, 'actualizar_borrador', {
      ficha_id: id,
      version: version + 5,
      cambios: { name: 'Atlas' },
    });
    assert.equal(stale.error, true);
    assert.equal(stale.body.error, 'conflict');
    assert.equal(stale.body.currentVersion, version);
    const invalid = await call(client, 'actualizar_borrador', {
      ficha_id: id,
      version,
      cambios: { name: 'x'.repeat(150) },
    });
    assert.equal(invalid.body.error, 'invalidFields');
    assert.deepEqual(invalid.body.fields, ['name']);
    const smuggled = await call(client, 'actualizar_borrador', {
      ficha_id: id,
      version,
      cambios: { catalog_key: 'cord' },
    });
    assert.equal(smuggled.error, true, 'catalog_key is refused by the schema');
    const [untouched] = await sql`SELECT catalog_key, version FROM founder_solutions WHERE id = ${id}`;
    assert.equal(untouched.catalog_key, null);
    assert.equal(Number(untouched.version), version);

    const updated = await call(client, 'actualizar_borrador', {
      ficha_id: id,
      version,
      cambios: {
        name: 'Atlas MCP',
        kind: 'Software',
        categories: ['Cobros'],
        problem: 'Las empresas pierden días conciliando pagos y facturas a mano cada mes.',
        audience: 'Equipos de finanzas de pymes',
        industries: [],
        companySizes: ['pyme'],
        capabilities: ['cobranza-recordatorios'],
      },
    });
    assert.equal(updated.error, false, JSON.stringify(updated.body));
    assert.equal(updated.body.readyToSubmit, true);
    version = Number(updated.body.version);

    // 4. Screenshots: private addresses are refused before any request; a public image
    // goes through the same processing as an upload from the editor.
    for (const url of ['http://127.0.0.1:3107/og-image.png', 'http://169.254.169.254/latest']) {
      const blocked = await call(client, 'subir_captura', { ficha_id: id, url_imagen: url });
      assert.equal(blocked.body.error, 'imageUnreachable', url);
    }
    const image = process.env.IMAGE_URL ?? 'https://shwcs.site/og-image.png';
    const upload = await call(client, 'subir_captura', {
      ficha_id: id,
      url_imagen: image,
      descripcion: 'Panel de cobranza',
    });
    assert.equal(upload.error, false, JSON.stringify(upload.body));
    assert.equal(upload.body.addedToListing, true);
    version = Number(upload.body.version);
    const media =
      await sql`SELECT m.storage_key, (SELECT array_agg(f.storage_key) FROM solution_media_files f WHERE f.media_id = m.id) AS files FROM solution_media m WHERE m.solution_id = ${id}`;
    assert.equal(media.length, 1);
    for (const item of media) blobKeys.push(String(item.storage_key), ...(item.files ?? []));

    // 5. Never another account's listing, with any tool.
    for (const [name, args] of [
      ['ver_lo_que_falta', { ficha_id: foreignId }],
      ['actualizar_borrador', { ficha_id: foreignId, version: 1, cambios: { name: 'Robado' } }],
      ['subir_captura', { ficha_id: foreignId, url_imagen: image }],
      ['enviar_a_revision', { ficha_id: foreignId, version: 1, confirmo: true }],
    ] as const) {
      const denied = await call(client, name, args);
      assert.equal(denied.body.error, 'notFound', name);
    }
    const [theirs] = await sql`SELECT data->>'name' AS name, version FROM founder_solutions WHERE id = ${foreignId}`;
    assert.equal(theirs.name, '');
    assert.equal(Number(theirs.version), 1);
    const listing = await call(client, 'estado_de_mis_fichas');
    const ids = (listing.body.listings as { id: string }[]).map(item => item.id);
    assert.deepEqual(ids, [id], 'only the owner’s listings are listed');

    // 6. Submitting needs the explicit confirmation, then waits for review in ops.
    const unconfirmed = await call(client, 'enviar_a_revision', {
      ficha_id: id,
      version,
      confirmo: false,
    });
    assert.equal(unconfirmed.error, true);
    const submitted = await call(client, 'enviar_a_revision', {
      ficha_id: id,
      version,
      confirmo: true,
    });
    assert.equal(submitted.error, false, JSON.stringify(submitted.body));
    assert.equal(submitted.body.status, 'pending');
    const [pending] =
      await sql`SELECT status, published_data, (SELECT count(*) FROM solution_events e WHERE e.solution_id = s.id AND e.status = 'pending')::int AS events FROM founder_solutions s WHERE id = ${id}`;
    assert.equal(pending.status, 'pending');
    assert.equal(pending.published_data, null, 'nothing is published without review');
    assert.equal(pending.events, 1);
    const locked = await call(client, 'actualizar_borrador', {
      ficha_id: id,
      version: Number(submitted.body.version),
      cambios: { name: 'Otro' },
    });
    assert.equal(locked.body.error, 'pending');

    // 7. The log shows what the token did, without its arguments.
    const log =
      await sql`SELECT tool, outcome, code, solution_id::text FROM assistant_token_events WHERE token_id = ${created.body.id} ORDER BY id`;
    assert.ok(log.some(line => line.tool === 'enviar_a_revision' && line.outcome === 'ok'));
    assert.ok(log.some(line => line.code === 'notFound' && line.solution_id === null));
    assert.ok(log.some(line => line.code === 'conflict'));

    // 8. Revoking takes effect on the next call.
    const revoked = await api('/api/account/assistant-tokens', owner.id, {
      action: 'revoke',
      id: created.body.id,
      password,
    });
    assert.equal(revoked.status, 200);
    await assert.rejects(call(client, 'estado_de_mis_fichas'), /401|Unauthorized|invalid/i);
    await client.close().catch(() => undefined);

    // 9. A new password turns every earlier token off.
    const second = await api('/api/account/assistant-tokens', owner.id, {
      action: 'create',
      name: 'Cursor',
      days: 7,
      password,
    });
    assert.equal(second.status, 200);
    tokenIds.push(String(second.body.id));
    const cursor = await connect(String(second.body.token));
    assert.equal((await call(cursor, 'estado_de_mis_fichas')).error, false);
    await sql`UPDATE auth_accounts SET password_hash = ${await hashPassword(`${password}-nueva`)} WHERE id = ${owner.id}`;
    await assert.rejects(call(cursor, 'estado_de_mis_fichas'), /401|Unauthorized|invalid/i);
    await cursor.close().catch(() => undefined);

    // 10. The data export carries the tokens and their log, never a hash.
    const exported = await fetch(`${origin}/api/account/export`, {
      headers: { cookie: `showcasemx-session=${sessions[owner.id]}` },
    });
    const payload = await exported.json();
    assert.equal(payload.assistant.tokens.length, 2);
    assert.ok(payload.assistant.activity.length > 5);
    assert.equal(JSON.stringify(payload).includes(hashToken(token)), false);
    assert.equal(JSON.stringify(payload).includes(token), false);

    console.log('assistant MCP integration: ok');
  } finally {
    for (const account of [owner, other]) {
      await sql`DELETE FROM auth_accounts WHERE id = ${account.id}`;
      for (const scope of ['assistant-tokens', 'solution-create', 'solution-update', 'solution-media'])
        await sql`DELETE FROM auth_rate_limits WHERE key = ${`${scope}:${hashToken(account.id)}`}`;
    }
    for (const tokenId of tokenIds)
      await sql`DELETE FROM auth_rate_limits WHERE key = ${`assistant-mcp:${hashToken(tokenId)}`}`;
    // Account deletion cascaded the tokens and their log.
    const left =
      await sql`SELECT count(*)::int AS n FROM assistant_tokens WHERE account_id IN (${owner.id}, ${other.id})`;
    assert.equal(left[0].n, 0);
    if (blobKeys.length) {
      await deleteObjects(blobKeys).catch(() => undefined);
      await sql`DELETE FROM storage_orphans WHERE key = ANY(${blobKeys})`;
    }
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
