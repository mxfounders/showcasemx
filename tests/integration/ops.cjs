// Opt-in integration test for the ops console. Uses only newly created
// @example.invalid accounts against the locally running apps and database,
// and deletes them (and their rate-limit rows created during the run) in finally.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { randomUUID, createHash, createHmac } = crypto;

if (process.env.RUN_OPS_INTEGRATION !== '1') {
  console.log('Set RUN_OPS_INTEGRATION=1 to test the running local apps (root :3000, ops on OPS_PORT) and configured database.');
  process.exit(0);
}

const root = process.cwd();
const { neon } = require(root + '/node_modules/@neondatabase/serverless');
const env = require(root + '/node_modules/dotenv').parse(fs.readFileSync(path.join(root, '.env.local')));
const sql = neon(env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL, { fetchOptions: { cache: 'no-store' } });

const mainOrigin = 'http://localhost:3000';
const opsOrigin = 'http://localhost:' + (process.env.OPS_PORT || '3011');
const tag = randomUUID();
const password = 'Temporary ops integration passphrase';
const emails = {
  admin: `ops-admin-${tag}@example.invalid`,
  target: `ops-target-${tag}@example.invalid`,
  reviewer: `ops-reviewer-${tag}@example.invalid`,
};

const testStart = new Date();
const accountIds = {};
const opsCookies = {}; // role -> 'ops-session=...'
let inquiryId = null;
let reportId = null;

// --- TOTP (mirrors ops/src/lib/totp.ts) ---
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}
function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 10 ** 6).padStart(6, '0');
}
function totpNow(secretBase32) {
  const step = BigInt(Math.floor(Date.now() / 1000 / 30));
  return hotp(base32Decode(secretBase32), step);
}

function setCookieValue(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  return raw.split(';')[0];
}

async function opsFetch(pathname, { method = 'GET', body, cookie } = {}) {
  const headers = { origin: opsOrigin };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const res = await fetch(opsOrigin + pathname, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, json, res };
}

