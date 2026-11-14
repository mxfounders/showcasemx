// Opt-in integration test for immediate contact alerts (SHCWS-13): a new request emails
// the founder within seconds, with the cron only as the retry. The founder's addresses
// are Resend's test inbox (delivered+…@resend.dev): accepted and logged by the provider,
// delivered to nobody, harmless to the sender's reputation. The buyer is an unverified
// @example.invalid account, so nothing is ever sent to it. Fixtures go in `finally`.
//
//   RUN_CONTACT_ALERTS_INTEGRATION=1 node tests/integration/contact-alerts.cjs
//   APP_ORIGIN=http://localhost:3100 RUN_CONTACT_ALERTS_INTEGRATION=1 node tests/integration/contact-alerts.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_CONTACT_ALERTS_INTEGRATION !== '1') {
  console.log('Set RUN_CONTACT_ALERTS_INTEGRATION=1 against a local running app with Resend set.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const founder = randomUUID(),
  buyer = randomUUID(),
  solution = randomUUID(),
  request = randomUUID(),
  founderToken = randomBytes(32).toString('hex'),
  buyerToken = randomBytes(32).toString('hex');

const contacts = (token, body) =>
  fetch(`${origin}/api/contacts`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      cookie: `showcasemx-session=${token}`,
    },
    body: JSON.stringify(body),
  });
const alertFor = async (owner, href) => {
  for (let second = 0; second < 30; second++) {
    const [row] =
      await sql`SELECT email_state, provider_id FROM account_notifications WHERE owner_id=${owner} AND href=${href}`;
    if (row && !['pending', 'sending'].includes(row.email_state)) return row;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
};

(async () => {
  try {
    await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at) VALUES
      (${founder}, ${`delivered+shwcs-founder-${tag}@resend.dev`}, 'x', 'QA Fundador', now()),
      (${buyer}, ${`contact-alerts-buyer-${tag}@example.invalid`}, 'x', 'QA Comprador', null)`;
    await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES
      (${hash(founderToken)},${founder},now()+interval '1 hour'),
      (${hash(buyerToken)},${buyer},now()+interval '1 hour')`;
    const data = {
      name: 'Contact alerts QA',
      kind: 'Software',
      category: 'Ventas',
      categories: ['Ventas'],
      problem: 'Prueba de avisos.',
      audience: 'QA',
      website: 'https://contact-alerts.example.com/',
      contactEmail: `delivered+shwcs-listing-${tag}@resend.dev`,
    };
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
      VALUES (${solution},${founder},${JSON.stringify(data)}::jsonb,${JSON.stringify(data)}::jsonb,'published',now())`;

    const started = Date.now();
    const created = await contacts(buyerToken, {
      action: 'create',
      id: request,
      solutionId: solution,
      recipientId: founder,
      consent: true,
      consentVersion: 'contact-v1',
      name: 'Ana QA',
      company: 'Empresa QA',
      size: 'micro',
      timeline: 'Este mes',
      budget: '',
      need: 'Necesitamos cotizar a mayoristas cada semana sin hojas de cálculo.',
    });
    assert.equal(created.status, 200);
    // Sent right away (no account opted out: contact alerts default to on), well under a minute.
    const founderAlert = await alertFor(founder, `/account/opportunities/${request}`);
    assert.equal(founderAlert?.email_state, 'sent');
    assert.ok(founderAlert.provider_id);
    assert.ok(Date.now() - started < 60_000);

    // The founder replies; the unverified buyer gets the in-app notice, never an email.
    const [{ version }] = await sql`SELECT version FROM contact_requests WHERE id=${request}`;
    const replied = await contacts(founderToken, {
      action: 'update',
      id: request,
      status: 'conversation',
      version: Number(version),
      message: 'Hola Ana, te escribo mañana con una propuesta.',
    });
    assert.equal(replied.status, 200);
    assert.equal((await alertFor(buyer, `/account/contacts/${request}`))?.email_state, 'disabled');
    console.log('contact alerts: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE id IN (${founder}, ${buyer})`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
