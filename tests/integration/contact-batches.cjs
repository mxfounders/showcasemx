// Opt-in integration test for proposals to several projects (SHCWS-62, docs/contacts.md).
// Creates temporary @example.invalid accounts, listings and lists only, and deletes them
// (with everything that cascades) in `finally`. Sends no email to anyone.
//
//   RUN_CONTACT_BATCH_INTEGRATION=1 node tests/integration/contact-batches.cjs
//   APP_ORIGIN=http://localhost:3160 RUN_CONTACT_BATCH_INTEGRATION=1 \
//     node --env-file=<dev .env.local> tests/integration/contact-batches.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { randomUUID, createHash } = require('node:crypto');
if (process.env.RUN_CONTACT_BATCH_INTEGRATION !== '1') {
  console.log('Set RUN_CONTACT_BATCH_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless');
const env =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
    ? process.env
    : require('dotenv').parse(fs.readFileSync('.env.local'));
const url = env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL;
if (/production/i.test(new URL(url).pathname)) {
  console.error('Refusing to run against a production database.');
  process.exit(1);
}
const sql = neon(url, { fetchOptions: { cache: 'no-store' } }),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  password = 'Temporary batch contact passphrase';
const roles = ['buyer', 'founder-a', 'founder-b', 'intruder'];
const emails = roles.map(role => `batch-${role}-${tag}@example.invalid`);
const accounts = [],
  sessions = [];
const [s1, s2, s3, s4, own, gone] = Array.from({ length: 6 }, () => randomUUID());
const list = randomUUID();
const hash = value => createHash('sha256').update(value).digest('hex');

async function post(route, data, who = 0, from = origin) {
  return fetch(origin + route, {
    method: 'POST',
    headers: {
      origin: from,
      'content-type': 'application/json',
      ...(who >= 0 && sessions[who] ? { cookie: sessions[who] } : {}),
    },
    body: JSON.stringify(data),
  });
}
async function page(route, who = 0) {
  const response = await fetch(origin + route, {
    headers: { cookie: sessions[who] },
    redirect: 'manual',
  });
  return { status: response.status, html: await response.text() };
}
const details = {
  name: 'Batch Buyer',
  company: 'Batch Company',
  size: 'pyme',
  timeline: 'Este mes',
  budget: '',
  need: 'Necesitamos comparar opciones para ordenar la cobranza.',
};
const batch = (id, recipients, patch = {}) => ({
  ...details,
  id,
  listId: list,
  consentVersion: 'contact-v1',
  recipients,
  ...patch,
});
const ask = (solutionId, recipientIndex, id = randomUUID()) => ({
  id,
  solutionId,
  recipientId: accounts[recipientIndex],
  consent: true,
});

(async () => {
  try {
    for (const email of emails) {
      assert.equal((await post('/api/auth/register', { email, password }, -1)).status, 200);
      const login = await post('/api/auth/login', { email, password }, -1);
      assert.equal(login.status, 200);
      sessions.push(login.headers.get('set-cookie').split(';')[0]);
      const [row] = await sql`SELECT id FROM auth_accounts WHERE email=${email}`;
      accounts.push(row.id);
    }
    const listing = name => ({
      name,
      kind: 'Software',
      category: 'Cobros',
      categories: ['Cobros'],
      problem: 'Public problem ' + name,
      audience: 'Equipos financieros',
      website: 'https://example.com',
      contactEmail: 'private-' + tag + '@example.invalid',
      companySizes: ['pyme'],
    });
    const owners = { [s1]: 1, [s2]: 2, [s3]: 1, [s4]: 2, [own]: 0, [gone]: 2 };
    const names = {};
    for (const [id, owner] of Object.entries(owners)) {
      names[id] = `Batch ${tag} ${id.slice(0, 6)}`;
      const data = JSON.stringify(listing(names[id]));
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status)
        VALUES(${id},${accounts[owner]},${data}::jsonb,${data}::jsonb,'published')`;
    }
    for (const id of Object.keys(owners))
      assert.equal(
        (await post('/api/library', { action: 'save', projectKey: 'solution:' + id })).status,
        200,
      );
    assert.equal(
      (
        await post('/api/library', {
          action: 'create-list',
          id: list,
          name: 'Batch list ' + tag,
          purpose: '',
        })
      ).status,
      200,
    );
    for (const id of Object.keys(owners))
      assert.equal(
        (
          await post('/api/library', {
            action: 'add-to-list',
            listId: list,
            projectKey: 'solution:' + id,
          })
        ).status,
        200,
      );
    // A request to s3 sent earlier with the single form.
    const earlier = randomUUID();
    assert.equal(
      (
        await post('/api/contacts', {
          ...details,
          action: 'create',
          id: earlier,
          solutionId: s3,
          recipientId: accounts[1],
          consent: true,
          consentVersion: 'contact-v1',
        })
      ).status,
      200,
    );

    // The form: who receives a new request, who was already written to, who is left out.
    const query = (...ids) =>
      new URLSearchParams(ids.map(id => ['project', 'solution:' + id])).toString();
    const form = await page(`/es/account/lists/${list}/proposal?${query(s1, s2, s3)}`);
    assert.equal(form.status, 200);
    assert.ok(form.html.includes('Pide propuesta a 2 proyectos'));
    assert.ok(form.html.includes('Ya le escribiste'));
    assert.ok(form.html.includes('/account/contacts/' + earlier));
    assert.ok(!form.html.includes('private-' + tag), 'never the listing’s private email');
    const excluded = await page(`/es/account/lists/${list}/proposal?${query(s1, own)}`);
    assert.ok(excluded.html.includes('Es tu proyecto'));
    const english = await page(`/en/account/lists/${list}/proposal?${query(s1, s2)}`);
    assert.ok(english.html.includes('Request proposals from 2 projects'));
    assert.equal(
      (await page(`/es/account/lists/${list}/proposal?${query(s1, s2)}`, 3)).status,
      404,
      'another account cannot open the buyer’s list',
    );
    const compare = await page(`/es/account/lists/${list}/compare?${query(s1, s2)}`);
    assert.ok(compare.html.includes('Pedir propuesta a estos 2'));

    // Origin, session and validation come first; nothing is written.
    assert.equal(
      (await post('/api/contacts/batch', batch(randomUUID(), [ask(s1, 1)]), 0, 'https://evil.test'))
        .status,
      403,
    );
    assert.equal(
      (await post('/api/contacts/batch', batch(randomUUID(), [ask(s1, 1)]), -1)).status,
      401,
    );
    assert.equal(
      (await post('/api/contacts/batch', batch(randomUUID(), [ask(s1, 1)]), 3)).status,
      404,
      'a list of another account',
    );
    assert.equal(
      (
        await post('/api/contacts/batch', {
          ...batch(randomUUID(), [ask(s1, 1)]),
          listId: randomUUID(),
        })
      ).status,
      404,
    );
    const outsider = randomUUID();
    const notMember = await post('/api/contacts/batch', batch(randomUUID(), [ask(outsider, 1)]));
    assert.equal(notMember.status, 400);
    assert.equal(
      (
        await post(
          '/api/contacts/batch',
          batch(randomUUID(), [{ id: randomUUID(), solutionId: s1, consent: false }, ask(s2, 2)]),
        )
      ).status,
      400,
      'no request without consent for that project',
    );
    let [count] =
      await sql`SELECT count(*)::int AS n FROM contact_requests WHERE buyer_id=${accounts[0]}`;
    assert.equal(count.n, 1, 'only the earlier single request so far');

    // Partial failure: s2 shown with the wrong recipient. s1 is sent, s3 joins as earlier.
    const groupId = randomUUID();
    const r1 = randomUUID(),
      r2 = randomUUID(),
      r3 = randomUUID();
    const first = [
      ask(s1, 1, r1),
      { ...ask(s2, 1, r2) },
      { id: r3, solutionId: s3, consent: false },
    ];
    let response = await post('/api/contacts/batch', batch(groupId, first));
    assert.equal(response.status, 200);
    let result = await response.json();
    assert.equal(result.batchId, groupId);
    assert.deepEqual(
      result.results.map(item => [item.solutionId, item.outcome, item.requestId ?? null]),
      [
        [s1, 'sent', r1],
        [s2, 'failed', null],
        [s3, 'existing', earlier],
      ],
    );
    assert.match(result.results[1].error, /cuenta destinataria cambió/);
    const [sent] =
      await sql`SELECT buyer_email,consent_version,consent_at,recipient_id,details FROM contact_requests WHERE id=${r1}`;
    assert.equal(sent.buyer_email, emails[0], 'email from the session');
    assert.equal(sent.consent_version, 'contact-v1');
    assert.ok(sent.consent_at);
    assert.equal(sent.recipient_id, accounts[1]);
    assert.equal(sent.details.need, details.need);

    // Retry with s2 corrected and the same ids: nothing is duplicated.
    const corrected = [first[0], ask(s2, 2, r2), first[2]];
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await post('/api/contacts/batch', batch(groupId, corrected));
      assert.equal(response.status, 200);
      result = await response.json();
      assert.deepEqual(
        result.results.map(item => item.outcome),
        ['sent', 'sent', 'existing'],
      );
    }
    [count] =
      await sql`SELECT count(*)::int AS n FROM contact_requests WHERE buyer_id=${accounts[0]}`;
    assert.equal(count.n, 3, 'earlier + s1 + s2, no duplicates');
    const items =
      await sql`SELECT request_id,created,position FROM contact_batch_items WHERE batch_id=${groupId} ORDER BY position`;
    assert.deepEqual(
      items.map(item => [item.request_id, item.created, Number(item.position)]),
      [
        [r1, true, 0],
        [r2, true, 1],
        [earlier, false, 2],
      ],
    );

    // Two identical submissions at once still give one request per project.
    const raceId = randomUUID(),
      raceBody = batch(raceId, [ask(s4, 2)]);
    const race = await Promise.all([
      post('/api/contacts/batch', raceBody),
      post('/api/contacts/batch', raceBody),
    ]);
    assert.deepEqual(
      race.map(item => item.status),
      [200, 200],
    );
    const [raced] =
      await sql`SELECT count(*)::int AS n FROM contact_requests WHERE buyer_id=${accounts[0]} AND solution_id=${s4}`;
    assert.equal(raced.n, 1);

    // One's own listing and a withdrawn one fail by themselves, with the reason.
    await sql`UPDATE founder_solutions SET published_data=NULL WHERE id=${gone}`;
    response = await post('/api/contacts/batch', batch(randomUUID(), [ask(own, 0), ask(gone, 2)]));
    assert.equal(response.status, 200);
    result = await response.json();
    assert.equal(result.batchId, null, 'nothing to group when nothing was sent');
    assert.deepEqual(
      result.results.map(item => item.outcome),
      ['failed', 'failed'],
    );
    assert.match(result.results[0].error, /propio proyecto/);
    assert.match(result.results[1].error, /no está disponible/);

    // The creation limit is checked before writing: over it, nothing is sent.
    await sql`INSERT INTO auth_rate_limits(key,window_start,attempts)
      VALUES(${'contact-create:' + hash(accounts[0])},date_trunc('hour',now()),20)
      ON CONFLICT (key) DO UPDATE SET attempts=20,window_start=date_trunc('hour',now())`;
    const limited = randomUUID();
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status)
      VALUES(${limited},${accounts[2]},${JSON.stringify(listing('Limited ' + tag))}::jsonb,${JSON.stringify(listing('Limited ' + tag))}::jsonb,'published')`;
    await post('/api/library', { action: 'save', projectKey: 'solution:' + limited });
    await post('/api/library', {
      action: 'add-to-list',
      listId: list,
      projectKey: 'solution:' + limited,
    });
    response = await post('/api/contacts/batch', batch(randomUUID(), [ask(limited, 2)]));
    assert.equal(response.status, 429);
    const [limitedCount] =
      await sql`SELECT count(*)::int AS n FROM contact_requests WHERE buyer_id=${accounts[0]} AND solution_id=${limited}`;
    assert.equal(limitedCount.n, 0);

    // A recipient sees an ordinary request: no batch, no other project.
    const opportunity = await page('/es/account/opportunities/' + r1, 1);
    assert.equal(opportunity.status, 200);
    assert.ok(!opportunity.html.includes(groupId));
    assert.ok(!opportunity.html.includes(names[s2]));
    assert.ok(!opportunity.html.includes('propuesta a varios'));
    // The founder replies; the buyer sees it in the side-by-side view.
    const reply = 'Respuesta comparable ' + tag;
    assert.equal((await post(`/api/contacts/${r1}/messages`, { message: reply }, 1)).status, 200);
    const group = await page('/es/account/contacts/groups/' + groupId);
    assert.equal(group.status, 200);
    for (const id of [s1, s2, s3]) assert.ok(group.html.includes(names[id]));
    assert.ok(group.html.includes(reply));
    assert.ok(group.html.includes('Ya le habías escrito antes'));
    assert.ok(group.html.includes('Te toca responder'));
    for (const who of [1, 2, 3])
      assert.equal((await page('/es/account/contacts/groups/' + groupId, who)).status, 404);
    const inbox = await page('/es/account/contacts');
    assert.ok(inbox.html.includes('Propuestas en grupo'));
    const detail = await page('/es/account/contacts/' + r2);
    assert.ok(detail.html.includes('/account/contacts/groups/' + groupId));

    // The composite keys keep another account's request out of a buyer's batch.
    const [foreign] =
      await sql`SELECT id FROM contact_requests WHERE buyer_id=${accounts[0]} LIMIT 1`;
    await assert.rejects(
      sql`INSERT INTO contact_batch_items(batch_id,buyer_id,request_id,created,position)
        VALUES(${groupId},${accounts[3]},${foreign.id},true,0)`,
    );
    console.log('Contact batch integration passed.');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`;
    const rateKeys = [
      ...emails.map(email => 'email:' + hash(email)),
      ...accounts.flatMap(id =>
        ['library', 'contact-create', 'contact-update', 'contact-message'].map(
          scope => scope + ':' + hash(id),
        ),
      ),
    ];
    await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${rateKeys})`;
    console.log('Cleaned only temporary integration accounts and their cascading data.');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
