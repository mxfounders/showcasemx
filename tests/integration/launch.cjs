// Explicit opt-in. Temporary accounts only; never sends email or changes real editorial roles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
if (process.env.RUN_LAUNCH_INTEGRATION !== '1') { console.log('Set RUN_LAUNCH_INTEGRATION=1 against a local running app.'); process.exit(0); }
const { neon } = require('@neondatabase/serverless');
const env = require('dotenv').parse(fs.readFileSync('.env.local'));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL);
const origin = 'http://localhost:3000', tag = randomUUID(), password = 'Temporary launch test passphrase';
const emails = ['buyer','founder','reviewer'].map(role => `launch-${role}-${tag}@example.invalid`);
const accounts = [], sessions = [], solution = randomUUID(), draft = randomUUID(), tokens = [];
const hash = value => createHash('sha256').update(value).digest('hex');
async function post(route, data, who = 0, extra = {}) { return fetch(origin + route, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(sessions[who] ? { cookie: sessions[who] } : {}), ...extra }, body: JSON.stringify(data) }); }
async function action(route, data, expected, who = 0, extra = {}) { const response = await post(route, data, who, extra); assert.equal(response.status, expected, route + ' ' + (data.action || data.event || '')); return response.status === 204 ? null : response.json(); }
async function tokenFixture(email, expiry = "30 minutes") { const token = randomBytes(32).toString('hex'); tokens.push(token); await sql`INSERT INTO auth_email_verifications(token_hash,account_id,email,expires_at) VALUES(${hash(token)},${accounts[1]},${email},now()+${expiry}::interval)`; return token; }
(async () => { try {
  for (const email of emails) { await action('/api/auth/register', { email, password }, 200, -1); const login = await post('/api/auth/login', { email, password }, -1); assert.equal(login.status, 200); sessions.push(login.headers.get('set-cookie').split(';')[0]); const [account] = await sql`SELECT id FROM auth_accounts WHERE email=${email}`; accounts.push(account.id); }
  const data = { name: 'Launch fixture ' + tag, kind: 'Software', category: 'Finanzas', categories: ['Finanzas'], problem: 'A public problem for this temporary test', audience: 'Finance teams', website: 'https://example.invalid', contactEmail: emails[1] };
  await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status) VALUES(${solution},${accounts[1]},${JSON.stringify(data)}::jsonb,${JSON.stringify(data)}::jsonb,'published'),(${draft},${accounts[1]},'{}'::jsonb,NULL,'draft')`;
  await action('/api/notifications', { action: 'preferences', contactEmail: true, solutionEmail: true }, 403, 1);
  for (const invalid of [await tokenFixture('other@example.invalid'), await tokenFixture(emails[1], '-1 minute')]) await action('/api/account/verification', { action: 'confirm', token: invalid }, 400, -1);
  const valid = await tokenFixture(emails[1]);
  const confirmations = await Promise.all([post('/api/account/verification', { action: 'confirm', token: valid }, -1), post('/api/account/verification', { action: 'confirm', token: valid }, -1)]);
  assert.deepEqual(confirmations.map(r => r.status).sort(), [200,400]);
  await action('/api/account/verification', { action: 'confirm', token: valid }, 400, -1);
  assert.equal((await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${accounts[0]}`)[0].email_verified_at, null);
  // Only enable in-app testing. No queued mail is produced, even if a worker is active.
  await action('/api/notifications', { action: 'preferences', contactEmail: false, solutionEmail: false }, 200, 1);
  await sql`INSERT INTO solution_events(solution_id,status,message) VALUES(${solution},'published','Temporary fixture publication')`;
  const [notice] = await sql`SELECT * FROM account_notifications WHERE owner_id=${accounts[1]}`;
  assert.equal(notice.email_state, 'disabled'); assert.equal(notice.category, 'solution');
  await action('/api/notifications', { action: 'read', id: notice.id }, 200, 0);
  assert.equal((await sql`SELECT read_at FROM account_notifications WHERE id=${notice.id}`)[0].read_at, null);
  await action('/api/notifications', { action: 'read', id: notice.id }, 200, 1);
  assert.ok((await sql`SELECT read_at FROM account_notifications WHERE id=${notice.id}`)[0].read_at);
  await action(`/api/solutions/${solution}/domain`, { action: 'issue' }, 404, 0);
  await action(`/api/solutions/${draft}/domain`, { action: 'issue' }, 404, 1);
  const proof = await action(`/api/solutions/${solution}/domain`, { action: 'issue' }, 200, 1);
  assert.equal(proof.name, '_showcasemx.example.invalid'); assert.ok(proof.value.startsWith('showcasemx-verification='));
  await action(`/api/solutions/${solution}/domain`, { action: 'verify' }, 400, 1);
  assert.equal((await sql`SELECT verified_at FROM solution_domain_proofs WHERE solution_id=${solution}`)[0].verified_at, null);
  await action('/api/metrics', { solutionId: solution, event: 'view' }, 204, 1);
  await action('/api/metrics', { solutionId: solution, event: 'view' }, 204, 0, { dnt: '1' });
  assert.equal((await sql`SELECT * FROM solution_daily_metrics WHERE solution_id=${solution}`).length, 0);
  await action('/api/metrics', { solutionId: solution, event: 'view' }, 204, 0);
  await action('/api/metrics', { solutionId: solution, event: 'click' }, 204, -1);
  const [metrics] = await sql`SELECT * FROM solution_daily_metrics WHERE solution_id=${solution}`;
  assert.equal(metrics.views, 1); assert.equal(metrics.clicks, 1);
  await action('/api/metrics', { solutionId: draft, event: 'view' }, 204, -1);
  assert.equal((await sql`SELECT * FROM solution_daily_metrics WHERE solution_id=${draft}`).length, 0);
  await action('/api/reports', { action: 'create', solutionId: solution, reason: 'broken', details: 'The website is unavailable in this fixture.' }, 200, 0);
  await action('/api/reports', { action: 'create', solutionId: solution, reason: 'broken', details: 'Duplicate report must be rejected.' }, 409, 0);
  const [report] = await sql`SELECT id FROM solution_reports WHERE solution_id=${solution}`;
  const review = { action: 'review', id: report.id, version: 0, decision: 'withdraw', message: 'Temporary fixture withdrawn after editorial test.' };
  await action('/api/reports', review, 409, 2);
  // Fixtures may be reviewers; the real owner's permissions are never touched.
  console.log('Verified email, notification privacy, domain ownership, metric exclusions and report creation.');
  await sql`INSERT INTO solution_reviewers(account_id) VALUES(${accounts[0]}),(${accounts[1]}),(${accounts[2]})`;
  await action('/api/reports', review, 409, 0); await action('/api/reports', review, 409, 1);
  await action('/api/reports', review, 200, 2); await action('/api/reports', review, 409, 2);
  assert.equal((await sql`SELECT published_data FROM founder_solutions WHERE id=${solution}`)[0].published_data, null);
  assert.equal((await fetch(origin + '/soluciones/' + solution)).status, 404);
  await action('/api/metrics', { solutionId: solution, event: 'view' }, 204, -1);
  assert.equal((await sql`SELECT views FROM solution_daily_metrics WHERE solution_id=${solution}`)[0].views, 1);
  assert.ok((await sql`SELECT id FROM account_notifications WHERE owner_id=${accounts[1]} AND title='Publicación retirada'`).length);
  await sql`INSERT INTO auth_google_identities(subject,account_id,email) VALUES(${tag},${accounts[1]},${emails[1]})`;
  await action('/api/account/google', { action: 'unlink', password: 'wrong password' }, 400, 1);
  await action('/api/account/google', { action: 'unlink', password }, 200, 1);
  assert.equal((await sql`SELECT * FROM auth_sessions WHERE account_id=${accounts[1]}`).length, 0);
  assert.equal((await sql`SELECT * FROM auth_google_identities WHERE account_id=${accounts[1]}`).length, 0);
  await action('/api/notifications', { action: 'read-all' }, 401, 1);
  assert.equal((await fetch(origin + '/api/internal/mail')).status, 401);
  console.log('PASS: concurrent single-use verification/email binding/expiry; private notification reads and transactional events; owner-only domain proofs; owner/DNT excluded metrics; report separation and withdrawal; Google reauthentication and session revocation; protected worker.');
} catch (error) { console.log(error instanceof assert.AssertionError ? error.stack : 'Integration failed: ' + String(error.code || error.name) + ' ' + String(error.constraint || '')); process.exitCode = 1; }
finally { await sql`DELETE FROM solution_reports WHERE solution_id IN(${solution},${draft})`; await sql`DELETE FROM founder_solutions WHERE id IN(${solution},${draft})`; await sql`DELETE FROM auth_accounts WHERE email=ANY(${emails})`; const keys = [...emails.map(e => 'email:' + hash(e)), ...accounts.flatMap(id => ['verify-email','domain-verify','report','google-account'].map(scope => scope + ':' + hash(id))), ...tokens.map(t => 'verify-token:' + hash(t)), 'public-metric:' + hash(solution)]; await sql`DELETE FROM auth_rate_limits WHERE key=ANY(${keys})`; console.log('Cleaned temporary launch fixtures.'); }
})();
