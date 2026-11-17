import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  FRAUD_THRESHOLDS,
  SIGNAL_WEIGHT,
  cohorts,
  densestBurst,
  detectFraud,
  emailDomain,
  isAutomatedUserAgent,
  isDisposableEmail,
  isSignalCode,
  type FraudAccount,
  type Interaction,
} from '../ops/src/lib/fraud';

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.parse('2026-11-01T12:00:00.000Z');
const at = (ms: number) => new Date(T0 + ms).toISOString();
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function account(id: string, createdMs: number, extra: Partial<FraudAccount> = {}): FraudAccount {
  return { id, email: `${id}@example.invalid`, createdAt: at(createdMs), userAgents: [], ...extra };
}
function like(accountId: string, ms: number, targetId = 'listing'): Interaction {
  return { kind: 'like', targetType: 'solution', targetId, accountId, at: at(ms) };
}

test('disposable addresses match the curated list, subdomains included, and nothing else', () => {
  assert.equal(emailDomain('Someone@YopMail.COM'), 'yopmail.com');
  assert.equal(emailDomain('no-at-sign'), '');
  assert.equal(isDisposableEmail('a@mailinator.com'), true);
  assert.equal(isDisposableEmail('a@inbox.mailinator.com'), true);
  assert.equal(isDisposableEmail('A@YOPMAIL.FR'), true);
  assert.equal(isDisposableEmail('a@notmailinator.com'), false);
  assert.equal(isDisposableEmail('a@gmail.com'), false);
  assert.equal(isDisposableEmail('a@acme.mx'), false);
  assert.equal(isDisposableEmail('broken'), false);
});

test('automated user agents are told apart from real browsers', () => {
  assert.equal(isAutomatedUserAgent(CHROME), false);
  assert.equal(
    isAutomatedUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    ),
    false,
  );
  assert.equal(isAutomatedUserAgent(CHROME.replace('Chrome/', 'HeadlessChrome/')), true);
  assert.equal(isAutomatedUserAgent('python-requests/2.32.3'), true);
  assert.equal(isAutomatedUserAgent('curl/8.7.1'), true);
  assert.equal(isAutomatedUserAgent('node'), true);
  assert.equal(isAutomatedUserAgent('Mozilla/5.0 (compatible; bot; +https://x.example)'), true);
});

test('signal codes are a closed set with a weight each', () => {
  for (const code of ['cohort', 'burst', 'fresh', 'shared_ua', 'disposable', 'automated_ua'])
    assert.equal(isSignalCode(code), true, code);
  assert.equal(isSignalCode('ip'), false);
  assert.equal(isSignalCode(3), false);
  for (const weight of Object.values(SIGNAL_WEIGHT)) assert.ok(weight > 0);
  // The exact user agent is shared by everyone on one browser version: it weighs least.
  assert.ok(SIGNAL_WEIGHT.shared_ua < SIGNAL_WEIGHT.cohort);
});

test('cohorts group accounts born within the window of the first one, without overlap', () => {
  const groups = cohorts(
    [
      { id: 'c', createdAt: 50 * MIN },
      { id: 'a', createdAt: 0 },
      { id: 'b', createdAt: 10 * MIN },
      { id: 'd', createdAt: 5 * HOUR },
      { id: 'e', createdAt: 5 * HOUR + 10 * MIN },
    ],
    2 * HOUR,
    3,
  );
  assert.deepEqual(groups, [{ ids: ['a', 'b', 'c'], from: 0, to: 50 * MIN }]);
  assert.deepEqual(cohorts([{ id: 'a', createdAt: 0 }], HOUR, 3), []);
});

test('a burst counts distinct accounts, not repeated clicks by one account', () => {
  const five = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ accountId: id, at: i * 10 * MIN }));
  assert.deepEqual(densestBurst(five, HOUR, 5)?.ids, ['a', 'b', 'c', 'd', 'e']);
  const oneSpammer = Array.from({ length: 20 }, (_, i) => ({ accountId: 'a', at: i * MIN }));
  assert.equal(densestBurst(oneSpammer, HOUR, 5), null);
  // Spread over more than the window: never more than four inside any hour.
  const spread = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ accountId: id, at: i * 20 * MIN }));
  assert.equal(densestBurst(spread, HOUR, 5), null);
});

