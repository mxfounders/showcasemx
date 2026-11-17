// Opt-in integration test for review invitations (SHCWS-132), «Contactó vía shwcs»
// (SHCWS-135) and public questions (SHCWS-57). Accounts and sessions are created in the
// database, never through registration, so no email goes to a test address. The only real
// emails go to Resend's test inbox (delivered+…@resend.dev) and only when
// RESEND_TEST_EMAILS=1. Every fixture is removed in `finally`.
//
//   RUN_REVIEW_INVITES_INTEGRATION=1 APP_ORIGIN=http://localhost:3107 node tests/integration/review-invitations.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_REVIEW_INVITES_INTEGRATION !== '1') {
  console.log('Set RUN_REVIEW_INVITES_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const url = env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL;
if (new URL(url).pathname !== '/neondb') throw Error('Refusing to run outside the dev database.');
const sql = neon(url),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  realEmail = process.env.RESEND_TEST_EMAILS === '1',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex'),
  wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const people = {
  founder: `inv-founder-${tag}@example.invalid`,
  existing: `inv-existing-${tag}@example.invalid`,
  totp: `inv-totp-${tag}@example.invalid`,
  unverified: `inv-unverified-${tag}@example.invalid`,
  buyer1: `inv-buyer1-${tag}@example.invalid`,
  buyer2: `inv-buyer2-${tag}@example.invalid`,
  buyer3: `inv-buyer3-${tag}@example.invalid`,
  asker: `inv-asker-${tag}@example.invalid`,
  shy: `inv-shy-${tag}@example.invalid`,
  outsider: `inv-outsider-${tag}@example.invalid`,
  ...(realEmail && { mail: `delivered+shwcs-qa-${tag}@resend.dev` }),
};
const created = [`inv-new-${tag}@example.invalid`, `inv-race-${tag}@example.invalid`];
const ids = {},
  cookies = {},
  listing = randomUUID(),
  mailListing = randomUUID(),
  requests = { r1: randomUUID(), r2: randomUUID(), r3: randomUUID() };
const call = (path, { who, method = 'POST', body, cookie } = {}) =>
  fetch(origin + path, {
    method,
    redirect: 'manual',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-forwarded-for': `10.88.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(who || cookie ? { cookie: cookie ?? cookies[who] } : {}),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
const expect = async (response, status, label) => {
  const text = await response.text();
  assert.equal(response.status, status, `${label}: ${text.slice(0, 300)}`);
  return text.startsWith('{') ? JSON.parse(text) : text;
};
const page = async (path, who) => (await call(path, { who, method: 'GET' })).text();
const review = (who, patch = {}) => ({
  action: 'save',
  reviewId: randomUUID(),
  name: `Revisora ${who}`,
  rating: 4,
  recommends: true,
  headline: `Reseña de prueba ${tag}`,
  useCase: 'Cotizaciones mensuales para clientes de mayoreo.',
  pros: 'Las cotizaciones salen en minutos y sin errores.',
  cons: 'Los reportes por vendedor todavía son limitados.',
  usageDuration: '6to12m',
  companySize: 'pyme',
  country: 'MX',
  ...patch,
});
const ficha = name => ({
  name,
  kind: 'Software',
  category: 'Ventas',
  categories: ['Ventas'],
  problem: 'Problema público de prueba para invitaciones.',
  audience: 'Equipos comerciales',
  website: `https://qa-invites-${tag}.example`,
  contactEmail: people.founder,
});
const magic = async (email, { issued = null, minutes = 30 } = {}) => {
  const token = randomBytes(32).toString('hex');
  await sql`INSERT INTO auth_magic_links(token_hash,email,solution_id,password_hash_at_issue,expires_at)
    VALUES (${hash(token)},${email},${listing},${issued},now()+${minutes}*interval '1 minute')`;
  return token;
};
const consume = token => call('/api/auth/magic-link', { body: { action: 'consume', token } });
let passed = 0;
const step = label => {
  passed++;
  console.log(`ok ${passed} - ${label}`);
};

(async () => {
  try {
    // Accounts, sessions and preferences straight in the database. Listing and contact
    // emails are off for the example.invalid accounts so nothing is ever queued to them.
    for (const [role, email] of Object.entries(people)) {
      const id = randomUUID(),
        token = randomBytes(32).toString('hex');
      ids[role] = id;
      await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at)
        VALUES (${id},${email},${'scrypt-v1:qa:' + tag + role},${'QA ' + role},
          ${role === 'unverified' || role === 'shy' ? null : new Date().toISOString()})`;
      const mail = role === 'mail';
      await sql`INSERT INTO notification_preferences(owner_id,contact_email,solution_email) VALUES (${id},${mail},${mail})
        ON CONFLICT (owner_id) DO UPDATE SET contact_email=${mail},solution_email=${mail}`;
      await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES (${hash(token)},${id},now()+interval '1 hour')`;
      cookies[role] = `showcasemx-session=${token}`;
    }
    await sql`UPDATE auth_accounts SET totp_confirmed_at=now(),totp_secret='qa' WHERE id=${ids.totp}`;
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at) VALUES
      (${listing},${ids.founder},${JSON.stringify(ficha('QA invitada ' + tag))}::jsonb,${JSON.stringify(ficha('QA invitada ' + tag))}::jsonb,'published',now())`;
    if (realEmail)
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at) VALUES
        (${mailListing},${ids.mail},${JSON.stringify(ficha('QA correo ' + tag))}::jsonb,${JSON.stringify(ficha('QA correo ' + tag))}::jsonb,'published',now())`;

    // ---- SHCWS-132: the founder's link -------------------------------------------------
    const invitePath = `/api/solutions/${listing}/review-invite`;
    await expect(await call(invitePath, { body: { action: 'create' } }), 401, 'anonymous link');
    await expect(
      await call(invitePath, { who: 'outsider', body: { action: 'create' } }),
      403,
      'someone else’s link',
    );
    const first = await expect(
      await call(invitePath, { who: 'founder', body: { action: 'create' } }),
      200,
      'create link',
    );
    assert.match(first.token, /^[a-f0-9]{32}$/);
    const again = await expect(
      await call(invitePath, { who: 'founder', body: { action: 'create' } }),
      200,
      'create link again',
    );
    assert.equal(again.token, first.token, 'create returns the existing link');
    const rotated = await expect(
      await call(invitePath, { who: 'founder', body: { action: 'rotate' } }),
      200,
      'rotate link',
    );
    assert.notEqual(rotated.token, first.token);
    const invite = rotated.token;
    assert.match(await page(`/es/resenar/${first.token}`), /Este enlace ya no funciona/);
    step('the founder creates, reuses and replaces the link; the old one stops working');

    const landing = await page(`/es/resenar/${invite}`);
    assert.match(landing, new RegExp(`Reseña QA invitada ${tag}`));
    assert.match(landing, /Enviarme el enlace/);
    assert.match(landing, /noindex/);
    assert.match(await page(`/en/resenar/${invite}`), /Send me the link/);
    assert.match(await page(`/es/resenar/${invite}`, 'founder'), /No puedes reseñar tu propia/);
    step('the invitation page asks for an email signed out and refuses the owner');

    await expect(
      await call('/api/auth/magic-link', {
        body: { action: 'send', email: 'not-an-email', invite },
      }),
      400,
      'bad email',
    );
    await expect(
      await call('/api/auth/magic-link', {
        body: { action: 'send', email: created[0], invite: 'f'.repeat(32) },
      }),
      409,
      'unknown invitation',
    );
    if (realEmail) {
      const to = `delivered+shwcs-link-${tag}@resend.dev`;
      await expect(
        await call('/api/auth/magic-link', { body: { action: 'send', email: to, invite } }),
        200,
        'send link',
      );
      const [row] = await sql`SELECT count(*)::int n FROM auth_magic_links WHERE email=${to}`;
      assert.equal(row.n, 1, 'one stored link');
      assert.equal(
        (await sql`SELECT count(*)::int n FROM auth_accounts WHERE email=${to}`)[0].n,
        0,
        'asking for a link creates no account',
      );
      await sql`DELETE FROM auth_magic_links WHERE email=${to}`;
      step('a link goes out to Resend’s test inbox without creating an account');
    }

    const started = Date.now();
    const fresh = await consume(await magic(created[0]));
    const freshBody = await expect(fresh, 200, 'new account by link');
    assert.equal(freshBody.created, true);
    cookies.invited = fresh.headers.get('set-cookie').split(';')[0];
    const [newAccount] =
      await sql`SELECT id,email_verified_at FROM auth_accounts WHERE email=${created[0]}`;
    assert.ok(newAccount.email_verified_at, 'verified in the same step');
    ids.invited = newAccount.id;
    const [newHash] = await sql`SELECT password_hash FROM auth_accounts WHERE id=${ids.invited}`;
    const reused = await magic(created[0], { issued: newHash.password_hash });
    await expect(await consume(reused), 200, 'second link for the same address');
    await expect(await consume(reused), 400, 'a link works once');
    await expect(await consume(await magic(created[0], { minutes: -1 })), 400, 'expired link');
    step('a link creates a verified account, signs in once and expires');

    const [existing] = await sql`SELECT password_hash FROM auth_accounts WHERE id=${ids.existing}`;
    const signedIn = await expect(
      await consume(await magic(people.existing, { issued: existing.password_hash })),
      200,
      'existing verified account',
    );
    assert.equal(signedIn.created, false);
    await expect(
      await consume(await magic(people.existing, { issued: 'scrypt-v1:old' })),
      400,
      'password changed since the link',
    );
    await expect(
      await consume(await magic(people.existing, { issued: null })),
      409,
      'account appeared after the link',
    );
    const [totp] = await sql`SELECT password_hash FROM auth_accounts WHERE id=${ids.totp}`;
    await expect(
      await consume(await magic(people.totp, { issued: totp.password_hash })),
      409,
      'two-step account',
    );
    const [unverified] =
      await sql`SELECT password_hash FROM auth_accounts WHERE id=${ids.unverified}`;
    await expect(
      await consume(await magic(people.unverified, { issued: unverified.password_hash })),
      409,
      'unverified account',
    );
    assert.equal(
      (await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${ids.unverified}`)[0]
        .email_verified_at,
      null,
      'an unverified account is never verified by the link',
    );
    const race = await magic(created[1]);
    const statuses = (await Promise.all([consume(race), consume(race)])).map(r => r.status).sort();
    assert.deepEqual(statuses, [200, 400], 'two tabs racing: one session, one refusal');
    step(
      'existing accounts: verified ones sign in; changed, newer, two-step and unverified ones do not',
    );

    assert.match(await page(`/es/resenar/${invite}`, 'invited'), /Publicar reseña/);
    const invitedReview = review('invitada', { invite });
    await expect(
      await call(`/api/solutions/${listing}/reviews`, { who: 'invited', body: invitedReview }),
      200,
      'invited review',
    );
    const seconds = (Date.now() - started) / 1000;
    assert.ok(seconds < 120, `link to published review in ${seconds}s`);
    assert.equal(
      (await sql`SELECT review_invited(${ids.invited}::uuid,${listing}::uuid) AS invited`)[0]
        .invited,
      true,
    );
    await expect(
      await call(`/api/solutions/${listing}/reviews`, {
        who: 'existing',
        body: review('existente', { invite: 'f'.repeat(32) }),
      }),
      409,
      'a replaced or unknown link is refused, not saved unlabelled',
    );
    await expect(
      await call(`/api/solutions/${listing}/reviews`, {
        who: 'existing',
        body: review('existente', { rating: 4 }),
      }),
      200,
      'organic review',
    );
    const publicPage = await page(`/es/soluciones/${listing}`);
    assert.match(publicPage, /Invitada por el proyecto/);
    assert.match(publicPage, /1 por invitación del proyecto/);
    assert.doesNotMatch(publicPage, new RegExp(created[0]));
    assert.match(await page(`/en/soluciones/${listing}`), /Invited by the vendor/);
    // Same expression as the catalogue order (src/lib/solutions/public.ts), undecayed.
    const weights =
      await sql`SELECT r.author_id,r.rating*CASE WHEN review_contact_backed(r.author_id,r.solution_id) THEN 2
        WHEN split_part(a.email,'@',2)='gmail.com' THEN 1 ELSE 1.5 END
        *CASE WHEN review_invited(r.author_id,r.solution_id) THEN 0.5 ELSE 1 END AS weight
      FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id WHERE r.solution_id=${listing}`;
    const weight = id => Number(weights.find(row => row.author_id === id).weight);
    assert.equal(weight(ids.invited), 3, 'invited: 4 stars × 1.5 × 0.5');
    assert.equal(weight(ids.existing), 6, 'organic: 4 stars × 1.5');
    step(
      `an invited customer publishes a verified review in ${seconds.toFixed(1)} s, labelled and at half weight`,
    );

    const ownPublic = await page(`/es/soluciones/${listing}`, 'founder');
    assert.match(ownPublic, /Invita a tus clientes a reseñar/);
    const ownAccount = await page(`/es/account/solutions/${listing}`, 'founder');
    assert.match(ownAccount, /Invita a tus clientes a reseñar/);
    assert.match(ownAccount, new RegExp(invite));
    step('the owner finds the link on the listing and on their solution page');

    // ---- SHCWS-135: «Contactó vía shwcs» -----------------------------------------------
    const [others] =
      await sql`SELECT count(*)::int n FROM contact_requests c JOIN founder_solutions s ON s.id=c.solution_id
      WHERE c.id <> ALL(${Object.values(requests)}::uuid[]) AND s.published_data IS NOT NULL
        AND LEAST((SELECT min(e.created_at) FROM contact_events e WHERE e.request_id=c.id AND e.kind='status' AND e.status='conversation'),
          CASE WHEN c.outcome='won' THEN c.outcome_at END) BETWEEN now()-interval '90 days' AND now()-interval '30 days'
        AND NOT EXISTS(SELECT 1 FROM solution_reviews r WHERE r.solution_id=c.solution_id AND r.author_id=c.buyer_id)`;
    assert.equal(others.n, 0, 'no real conversation would be invited by this test');
    const details = JSON.stringify({ name: 'QA', company: 'QA SA', need: 'Prueba de invitación' });
    const request = (key, buyer, status, days, extra = {}) =>
      sql`INSERT INTO contact_requests(id,buyer_id,recipient_id,solution_id,project_name,buyer_email,details,consent_version,status,created_at,updated_at,outcome,outcome_at)
        VALUES (${requests[key]},${ids[buyer]},${ids.founder},${listing},${'QA invitada ' + tag},${people[buyer]},${details}::jsonb,'contact-v1',${status},
          now()-${days}*interval '1 day',now(),${extra.outcome ?? null},${extra.outcomeDays ? new Date(Date.now() - extra.outcomeDays * 864e5).toISOString() : null})`;
    const event = (key, actor, status, days, kind = 'status') =>
      sql`INSERT INTO contact_events(request_id,actor_id,status,kind,message,created_at)
        VALUES (${requests[key]},${ids[actor]},${status},${kind},'',now()-${days}*interval '1 day')`;
    await request('r1', 'buyer1', 'conversation', 40);
    await event('r1', 'buyer1', 'new', 40);
    await event('r1', 'founder', 'conversation', 35);
    // A message keeps the request's status: it never counts as reaching a conversation.
    await request('r2', 'buyer2', 'new', 40);
    await event('r2', 'buyer2', 'new', 40);
    await event('r2', 'buyer2', 'new', 39, 'message');
    await request('r3', 'buyer3', 'closed', 50, { outcome: 'won', outcomeDays: 45 });
    await event('r3', 'buyer3', 'new', 50);
    await event('r3', 'founder', 'closed', 45);

    const [run] = await sql`SELECT invite_contact_reviews() AS created`;
    assert.equal(Number(run.created), 2, 'conversation and won are invited, a message is not');
    const notices =
      await sql`SELECT source_key,category,href,title,email_state FROM account_notifications WHERE source_key LIKE 'review-request:%'
        AND owner_id = ANY(${[ids.buyer1, ids.buyer2, ids.buyer3]}::uuid[]) ORDER BY source_key`;
    assert.deepEqual(
      notices.map(n => n.source_key).sort(),
      [`review-request:${requests.r1}`, `review-request:${requests.r3}`].sort(),
    );
    for (const notice of notices) {
      assert.equal(notice.category, 'contact');
      assert.equal(notice.href, `/account/reviews/${listing}`);
      assert.match(notice.title, new RegExp(`¿Cómo te fue con QA invitada ${tag}\\?`));
      assert.equal(notice.email_state, 'disabled', 'follows the contact email preference');
    }
    assert.equal(Number((await sql`SELECT invite_contact_reviews() AS created`)[0].created), 0);
    step('a 30-day-old conversation and a won deal trigger one invitation each, once');

    const buyerPage = await page(`/es/account/reviews/${listing}`, 'buyer1');
    assert.match(buyerPage, /Contactaste a QA invitada/);
    // The template is in the page's dictionary; only a real conversation fills in the name.
    assert.doesNotMatch(
      await page(`/es/account/reviews/${listing}`, 'buyer2'),
      new RegExp(`Contactaste a QA invitada ${tag}`),
    );
    assert.match(
      await page(`/en/account/reviews/${listing}`, 'buyer1'),
      /You contacted QA invitada/,
    );
    const anonymous = await call(`/es/account/reviews/${listing}`, { method: 'GET' });
    assert.ok([307, 308].includes(anonymous.status), 'signed out goes to sign-in');
    assert.match(anonymous.headers.get('location'), /sign-in\?next=%2Faccount%2Freviews%2F/);
    await expect(
      await call(`/api/solutions/${listing}/reviews`, { who: 'buyer1', body: review('b1') }),
      200,
      'contact-backed review',
    );
    await expect(
      await call(`/api/solutions/${listing}/reviews`, { who: 'buyer2', body: review('b2') }),
      200,
      'review without a conversation',
    );
    const withContact = await page(`/es/soluciones/${listing}`);
    assert.match(withContact, /Contactó vía shwcs/);
    assert.match(withContact, /1 tras contactar vía shwcs/);
    assert.doesNotMatch(withContact, /Prueba de invitación/, 'nothing from the request');
    const [b1] =
      await sql`SELECT review_contact_backed(${ids.buyer1}::uuid,${listing}::uuid) a, review_contact_backed(${ids.buyer2}::uuid,${listing}::uuid) b,
        review_contact_backed(${ids.buyer3}::uuid,${listing}::uuid) c`;
    assert.deepEqual([b1.a, b1.b, b1.c], [true, false, true]);
    step(
      'the review shows «Contactó vía shwcs» only for a real conversation, with none of its content',
    );

    // ---- SHCWS-52 signal on the listing ------------------------------------------------
    assert.match(withContact, /2 de 3 respondidas/);
    assert.match(await page(`/en/soluciones/${listing}`), /2 of 3 answered/);
    step('the response signal shows under the contact action in es and en');

    // ---- SHCWS-57: public questions -----------------------------------------------------
    const qPath = `/api/solutions/${listing}/questions`;
    const question = randomUUID();
    const ask = (who, patch = {}) =>
      call(qPath, {
        who,
        body: {
          action: 'ask',
          questionId: question,
          name: 'Ana QA',
          body: `¿Emite facturas CFDI? ${tag}`,
          ...patch,
        },
      });
    await expect(await ask(null), 401, 'anonymous question');
    await expect(await ask('shy'), 403, 'unverified question');
    await expect(await ask('founder', { questionId: randomUUID() }), 409, 'own listing');
    const short = await expect(await ask('asker', { body: '¿CFDI?' }), 400, 'short question');
    assert.equal(short.field, 'body');
    assert.equal((await expect(await ask('asker'), 200, 'ask')).created, true);
    assert.equal((await expect(await ask('asker'), 200, 'retry')).created, false);
    const [notice] =
      await sql`SELECT owner_id,category,title,href,email_state FROM account_notifications WHERE source_key=${'question:' + question}`;
    assert.equal(notice.owner_id, ids.founder);
    assert.equal(notice.category, 'solution');
    assert.equal(notice.title, 'Nueva pregunta sobre tu ficha');
    assert.equal(notice.href, `/account/solutions/${listing}`);
    step('verified accounts ask under an alias; the owner gets a listing notice');

    const answer = (who, text) =>
      call(qPath, { who, body: { action: 'answer', questionId: question, answer: text } });
    await expect(await answer('outsider', 'No soy el dueño.'), 403, 'someone else answers');
    await expect(await answer('asker', 'Me respondo.'), 403, 'asker answers');
    await expect(await answer('founder', 'Sí, timbramos con nuestro PAC.'), 200, 'owner answers');
    const qa = await page(`/es/soluciones/${listing}`);
    assert.match(qa, new RegExp(`¿Emite facturas CFDI\\? ${tag}`));
    assert.match(qa, new RegExp(`Respuesta de QA invitada ${tag}`));
    assert.match(qa, /"@type":"FAQPage"/);
    assert.match(qa, /Sí, timbramos con nuestro PAC\./);
    assert.doesNotMatch(qa, new RegExp(people.asker));
    step('the owner’s answer is public, marked as theirs and in the FAQPage markup');

    const report = (who, id = question) =>
      call(qPath, {
        who,
        body: {
          action: 'report',
          questionId: id,
          reason: 'spam',
          details: 'Publicidad de otra app.',
        },
      });
    await expect(await report('outsider'), 200, 'report');
    await expect(await report('outsider'), 409, 'report twice');
    await expect(await report('asker'), 409, 'report your own');
    await expect(await report('founder'), 200, 'the owner reports');
    await expect(
      await call(qPath, { who: 'founder', body: { action: 'delete', questionId: question } }),
      404,
      'the owner cannot delete a question',
    );
    // What ops does when it hides one (no product endpoint does this).
    await sql`UPDATE solution_questions SET hidden_at=now(),hidden_reason='Spam confirmado' WHERE id=${question}`;
    const hidden = await page(`/es/soluciones/${listing}`);
    assert.doesNotMatch(hidden, new RegExp(`¿Emite facturas CFDI\\? ${tag}`));
    assert.doesNotMatch(hidden, /"@type":"FAQPage"/);
    assert.match(await page(`/es/soluciones/${listing}`, 'asker'), /Spam confirmado/);
    await expect(
      await call(qPath, { who: 'asker', body: { action: 'delete', questionId: question } }),
      200,
      'the author deletes',
    );
    step(
      'reports go to ops; a hidden question leaves the page and the markup; only its author deletes it',
    );

    if (realEmail) {
      const mailQuestion = randomUUID();
      await expect(
        await call(`/api/solutions/${mailListing}/questions`, {
          who: 'asker',
          body: {
            action: 'ask',
            questionId: mailQuestion,
            name: 'Ana QA',
            body: '¿Tiene app móvil?',
          },
        }),
        200,
        'question to the mail founder',
      );
      let state = '';
      for (let i = 0; i < 20 && state !== 'sent'; i++) {
        await wait(1000);
        state = (
          await sql`SELECT email_state FROM account_notifications WHERE source_key=${'question:' + mailQuestion}`
        )[0]?.email_state;
      }
      assert.equal(state, 'sent', 'the question reaches the founder by email');
      step('a question reaches the founder by email (Resend test inbox)');
    }
    console.log(`\n${passed} checks passed`);
  } finally {
    const accounts = [...Object.values(ids)];
    await sql`DELETE FROM auth_magic_links WHERE email = ANY(${[...Object.values(people), ...created]}::text[])`;
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts}::uuid[]) OR email = ANY(${created}::text[])`;
    const [left] =
      await sql`SELECT count(*)::int n FROM founder_solutions WHERE id = ANY(${[listing, mailListing]}::uuid[])`;
    console.log(`cleanup: ${left.n} listings left`);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
