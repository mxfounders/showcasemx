// Opt-in integration test for community notices (SHCWS-117): likes, saves and comments on
// a public list reach its curator as one grouped notice per kind and day, never naming who
// liked or saved it; founders hear once that their project is on a public list, and only
// when that list can be seen (3 available projects). The founder's address is Resend's test
// inbox (delivered+…@resend.dev); everyone else is @example.invalid. Fixtures go in `finally`.
//
//   RUN_COMMUNITY_NOTICES_INTEGRATION=1 node tests/integration/community-notices.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_COMMUNITY_NOTICES_INTEGRATION=1 node tests/integration/community-notices.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_COMMUNITY_NOTICES_INTEGRATION !== '1') {
  console.log('Set RUN_COMMUNITY_NOTICES_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const curator = randomUUID(),
  founder = randomUUID(),
  visitors = [randomUUID(), randomUUID()],
  accounts = [curator, founder, ...visitors],
  tokens = Object.fromEntries(accounts.map(id => [id, randomBytes(32).toString('hex')])),
  solutions = [randomUUID(), randomUUID(), randomUUID()],
  ownSolution = randomUUID(),
  list = randomUUID();

const call = (who, path, body) =>
  fetch(`${origin}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      origin,
      'content-type': 'application/json',
      cookie: `showcasemx-session=${tokens[who]}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const notices = owner =>
  sql`SELECT source_key,title,href,email_state,read_at FROM account_notifications WHERE owner_id=${owner} ORDER BY source_key`;
const addItem = async (owner, key) => {
  await sql`INSERT INTO buyer_saved_projects(owner_id,project_key) VALUES (${owner},${key}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO buyer_list_items(owner_id,list_id,project_key) VALUES (${owner},${list},${key})`;
};

(async () => {
  try {
    await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at) VALUES
      (${curator}, ${`community-curator-${tag}@example.invalid`}, 'x', 'QA Curadora', now()),
      (${founder}, ${`delivered+shwcs-community-${tag}@resend.dev`}, 'x', 'QA Fundador', now()),
      (${visitors[0]}, ${`community-a-${tag}@example.invalid`}, 'x', 'QA Visitante A', now()),
      (${visitors[1]}, ${`community-b-${tag}@example.invalid`}, 'x', 'QA Visitante B', now())`;
    for (const id of accounts)
      await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES (${hash(tokens[id])},${id},now()+interval '1 hour')`;
    const listing = name => ({
      name,
      kind: 'Software',
      category: 'Ventas',
      categories: ['Ventas'],
      problem: 'Prueba de avisos de comunidad.',
      audience: 'QA',
      website: 'https://community-notices.example.com/',
    });
    for (const [index, id] of solutions.entries())
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
        VALUES (${id},${founder},${JSON.stringify(listing(`QA proyecto ${index + 1}`))}::jsonb,${JSON.stringify(listing(`QA proyecto ${index + 1}`))}::jsonb,'published',now())`;
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
      VALUES (${ownSolution},${curator},${JSON.stringify(listing('QA propio'))}::jsonb,${JSON.stringify(listing('QA propio'))}::jsonb,'published',now())`;

    // A private list notifies nobody.
    await sql`INSERT INTO buyer_lists(id,owner_id,name,curator_name) VALUES (${list},${curator},'Herramientas QA','QA Curadora')`;
    await addItem(curator, `solution:${ownSolution}`);
    await addItem(curator, `solution:${solutions[0]}`);
    // Public with 2 available projects: hidden from the gallery, so still no notice.
    await sql`UPDATE buyer_lists SET visibility='public' WHERE id=${list}`;
    assert.equal((await notices(founder)).length, 0);
    // The third available project makes it visible: the founder hears about both of theirs,
    // and the curator's own project is skipped.
    await addItem(curator, `solution:${solutions[1]}`);
    let founderNotices = await notices(founder);
    assert.deepEqual(
      founderNotices.map(row => row.source_key),
      [`listed:${list}:${solutions[0]}`, `listed:${list}:${solutions[1]}`].sort(),
    );
    assert.match(founderNotices[0].title, /aparece en la lista pública «Herramientas QA»/);
    assert.equal(founderNotices[0].href, `/comunidad/${list}`);
    assert.equal(founderNotices[0].email_state, 'pending');
    await addItem(curator, `solution:${solutions[2]}`);
    // Private and public again: no repeats.
    await sql`UPDATE buyer_lists SET visibility='private' WHERE id=${list}`;
    await sql`UPDATE buyer_lists SET visibility='public' WHERE id=${list}`;
    founderNotices = await notices(founder);
    assert.equal(founderNotices.length, 3);
    assert.equal((await notices(curator)).length, 0);

    // The bell lists the public-list link as it is (not rewritten to /account).
    const bell = await (await call(founder, '/api/notifications')).json();
    assert.ok(bell.notifications.some(item => item.href === `/comunidad/${list}`));

    // Ops' catalog refresh sends pending listing notices now; the email links to the list.
    const refreshed = await fetch(`${origin}/api/internal/catalog-revalidate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CATALOG_REVALIDATE_SECRET}` },
    });
    assert.equal(refreshed.status, 200);
    let sent = [];
    for (let second = 0; second < 30 && sent.length < 3; second++) {
      sent =
        await sql`SELECT provider_id FROM account_notifications WHERE owner_id=${founder} AND email_state='sent'`;
      if (sent.length < 3) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal(sent.length, 3);
    const email = await (
      await fetch(`https://api.resend.com/emails/${sent[0].provider_id}`, {
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
      })
    ).json();
    assert.ok(email.html.includes(`/es/comunidad/${list}`));
    assert.ok(email.html.includes('Ver la lista'));
    assert.ok(!email.html.includes('QA Curadora'));

    // Two likes, a save and two comments from two visitors: one grouped notice per kind.
    for (const visitor of visitors)
      assert.equal(
        (await call(visitor, '/api/community', { action: 'like', listId: list })).status,
        200,
      );
    assert.equal(
      (await call(visitors[0], '/api/community', { action: 'save', listId: list })).status,
      200,
    );
    for (const visitor of visitors)
      assert.equal(
        (
          await call(visitor, '/api/community', {
            action: 'comment',
            listId: list,
            commentId: randomUUID(),
            name: 'Visitante',
            comment: 'Muy buena selección.',
          })
        ).status,
        200,
      );
    const curatorNotices = await notices(curator);
    assert.equal(curatorNotices.length, 3);
    const byKind = kind =>
      curatorNotices.find(row => row.source_key.startsWith(`community:${kind}:`));
    assert.equal(byKind('likes').title, 'A 2 personas les gustó tu lista «Herramientas QA»');
    assert.equal(byKind('saves').title, 'Una persona guardó tu lista «Herramientas QA»');
    assert.equal(byKind('comments').title, '2 comentarios nuevos en tu lista «Herramientas QA»');
    for (const row of curatorNotices) {
      assert.equal(row.href, `/account/lists/${list}`);
      // Email for community activity is opt-in: off by default.
      assert.equal(row.email_state, 'disabled');
      assert.ok(!/QA Visitante/.test(row.title));
    }

    // A read grouped notice comes back unread when the count goes up.
    await sql`UPDATE account_notifications SET read_at=now() WHERE owner_id=${curator}`;
    assert.equal(
      (await call(visitors[0], '/api/community', { action: 'like', listId: list })).status,
      200,
    );
    assert.equal(
      (await call(visitors[0], '/api/community', { action: 'like', listId: list })).status,
      200,
    );
    const [likes] =
      await sql`SELECT title,read_at FROM account_notifications WHERE owner_id=${curator} AND source_key LIKE 'community:likes:%'`;
    assert.equal(likes.read_at, null);
    assert.equal(likes.title, 'A 2 personas les gustó tu lista «Herramientas QA»');

    // The preference is saved and read back.
    const saved = await call(curator, '/api/notifications', {
      action: 'preferences',
      contactEmail: true,
      solutionEmail: true,
      communityEmail: true,
    });
    assert.equal(saved.status, 200);
    const [prefs] =
      await sql`SELECT community_email FROM notification_preferences WHERE owner_id=${curator}`;
    assert.equal(prefs.community_email, true);
    // An older settings page without the new field keeps the stored choice.
    await call(curator, '/api/notifications', {
      action: 'preferences',
      contactEmail: true,
      solutionEmail: true,
    });
    const [kept] =
      await sql`SELECT community_email FROM notification_preferences WHERE owner_id=${curator}`;
    assert.equal(kept.community_email, true);
    console.log('community notices: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts})`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
