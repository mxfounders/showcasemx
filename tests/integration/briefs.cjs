// Opt-in integration test for «Publica tu necesidad» and the ops Necesidades board
// (SHCWS-58/60, docs/briefs.md). Creates temporary accounts, listings and briefs and
// deletes them (with everything that cascades) in `finally`. Accounts that receive email
// use Resend's test inbox (delivered+…@resend.dev); the rest are @example.invalid and
// stay unverified, so nothing is sent to them. Listings use the «Legal» category so no
// other published listing in the database is matched.
//
//   APP_ORIGIN=http://localhost:3103 OPS_ORIGIN=http://localhost:3203 \
//     RUN_BRIEFS_INTEGRATION=1 node --env-file=.env.local tests/integration/briefs.cjs
//
// Without OPS_ORIGIN the ops part is skipped. Refuses to run against production.
//
// On a machine that can only hold one dev server, run it in three phases sharing a state
// file: BRIEFS_PHASE=product (product server only), then BRIEFS_PHASE=ops (ops server only,
// the product down), then BRIEFS_PHASE=finish (product only), each with
// BRIEFS_STATE=<file>. Only `finish`, or any failure, deletes the data.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { randomUUID, randomBytes, createHash } = require('node:crypto');
if (process.env.RUN_BRIEFS_INTEGRATION !== '1') {
  console.log('Set RUN_BRIEFS_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless');
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url || /production/i.test(new URL(url).pathname)) {
  console.error('Refusing to run without a development database.');
  process.exit(1);
}
const sql = neon(url, { fetchOptions: { cache: 'no-store' } }),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  opsOrigin = process.env.OPS_ORIGIN || '',
  phase = process.env.BRIEFS_PHASE || 'all',
  stateFile = process.env.BRIEFS_STATE || '',
  saved = ['ops', 'finish'].includes(phase) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null,
  tag = saved?.tag ?? randomUUID().slice(0, 8),
  password = 'Temporary briefs integration passphrase';
const hash = value => createHash('sha256').update(value).digest('hex');
// Who receives email: buyer and the two matching founders, at Resend's test inbox.
const people = {
  buyer: `delivered+shwcs-brief-buyer-${tag}@resend.dev`,
  a: `delivered+shwcs-brief-a-${tag}@resend.dev`,
  b: `delivered+shwcs-brief-b-${tag}@resend.dev`,
  c: `brief-c-${tag}@example.invalid`,
  outsider: `brief-outsider-${tag}@example.invalid`,
  ops: `brief-ops-${tag}@example.invalid`,
};
const ids = saved?.ids ?? {},
  cookies = saved?.cookies ?? {};
const listings = saved?.listings ?? { a: randomUUID(), b: randomUUID(), c: randomUUID() };
const briefs = saved?.briefs ?? {
  main: randomUUID(),
  closed: randomUUID(),
  other: randomUUID(),
  extra: randomUUID(),
};
const markers = {
  proposalA: `PROPOSAL-A-${tag}`,
  proposalB: `PROPOSAL-B-${tag}`,
  contact: `CONTACT-SECRET-${tag}`,
  company: `Empresa Secreta ${tag}`,
};
const opsToken = saved?.opsToken ?? randomBytes(32).toString('hex');
const shortlistId = saved?.shortlistId ?? randomUUID();
let keep = false;
const save = () =>
  fs.writeFileSync(
    stateFile,
    JSON.stringify({ tag, ids, cookies, listings, briefs, opsToken, shortlistId }),
  );
const bearer = { authorization: `Bearer ${process.env.CATALOG_REVALIDATE_SECRET}` };
const demandQuery = `cobranza atrasada ${tag}`;

