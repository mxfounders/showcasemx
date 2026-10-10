// Opt-in integration test for registry checks and proven purchases (docs/compliance.md).
// Starts a fake SAT CFDI service; the app under test must point at it and know the cron
// secret used here:
//
//   SAT_CFDI_URL=http://localhost:4020 CRON_SECRET=<32+ chars> npm run start   (or dev)
//   APP_ORIGIN=http://localhost:3000 CRON_SECRET=<same> RUN_COMPLIANCE_INTEGRATION=1 \
//     node tests/integration/compliance.cjs
//
// The cron step downloads the real 69-B list from the SAT. Temporary accounts only; the
// fake 69-B row and every fixture are removed in `finally`.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
if (process.env.RUN_COMPLIANCE_INTEGRATION !== '1') {
  console.log('Set RUN_COMPLIANCE_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  password = 'Temporary compliance passphrase';
const people = ['founder', 'buyer', 'second'].map(r => `compliance-${r}-${tag}@example.invalid`);
const [founder, buyer, second] = people;
const cookies = {},
  ids = {},
  solution = randomUUID(),
  review = randomUUID(),
  secondReview = randomUUID();
// RFCs shaped like real ones but outside the SAT list: QAV = vendor, QAB = buyer.
const vendorRfc = 'QAV010101AB1',
  flaggedRfc = 'QAD010101AB1',
  buyerRfc = 'QAB010101AB1';
const receipt = {
  uuid: randomUUID().toUpperCase(),
  issuer: vendorRfc,
  receiver: buyerRfc,
  total: '1566.50',
};

// Fake SAT: vigente only for the exact receipt above, in the CFDI 3.3/4.0 total format.
const sat = http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      const expected = `?re=${vendorRfc}&rr=${buyerRfc}&tt=1566.5&id=${receipt.uuid}`;
      const estado = raw.includes(`<![CDATA[${expected}]]>`) ? 'Vigente' : 'No Encontrado';
      res.writeHead(200, { 'content-type': 'text/xml' });
      res.end(
        `<s:Envelope><s:Body><ConsultaResponse><ConsultaResult><a:CodigoEstatus>S</a:CodigoEstatus><a:Estado>${estado}</a:Estado></ConsultaResult></ConsultaResponse></s:Body></s:Envelope>`,
      );
    });
  })
  .listen(Number(process.env.SAT_PORT || 4020));

