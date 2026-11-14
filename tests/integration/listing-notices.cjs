// Opt-in integration test for listing notices (SHCWS-18/20): an approval decided in ops,
// a comment, a report and a sponsored slot's lifecycle each leave one notice for the
// founder; the first three are emailed within seconds. The founder's address is Resend's
// test inbox (delivered+…@resend.dev): accepted and logged, delivered to nobody. The other
// accounts are @example.invalid. Every fixture is deleted in `finally`.
//
//   RUN_LISTING_NOTICES_INTEGRATION=1 node tests/integration/listing-notices.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_LISTING_NOTICES_INTEGRATION=1 node tests/integration/listing-notices.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_LISTING_NOTICES_INTEGRATION !== '1') {
  console.log('Set RUN_LISTING_NOTICES_INTEGRATION=1 against a local running app with Resend set.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const founder = randomUUID(),
  visitor = randomUUID(),
  solution = randomUUID(),
  campaign = randomUUID(),
  visitorToken = randomBytes(32).toString('hex');

const post = (path, body, headers = {}) =>
  fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const asVisitor = { cookie: `showcasemx-session=${visitorToken}` };
const notice = async (source, settle = true) => {
  for (let second = 0; second < 30; second++) {
    const [row] =
      await sql`SELECT title,href,email_state,provider_id FROM account_notifications WHERE source_key=${source}`;
    if (row && (!settle || !['pending', 'sending'].includes(row.email_state))) return row;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
};

(async () => {
  try {
    await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at) VALUES
      (${founder}, ${`delivered+shwcs-listing-${tag}@resend.dev`}, 'x', 'QA Fundador', now()),
      (${visitor}, ${`listing-notices-${tag}@example.invalid`}, 'x', 'QA Visitante', now())`;
    await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES
      (${hash(visitorToken)},${visitor},now()+interval '1 hour')`;
    const data = {
      name: 'Listing notices QA',
      kind: 'Software',
      category: 'Ventas',
      categories: ['Ventas'],
      problem: 'Prueba de avisos de fichas.',
      audience: 'QA',
      website: 'https://listing-notices.example.com/',
    };
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
      VALUES (${solution},${founder},${JSON.stringify(data)}::jsonb,${JSON.stringify(data)}::jsonb,'published',now())`;

    // Ops records the decision, then calls the product to refresh the catalog: that call
    // now sends the approval (with its launch kit) right away.
    const [event] =
      await sql`INSERT INTO solution_events(solution_id,status,message) VALUES (${solution},'published','') RETURNING id`;
    const refreshed = await post(
      '/api/internal/catalog-revalidate',
      {},
      { authorization: `Bearer ${env.CATALOG_REVALIDATE_SECRET}` },
    );
    assert.equal(refreshed.status, 200);
    const approval = await notice(`solution:${event.id}`);
    assert.equal(approval?.email_state, 'sent');
    assert.ok(approval.provider_id);

    const commentId = randomUUID();
    const commented = await post(
      '/api/solutions/social',
      { action: 'comment', solutionId: solution, commentId, name: 'Ana', comment: '¿Tiene API?' },
      asVisitor,
    );
    assert.equal(commented.status, 200);
    const comment = await notice(`comment:${commentId}`);
    assert.equal(comment?.email_state, 'sent');
    assert.equal(comment.href, `/account/solutions/${solution}`);

    const reported = await post(
      '/api/reports',
      {
        action: 'create',
        solutionId: solution,
        reason: 'broken',
        details: 'El enlace de la demo no abre.',
      },
      asVisitor,
    );
    assert.equal(reported.status, 200);
    const [report] = await sql`SELECT id FROM solution_reports WHERE solution_id=${solution}`;
    const reportNotice = await notice(`report:${report.id}`);
    assert.equal(reportNotice?.email_state, 'sent');
    assert.ok(!reportNotice.title.includes('QA Visitante'));

    // A sponsored slot: each lifecycle change leaves one notice; repeating it adds none.
    await sql`INSERT INTO ad_campaigns(id,solution_id,owner_id,solution_name,billing_email,placement,scope,
        starts_on,ends_on,currency,daily_amount,subtotal_amount,hold_expires_at,terms_version,terms_accepted_at)
      VALUES (${campaign},${solution},${founder},'Listing notices QA',${`delivered+shwcs-listing-${tag}@resend.dev`},
        'category','ventas',current_date+1,current_date+3,'usd',900,1800,now()+interval '30 minutes','ads-v1',now())`;
    await sql`UPDATE ad_campaigns SET status='paid',paid_at=now() WHERE id=${campaign}`;
    await sql`UPDATE ad_campaigns SET version=version+1 WHERE id=${campaign}`;
    const paid = await notice(`ad:${campaign}:paid`, false);
    assert.match(paid.title, /está confirmado/);
    assert.equal(paid.href, `/account/solutions/${solution}/promote`);
    await sql`UPDATE ad_campaigns SET dispute_status='open' WHERE id=${campaign}`;
    assert.match((await notice(`ad:${campaign}:dispute`, false)).title, /disputa/);
    const [{ count }] =
      await sql`SELECT count(*)::int AS count FROM account_notifications WHERE owner_id=${founder} AND source_key LIKE 'ad:%'`;
    assert.equal(count, 2);
    console.log('listing notices: PASS');
  } finally {
    await sql`DELETE FROM ad_campaigns WHERE id=${campaign}`;
    await sql`DELETE FROM auth_accounts WHERE id IN (${founder}, ${visitor})`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
