import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCsp, clientIp, ipAllowed, isIp, parseAllowlist, parseIp } from '../ops/src/lib/net';
import { csvCell, toCsv } from '../ops/src/lib/csv';
import { fieldChanges, wordDiff } from '../ops/src/lib/diff';
import { niceTicks } from '../ops/src/components/charts/scale';

test('ops IP parsing handles IPv4, IPv6, compressed forms and IPv4-mapped addresses', () => {
  assert.deepEqual(parseIp('192.168.1.10'), { family: 4, value: 3232235786 });
  assert.equal(parseIp('256.1.1.1'), null);
  assert.equal(parseIp('1.2.3'), null);
  assert.equal(parseIp('01.2.3.4')?.family, 4);
  assert.equal(parseIp('::1')?.family, 6);
  assert.equal(parseIp('2001:db8::1')?.family, 6);
  assert.equal(parseIp('2001:db8:::1'), null);
  assert.equal(parseIp('1:2:3:4:5:6:7:8:9'), null);
  // ::ffff:a.b.c.d folds to IPv4 so an IPv4 rule matches it.
  assert.deepEqual(parseIp('::ffff:10.0.0.7'), parseIp('10.0.0.7'));
  assert.equal(isIp('not-an-ip'), false);
  assert.equal(isIp('fe80::1%en0'), true);
});

test('ops allowlist matches exact addresses and CIDR ranges, drops invalid entries, and is open when unset', () => {
  const rules = parseAllowlist(
    '203.0.113.7, 10.0.0.0/8 2001:db8::/32 bogus 300.0.0.0/8 10.0.0.0/33',
  );
  assert.equal(rules.length, 3);
  assert.equal(ipAllowed('203.0.113.7', rules), true);
  assert.equal(ipAllowed('203.0.113.8', rules), false);
  assert.equal(ipAllowed('10.200.3.4', rules), true);
  assert.equal(ipAllowed('11.0.0.1', rules), false);
  assert.equal(ipAllowed('2001:db8:abcd::5', rules), true);
  assert.equal(ipAllowed('2001:db9::5', rules), false);
  assert.equal(ipAllowed('::ffff:10.1.1.1', rules), true);
  assert.equal(
    ipAllowed(null, rules),
    false,
    'unknown client is rejected when an allowlist exists',
  );
  assert.equal(
    ipAllowed(null, parseAllowlist(undefined)),
    true,
    'no allowlist means no network restriction',
  );
  assert.equal(ipAllowed('8.8.8.8', parseAllowlist('0.0.0.0/0')), true);
});

test('ops client IP prefers platform headers and ignores garbage', () => {
  assert.equal(
    clientIp(new Headers({ 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '1.1.1.1' })),
    '198.51.100.4',
  );
  assert.equal(
    clientIp(new Headers({ 'x-forwarded-for': '2001:DB8::2, 10.0.0.1' })),
    '2001:db8::2',
  );
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '<script>' })), null);
  assert.equal(clientIp(new Headers()), null);
});

test('ops CSP is nonce-based without unsafe-inline scripts in production', () => {
  const csp = buildCsp('abc123', false);
  assert.match(csp, /script-src 'self' 'nonce-abc123' 'strict-dynamic'(;|$)/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  for (const directive of [
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "font-src 'self'",
    'upgrade-insecure-requests',
  ])
    assert.ok(csp.includes(directive), directive);
  const dev = buildCsp('n', true);
  assert.match(dev, /'unsafe-eval'/);
  assert.doesNotMatch(dev, /upgrade-insecure-requests/);
});

test('ops CSV export neutralises spreadsheet formulas and quotes correctly', () => {
  assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
  assert.equal(csvCell('+52 55'), "'+52 55");
  assert.equal(csvCell('-1'), "'-1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('line\nbreak'), '"line\nbreak"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(new Date('2026-01-02T03:04:05.000Z')), '2026-01-02T03:04:05.000Z');
  const csv = toCsv(['a', 'b'], [['x', 1]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.slice(1), 'a,b\r\nx,1\r\n');
});

test('ops word diff marks only what changed and field diff separates text from lists', () => {
  const tokens = wordDiff('Desde $2,500 al mes.', 'Desde $2,900 al mes.');
  assert.deepEqual(
    tokens.filter(t => t.kind !== 'same').map(t => [t.kind, t.text.trim()]),
    [
      ['removed', '$2,500'],
      ['added', '$2,900'],
    ],
  );
  assert.equal(
    wordDiff('igual', 'igual').every(t => t.kind === 'same'),
    true,
  );
  const changes = fieldChanges(
    { name: 'A', problem: 'uno', capabilities: ['x', 'y'], founders: [{ name: 'Ana' }] },
    { name: 'A', problem: 'dos', capabilities: ['y', 'z'], founders: [{ name: 'Ana' }] },
    { problem: 'Problema' },
  );
  assert.deepEqual(changes.map(c => c.key).sort(), ['capabilities', 'problem']);
  const list = changes.find(c => c.key === 'capabilities');
  assert.deepEqual(list?.added, ['z']);
  assert.deepEqual(list?.removed, ['x']);
  assert.equal(changes.find(c => c.key === 'problem')?.label, 'Problema');
  assert.deepEqual(
    fieldChanges(null, { name: 'A' }, {}),
    [],
    'no published version means nothing to compare',
  );
  // Key order inside objects never counts as a change.
  assert.equal(
    fieldChanges({ founders: [{ a: 1, b: 2 }] }, { founders: [{ b: 2, a: 1 }] }, {}).length,
    0,
  );
});

test('ops chart axis uses clean integer ticks for counts', () => {
  assert.deepEqual(niceTicks(1), [0, 1]);
  assert.deepEqual(niceTicks(0), [0, 1]);
  assert.deepEqual(niceTicks(77), [0, 20, 40, 60, 80]);
  assert.ok(niceTicks(3).every(Number.isInteger));
  assert.deepEqual(niceTicks(0.5, 4, false), [0, 0.2, 0.4, 0.6]);
});
