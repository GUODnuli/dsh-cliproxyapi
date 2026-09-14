import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Accounts } from '../src/accounts.js';
import { OAuthLogins } from '../src/oauth.js';
import { Config, PROVIDERS } from '../src/config.js';
import { memoryCredentials, json, jwt } from './helpers.js';

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('Codex OAuth validates state, exchanges PKCE and commits only provider-returned credentials', async t => {
  const port = await freePort(), calls = [];
  const accounts = new Accounts(memoryCredentials(), Config({ codexCallbackPort: port }), async (url, init) => {
    calls.push({ url, init });
    return json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600,
      id_token: jwt({ email: 'fixture@example.test', 'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' } }) });
  });
  let changed = false;
  const logins = new OAuthLogins(accounts, async () => { changed = true; });
  t.after(() => logins.dispose());
  const { url, completion } = await logins.start('codex');
  const auth = new URL(url);
  assert.equal(auth.origin, 'https://auth.openai.com');
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(auth.searchParams.get('client_id'), PROVIDERS.codex.clientId);
  await assert.rejects(logins.start('codex'), /已有授权/);
  const wrong = await fetch(`http://127.0.0.1:${port}/auth/callback?state=bad&code=bad`);
  assert.equal(wrong.status, 400); assert.equal(calls.length, 0); assert.equal(logins.pending.size, 1);
  const valid = await fetch(`http://127.0.0.1:${port}/auth/callback?state=${auth.searchParams.get('state')}&code=fixture-code`);
  assert.equal(valid.status, 200); assert.equal((await completion).status, 'authorized');
  assert.equal(calls[0].init.body.get('code'), 'fixture-code');
  assert.ok(calls[0].init.body.get('code_verifier').length >= 43);
  assert.equal((await accounts.read('codex')).accountId, 'test-account'); assert.ok(changed);
  assert.equal(logins.pending.size, 0);
});

test('Antigravity login obtains project id and does not expose token values in callback page', async t => {
  const port = await freePort(), urls = [];
  const accounts = new Accounts(memoryCredentials(), Config({ antigravityCallbackPort: port }), async (url, init) => {
    urls.push(url);
    if (url === PROVIDERS.antigravity.tokenURL) return json({ access_token: 'test-google-access', refresh_token: 'test-google-refresh', expires_in: 3600 });
    if (url === PROVIDERS.antigravity.userInfoURL) return json({ email: 'google@example.test' });
    if (url.endsWith(':loadCodeAssist')) return json({ allowedTiers: [{ id: 'test-tier', isDefault: true }] });
    assert.equal(JSON.parse(init.body).tier_id, 'test-tier');
    return json({ done: true, response: { cloudaicompanionProject: { id: 'project-fixture' } } });
  });
  const logins = new OAuthLogins(accounts); t.after(() => logins.dispose());
  const login = await logins.start('antigravity'), auth = new URL(login.url);
  const response = await fetch(`http://127.0.0.1:${port}/oauth-callback?state=${auth.searchParams.get('state')}&code=fixture`);
  assert.equal(response.status, 200); assert.doesNotMatch(await response.text(), /test-google/);
  await login.completion;
  assert.equal((await accounts.read('antigravity')).projectId, 'project-fixture');
  assert.equal(urls.length, 4);
});

test('cancel releases callback listener and refuses a late credential commit', async t => {
  const port = await freePort();
  let release;
  const accounts = new Accounts(memoryCredentials(), Config({ codexCallbackPort: port }), () => new Promise(resolve => { release = resolve; }));
  const logins = new OAuthLogins(accounts); t.after(() => logins.dispose());
  const login = await logins.start('codex'), auth = new URL(login.url);
  const callback = fetch(`http://127.0.0.1:${port}/auth/callback?state=${auth.searchParams.get('state')}&code=fixture`);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  logins.cancel('codex');
  release(json({ access_token: 'late-token', id_token: jwt({ 'https://api.openai.com/auth': { chatgpt_account_id: 'a' } }) }));
  await callback; assert.equal((await login.completion).status, 'cancelled');
  assert.equal(await accounts.read('codex'), undefined);
  const next = await logins.start('codex'); assert.ok(next.url); logins.cancel('codex');
});
