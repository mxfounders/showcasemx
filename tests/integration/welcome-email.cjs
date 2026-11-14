// Opt-in integration test for the welcome email (SHCWS-153): finishing onboarding sends
// one email per account, by profile, and editing the profile later never sends another.
// Addresses are Resend's test inbox (delivered+…@resend.dev): logged by the provider,
// delivered to nobody. Fixtures are removed in `finally`.
//
//   RUN_WELCOME_INTEGRATION=1 node tests/integration/welcome-email.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_WELCOME_INTEGRATION !== '1') {
  console.log('Set RUN_WELCOME_INTEGRATION=1 against a local running app with Resend set.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL),
  origin = process.env.APP_ORIGIN || 'http://localhost:3000',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const accounts = ['founder', 'buyer', 'exploring'].map(profile => ({
  profile,
  id: randomUUID(),
  token: randomBytes(32).toString('hex'),
  email: `delivered+shwcs-welcome-${profile}-${tag}@resend.dev`,
}));
const save = (account, name) =>
  fetch(`${origin}/api/account`, {
    method: 'PATCH',
    headers: {
      origin,
      'content-type': 'application/json',
      cookie: `showcasemx-session=${account.token}`,
    },
    body: JSON.stringify({ name, organization: 'QA', profile: account.profile, role: 'other' }),
  });
const welcomes = async id =>
  sql`SELECT email_state, provider_id, read_at FROM account_notifications WHERE owner_id=${id} AND category='account'`;

(async () => {
  try {
    for (const account of accounts) {
      await sql`INSERT INTO auth_accounts(id,email,password_hash) VALUES (${account.id},${account.email},'x')`;
      await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES (${hash(account.token)},${account.id},now()+interval '1 hour')`;
      assert.equal((await save(account, 'QA Bienvenida')).status, 200);
    }
    for (const account of accounts) {
      let rows = [];
      for (let second = 0; second < 30; second++) {
        rows = await welcomes(account.id);
        if (rows[0] && !['pending', 'sending'].includes(rows[0].email_state)) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      assert.equal(rows.length, 1, `${account.profile}: one welcome`);
      assert.equal(rows[0].email_state, 'sent', `${account.profile}: sent`);
      assert.ok(rows[0].provider_id && rows[0].read_at);
      // Editing the profile afterwards never queues another one.
      assert.equal((await save(account, 'QA Bienvenida editada')).status, 200);
      assert.equal((await welcomes(account.id)).length, 1, `${account.profile}: no repeat`);
    }
    console.log('welcome email: PASS');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts.map(account => account.id)}::uuid[])`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
