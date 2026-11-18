import assert from 'node:assert/strict';
import test from 'node:test';
import { siteIconUrl } from '../src/lib/solutions/public';
import { fetchSiteIconOnly } from '../src/lib/solutions/site-image';
import { storeSiteIcon } from '../src/lib/solutions/site-icon-store';

const id = '31870a5c-a1d3-4de8-bc01-c78e8751d9a2';

test('a stored site logo is versioned by its checksum, so a new logo is a new URL', () => {
  assert.equal(siteIconUrl(id, undefined), undefined);
  assert.equal(
    siteIconUrl(id, 'abcdef0123456789abcdef'),
    `/api/solutions/${id}/site-icon?v=abcdef012345`,
  );
  assert.notEqual(siteIconUrl(id, 'aaaaaaaaaaaa1'), siteIconUrl(id, 'bbbbbbbbbbbb1'));
});

test('the refresh never reads private addresses', async () => {
  assert.equal(await fetchSiteIconOnly('http://127.0.0.1/'), 'unreachable');
  assert.equal(await fetchSiteIconOnly('http://169.254.169.254/latest/'), 'unreachable');
});

/** A stand-in for the SQL tag: records each statement and answers from a script. */
function fakeSql(answers: unknown[][]) {
  const statements: string[] = [];
  const sql = (strings: TemplateStringsArray) => {
    statements.push(strings.join('?').replace(/\s+/g, ' ').trim());
    return Promise.resolve(answers.shift() ?? []);
  };
  return { sql: sql as never, statements };
}

test('the same logo again only touches fetched_at: no new blob, no new URL', async () => {
  const { sql, statements } = fakeSql([[{ '?column?': 1 }]]);
  const result = await storeSiteIcon(sql, id, 'https://cordhq.app/', {
    iconUrl: 'https://cordhq.app/favicon.svg',
    buffer: Buffer.from('same bytes'),
    size: 128,
  });
  assert.deepEqual(result, { hasIcon: true, changed: false });
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^UPDATE solution_site_icons SET fetched_at = now\(\)/);
});

test('a site that shows no logo keeps the previous one, unless the listing moved sites', async () => {
  const kept = fakeSql([[], [{ '?column?': 1 }]]);
  assert.deepEqual(await storeSiteIcon(kept.sql, id, 'https://cordhq.app/', null), {
    hasIcon: true,
    changed: false,
  });
  const moved = fakeSql([[{ '?column?': 1 }], []]);
  assert.deepEqual(await storeSiteIcon(moved.sql, id, 'https://otro.example.com/', null), {
    hasIcon: false,
    changed: true,
  });
});
