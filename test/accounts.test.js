import test from 'node:test';
import assert from 'node:assert/strict';
import { Accounts, tokenPayload } from '../src/accounts.js';
import { Config } from '../src/config.js';
import { memoryCredentials, json, jwt } from './helpers.js';

test('concurrent callers share one rotating refresh and preserve omitted refresh token', async () => {
  let count = 0;
  const credentials = memoryCredentials();
  const accounts = new Accounts(credentials, Config({}), async () => { count++; return json({ access_token: 'new-access', expires_in: 3600 }); });
  await accounts.save('codex', { accessToken: 'old', refreshToken: 'refresh-once', expiresAt: 0, accountId: 'account' });
  const values = await Promise.all(Array.from({ length: 10 }, () => accounts.current('codex')));
  assert.equal(count, 1); assert.ok(values.every(v => v.accessToken === 'new-access'));
  assert.equal((await accounts.read('codex')).refreshToken, 'refresh-once');
  assert.equal(JSON.stringify(credentials.records).includes('process.env'), false);
});

test('token payload extracts account metadata and contains lossless JSON only', () => {
  const result = tokenPayload({ access_token: 'access', id_token: jwt({ email: 'test@example.test',
    'https://api.openai.com/auth': { chatgpt_account_id: 'a' } }), expires_in: 10 }, {}, 1000);
  assert.equal(result.expiresAt, 11000); assert.equal(result.accountId, 'a');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});

test('failed refresh leaves durable credentials intact and does not leak upstream errors', async () => {
  const accounts = new Accounts(memoryCredentials(), Config({}), async () => new Response('old-refresh-secret', { status: 401 }));
  await accounts.save('codex', { accessToken: 'old', refreshToken: 'old-refresh-secret', expiresAt: 0 });
  await assert.rejects(accounts.current('codex'), e => e.code === 'AUTH' && !e.message.includes('old-refresh-secret'));
  assert.equal((await accounts.read('codex')).accessToken, 'old');
});

test('disposing accounts aborts an in-flight token refresh before it can write credentials', async () => {
  let started = false;
  const credentials = memoryCredentials();
  const accounts = new Accounts(credentials, Config({}), (_url, init) => new Promise((resolve, reject) => {
    started = true;
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }));
  await accounts.save('codex', { accessToken: 'old', refreshToken: 'refresh', expiresAt: 0 });
  const refreshing = accounts.current('codex');
  while (!started) await new Promise(resolve => setImmediate(resolve));
  accounts.dispose();
  await assert.rejects(refreshing);
  assert.equal((await accounts.read('codex')).accessToken, 'old');
});

test('cancelling one refresh waiter does not cancel shared refresh or resurrect logged-out account', async () => {
  let release;
  const accounts = new Accounts(memoryCredentials(), Config({}), () => new Promise(resolve => { release = resolve; }));
  await accounts.save('codex', { accessToken: 'old', refreshToken: 'refresh', expiresAt: 0 });
  const controller = new AbortController();
  const waiting = accounts.current('codex', controller.signal);
  const rejection = assert.rejects(waiting, { name: 'AbortError' });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  controller.abort(); await rejection;
  const logout = accounts.logout('codex');
  release(json({ access_token: 'new', expires_in: 3600 }));
  await logout;
  assert.equal(await accounts.read('codex'), undefined);
});