test('a ring of fresh accounts on one listing raises cohort, burst, fresh and shared browser', () => {
  const ring = ['r1', 'r2', 'r3', 'r4', 'r5'];
  const accounts = [
    account('owner', -400 * 24 * HOUR),
    account('organic', -200 * 24 * HOUR, { userAgents: [CHROME] }),
    ...ring.map((id, i) => account(id, i * 5 * MIN, { userAgents: i < 3 ? [CHROME] : [] })),
  ];
  const interactions: Interaction[] = [
    ...ring.map((id, i) => like(id, 30 * MIN + i * 3 * MIN)),
    { kind: 'review', targetType: 'solution', targetId: 'listing', accountId: 'r1', at: at(HOUR) },
    // The owner's own activity never counts, so it is never a signal either.
    {
      kind: 'comment',
      targetType: 'solution',
      targetId: 'listing',
      accountId: 'owner',
      at: at(HOUR),
    },
    like('organic', 10 * 24 * HOUR),
  ];
  const report = detectFraud({
    interactions,
    accounts,
    targets: [{ type: 'solution', id: 'listing', ownerId: 'owner' }],
  });
  assert.equal(report.targets.length, 1);
  const [finding] = report.targets;
  assert.equal(finding.key, 'solution:listing');
  assert.deepEqual(finding.signals.map(s => s.code).sort(), [
    'burst',
    'cohort',
    'fresh',
    'shared_ua',
  ]);
  assert.deepEqual(finding.signals.find(s => s.code === 'cohort')?.accountIds, ring);
  assert.deepEqual(finding.signals.find(s => s.code === 'fresh')?.accountIds, ring);
  // The organic account shares the popular browser string but nothing else.
  assert.deepEqual(finding.signals.find(s => s.code === 'shared_ua')?.accountIds, [
    'organic',
    'r1',
    'r2',
    'r3',
  ]);
  assert.equal(finding.accountCount, 6, 'owner excluded');
  assert.deepEqual(finding.kinds.r1, ['like', 'review']);
  assert.equal(finding.kinds.owner, undefined);

  const byId = new Map(report.accounts.map(a => [a.accountId, a]));
  assert.equal(byId.has('owner'), false);
  assert.deepEqual(byId.get('r1')?.signals, ['cohort', 'burst', 'fresh', 'shared_ua']);
  assert.deepEqual(byId.get('r5')?.signals, ['cohort', 'burst', 'fresh']);
  assert.deepEqual(byId.get('organic')?.signals, ['shared_ua']);
  // Strongest first: the ring outranks the organic account.
  assert.equal(report.accounts[0].accountId, 'r1');
  assert.equal(report.accounts.at(-1)?.accountId, 'organic');
  assert.equal(
    byId.get('r5')?.score,
    SIGNAL_WEIGHT.cohort + SIGNAL_WEIGHT.burst + SIGNAL_WEIGHT.fresh,
  );
});

test('account signals show up without making a listing suspicious on their own', () => {
  const report = detectFraud({
    interactions: [like('temp', 2 * 24 * HOUR, 'other'), like('script', 3 * 24 * HOUR, 'other')],
    accounts: [
      { id: 'temp', email: 'x@guerrillamail.com', createdAt: at(0), userAgents: [] },
      account('script', 0, { userAgents: ['python-requests/2.32.3'] }),
    ],
    targets: [{ type: 'solution', id: 'other', ownerId: 'someone' }],
  });
  assert.equal(report.targets.length, 0);
  assert.deepEqual(
    report.accounts.map(a => [a.accountId, a.signals]),
    [
      ['script', ['automated_ua']],
      ['temp', ['disposable']],
    ],
  );
});

test('fresh accounts must be most of the listing, and spread-out accounts are no cohort', () => {
  const t = FRAUD_THRESHOLDS;
  // Three fresh accounts among seven established ones: under the 50 % share.
  const established = Array.from({ length: 7 }, (_, i) =>
    account(`old${i}`, -(100 + i * 30) * 24 * HOUR),
  );
  const fresh = ['f1', 'f2', 'f3'].map((id, i) => account(id, i * 3 * 24 * HOUR));
  const interactions = [
    ...established.map((a, i) => like(a.id, i * 2 * 24 * HOUR)),
    ...fresh.map((a, i) => like(a.id, i * 3 * 24 * HOUR + HOUR)),
  ];
  const report = detectFraud(
    {
      interactions,
      accounts: [...established, ...fresh],
      targets: [{ type: 'solution', id: 'listing', ownerId: null }],
    },
    t,
  );
  assert.equal(report.targets.length, 0);
  assert.equal(report.accounts.length, 0);
});

// The order must ignore marked accounts everywhere it ignores unverified ones (SHCWS-141).
test('every ranking query excludes accounts marked as suspicious', () => {
  const catalogue = readFileSync('src/lib/solutions/public.ts', 'utf8');
  const decayed = catalogue
    .split('\n')
    .filter(line => line.includes('sum(CASE WHEN a.email_verified_at IS NOT NULL'));
  assert.equal(decayed.length, 3, 'likes, comments and saves');
  for (const line of decayed) assert.match(line, /AND NOT account_flagged\(a\.id\)/);
  assert.match(catalogue, /\*CASE WHEN account_flagged\(a\.id\) THEN 0 ELSE 1 END/, 'reviews');

  const community = readFileSync('src/lib/library/community.ts', 'utf8');
  const popular = community
    .split('\n')
    .filter(line => line.includes('a.email_verified_at IS NOT NULL'));
  assert.equal(popular.length, 3);
  for (const line of popular) assert.match(line, /NOT account_flagged\(a\.id\)/);

  const weekly = readFileSync('src/lib/recognition/server.ts', 'utf8');
  assert.match(weekly, /a\.email_verified_at IS NOT NULL AND NOT account_flagged\(a\.id\)/);

  const migration = readFileSync('db/account-flags.sql', 'utf8');
  assert.match(migration, /CREATE OR REPLACE FUNCTION account_flagged\(account uuid\)/);
  assert.match(migration, /WHERE cleared_at IS NULL/);
});
