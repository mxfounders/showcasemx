import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../src/app/robots';

/**
 * RFC 9309 matching, as Google and Bing apply it: the longest matching rule wins, allow
 * wins a tie, `*` is any run of characters and `$` anchors the end.
 */
function allowed(path: string) {
  const { rules } = robots();
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const list = (value: string | string[] | undefined) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];
  const matches = (pattern: string) => {
    const source = pattern
      .split('')
      .map(char =>
        char === '*' ? '.*' : char === '$' ? '$' : char.replace(/[.?+^()[\]{}|\\]/g, '\\$&'),
      )
      .join('');
    return new RegExp(`^${source}`).test(path);
  };
  const best = (patterns: string[]) =>
    Math.max(-1, ...patterns.filter(matches).map(pattern => pattern.length));
  return best(list(rule.allow)) >= best(list(rule.disallow));
}

test('badge links stay crawlable; other queries and private pages do not', () => {
  for (const path of [
    '/es/soluciones/cord?ref=badge',
    '/en/soluciones/flouvia?ref=badge',
    '/es/soluciones/cord',
    '/es/comunidad?page=2',
    '/api/solutions/abc/site-image',
  ])
    assert.equal(allowed(path), true, path);
  for (const path of [
    '/es/soluciones/cord?ref=newsletter',
    '/es/soluciones/cord?utm_source=x',
    '/es?q=cobranza',
    '/es/comunidad?category=Cobros',
    '/es/account',
    '/api/auth/login',
  ])
    assert.equal(allowed(path), false, path);
});
