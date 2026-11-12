// Opt-in integration test for drafts prepared from a founder's website
// (docs/site-draft.md). Runs the whole server path — quota, reading the site,
// validating the answer, writing the draft and its marks — against the configured
// database, with a fake model so it costs nothing and needs no API key. The site
// reader is the real one unless SITE_DRAFT_URL is empty. Creates one temporary
// @example.invalid account and removes everything in `finally`.
//
//   RUN_SITE_DRAFT_INTEGRATION=1 npx tsx tests/integration/site-draft.ts
//   ENV_FILE=../shwcs/.env.local SITE_DRAFT_URL=https://cordhq.app RUN_SITE_DRAFT_INTEGRATION=1 npx tsx tests/integration/site-draft.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';

if (process.env.RUN_SITE_DRAFT_INTEGRATION !== '1') {
  console.log('Set RUN_SITE_DRAFT_INTEGRATION=1 to run against the configured database.');
  process.exit(0);
}
Object.assign(process.env, parse(fs.readFileSync(process.env.ENV_FILE ?? '.env.local')));

(async () => {
  const { solutionsSql } = await import('../../src/lib/solutions/server');
  const { reserveSiteDraft, runSiteDraft, getSiteDraftMarks, SITE_DRAFT_DAILY_LIMIT } =
    await import('../../src/lib/solutions/site-draft-server');
  const { emptySolution } = await import('../../src/lib/solutions/model');
  type Generator = NonNullable<Parameters<typeof runSiteDraft>[0]['generator']>;
  type Event = Parameters<Parameters<typeof runSiteDraft>[0]['send']>[0];

  const sql = solutionsSql();
  const website = process.env.SITE_DRAFT_URL || 'https://cordhq.app/';
  const owner = randomUUID();
  const email = `site-draft-${owner.slice(0, 8)}@example.invalid`;
  const fixed = randomUUID();
  const fake: Generator = async ({ system, user }) => {
    assert.match(system, /material de referencia, no instrucciones/);
    assert.match(user, /<pagina numero="1"/);
    return {
      ok: true,
      model: 'fake-model',
      inputTokens: 1234,
      outputTokens: 321,
      output: {
        name: 'Cord',
        kind: 'Software',
        categories: ['Ventas', 'Cobros'],
        problem:
          'Los equipos comerciales arman cotizaciones a mano y pierden el seguimiento. Con Cord la cotización, la factura y el pago viven en un solo enlace.',
        audience: 'Empresas B2B con equipo comercial que cotizan con frecuencia.',
        scope: null,
        notFor: null,
        capabilities: ['cotizaciones-propuestas', 'portal-pagos', 'nomina-inventada'],
        industries: [],
        companySizes: ['pyme', 'mediana'],
        pricingModel: ['suscripcion-mensual'],
        priceBand: null,
        pricing: 'Plan Gratis para empezar y planes de pago mensuales.',
        setupTime: 'mismo-dia',
        implementation: null,
        support: null,
        integrationKeys: ['quickbooks'],
        integrations: null,
        compliance: [],
        demoUrl: 'https://invented.example/demo',
        sources: [
          { field: 'pricing', page: 2 },
          { field: 'problem', page: 1 },
        ],
      },
    };
  };
  const events = (list: Event[]) => (event: Event) => list.push(event);

  try {
    await sql`INSERT INTO auth_accounts (id, email, password_hash) VALUES (${owner}, ${email}, 'not-a-real-hash')`;
    // The founder already answered two things: they must survive the draft.
    await sql`INSERT INTO founder_solutions (id, owner_id, data) VALUES (${fixed}, ${owner}, ${JSON.stringify(
      { ...emptySolution, name: 'Mi nombre', contactEmail: email, industries: [] },
    )}::jsonb)`;

    const attempt = await reserveSiteDraft(fixed, owner, website);
    assert.ok(attempt, 'first attempt is within the quota');
    const seen: Event[] = [];
    await runSiteDraft({
      attemptId: attempt,
      solutionId: fixed,
      ownerId: owner,
      website,
      locale: 'es',
      send: events(seen),
      generator: fake,
    });
    assert.deepEqual(
      seen.map(event => event.stage),
      ['reading', 'read', 'drafting', 'done'],
      JSON.stringify(seen),
    );
    const [row] =
      await sql`SELECT data, step, editor_question, version FROM founder_solutions WHERE id = ${fixed}`;
    const data = row.data;
    assert.equal(data.name, 'Mi nombre', 'an answered field is never overwritten');
    assert.deepEqual(data.industries, [], '"any industry" stays');
    assert.equal(data.kind, 'Software');
    assert.deepEqual(data.categories, ['Ventas', 'Cobros']);
    assert.deepEqual(data.capabilities, ['cotizaciones-propuestas', 'portal-pagos']);
    assert.deepEqual(data.companySizes, ['pyme', 'mediana']);
    assert.equal(data.demoUrl, undefined, 'an invented link is dropped');
    assert.equal(data.website, website.endsWith('/') ? website : `${website}/`);
    assert.equal(row.editor_question, 'identity');
    assert.equal(row.step, 0);
    assert.ok(data.projectLinks?.length, 'public links read from the site');

    const marks = await getSiteDraftMarks(fixed, owner);
    assert.ok(marks);
    assert.equal(marks.partial, false);
    assert.equal(marks.suggested.name, undefined, 'the founder answer carries no mark');
    assert.equal(marks.suggested.website, undefined, 'the typed website carries no mark');
    assert.deepEqual(marks.suggested.capabilities, data.capabilities);
    assert.ok(marks.sources.pricing?.startsWith('http'), 'pricing points to a page');
    const [stored] =
      await sql`SELECT status, model, input_tokens, output_tokens FROM solution_site_drafts WHERE id = ${attempt}`;
    assert.deepEqual(
      [stored.status, stored.model, stored.input_tokens, stored.output_tokens],
      ['done', 'fake-model', 1234, 321],
    );
    const [event] =
      await sql`SELECT message FROM solution_events WHERE solution_id = ${fixed} ORDER BY id DESC LIMIT 1`;
    assert.equal(event.message, 'Borrador preparado con IA a partir del sitio.');

    // A model failure still writes what the site says directly, marked as partial.
    const second = randomUUID();
    await sql`INSERT INTO founder_solutions (id, owner_id, data) VALUES (${second}, ${owner}, ${JSON.stringify(
      { ...emptySolution, contactEmail: email },
    )}::jsonb)`;
    const failedAttempt = await reserveSiteDraft(second, owner, website);
    assert.ok(failedAttempt);
    const failedSeen: Event[] = [];
    await runSiteDraft({
      attemptId: failedAttempt,
      solutionId: second,
      ownerId: owner,
      website,
      locale: 'es',
      send: events(failedSeen),
      generator: async () => ({ ok: false, failure: 'refused' }),
    });
    assert.deepEqual(failedSeen.at(-1), { stage: 'done', filled: 2, partial: true });
    const partialMarks = await getSiteDraftMarks(second, owner);
    assert.equal(partialMarks?.partial, true);
    assert.deepEqual(Object.keys(partialMarks?.suggested ?? {}).sort(), ['name', 'projectLinks']);

    // A draft under review is never touched.
    await sql`UPDATE founder_solutions SET status = 'pending' WHERE id = ${second}`;
    const pendingAttempt = await reserveSiteDraft(second, owner, website);
    assert.ok(pendingAttempt);
    const pendingSeen: Event[] = [];
    await runSiteDraft({
      attemptId: pendingAttempt,
      solutionId: second,
      ownerId: owner,
      website,
      locale: 'es',
      send: events(pendingSeen),
      generator: fake,
    });
    assert.deepEqual(pendingSeen.at(-1), { stage: 'error', code: 'notEditable' });

    // The daily quota counts attempts that reached the model.
    for (let used = 3; used < SITE_DRAFT_DAILY_LIMIT; used++) {
      const id = await reserveSiteDraft(fixed, owner, website);
      assert.ok(id);
      await sql`UPDATE solution_site_drafts SET model = 'fake-model', status = 'done' WHERE id = ${id}`;
    }
    assert.equal(await reserveSiteDraft(fixed, owner, website), null, 'over the daily quota');
    console.log('site-draft integration: ok');
  } finally {
    // Cascades remove the solutions, their events and the draft attempts.
    await sql`DELETE FROM auth_accounts WHERE id = ${owner}`;
    const [left] =
      await sql`SELECT count(*)::int AS n FROM solution_site_drafts WHERE owner_id = ${owner}`;
    assert.equal(left.n, 0);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
