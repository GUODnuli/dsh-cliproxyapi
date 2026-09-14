import test from 'node:test';
import assert from 'node:assert/strict';
import { Accounts } from '../src/accounts.js';
import { Config } from '../src/config.js';
import { Quotas, composerQuotaRows, parseAntigravityQuota, parseCodexQuota } from '../src/quota.js';
import { json, memoryCredentials } from './helpers.js';

test('Codex quota parsing converts used percentages and orders known windows', () => {
  const rows = parseCodexQuota({
    rate_limit: {
      primary_window: { used_percent: 20, limit_window_seconds: 604800, reset_at: 1893456000 },
      secondary_window: { used_percent: 2.5, limit_window_seconds: 18000, reset_after_seconds: 3600 },
    },
    additional_rate_limits: [{
      limit_name: '代码审查增强',
      rate_limit: { primary_window: { used_percent: '75', limit_window_seconds: 604800 } },
    }],
  });
  assert.deepEqual(rows.map(row => [row.label, row.remainingPercent]), [
    ['5 小时额度', 97.5],
    ['每周额度', 80],
    ['代码审查增强 · 每周额度', 25],
  ]);
  assert.match(rows[0].resetAt, /^\d{4}-/);
  assert.deepEqual(rows.map(row => [row.scope, row.windowKind, row.windowSeconds]), [
    ['account', 'five-hour', 18000],
    ['account', 'week', 604800],
    ['additional', 'week', 604800],
  ]);
});

test('Antigravity quota parsing supports wrapped bodies, percent strings and distinct windows', () => {
  const rows = parseAntigravityQuota({ body: JSON.stringify({ groups: [{
    displayName: 'Gemini Models',
    buckets: [
      { window: 'weekly', remainingFraction: '40%', resetTime: '2030-01-01T00:00:00Z' },
      { window: 'five_hour', remaining_fraction: 0.8 },
    ],
  }] }) });
  assert.deepEqual(rows.map(row => [row.label, row.remainingPercent]), [
    ['Gemini Models · 5 小时额度', 80],
    ['Gemini Models · 每周额度', 40],
  ]);
  assert.equal(rows[1].resetAt, '2030-01-01T00:00:00.000Z');
  assert.deepEqual(rows.map(row => [row.scope, row.windowKind]), [
    ['account', 'five-hour'],
    ['account', 'week'],
  ]);
});

test('Composer quota keeps only present account-wide Codex five-hour and weekly windows', () => {
  const rows = composerQuotaRows('codex', [
    { label: 'Five hours', remainingPercent: 80, scope: 'account', windowKind: 'five-hour' },
    { label: 'Weekly', remainingPercent: 55, scope: 'account', windowKind: 'week' },
    { label: 'Code review weekly', remainingPercent: 20, scope: 'additional', windowKind: 'week' },
    { label: 'Monthly', remainingPercent: 90, scope: 'account' },
    { label: 'Unknown', remainingPercent: null, scope: 'account', windowKind: 'five-hour' },
  ]);
  assert.deepEqual(rows.map(row => [row.key, row.shortLabel, row.remainingPercent]), [
    ['five-hour', '5h', 80],
    ['week', '周', 55],
  ]);
});

test('Composer quota omits missing Gemini windows instead of rendering placeholders', () => {
  assert.deepEqual(composerQuotaRows('antigravity', [
    { label: 'Gemini Pro weekly', remainingPercent: 40, scope: 'account', windowKind: 'week' },
    { label: 'Gemini Flash monthly', remainingPercent: 90, scope: 'account' },
  ]).map(row => [row.key, row.label]), [['week', 'Gemini Pro weekly']]);
  assert.deepEqual(composerQuotaRows('antigravity', [{ label: 'Gemini', remainingPercent: 60, scope: 'account' }]), []);
});

test('Codex quota refresh calls official usage endpoint with account metadata', async () => {
  let request;
  const accounts = new Accounts(memoryCredentials(), Config({}), async (url, init) => {
    request = { url, init };
    return json({ plan_type: 'pro', rate_limit: { primary_window: { used_percent: 25, limit_window_seconds: 18000 } } });
  });
  await accounts.save('codex', { accessToken: 'token', accountId: 'account-test', expiresAt: Date.now() + 3600000 });
  const quotas = new Quotas(accounts);
  const state = await quotas.refresh('codex');
  assert.equal(state.state, 'ok');
  assert.equal(state.plan, 'pro');
  assert.equal(state.rows[0].remainingPercent, 75);
  assert.equal(request.url, 'https://chatgpt.com/backend-api/wham/usage');
  assert.equal(request.init.headers['chatgpt-account-id'], 'account-test');
  assert.equal(request.init.headers.authorization, 'Bearer token');
  assert.match(request.init.headers['user-agent'], /codex-tui\/0\.153\.3/);
});

test('Antigravity quota refresh falls back after an empty successful response', async () => {
  const requests = [];
  const accounts = new Accounts(memoryCredentials(), Config({}), async (url, init) => {
    requests.push({ url, init });
    return requests.length === 1 ? json({ groups: [] })
      : json({ groups: [{ displayName: 'Gemini', buckets: [{ remainingFraction: 0.6 }] }] });
  });
  await accounts.save('antigravity', { accessToken: 'google-token', projectId: 'project-test', expiresAt: Date.now() + 3600000 });
  const state = await new Quotas(accounts).refresh('antigravity');
  assert.equal(state.state, 'ok');
  assert.equal(state.rows[0].remainingPercent, 60);
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /sandbox\.googleapis\.com/);
  assert.deepEqual(JSON.parse(requests[0].init.body), { project: 'project-test' });
  assert.equal(requests[0].init.headers.authorization, 'Bearer google-token');
});

test('Cancelling one quota waiter does not cancel a shared provider refresh', async () => {
  let release;
  let requests = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const accounts = new Accounts(memoryCredentials(), Config({}), async () => {
    requests += 1;
    await pending;
    return json({ rate_limit: { primary_window: { used_percent: 10, limit_window_seconds: 18000 } } });
  });
  await accounts.save('codex', { accessToken: 'token', accountId: 'account-test', expiresAt: Date.now() + 3600000 });
  const quotas = new Quotas(accounts);
  const firstController = new AbortController();
  const first = quotas.refresh('codex', firstController.signal);
  const second = quotas.refresh('codex');
  firstController.abort(new Error('first waiter cancelled'));
  await assert.rejects(first, /first waiter cancelled/);
  release();
  assert.equal((await second).state, 'ok');
  assert.equal(requests, 1);
  assert.equal(quotas.status('codex').rows[0].remainingPercent, 90);
});

test('Quota failures stay available to the account card without leaking credentials', async () => {
  const accounts = new Accounts(memoryCredentials(), Config({}), async () => new Response('{}', { status: 403 }));
  await accounts.save('codex', { accessToken: 'secret-token', accountId: 'account-test', expiresAt: Date.now() + 3600000 });
  const quotas = new Quotas(accounts);
  const state = await quotas.refresh('codex');
  assert.equal(state.state, 'failed');
  assert.match(state.message, /HTTP 403/);
  assert.doesNotMatch(JSON.stringify(state), /secret-token|account-test/);
  assert.deepEqual(quotas.status('codex'), state);
});
