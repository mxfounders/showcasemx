import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { ruleArgs } from '../scripts/firewall.mjs';

type Condition = { type: string; op: string; pattern?: string; value?: string; key?: string };
type Rule = {
  name: string;
  groups: Condition[][];
  action: string;
  rateLimit?: { window: number; requests: number; keys: string[]; action: string };
};
const config = JSON.parse(readFileSync('firewall/rules.json', 'utf8')) as {
  patterns: Record<string, string>;
  projects: Record<string, { hobby: Rule[]; pro: Rule[] }>;
};
const pattern = (name: string) => new RegExp(config.patterns[name]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('firewall patterns compile and every rule names a known pattern', () => {
  for (const source of Object.values(config.patterns))
    assert.doesNotThrow(() => new RegExp(source));
  for (const project of Object.values(config.projects))
    for (const rule of [...project.hobby, ...project.pro])
      for (const group of rule.groups)
        for (const condition of group)
          if (condition.pattern) assert.ok(config.patterns[condition.pattern], condition.pattern);
});

test('the Hobby set fits the plan: 3 custom rules, at most 1 rate limit', () => {
  for (const [name, project] of Object.entries(config.projects)) {
    assert.ok(project.hobby.length <= 3, name);
    assert.ok(project.hobby.filter(rule => rule.action === 'rate_limit').length <= 1, name);
    assert.equal(
      project.hobby[0].action === 'bypass' || !project.hobby.some(rule => rule.action === 'bypass'),
      true,
      `${name}: bypass goes first`,
    );
  }
});

test('scanner rule blocks probes and never a file or page shwcs serves', () => {
  const scanner = pattern('scanner');
  for (const probe of [
    '/wp-login.php',
    '/wp-admin/install.php',
    '/wordpress/',
    '/.env',
    '/.env.production',
    '/.git/config',
    '/xmlrpc.php',
    '/index.php',
    '/phpmyadmin/',
    '/cgi-bin/luci',
    '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
    '/backup.sql',
    '/config.ini',
  ])
    assert.match(probe, scanner, probe);

  const served = [
    ...files('public').map(path => '/' + relative('public', path)),
    '/',
    '/es',
    '/en/explorar/cobros',
    '/es/soluciones/cord',
    '/soluciones/cord.md',
    '/llms.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/api/health',
    '/api/webhooks/stripe',
    '/.well-known/security.txt',
    '/_next/static/chunks/main-app.js',
    '/relay/static/array.js',
    '/es/account/settings/data',
    '/es/blog/como-elegir-software-de-cobranza',
  ];
  for (const path of served) assert.doesNotMatch(path, scanner, path);
});

test('machine bypass covers webhooks, cron, health, badges and AI files only', () => {
  const machine = pattern('machine');
  const apiDirs = (dir: string) =>
    readdirSync(`src/app/api/${dir}`).map(name => `/api/${dir}/${name}`);
  for (const path of [
    ...apiDirs('webhooks'),
    ...apiDirs('internal'),
    '/api/health',
    '/api/badge/0f8e9c53-5a1e-4b1a-9a40-0e1e6f3f9a11',
    '/llms.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/soluciones/cord.md',
  ])
    assert.match(path, machine, path);
  for (const path of [
    '/api/healthz',
    '/api/internalx',
    '/api/auth/login',
    '/api/contacts',
    '/es/soluciones/cord',
    '/es/llms.txt',
    '/soluciones/cord',
  ])
    assert.doesNotMatch(path, machine, path);
});

test('sensitive rate limit covers sign-up, sign-in, contact and newsletter, not the inboxes', () => {
  const sensitive = pattern('sensitivePost');
  for (const path of [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/contact',
    '/api/newsletter',
  ])
    assert.match(path, sensitive, path);
  for (const path of ['/api/contacts', '/api/community', '/api/account', '/api/authority'])
    assert.doesNotMatch(path, sensitive, path);
});

test('community combos need three or more values, encoded or not', () => {
  const combos = pattern('communityCombos');
  assert.match('Cobros,Ventas,Legal', combos);
  assert.match('Cobros%2CVentas%2CLegal', combos);
  assert.doesNotMatch('Cobros,Ventas', combos);
  assert.doesNotMatch('Cobros', combos);
});

test('log stage only observes; enforce stage applies the real action', () => {
  const [bypass, scanner, limit] = config.projects.shwcs.hobby;
  const action = (args: string[], flag: string) => args[args.indexOf(flag) + 1];
  assert.equal(action(ruleArgs(scanner, 'log'), '--action'), 'log');
  assert.equal(action(ruleArgs(scanner, 'enforce'), '--action'), 'deny');
  assert.equal(action(ruleArgs(bypass, 'log'), '--action'), 'bypass');
  assert.equal(action(ruleArgs(limit, 'log'), '--rate-limit-action'), 'log');
  assert.equal(action(ruleArgs(limit, 'enforce'), '--rate-limit-action'), 'rate_limit');
  const conditions = ruleArgs(limit, 'enforce')
    .map((part: string, index: number, all: string[]) =>
      all[index - 1] === '--condition' ? JSON.parse(part) : null,
    )
    .filter(Boolean);
  assert.deepEqual(conditions, [
    { type: 'path', op: 're', value: config.patterns.sensitivePost },
    { type: 'method', op: 'eq', value: 'POST' },
  ]);
  // OR groups are separated with --or.
  const pro = config.projects.shwcs.pro.find(rule => rule.action === 'challenge')!;
  assert.equal(ruleArgs(pro, 'enforce').filter((part: string) => part === '--or').length, 1);
});