async function post(route, data, who, from = origin) {
  return fetch(from + route, {
    method: 'POST',
    headers: {
      origin: from,
      'content-type': 'application/json',
      ...(who && cookies[who] ? { cookie: cookies[who] } : {}),
    },
    body: JSON.stringify(data),
  });
}
async function page(route, who) {
  const response = await fetch(origin + route, {
    headers: who ? { cookie: cookies[who] } : {},
    redirect: 'manual',
  });
  return { status: response.status, html: await response.text() };
}
async function opsFetch(route, init = {}) {
  return fetch(opsOrigin + route, {
    ...init,
    redirect: 'manual',
    headers: {
      cookie: `ops-session=${opsToken}`,
      ...(init.body ? { origin: opsOrigin, 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
}
async function until(check, label, tries = 30) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.fail(`Timed out waiting for ${label}`);
}
const briefBody = (id, patch = {}) => ({
  action: 'create',
  id,
  problem: `Necesitamos revisar contratos con proveedores y llevar el control de vencimientos ${tag}.`,
  budget: 'hasta 800 USD al mes',
  timeline: 'Este mes',
  companySize: 'pyme',
  industry: 'Retail',
  country: 'MX',
  categories: ['Legal'],
  capabilities: [],
  consent: true,
  consentVersion: 'brief-v1',
  ...patch,
});
const proposal = (briefId, solutionId, message, id = randomUUID()) => ({
  action: 'propose',
  id,
  briefId,
  solutionId,
  message,
  price: 'desde 300 USD al mes',
  timeline: '2 semanas',
});

(async () => {
  const step = text => console.log('✔', text);
  try {
    if (phase === 'all' || phase === 'product') await productPart(step);
    if (opsOrigin && (phase === 'all' || phase === 'ops')) await opsPart(step);
    else if (phase === 'all') console.log('… OPS_ORIGIN not set: ops part skipped');
    if (phase === 'finish') await finishPart(step);
    if (phase === 'product' || phase === 'ops') {
      save();
      keep = true;
      console.log(`Phase ${phase} passed; state kept in ${stateFile}.`);
    } else console.log('All brief checks passed.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    const accounts = Object.values(ids);
    if (!keep && accounts.length) {
      await sql`DELETE FROM search_demand WHERE query=${demandQuery}`;
      await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts}::uuid[])`;
      const scopes = ['brief-create', 'brief-update', 'brief-propose', 'contact-create'];
      const keys = scopes.flatMap(scope => accounts.map(id => `${scope}:${hash(id)}`));
      await sql`DELETE FROM auth_rate_limits WHERE key = ANY(${keys})`;
      const [left] =
        await sql`SELECT count(*)::int AS n FROM buyer_briefs WHERE id = ANY(${Object.values(briefs)}::uuid[])`;
      console.log(`Cleaned up ${accounts.length} accounts; briefs left: ${left.n}.`);
      if (stateFile && fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    }
  }
})();

async function productPart(step) {
  {
    for (const [role, email] of Object.entries(people)) {
      const response = await post('/api/auth/register', { email, password });
      assert.equal(response.status, 200, `register ${role}`);
      // A new account leaves registration signed in (SHCWS-26): no login, no device notice.
      cookies[role] = response.headers.get('set-cookie').split(';')[0];
      const [row] = await sql`SELECT id FROM auth_accounts WHERE email=${email}`;
      ids[role] = row.id;
    }
    await sql`UPDATE auth_accounts SET email_verified_at=now(), name='Ana Compradora', organization=${markers.company} WHERE id=${ids.buyer}`;
    await sql`UPDATE auth_accounts SET email_verified_at=now() WHERE id IN (${ids.a},${ids.b})`;
    const listing = (name, patch) =>
      JSON.stringify({
        name,
        kind: 'Software',
        category: 'Legal',
        categories: ['Legal'],
        problem: 'Gestión de contratos ' + name,
        audience: 'Equipos legales',
        website: 'https://example.com',
        contactEmail: `private-${tag}@example.invalid`,
        ...patch,
      });
    const data = {
      a: listing(`Contrata ${tag}`, {}),
      b: listing(`Pacta ${tag}`, { industries: ['Retail'], companySizes: ['pyme'] }),
      // Declared another industry: never sees a Retail brief.
      c: listing(`Clausula ${tag}`, { industries: ['Salud'] }),
    };
    for (const key of ['a', 'b', 'c'])
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status)
        VALUES(${listings[key]},${ids[key]},${data[key]}::jsonb,${data[key]}::jsonb,'published')`;
    step('accounts and listings');

    // Unverified buyers cannot broadcast a brief.
    assert.equal((await post('/api/briefs', briefBody(randomUUID()), 'outsider')).status, 403);
    // No consent, no brief.
    assert.equal(
      (await post('/api/briefs', briefBody(randomUUID(), { consent: false }), 'buyer')).status,
      400,
    );
    const created = await post('/api/briefs', briefBody(briefs.main), 'buyer');
    assert.equal(created.status, 200, await created.clone().text());
    // A retry of the same submit is the same brief.
    assert.equal((await post('/api/briefs', briefBody(briefs.main), 'buyer')).status, 200);
    const matches =
      await sql`SELECT solution_id::text FROM buyer_brief_matches WHERE brief_id=${briefs.main} ORDER BY 1`;
    assert.deepEqual(matches.map(row => row.solution_id).sort(), [listings.a, listings.b].sort());
    step('brief reaches the two listings that fit, not the one that declared another industry');

    const notices =
      await sql`SELECT owner_id::text,email_state FROM account_notifications WHERE source_key LIKE ${'brief-match:' + briefs.main + ':%'}`;
    assert.deepEqual(notices.map(row => row.owner_id).sort(), [ids.a, ids.b].sort());
    await until(async () => {
      const rows =
        await sql`SELECT email_state FROM account_notifications WHERE source_key LIKE ${'brief-match:' + briefs.main + ':%'}`;
      return rows.every(row => row.email_state === 'sent');
    }, 'founder emails');
    step('both founders got a notice and an email (Resend test inbox)');

    // Permissions before anyone is chosen.
    assert.equal((await page(`/es/account/needs/${briefs.main}`, 'c')).status, 404);
    assert.equal((await page(`/es/account/needs/${briefs.main}`, 'outsider')).status, 404);
    assert.equal((await page(`/es/account/briefs/${briefs.main}`, 'a')).status, 404);
    assert.equal((await page(`/es/account/briefs/${briefs.main}`, 'outsider')).status, 404);
    const needA = await page(`/es/account/needs/${briefs.main}`, 'a');
    assert.equal(needA.status, 200);
    assert.ok(needA.html.includes('control de vencimientos'));
    for (const secret of [people.buyer, markers.company, 'Ana Compradora', ids.buyer])
      assert.ok(!needA.html.includes(secret), `founder page leaks ${secret}`);
    const listA = await page('/es/account/needs', 'a');
    assert.ok(listA.html.includes(briefs.main) && !listA.html.includes(people.buyer));
    assert.equal(
      (
        await post(
          '/api/briefs',
          proposal(briefs.main, listings.c, 'Propuesta de quien no encaja.'),
          'c',
        )
      ).status,
      404,
    );
    // A founder cannot propose from someone else's listing.
    assert.equal(
      (
        await post(
          '/api/briefs',
          proposal(briefs.main, listings.a, 'Propuesta ajena a mi ficha.'),
          'b',
        )
      ).status,
      404,
    );
    step('only matched founders see the brief, never who the buyer is');

    const proposalA = randomUUID();
    const sentA = await post(
      '/api/briefs',
      proposal(
        briefs.main,
        listings.a,
        `Lo resolvemos con plantillas ${markers.proposalA}.`,
        proposalA,
      ),
      'a',
    );
    assert.equal(sentA.status, 200, await sentA.clone().text());
    assert.equal(
      (
        await post(
          '/api/briefs',
          proposal(
            briefs.main,
            listings.a,
            `Lo resolvemos con plantillas ${markers.proposalA}.`,
            proposalA,
          ),
          'a',
        )
      ).status,
      200,
      'retrying the same proposal',
    );
    assert.equal(
      (await post('/api/briefs', proposal(briefs.main, listings.a, 'Una segunda propuesta.'), 'a'))
        .status,
      409,
      'one proposal per founder',
    );
    const proposalB = randomUUID();
    assert.equal(
      (
        await post(
          '/api/briefs',
          proposal(
            briefs.main,
            listings.b,
            `Alertas de vencimiento ${markers.proposalB}.`,
            proposalB,
          ),
          'b',
        )
      ).status,
      200,
    );
    const buyerNotices =
      await sql`SELECT count(*)::int AS n FROM account_notifications WHERE owner_id=${ids.buyer} AND source_key LIKE 'brief-proposal:%'`;
    assert.equal(buyerNotices[0].n, 2);
    step('both founders proposed once; the buyer was told twice');

    const compare = await page(`/es/account/briefs/${briefs.main}`, 'buyer');
    assert.equal(compare.status, 200);
    assert.ok(compare.html.includes(markers.proposalA) && compare.html.includes(markers.proposalB));
    assert.ok(compare.html.includes('<table'), 'proposals side by side in one table');
    assert.ok(compare.html.includes(`/account/briefs/${briefs.main}/choose/${proposalA}`));
    step('the buyer compares both proposals on one page');

    const choose = await page(`/es/account/briefs/${briefs.main}/choose/${proposalA}`, 'buyer');
    assert.equal(choose.status, 200);
    assert.equal(
      (await page(`/es/account/briefs/${briefs.main}/choose/${proposalA}`, 'a')).status,
      404,
      'only the buyer chooses',
    );
    const contactId = randomUUID();
    const contact = await post(
      '/api/contacts',
      {
        action: 'create',
        id: contactId,
        solutionId: listings.a,
        recipientId: ids.a,
        name: 'Ana Compradora',
        company: markers.company,
        size: 'pyme',
        timeline: 'Este mes',
        budget: 'hasta 800 USD al mes',
        need: `Vengo de tu propuesta. ${markers.contact}`,
        consent: true,
        consentVersion: 'contact-v1',
        briefId: briefs.main,
      },
      'buyer',
    );
    assert.equal(contact.status, 200, await contact.clone().text());
    const [chosen] =
      await sql`SELECT chosen_at,contact_request_id::text FROM buyer_brief_proposals WHERE id=${proposalA}`;
    assert.ok(chosen.chosen_at);
    assert.equal(chosen.contact_request_id, contactId);
    const needAfter = await page(`/es/account/needs/${briefs.main}`, 'a');
    assert.ok(needAfter.html.includes(`/account/opportunities/${contactId}`));
    const opportunity = await page(`/es/account/opportunities/${contactId}`, 'a');
    assert.equal(opportunity.status, 200);
    assert.ok(opportunity.html.includes(markers.company), 'chosen founder now sees the company');
    const needB = await page(`/es/account/needs/${briefs.main}`, 'b');
    assert.ok(!needB.html.includes(markers.company) && !needB.html.includes(people.buyer));
    step('choosing A opened an ordinary conversation; B still sees nothing of the buyer');

    // B already talks to the buyer: choosing B links that conversation, no second request.
    const direct = randomUUID();
    assert.equal(
      (
        await post(
          '/api/contacts',
          {
            action: 'create',
            id: direct,
            solutionId: listings.b,
            recipientId: ids.b,
            name: 'Ana Compradora',
            company: markers.company,
            size: 'pyme',
            timeline: 'Este mes',
            budget: '',
            need: 'Escribo directo desde la ficha publicada.',
            consent: true,
            consentVersion: 'contact-v1',
          },
          'buyer',
        )
      ).status,
      200,
    );
    const existing = await post(
      '/api/briefs',
      { action: 'choose-existing', id: briefs.main, proposalId: proposalB },
      'buyer',
    );
    assert.equal(existing.status, 200);
    assert.equal((await existing.json()).contactId, direct);
    const [requests] =
      await sql`SELECT count(*)::int AS n FROM contact_requests WHERE buyer_id=${ids.buyer}`;
    assert.equal(requests.n, 2);
    step('choosing a founder already in conversation reuses it');

    // A closed brief takes no proposals; the daily quota holds.
    assert.equal((await post('/api/briefs', briefBody(briefs.closed), 'buyer')).status, 200);
    assert.equal(
      (await post('/api/briefs', { action: 'close', id: briefs.closed }, 'buyer')).status,
      200,
    );
    assert.equal(
      (
        await post(
          '/api/briefs',
          proposal(briefs.closed, listings.a, 'Propuesta a una cerrada.'),
          'a',
        )
      ).status,
      409,
    );
    assert.equal(
      (await post('/api/briefs', briefBody(briefs.other, { categories: ['Desarrollo'] }), 'buyer'))
        .status,
      200,
    );
    assert.equal(
      (await post('/api/briefs', briefBody(briefs.extra, { categories: ['Desarrollo'] }), 'buyer'))
        .status,
      429,
      'fourth brief in a day',
    );
    step('closing stops proposals; the fourth brief of the day is refused');

    const exportBuyer = await fetch(origin + '/api/account/export', {
      headers: { cookie: cookies.buyer },
    }).then(response => response.json());
    assert.equal(exportBuyer.briefs.posted.length, 3);
    assert.equal(exportBuyer.briefs.proposals.length, 2);
    const exportA = await fetch(origin + '/api/account/export', {
      headers: { cookie: cookies.a },
    }).then(response => response.text());
    assert.ok(exportA.includes(markers.proposalA));
    assert.ok(!exportA.includes(ids.buyer));
    step('both exports carry their own side');
    // The ops session and a search that found nothing, for the ops part.
    await sql`INSERT INTO solution_reviewers(account_id,level) VALUES(${ids.ops},'reviewer')`;
    await sql`INSERT INTO ops_sessions(token_hash,account_id,expires_at) VALUES(${hash(opsToken)},${ids.ops},now()+interval '1 hour')`;
    await sql`INSERT INTO search_demand(day,query,surface,searches,empty) VALUES(current_date,${demandQuery},'search',3,3)`;
  }
}

/** Ops part. With the product down (BRIEFS_PHASE=ops), what needs it moves to `finish`. */
async function opsPart(step) {
  const productUp = phase === 'all';
  {
    const board = await opsFetch('/panel/necesidades?estado=all');
    assert.equal(board.status, 200);
    const boardHtml = await board.text();
    assert.ok(boardHtml.includes(`/panel/necesidades/${briefs.main}`));
    if (productUp) {
      assert.ok(boardHtml.includes(demandQuery), 'zero-result searches grouped by topic');
      assert.ok(boardHtml.includes('Cobros'), 'the search falls under Cobros');
    } else assert.ok(boardHtml.includes('No se pudo consultar el producto'), 'says why');
    const detail = await opsFetch(`/panel/necesidades/${briefs.main}`);
    assert.equal(detail.status, 200);
    const detailHtml = await detail.text();
    assert.ok(detailHtml.includes('control de vencimientos'), 'ops reads the brief');
    for (const secret of [markers.proposalA, markers.proposalB, markers.contact])
      assert.ok(!detailHtml.includes(secret), `ops page leaks ${secret}`);
    step('ops sees briefs and grouped demand, never proposals or conversations');

    const shortlist = {
      action: 'shortlist',
      id: shortlistId,
      briefId: briefs.main,
      solutionIds: [listings.b, listings.c],
      note: `Estas dos opciones llevan contratos para retail. NOTE-${tag}`,
    };
    const sent = await opsFetch('/api/briefs', {
      method: 'POST',
      body: JSON.stringify(shortlist),
    });
    assert.equal(sent.status, 200, await sent.clone().text());
    assert.equal(
      (await opsFetch('/api/briefs', { method: 'POST', body: JSON.stringify(shortlist) })).status,
      200,
      'same short list again',
    );
    assert.equal(
      (
        await opsFetch('/api/briefs', {
          method: 'POST',
          body: JSON.stringify({ ...shortlist, id: randomUUID() }),
        })
      ).status,
      409,
      'one short list per brief',
    );
    const [audit] =
      await sql`SELECT count(*)::int AS n FROM ops_audit_log WHERE action='brief_shortlist' AND subject_id=${briefs.main} AND actor_id=${ids.ops}`;
    assert.equal(audit.n, 1);
    const [notice] =
      await sql`SELECT owner_id::text FROM account_notifications WHERE source_key=${'brief-shortlist:' + shortlistId}`;
    assert.equal(notice?.owner_id, ids.buyer);
    if (productUp) await shortlistReachedBuyer();
    step('ops sent a short list, audited, with the buyer’s notice');

    const hide = await opsFetch('/api/briefs', {
      method: 'POST',
      body: JSON.stringify({
        action: 'hide',
        id: briefs.closed,
        reason: 'Prueba de ocultar una necesidad.',
      }),
    });
    assert.equal(hide.status, 200);
    const [hidden] =
      await sql`SELECT count(*)::int AS n FROM ops_audit_log WHERE action='brief_hide' AND subject_id=${briefs.closed}`;
    assert.equal(hidden.n, 1);
    if (productUp) await hiddenForEveryone();
    // Hide and show another one: both audited.
    for (const action of ['hide', 'unhide']) {
      const response = await opsFetch('/api/briefs', {
        method: 'POST',
        body: JSON.stringify({ action, id: briefs.other, reason: 'Prueba de moderación.' }),
      });
      assert.equal(response.status, 200, action);
    }
    const [moderated] =
      await sql`SELECT count(*)::int AS n FROM ops_audit_log WHERE action IN ('brief_hide','brief_unhide') AND subject_id=${briefs.other}`;
    assert.equal(moderated.n, 2);
    // Cross-site posts are refused before anything else.
    const foreign = await fetch(opsOrigin + '/api/briefs', {
      method: 'POST',
      headers: {
        cookie: `ops-session=${opsToken}`,
        origin: 'https://evil.test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'hide',
        id: briefs.main,
        reason: 'Intento desde otro sitio.',
      }),
    });
    assert.equal(foreign.status, 403);
    step('ops hides and shows briefs with audit; foreign origins are refused');
  }
}

/** The short list's email went out and the buyer reads it in their account. */
async function shortlistReachedBuyer() {
  await until(async () => {
    const [row] =
      await sql`SELECT email_state FROM account_notifications WHERE source_key=${'brief-shortlist:' + shortlistId}`;
    return row?.email_state === 'sent';
  }, 'short list email');
  const withShortlist = await page(`/es/account/briefs/${briefs.main}`, 'buyer');
  assert.ok(withShortlist.html.includes(`NOTE-${tag}`));
}

/** A hidden brief: the buyer reads ops' reason, the founder it matched gets a 404. */
async function hiddenForEveryone() {
  const buyerHidden = await page(`/es/account/briefs/${briefs.closed}`, 'buyer');
  assert.ok(buyerHidden.html.includes('Prueba de ocultar una necesidad.'));
  assert.equal((await page(`/es/account/needs/${briefs.closed}`, 'a')).status, 404);
}

/** Product back up after the ops phase: what ops asked of it. */
async function finishPart(step) {
  // What ops calls after a short list (its own server was the one up then).
  const delivered = await fetch(origin + '/api/internal/brief-notices', {
    method: 'POST',
    headers: bearer,
  });
  assert.equal(delivered.status, 200);
  await shortlistReachedBuyer();
  step('the short list reached the buyer’s account and inbox');
  await hiddenForEveryone();
  step('the hidden brief shows ops’ reason to the buyer and is gone for the founder');
  assert.equal((await fetch(origin + '/api/internal/demand-topics')).status, 401);
  const topics = await fetch(origin + '/api/internal/demand-topics', { headers: bearer }).then(
    response => response.json(),
  );
  const cobros = topics.topics.find(topic => topic.value === 'Cobros');
  assert.ok(
    cobros?.queries.some(item => item.query === demandQuery),
    'grouped under Cobros',
  );
  step('zero-result searches come back grouped by topic, only with the ops credential');
}