const call = (path, { who, body, method = 'POST', headers = {} } = {}) =>
  fetch(origin + path, {
    method,
    redirect: 'manual',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-forwarded-for': `10.66.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      ...(who && { cookie: cookies[who] }),
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
const expect = async (response, status, label) => {
  const text = await response.text();
  assert.equal(response.status, status, `${label}: ${text}`);
  return text ? JSON.parse(text) : null;
};
const ficha = async who =>
  (await call(`/es/soluciones/${solution}`, { who, method: 'GET' })).text();
const identity = body => call(`/api/solutions/${solution}/tax-identity`, { who: founder, body });
const prove = (who, reviewId, patch = {}) =>
  call(`/api/solutions/${solution}/reviews`, {
    who,
    body: { action: 'prove', reviewId, consent: true, ...receipt, ...patch },
  });

(async () => {
  try {
    for (const email of people) {
      await expect(
        await call('/api/auth/register', { body: { email, password } }),
        200,
        'register',
      );
      const login = await call('/api/auth/login', { body: { email, password } });
      cookies[email] = login.headers.get('set-cookie').split(';')[0];
      ids[email] = (await sql`SELECT id FROM auth_accounts WHERE email=${email}`)[0].id;
    }
    await sql`UPDATE auth_accounts SET email_verified_at=now() WHERE email = ANY(${people})`;
    const data = {
      name: `Cumplimiento ${tag}`,
      kind: 'Software',
      category: 'Cobros',
      categories: ['Cobros'],
      problem: 'Problema de prueba.',
      audience: 'Finanzas',
      website: `https://qa-compliance-${tag}.example`,
      contactEmail: founder,
    };
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
      VALUES (${solution},${ids[founder]},${JSON.stringify(data)}::jsonb,${JSON.stringify(data)}::jsonb,'published',now())`;

    // The daily cron mirrors the real 69-B list (a 304 when it has not changed).
    if (process.env.CRON_SECRET) {
      // The health part may answer 503 locally (no mail provider for its homepage probe);
      // only the registry result matters here.
      const cron = await (
        await call('/api/internal/monitor', {
          method: 'GET',
          headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        })
      ).json();
      assert.ok(['imported', 'unchanged'].includes(cron.registry), `registry: ${cron.registry}`);
      const [list] = await sql`SELECT count(*)::int AS n FROM sat_69b_list`;
      assert.ok(list.n > 1000, `69-B list mirrored (${list.n} rows)`);
    }

    // Only the owner declares; a bad RFC is refused with its field.
    await expect(
      await call(`/api/solutions/${solution}/tax-identity`, {
        who: buyer,
        body: { action: 'save', country: 'MX', taxId: vendorRfc },
      }),
      403,
      'non-owner',
    );
    const invalid = await expect(
      await identity({ action: 'save', country: 'MX', taxId: '123' }),
      400,
      'bad rfc',
    );
    assert.equal(invalid.field, 'taxId');
    const saved = await expect(
      await identity({ action: 'save', country: 'MX', taxId: 'qav-010101-ab1' }),
      200,
      'save',
    );
    assert.equal(saved.identity.taxId, vendorRfc);
    assert.equal(saved.result.situation, 'clear');

    // The public ficha shows the result, never the RFC.
    let html = await ficha();
    assert.ok(html.includes('Sin coincidencias en la lista 69-B del SAT'), 'clear result shown');
    assert.ok(!html.includes(vendorRfc), 'the RFC is never published');

    // A vendor on the list is shown as such.
    await sql`INSERT INTO sat_69b_list(rfc,situation) VALUES (${flaggedRfc},'definitivo')`;
    await expect(
      await identity({ action: 'save', country: 'MX', taxId: flaggedRfc }),
      200,
      'flagged',
    );
    html = await ficha();
    assert.ok(html.includes('«definitivo»'), 'definitive status shown');
    await expect(await identity({ action: 'save', country: 'MX', taxId: vendorRfc }), 200, 'back');

    // Proven purchase.
    const base = {
      action: 'save',
      name: 'Compradora',
      rating: 5,
      recommends: true,
      headline: `Compra real ${tag}`,
      useCase: 'Cobramos a 200 clientes cada mes con esta herramienta.',
      pros: 'Los recordatorios automáticos funcionan sin intervención.',
      cons: 'Faltan reportes por vendedor y por región.',
      usageDuration: '1to2y',
    };
    await expect(
      await call(`/api/solutions/${solution}/reviews`, {
        who: buyer,
        body: { ...base, reviewId: review },
      }),
      200,
      'review',
    );
    await expect(await prove(buyer, review, { consent: false }), 400, 'consent required');
    const mismatch = await expect(
      await prove(buyer, review, { issuer: 'AAA010101AAA' }),
      400,
      'issuer mismatch',
    );
    assert.equal(mismatch.field, 'issuer');
    await expect(await prove(buyer, review, { total: '99' }), 409, 'not found at the SAT');
    await expect(await prove(second, review), 404, 'only the author proves their review');
    const proven = await expect(await prove(buyer, review), 200, 'proven');
    assert.equal(proven.level, 'customer');
    await expect(await prove(buyer, review), 200, 'retry is idempotent');
    html = await ficha();
    assert.ok(
      html.includes('Compra comprobada') && html.includes('1 con compra comprobada'),
      'level shown',
    );
    assert.ok(!html.includes(receipt.uuid), 'the receipt is never shown');
    const [stored] =
      await sql`SELECT receipt_hash FROM solution_review_proofs WHERE review_id=${review}`;
    assert.match(stored.receipt_hash, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(stored).includes(receipt.uuid), 'only a hash is stored');

    // One receipt, one review.
    await expect(
      await call(`/api/solutions/${solution}/reviews`, {
        who: second,
        body: { ...base, reviewId: secondReview, headline: `Otra ${tag}` },
      }),
      200,
      'second review',
    );
    await expect(await prove(second, secondReview), 409, 'receipt reused');

    // Outside Mexico the identity is declared only and purchases cannot be proven yet.
    await expect(
      await identity({ action: 'save', country: 'ES', taxId: 'B12345678' }),
      200,
      'spain',
    );
    html = await ficha();
    assert.ok(html.includes('Declaró su identificación fiscal de España'), 'declared-only note');
    await expect(await prove(second, secondReview), 409, 'no proof method outside Mexico');

    await expect(await identity({ action: 'delete' }), 200, 'delete');
    html = await ficha();
    assert.ok(
      !html.includes('69-B') && !html.includes('identificación fiscal de'),
      'nothing shown without an identity',
    );
    console.log('compliance integration: all checks passed');
  } finally {
    sat.close();
    await sql`DELETE FROM sat_69b_list WHERE rfc=${flaggedRfc}`;
    await sql`DELETE FROM founder_solutions WHERE id=${solution}`;
    await sql`DELETE FROM auth_accounts WHERE email = ANY(${people})`;
  }
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