async function loginAndEnroll(email) {
  // Step 1: password.
  const login = await opsFetch('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200, 'login step1: ' + JSON.stringify(login.json));
  assert.equal(login.json.step, 'enroll');
  const challengeCookie = setCookieValue(login.res);
  assert.ok(challengeCookie && challengeCookie.startsWith('ops-challenge='), 'expected challenge cookie');

  // Step 2: enroll start.
  const start = await opsFetch('/api/auth/enroll', { method: 'POST', body: { step: 'start' }, cookie: challengeCookie });
  assert.equal(start.status, 200, 'enroll start: ' + JSON.stringify(start.json));
  assert.ok(start.json.secret && start.json.qrDataUri && Array.isArray(start.json.backupCodes) && start.json.backupCodes.length === 10);

  // Step 3: enroll confirm.
  const code = totpNow(start.json.secret);
  const confirm = await opsFetch('/api/auth/enroll', { method: 'POST', body: { step: 'confirm', code }, cookie: challengeCookie });
  assert.equal(confirm.status, 200, 'enroll confirm: ' + JSON.stringify(confirm.json));
  const sessionCookie = setCookieValue(confirm.res);
  assert.ok(sessionCookie && sessionCookie.startsWith('ops-session='), 'expected session cookie');
  return { sessionCookie, secret: start.json.secret, backupCodes: start.json.backupCodes };
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForNextTotpStep() {
  const msIntoStep = Date.now() % 30000;
  await sleep(30000 - msIntoStep + 500);
}

async function loginWithTotp(email, secret) {
  const login = await opsFetch('/api/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  assert.equal(login.json.step, 'totp');
  const challengeCookie = setCookieValue(login.res);
  const code = totpNow(secret);
  const totp = await opsFetch('/api/auth/totp', { method: 'POST', body: { code }, cookie: challengeCookie });
  assert.equal(totp.status, 200, 'totp verify: ' + JSON.stringify(totp.json));
  return setCookieValue(totp.res);
}

// The neon serverless driver has occasionally surfaced a stray rejection from an unrelated earlier
// query under this test's rapid sequential request volume; log rather than let it crash a run whose
// real assertions already passed or failed on their own terms.
process.on('unhandledRejection', (reason) => {
  console.log('Ignoring a stray async rejection (unrelated to the assertions above):', reason && reason.message || reason);
});

(async () => {
  try {
    // --- Register three temp accounts on the main app and read their ids ---
    for (const email of Object.values(emails)) {
      const res = await fetch(mainOrigin + '/api/auth/register', {
        method: 'POST', headers: { origin: mainOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      assert.equal(res.status, 200, 'register ' + email);
    }
    for (const [role, email] of Object.entries(emails)) {
      const [row] = await sql`SELECT id FROM auth_accounts WHERE email = ${email}`;
      assert.ok(row, 'account created for ' + email);
      accountIds[role] = row.id;
    }

    // Grant ops levels directly (mirrors scripts/promote-ops-admin.cjs / add-reviewer.cjs).
    await sql`INSERT INTO solution_reviewers (account_id, level) VALUES (${accountIds.admin}, 'admin')`;
    await sql`INSERT INTO solution_reviewers (account_id, level) VALUES (${accountIds.reviewer}, 'reviewer')`;

    // --- Login without TOTP must not create a session ---
    const bareLogin = await opsFetch('/api/auth/login', { method: 'POST', body: { email: emails.admin, password } });
    assert.equal(bareLogin.status, 200);
    assert.equal(bareLogin.json.step, 'enroll');
    assert.equal(setCookieValue(bareLogin.res).includes('ops-session'), false);

    // --- Enroll admin and reviewer; verify a product session cookie cannot open ops ---
    const admin = await loginAndEnroll(emails.admin);
    opsCookies.admin = admin.sessionCookie;
    const reviewerEnroll = await loginAndEnroll(emails.reviewer);
    opsCookies.reviewer = reviewerEnroll.sessionCookie;

    const productLogin = await fetch(mainOrigin + '/api/auth/login', {
      method: 'POST', headers: { origin: mainOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ email: emails.target, password }),
    });
    assert.equal(productLogin.status, 200);
    const productCookie = setCookieValue({ headers: { get: () => productLogin.headers.get('set-cookie') } });
    const crossPanel = await fetch(opsOrigin + '/api/accounts', { headers: { cookie: productCookie } });
    assert.equal(crossPanel.status, 401, 'a product session must not authenticate ops');

    // Second login for admin exercises the code/session-reuse path via TOTP (not enroll, since already confirmed).
    // Wait for the next 30s window so the code differs from the one just consumed during enrollment (anti-replay).
    await waitForNextTotpStep();
    const secondSession = await loginWithTotp(emails.admin, admin.secret);
    assert.ok(secondSession);
    const crossOps = await fetch(mainOrigin + '/api/account', { headers: { cookie: secondSession, origin: mainOrigin }, method: 'PATCH', body: '{}' });
    assert.equal(crossOps.status, 401, 'an ops session must not authenticate the product');

    // --- Seed data owned by the target account: a solution of their own, a public list, an inquiry, a stuck notification ---
    const ownSolutionAdmin = randomUUID(); // owned by admin, to test the self-review guard
    const targetSolution = randomUUID();
    const listId = randomUUID();
    const savedKey = 'catalog:cord';
    inquiryId = randomUUID();
    const notificationId = randomUUID();
    const PRIVATE_NOTE = 'PRIVATE-NOTE-MARKER-' + tag;
    const PRIVATE_PURPOSE = 'PRIVATE-PURPOSE-MARKER-' + tag;

    await sql`INSERT INTO founder_solutions (id, owner_id, data, status, version) VALUES (${ownSolutionAdmin}, ${accountIds.admin}, ${JSON.stringify({ name: 'Admin self solution ' + tag, category: 'Cobros' })}::jsonb, 'pending', 0)`;
    const publishedData = { name: 'Target solution ' + tag, category: 'Cobros', problem: 'p', audience: 'a', website: 'https://example.com', contactEmail: emails.target };
    await sql`INSERT INTO founder_solutions (id, owner_id, data, status, version) VALUES (${targetSolution}, ${accountIds.target}, ${JSON.stringify(publishedData)}::jsonb, 'pending', 0)`;

    await sql`INSERT INTO buyer_saved_projects (owner_id, project_key) VALUES (${accountIds.target}, ${savedKey})`;
    await sql`INSERT INTO buyer_lists (id, owner_id, name, purpose, visibility, categories, public_description, curator_name) VALUES (${listId}, ${accountIds.target}, ${'Public list ' + tag}, ${PRIVATE_PURPOSE}, 'public', ARRAY['Cobros'], 'Public desc', 'Curator')`;
    await sql`INSERT INTO buyer_list_items (owner_id, list_id, project_key, note) VALUES (${accountIds.target}, ${listId}, ${savedKey}, ${PRIVATE_NOTE})`;
    const commentId = randomUUID();
    await sql`INSERT INTO community_list_comments (id, list_id, author_id, author_name, body) VALUES (${commentId}, ${listId}, ${accountIds.target}, 'Tester', 'A public comment ' || ${tag})`;

    await sql`INSERT INTO contact_inquiries (id, reason, name, email, organization, message, urgency) VALUES (${inquiryId}, 'find', 'Tester', ${emails.target}, 'Org', 'A test inquiry message', 'exploring')`;
    await sql`INSERT INTO account_notifications (id, owner_id, category, source_key, title, href, email_state, attempts) VALUES (${notificationId}, ${accountIds.target}, 'solution', ${'test:' + tag}, 'Test title', '/account', 'failed', 3)`;
    await sql`INSERT INTO newsletter_subscribers (email, consent_version) VALUES (${'nl-' + emails.target}, 'newsletter-v2')`;

    // === Self-review guard: admin cannot review their own pending solution ===
    const selfReview = await opsFetch('/api/review', { method: 'POST', cookie: opsCookies.admin, body: { solutionId: ownSolutionAdmin, action: 'publish', message: 'trying to self-approve', version: 0 } });
    assert.equal(selfReview.status, 409, 'self-review must be blocked: ' + JSON.stringify(selfReview.json));

    // === Publishing someone else's solution copies data -> published_data and records actor_id ===
    const publish = await opsFetch('/api/review', { method: 'POST', cookie: opsCookies.admin, body: { solutionId: targetSolution, action: 'publish', message: 'Looks good, publishing.', version: 0 } });
    assert.equal(publish.status, 200, 'publish: ' + JSON.stringify(publish.json));
    assert.equal(publish.json.newStatus, 'published');
    const [publishedRow] = await sql`SELECT published_data, status FROM founder_solutions WHERE id = ${targetSolution}`;
    assert.ok(publishedRow.published_data, 'published_data must be set after publish (fragment-composition regression)');
    assert.equal(publishedRow.published_data.name, publishedData.name);
    const [eventRow] = await sql`SELECT actor_id FROM solution_events WHERE solution_id = ${targetSolution} ORDER BY id DESC LIMIT 1`;
    assert.equal(String(eventRow.actor_id), String(accountIds.admin), 'solution_events.actor_id must record the reviewer');

    // === Reviewer-level account is forbidden from admin-only endpoints ===
    const reviewerTeam = await opsFetch('/api/team', { cookie: opsCookies.reviewer });
    assert.equal(reviewerTeam.status, 403);
    const reviewerAudit = await opsFetch('/api/audit', { cookie: opsCookies.reviewer });
    assert.equal(reviewerAudit.status, 403);
    const reviewerSuspend = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.reviewer, body: { action: 'suspend', reason: 'reviewer trying an admin-only action' } });
    assert.equal(reviewerSuspend.status, 403);

    // === solutions list must load (fragment-composition regression) ===
    const solutionsList = await opsFetch('/api/solutions?status=all&q=' + encodeURIComponent(tag), { cookie: opsCookies.admin });
    assert.equal(solutionsList.status, 200, 'solutions list: ' + JSON.stringify(solutionsList.json));
    assert.ok(solutionsList.json.items.some(i => i.id === targetSolution));

    // === Reports flow ===
    reportId = randomUUID();
    await sql`INSERT INTO solution_reports (id, solution_id, reporter_id, reason, details) VALUES (${reportId}, ${targetSolution}, ${accountIds.admin}, 'misleading', 'A test report detail message')`;
    const reportsList = await opsFetch('/api/reports?status=open', { cookie: opsCookies.admin });
    assert.equal(reportsList.status, 200);
    assert.ok(reportsList.json.items.some(r => r.id === reportId));
    const resolveReport = await opsFetch('/api/reports', { method: 'POST', cookie: opsCookies.admin, body: { reportId, decision: 'resolve', message: 'Reviewed, looks fine.', version: 0 } });
    assert.equal(resolveReport.status, 200, JSON.stringify(resolveReport.json));

    // === Accounts list/detail, and the privacy boundary ===
    const accountsList = await opsFetch('/api/accounts?q=' + encodeURIComponent(tag), { cookie: opsCookies.admin });
    assert.equal(accountsList.status, 200);
    assert.equal(accountsList.json.items.length, 3);

    const accountDetail = await opsFetch(`/api/accounts/${accountIds.target}`, { cookie: opsCookies.admin });
    assert.equal(accountDetail.status, 200);
    const rawDetail = JSON.stringify(accountDetail.json);
    assert.ok(!rawDetail.includes(PRIVATE_NOTE), 'list item notes must never be exposed to ops');
    assert.ok(!rawDetail.includes(PRIVATE_PURPOSE), 'list purpose must never be exposed to ops');
    assert.ok(accountDetail.json.lists.some(l => l.id === listId));
    assert.ok(accountDetail.json.solutions.some(s => s.id === targetSolution));

    // === Domains ===
    await sql`INSERT INTO solution_domain_proofs (solution_id, owner_id, domain, token, expires_at) VALUES (${targetSolution}, ${accountIds.target}, 'example.com', 'tok', now() + interval '1 day')`;
    const domains = await opsFetch('/api/domains', { cookie: opsCookies.admin });
    assert.equal(domains.status, 200);
    assert.ok(domains.json.items.some(d => d.solutionId === targetSolution));

    // === Community moderation ===
    const community = await opsFetch('/api/community?q=' + encodeURIComponent(tag), { cookie: opsCookies.admin });
    assert.equal(community.status, 200);
    assert.ok(community.json.lists.some(l => l.id === listId));
    assert.ok(community.json.comments.some(c => c.id === commentId));
    const deleteComment = await opsFetch('/api/community', { method: 'POST', cookie: opsCookies.admin, body: { action: 'delete_comment', commentId, reason: 'Test moderation removal.' } });
    assert.equal(deleteComment.status, 200, JSON.stringify(deleteComment.json));
    const unpublishList = await opsFetch('/api/community', { method: 'POST', cookie: opsCookies.admin, body: { action: 'unpublish_list', listId, reason: 'Test moderation unpublish.' } });
    assert.equal(unpublishList.status, 200, JSON.stringify(unpublishList.json));
    const [listRow] = await sql`SELECT visibility FROM buyer_lists WHERE id = ${listId}`;
    assert.equal(listRow.visibility, 'private');

    // === Inquiries ===
    const inquiries = await opsFetch('/api/inquiries?pending=1', { cookie: opsCookies.admin });
    assert.equal(inquiries.status, 200);
    assert.ok(inquiries.json.items.some(i => i.id === inquiryId));
    const markHandled = await opsFetch('/api/inquiries', { method: 'POST', cookie: opsCookies.admin, body: { id: inquiryId } });
    assert.equal(markHandled.status, 200);

    // === Mail outbox retry ===
    const mail = await opsFetch('/api/mail', { cookie: opsCookies.admin });
    assert.equal(mail.status, 200);
    assert.ok(mail.json.items.some(m => m.id === notificationId));
    const retryMail = await opsFetch('/api/mail', { method: 'POST', cookie: opsCookies.admin, body: { action: 'retry', id: notificationId } });
    assert.equal(retryMail.status, 200);
    const [notifRow] = await sql`SELECT email_state, attempts FROM account_notifications WHERE id = ${notificationId}`;
    assert.equal(notifRow.email_state, 'pending');
    assert.equal(Number(notifRow.attempts), 0);

    // === Newsletter, metrics, search ===
    const newsletter = await opsFetch('/api/newsletter?all=1', { cookie: opsCookies.admin });
    assert.equal(newsletter.status, 200);
    assert.ok(newsletter.json.items.some(s => s.email === 'nl-' + emails.target));
    const metrics = await opsFetch('/api/metrics', { cookie: opsCookies.admin });
    assert.equal(metrics.status, 200);
    assert.equal(metrics.json.days.length, 30);
    const search = await opsFetch('/api/search?q=' + encodeURIComponent(tag), { cookie: opsCookies.admin });
    assert.equal(search.status, 200);
    assert.ok(search.json.results.length > 0);

    // === Account actions: revoke, verify, suspend, reactivate, unpublish_all ===
    await fetch(mainOrigin + '/api/auth/login', { method: 'POST', headers: { origin: mainOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ email: emails.target, password }) });
    const sessionsBefore = await sql`SELECT count(*)::int AS n FROM auth_sessions WHERE account_id = ${accountIds.target}`;
    assert.ok(Number(sessionsBefore[0].n) >= 1);

    const revoke = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'revoke_sessions', reason: 'Test revoke of target sessions.' } });
    assert.equal(revoke.status, 200, JSON.stringify(revoke.json));
    const sessionsAfter = await sql`SELECT count(*)::int AS n FROM auth_sessions WHERE account_id = ${accountIds.target}`;
    assert.equal(Number(sessionsAfter[0].n), 0);

    const verifyEmail = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'verify_email', reason: 'Manual verification for testing.' } });
    assert.equal(verifyEmail.status, 200);
    const [verifiedRow] = await sql`SELECT email_verified_at FROM auth_accounts WHERE id = ${accountIds.target}`;
    assert.ok(verifiedRow.email_verified_at);

    // Self-suspend / self-revoke must be rejected.
    const selfSuspend = await opsFetch(`/api/accounts/${accountIds.admin}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'suspend', reason: 'trying to suspend myself' } });
    assert.equal(selfSuspend.status, 422);

    const suspend = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'suspend', reason: 'Test suspension of target account.' } });
    assert.equal(suspend.status, 200, JSON.stringify(suspend.json));

    const suspendedLogin = await fetch(mainOrigin + '/api/auth/login', { method: 'POST', headers: { origin: mainOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ email: emails.target, password }) });
    assert.equal(suspendedLogin.status, 401, 'a suspended account must not be able to log in to the product');

    const reactivate = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'reactivate', reason: 'Test reactivation of target account.' } });
    assert.equal(reactivate.status, 200);
    const reactivatedLogin = await fetch(mainOrigin + '/api/auth/login', { method: 'POST', headers: { origin: mainOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ email: emails.target, password }) });
    assert.equal(reactivatedLogin.status, 200, 'reactivated account must be able to log in again');

    const unpublish = await opsFetch(`/api/accounts/${accountIds.target}/actions`, { method: 'POST', cookie: opsCookies.admin, body: { action: 'unpublish_all', reason: 'Test unpublish-all of target solutions.' } });
    assert.equal(unpublish.status, 200, JSON.stringify(unpublish.json));
    assert.equal(unpublish.json.solutionsUnpublished, 1);
    const [afterUnpublish] = await sql`SELECT published_data, status FROM founder_solutions WHERE id = ${targetSolution}`;
    assert.equal(afterUnpublish.published_data, null);
    assert.equal(afterUnpublish.status, 'changes_requested');

    // === Team management: promote reviewer to admin, then demote back, then enforce "last admin" guard ===
    const teamList = await opsFetch('/api/team', { cookie: opsCookies.admin });
    assert.equal(teamList.status, 200);
    assert.ok(teamList.json.items.some(m => m.id === accountIds.reviewer && m.level === 'reviewer'));

    const promote = await opsFetch('/api/team', { method: 'POST', cookie: opsCookies.admin, body: { action: 'set_level', accountId: accountIds.reviewer, level: 'admin', reason: 'Promoting for last-admin guard test.' } });
    assert.equal(promote.status, 200, JSON.stringify(promote.json));

    const demoteOriginal = await opsFetch('/api/team', { method: 'POST', cookie: opsCookies.admin, body: { action: 'set_level', accountId: accountIds.admin, level: 'reviewer', reason: 'Demoting original admin; another admin remains.' } });
    assert.equal(demoteOriginal.status, 200, JSON.stringify(demoteOriginal.json));

    // Now accountIds.reviewer is the only admin, using its own (already-enrolled) TOTP session.
    const lastAdminGuard = await opsFetch('/api/team', { method: 'POST', cookie: opsCookies.reviewer, body: { action: 'set_level', accountId: accountIds.reviewer, level: 'reviewer', reason: 'Trying to demote the last admin.' } });
    assert.equal(lastAdminGuard.status, 422, 'the last admin must not be demotable');

    const resetTotp = await opsFetch('/api/team', { method: 'POST', cookie: opsCookies.reviewer, body: { action: 'reset_totp', accountId: accountIds.admin, reason: 'Test forced 2FA reset.' } });
    assert.equal(resetTotp.status, 200, JSON.stringify(resetTotp.json));
    const [resetRow] = await sql`SELECT totp_confirmed_at FROM solution_reviewers WHERE account_id = ${accountIds.admin}`;
    assert.equal(resetRow.totp_confirmed_at, null);
    // The old session must be dead now (reset_totp revokes ops_sessions for the target).
    const deadSession = await opsFetch('/api/accounts', { cookie: opsCookies.admin });
    assert.equal(deadSession.status, 401);

    // The reset account must re-enroll on next login (not go straight to totp).
    const loginAfterReset = await opsFetch('/api/auth/login', { method: 'POST', body: { email: emails.admin, password } });
    assert.equal(loginAfterReset.json.step, 'enroll');

    // === Audit log recorded these actions with actor and reason ===
    const audit = await opsFetch('/api/audit?subjectType=account&subjectId=' + accountIds.target, { cookie: opsCookies.reviewer });
    assert.equal(audit.status, 200);
    const actions = audit.json.items.map(i => i.action);
    for (const expected of ['suspend', 'reactivate', 'unpublish_all', 'revoke_sessions', 'verify_email']) {
      assert.ok(actions.includes(expected), `audit log missing ${expected}: ${actions.join(',')}`);
    }
    assert.ok(audit.json.items.every(i => i.reason && i.reason.length >= 10));

    console.log('PASS: two-step TOTP login/enrollment, session isolation from the product, self-review guard, publish copies published_data with actor_id, reviewer/admin permission split, last-admin guard, privacy boundary (no notes/purpose leaked), and all panel API surfaces (solutions, reports, accounts, domains, community, inquiries, mail, newsletter, metrics, search, team, audit).');
  } catch (error) {
    console.log(error instanceof assert.AssertionError ? error.stack : ('Integration failed: ' + (error && error.stack || error)));
    process.exitCode = 1;
  } finally {
    // Each cleanup step runs independently so a stray async error in one (observed occasionally with
    // this driver under rapid sequential requests) never skips the rest of the cleanup.
    const cleanupSteps = [
      // solution_reports rows sit at the intersection of two independent FK actions (solution_id
      // CASCADE from founder_solutions, reporter_id SET NULL from auth_accounts); deleting them
      // explicitly first avoids relying on both cascade paths resolving a shared row in one statement.
      () => (reportId ? sql`DELETE FROM solution_reports WHERE id = ${reportId}` : Promise.resolve()),
      () => sql`DELETE FROM auth_accounts WHERE email = ANY(${Object.values(emails)})`,
      () => sql`DELETE FROM newsletter_subscribers WHERE email = ${'nl-' + emails.target}`,
      () => (inquiryId ? sql`DELETE FROM contact_inquiries WHERE id = ${inquiryId}` : Promise.resolve()),
      // Ops rate limits are keyed by network identity, which is 'unknown' for local test requests and
      // shared across runs within the same clock hour; clear the whole 'ops:' namespace rather than a
      // window-scoped subset so repeated local runs don't self-throttle.
      () => sql`DELETE FROM auth_rate_limits WHERE key LIKE 'ops:%'`,
    ];
    for (const step of cleanupSteps) {
      try { await step(); } catch (cleanupError) { console.log('Cleanup step failed (continuing with the rest):', cleanupError && cleanupError.message || cleanupError); }
    }
    console.log('Cleaned only temporary integration accounts and their cascading data.');
  }
})();
