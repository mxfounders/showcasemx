import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  TOKEN_LIFETIMES,
  generateToken,
  isTokenFormat,
  passwordStamp,
  readBearer,
  readLifetime,
  readTokenName,
} from '../src/lib/assistant/tokens';
import { ASSISTANT_TOOLS } from '../src/lib/assistant/tools';
import { applySolutionChanges } from '../src/lib/solutions/writes';
import { emptySolution, type SolutionData } from '../src/lib/solutions/model';
import { assistant as esAssistant } from '../src/i18n/dictionaries/es/assistant';
import { assistant as enAssistant } from '../src/i18n/dictionaries/en/assistant';
import { GET as mcpGet, POST as mcpPost } from '../src/app/api/mcp/route';
import { POST as tokensPost } from '../src/app/api/account/assistant-tokens/route';

test('a token is the prefix plus 32 random bytes, and only that shape is ever looked up', () => {
  const { token, hint } = generateToken();
  assert.match(token, /^shwcs_mcp_[A-Za-z0-9_-]{43}$/);
  assert.ok(isTokenFormat(token));
  assert.equal(hint, token.slice('shwcs_mcp_'.length, 'shwcs_mcp_'.length + 4));
  assert.notEqual(generateToken().token, token);
  assert.equal(isTokenFormat('shwcs_mcp_short'), false);
  assert.equal(isTokenFormat(`${token} `), false);
});

test('the bearer header is the only place a token is read from', () => {
  const { token } = generateToken();
  assert.equal(readBearer(`Bearer ${token}`), token);
  assert.equal(readBearer(`bearer ${token}`), token);
  assert.equal(readBearer(token), null);
  assert.equal(readBearer(`Basic ${token}`), null);
  assert.equal(readBearer('Bearer abc'), null);
  assert.equal(readBearer(null), null);
});

test('names, lifetimes and the password stamp are validated', () => {
  assert.equal(readTokenName('  Claude   en mi laptop '), 'Claude en mi laptop');
  assert.equal(readTokenName(''), null);
  assert.equal(readTokenName('x'.repeat(61)), null);
  assert.equal(readTokenName(42), null);
  for (const days of TOKEN_LIFETIMES) assert.equal(readLifetime(days), days);
  assert.equal(readLifetime(0), null);
  assert.equal(readLifetime(3650), null);
  assert.equal(readLifetime('forever'), null);
  // A different password hash gives a different stamp: the token dies with the password.
  assert.equal(passwordStamp('scrypt-v1:a:b'), passwordStamp('scrypt-v1:a:b'));
  assert.notEqual(passwordStamp('scrypt-v1:a:b'), passwordStamp('scrypt-v1:a:c'));
  assert.match(passwordStamp('x'), /^[a-f0-9]{64}$/);
});

const draft: SolutionData = {
  ...emptySolution,
  name: 'Atlas',
  website: 'https://atlas.example.com/',
  contactEmail: 'fundador@example.invalid',
  scope: 'Facturación',
};

test('changes go through the editor validation and say which field is wrong', () => {
  const ok = applySolutionChanges(draft, {
    kind: 'Software',
    categories: ['Cobros', 'Finanzas'],
    industries: [],
    scope: null,
  });
  assert.ok('data' in ok);
  assert.equal(ok.data.kind, 'Software');
  // `category` mirrors the first category, as the editor does.
  assert.equal(ok.data.category, 'Cobros');
  // [] is a real answer («any industry»), distinct from never answered.
  assert.deepEqual(ok.data.industries, []);
  // null removes an optional field.
  assert.equal(ok.data.scope, undefined);
  assert.equal(ok.data.name, 'Atlas');

  const bad = applySolutionChanges(draft, { kind: 'Robot', name: 'x'.repeat(101), audience: 'ok' });
  assert.ok('invalid' in bad);
  assert.deepEqual(bad.invalid.sort(), ['kind', 'name']);

  // A required field can't be removed.
  const removed = applySolutionChanges(draft, { name: null });
  assert.ok('invalid' in removed);
  assert.deepEqual(removed.invalid, ['name']);
});

test('fields outside the editor never reach the data, catalog_key included', () => {
  const result = applySolutionChanges(draft, {
    catalog_key: 'cord',
    ownerId: 'x',
    name: 'Atlas 2',
  });
  assert.ok('data' in result);
  assert.equal(result.data.name, 'Atlas 2');
  assert.equal('catalog_key' in result.data, false);
  assert.equal('ownerId' in result.data, false);
});

test('every tool has its words in both languages', () => {
  for (const tool of ASSISTANT_TOOLS) {
    for (const dict of [esAssistant, enAssistant]) {
      assert.ok(dict.server.tools[tool].description.length > 20, tool);
      assert.ok(dict.guide.tools[tool].length > 10, tool);
      assert.ok(dict.card.activity.tools[tool].length > 3, tool);
    }
  }
});

const mcpRequest = (headers: Record<string, string>) =>
  new NextRequest('https://shwcs.example/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });

test('the MCP endpoint refuses calls without a well-formed bearer token before storage', async () => {
  for (const headers of [
    {},
    { authorization: 'Bearer nope' },
    { authorization: 'Basic abc' },
    { cookie: 'showcasemx-session=' + 'a'.repeat(64) },
  ]) {
    const response = await mcpPost(mcpRequest(headers));
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate') ?? '', /^Bearer /);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  assert.equal(mcpGet().status, 405);
});

test('managing tokens needs the same origin and a session', async () => {
  const body = JSON.stringify({ action: 'create', name: 'x', days: 30, password: 'secreto' });
  const foreign = new NextRequest('https://shwcs.example/api/account/assistant-tokens', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
    body,
  });
  assert.equal((await tokensPost(foreign)).status, 403);
  const anonymous = new NextRequest('https://shwcs.example/api/account/assistant-tokens', {
    method: 'POST',
    headers: { origin: 'https://shwcs.example', 'content-type': 'application/json' },
    body,
  });
  assert.equal((await tokensPost(anonymous)).status, 401);
});
