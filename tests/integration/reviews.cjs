// Opt-in integration test for verified reviews (docs/reviews.md). Creates temporary
// accounts and solutions only, and removes every fixture in `finally`.
//
//   RUN_REVIEWS_INTEGRATION=1 node tests/integration/reviews.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_REVIEWS_INTEGRATION=1 node tests/integration/reviews.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { randomUUID } = require('node:crypto');
if (process.env.RUN_REVIEWS_INTEGRATION !== '1') {
  console.log('Set RUN_REVIEWS_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  password = 'Temporary reviews passphrase';
// The conflict account writes from the vendor's own domain. `.example` is reserved
// (RFC 2606) like `.invalid`: nothing is ever delivered there.
const people = {
  founder: `reviews-founder-${tag}@example.invalid`,
  reviewer: `reviews-reviewer-${tag}@example.invalid`,
  unverified: `reviews-unverified-${tag}@example.invalid`,
  other: `reviews-other-${tag}@example.invalid`,
  insider: `reviews-insider-${tag}@qa-vendor-${tag}.example`,
};
const ids = {},
  cookies = {},
  reviewed = randomUUID(),
  rival = randomUUID(),
  draft = randomUUID(),
  reviewId = randomUUID();

const call = (path, { who, method = 'POST', body } = {}) =>
  fetch(origin + path, {
    method,
    redirect: 'manual',
    headers: {
      origin,
      'content-type': 'application/json',
      // A distinct network identity keeps the per-address login limit to this run.
      'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(who ? { cookie: cookies[who] } : {}),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
const review = (solutionId, who, body) =>
  call(`/api/solutions/${solutionId}/reviews`, { who, body });
const expect = async (response, status, label) => {
  const text = await response.text();
  assert.equal(response.status, status, `${label}: ${text}`);
  return text ? JSON.parse(text) : null;
};
const page = async who => (await call(`/es/soluciones/${reviewed}`, { who, method: 'GET' })).text();
const sample = (patch = {}) => ({
  action: 'save',
  reviewId,
  name: 'Revisora QA',
  rating: 4,
  recommends: true,
  headline: `Reseña de prueba ${tag}`,
  useCase: 'Cobranza mensual de clientes recurrentes desde hace un año.',
  pros: 'Los recordatorios automáticos redujeron la cartera vencida.',
  cons: 'Los reportes por vendedor todavía son limitados.',
  usageDuration: '1to2y',
  companySize: 'pyme',
  country: 'ES',
  ...patch,
});

(async () => {
  try {
    for (const [role, email] of Object.entries(people)) {
      await expect(
        await call('/api/auth/register', { body: { email, password } }),
        200,
        `register ${role}`,
      );
      const login = await call('/api/auth/login', { body: { email, password } });
      assert.equal(login.status, 200, `login ${role}`);
      cookies[role] = login.headers.get('set-cookie').split(';')[0];
      ids[role] = (await sql`SELECT id FROM auth_accounts WHERE email=${email}`)[0].id;
    }
    // Verification is a fixture here: the flow itself is covered by tests/integration/launch.cjs.
    await sql`UPDATE auth_accounts SET email_verified_at=now(), name='QA' WHERE id = ANY(${[ids.founder, ids.reviewer, ids.other, ids.insider]}::uuid[])`;
    const ficha = name => ({
      name,
      kind: 'Software',
      category: 'Cobros',
      categories: ['Cobros'],
      problem: 'Problema público de prueba para reseñas.',
      audience: 'Equipos de finanzas',
      website: `https://qa-vendor-${tag}.example`,
      contactEmail: people.founder,
    });
    // The rival was published later, so without reviews it would sort first.
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at) VALUES
      (${reviewed},${ids.founder},${JSON.stringify(ficha('QA reseñada ' + tag))}::jsonb,${JSON.stringify(ficha('QA reseñada ' + tag))}::jsonb,'published',now()-interval '2 days'),
      (${rival},${ids.founder},${JSON.stringify(ficha('QA rival ' + tag))}::jsonb,${JSON.stringify(ficha('QA rival ' + tag))}::jsonb,'published',now()-interval '1 day'),
      (${draft},${ids.founder},${JSON.stringify(ficha('QA borrador ' + tag))}::jsonb,NULL,'draft',NULL)`;

    // Who may write.
    await expect(await review(reviewed, null, sample()), 401, 'anonymous');
    await expect(
      await review(reviewed, 'founder', sample({ reviewId: randomUUID() })),
      409,
      'own solution',
    );
    await expect(
      await review(reviewed, 'insider', sample({ reviewId: randomUUID() })),
      409,
      'vendor domain',
    );
    await expect(
      await review(draft, 'reviewer', sample({ reviewId: randomUUID() })),
      409,
      'unpublished',
    );
    const invalid = await expect(
      await review(reviewed, 'reviewer', sample({ headline: 'no' })),
      400,
      'short headline',
    );
    assert.equal(invalid.field, 'headline');

    // Create, retry, second review.
    const created = await expect(await review(reviewed, 'reviewer', sample()), 200, 'create');
    assert.equal(created.created, true);
    const retried = await expect(await review(reviewed, 'reviewer', sample()), 200, 'retry');
    assert.equal(retried.created, false);
    await expect(
      await review(reviewed, 'reviewer', sample({ reviewId: randomUUID() })),
      409,
      'second review',
    );

    // The founder hears about it once, with a link inside their account.
    const notices =
      await sql`SELECT href FROM account_notifications WHERE owner_id=${ids.founder} AND source_key=${'review:' + reviewId}`;
    assert.equal(notices.length, 1, 'founder notified of the public review');
    assert.equal(notices[0].href, `/account/solutions/${reviewed}`);
    const founderPage = await (
      await call(`/es/account/solutions/${reviewed}`, { who: 'founder', method: 'GET' })
    ).text();
    assert.ok(
      founderPage.includes('1 sin respuesta') && founderPage.includes('Ver y responder'),
      'owner digest',
    );

    // Public page: the review, its level, never the email or its domain.
    let html = await page(null);
    assert.ok(html.includes(`Reseña de prueba ${tag}`), 'review shown to visitors');
    assert.ok(html.includes('Correo de empresa'), 'company-email level shown');
    assert.ok(html.includes('España'), 'country name resolved');
    assert.ok(
      !html.includes(people.reviewer) && !html.includes('example.invalid'),
      'no email or domain leaks',
    );

    // An unverified author's review stays private until verification.
    const pendingId = randomUUID();
    await expect(
      await review(
        reviewed,
        'unverified',
        sample({ reviewId: pendingId, headline: `Pendiente ${tag}` }),
      ),
      200,
      'unverified create',
    );
    assert.ok(
      !(await page(null)).includes(`Pendiente ${tag}`),
      'unverified review hidden from visitors',
    );
    const ownView = await page('unverified');
    assert.ok(
      ownView.includes(`Pendiente ${tag}`) && ownView.includes('no es pública'),
      'author sees it pending',
    );
    const silent =
      await sql`SELECT 1 FROM account_notifications WHERE source_key=${'review:' + pendingId}`;
    assert.equal(silent.length, 0, 'no notice while the review is private');
    await sql`UPDATE auth_accounts SET email_verified_at=now() WHERE id=${ids.unverified}`;
    const late =
      await sql`SELECT 1 FROM account_notifications WHERE source_key=${'review:' + pendingId}`;
    assert.equal(late.length, 1, 'verifying the email publishes the review and notifies once');
    assert.ok((await page(null)).includes(`Pendiente ${tag}`), 'public after verification');

    // Ranking: the reviewed ficha now sorts ahead of the newer rival.
    const catalog = await (await call('/es/explorar/cobros', { method: 'GET' })).text();
    assert.ok(
      catalog.indexOf(`QA reseñada ${tag}`) > -1 &&
        catalog.indexOf(`QA reseñada ${tag}`) < catalog.indexOf(`QA rival ${tag}`),
      'reviewed solution ranks first',
    );

    // Edit with versions.
    await expect(
      await review(reviewed, 'reviewer', sample({ rating: 5, version: created.version })),
      200,
      'edit',
    );
    await expect(
      await review(reviewed, 'reviewer', sample({ rating: 3, version: created.version })),
      409,
      'stale edit',
    );

    // Public reply: only the owner.
    await expect(
      await review(reviewed, 'other', { action: 'reply', reviewId, reply: 'No soy el dueño.' }),
      403,
      'non-owner reply',
    );
    await expect(
      await review(reviewed, 'founder', { action: 'reply', reviewId, reply: `Gracias ${tag}` }),
      200,
      'owner reply',
    );
    assert.ok((await page(null)).includes(`Gracias ${tag}`), 'reply public');
    await expect(
      await review(reviewed, 'founder', { action: 'delete', reviewId }),
      404,
      'owner cannot delete a review',
    );

    // Reports.
    const report = {
      action: 'report',
      reviewId,
      reason: 'conflict',
      details: 'Parece escrita por alguien del proveedor.',
    };
    await expect(await review(reviewed, 'reviewer', report), 409, 'self report');
    await expect(await review(reviewed, 'founder', report), 200, 'owner reports');
    await expect(await review(reviewed, 'founder', report), 409, 'duplicate report');

    // Moderation hides it (ops does this); the author sees why.
    await sql`UPDATE solution_reviews SET status='hidden', hidden_reason='Conflicto de interés confirmado' WHERE id=${reviewId}`;
    assert.ok(
      !(await page(null)).includes(`Reseña de prueba ${tag}`),
      'hidden review gone for visitors',
    );
    assert.ok(
      (await page('reviewer')).includes('Conflicto de interés confirmado'),
      'author sees the reason',
    );

    // Export and deletion.
    const exported = await (
      await call('/api/account/export', { who: 'reviewer', method: 'GET' })
    ).json();
    assert.equal(exported.published.reviews.length, 1, 'export carries the review');
    await expect(
      await review(reviewed, 'reviewer', { action: 'delete', reviewId }),
      200,
      'author deletes',
    );
    const [kept] =
      await sql`SELECT review_id FROM solution_review_reports WHERE solution_id=${reviewed}`;
    assert.equal(kept.review_id, null, 'the report outlives the review');
    console.log('reviews integration: all checks passed');
  } finally {
    await sql`DELETE FROM founder_solutions WHERE id = ANY(${[reviewed, rival, draft]}::uuid[])`;
    await sql`DELETE FROM auth_accounts WHERE email = ANY(${Object.values(people)})`;
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
