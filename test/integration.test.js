import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
import SettingsForms from '@deepseek-ai/dsh-settings';
import LlmRuntime, { createUserMessage } from '@deepseek-ai/dsh-llm';
import CommandRuntime from '@deepseek-ai/dsh-commands';
import * as web from '../src/web.js';
import { memoryCredentials, collect, sse } from './helpers.js';

async function testHost(t, credentials = memoryCredentials()) {
  const ctx = new Context();
  const home = await mkdtemp(join(tmpdir(), 'cpa-settings-'));
  t.after(async () => { await ctx.fiber.dispose(); await rm(home, { recursive: true, force: true }); });
  await ctx.plugin(Loader);
  await ctx.plugin(LlmRuntime);
  await ctx.plugin(CommandRuntime);
  ctx.provide('credentials', credentials);
  ctx.provide('profileContext', { home });
  ctx.provide('configEditor', {
    entries: () => [...ctx.loader.entries()],
    configuration() {
      return this.entries().map(entry => ({ entry, inherited: {}, override: entry.options.config ?? {} }));
    },
    async edit(entry, change) {
      const config = change(entry.options.config ?? {}, {});
      await ctx.loader.update(entry.options.id, { config });
    },
  });
  await ctx.plugin(SettingsForms);
  const id = await ctx.loader.create({ id: 'cpa-fixture', name: new URL('../index.js', import.meta.url).href });
  await ctx.loader.await();
  return { ctx, runtime: ctx.loader.resolve(id).fiber };
}

test('DSH 0.2.2 loads the plugin, updates volatile settings, streams, and unloads cleanly', async t => {
  const { ctx, runtime } = await testHost(t);
  assert.equal(runtime.state, 2);
  assert.deepEqual(ctx.llm.listProviders().map(p => p.id).sort(), ['cpa-antigravity', 'cpa-codex']);
  const command = ctx.commands.find({}, 'cpa');
  assert.equal(command.recordInput, false);
  const result = await command.handler({ rawInput: ' status', signal: new AbortController().signal });
  assert.match(result.text, /未登录/);
  const service = ctx.cpaSubscriptions;
  assert.equal(ctx.settings.describe().find(row => row.ns === 'cpa-fixture').autoGenerate, false);
  await service.updatePreferences({ network: { mode: 'direct' } });
  assert.equal(ctx.cpaSubscriptions, service, 'settings updates do not remount CPA');
  assert.equal(service.preferences.get().network.mode, 'direct');
  await service.adapter.updateModel('codex', 'gpt-5.4', { reasoningEffort: 'high' });
  assert.equal(service.adapter.modelEntries('codex')[0].reasoningEffort, 'high');
  await service.accounts.save('codex', { accessToken: 'test', accountId: 'a', expiresAt: Date.now() + 3600000 });
  service.accounts.fetcher = async () => new Response(JSON.stringify({
    rate_limit: { primary_window: { used_percent: 25, limit_window_seconds: 18000 } },
  }), { headers: { 'content-type': 'application/json' } });
  const quota = await command.handler({ rawInput: 'quota codex', signal: new AbortController().signal });
  assert.equal(quota.kind, 'success'); assert.match(quota.text, /75%/);
  service.accounts.fetcher = async () => sse([{ type: 'response.completed', response: { status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: 'native runtime works' }] }] } }]);
  const chunks = await collect(ctx.llm.stream({ provider: 'cpa-codex', model: 'gpt-5.4',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } })] }));
  assert.equal(chunks.at(-1).reason.kind, 'stop');
  assert.equal(chunks.find(c => c.type === 'block-end').block.text, 'native runtime works');
  await service.accounts.save('antigravity', { accessToken: 'fixture', projectId: 'test-project', expiresAt: Date.now() + 3600000 });
  service.accounts.fetcher = async (url, init) => {
    assert.equal(new URL(url).hostname, 'daily-cloudcode-pa.googleapis.com');
    const { model, request } = JSON.parse(init.body);
    assert.equal(model, 'gemini-3.8-flash');
    assert.equal(request.contents[0].parts[0].text, 'hello');
    return sse([{ response: { candidates: [{ content: { parts: [{ text: 'fixture Gemini response' }] }, finishReason: 'STOP' }] } }]);
  };
  const gemini = await collect(ctx.llm.stream({ provider: 'cpa-antigravity', model: 'gemini-3.8-flash',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } })] }));
  assert.equal(gemini.at(-1).reason.kind, 'stop');
  assert.equal(gemini.find(c => c.type === 'block-end').block.text, 'fixture Gemini response');
  await runtime.dispose();
  assert.equal(ctx.llm.listProviders().length, 0);
  assert.equal(ctx.commands.find({}, 'cpa'), undefined);
  assert.equal(ctx.get('cpaSubscriptions'), undefined);
});

test('startup probes stored accounts and batch refresh isolates provider failures', async t => {
  const credentials = memoryCredentials();
  let startupReads = 0;
  const readRecord = credentials.readRecord.bind(credentials);
  credentials.readRecord = async key => { startupReads += 1; return readRecord(key); };
  const { ctx, runtime } = await testHost(t, credentials);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(startupReads, 2, 'startup should inspect both supported account slots');

  const service = ctx.cpaSubscriptions;
  service.accounts.read = async id => ({ accessToken: `${id}-token` });
  service.quotas.refresh = async id => id === 'antigravity'
    ? Promise.reject(new Error('quota offline'))
    : ({ state: 'ok', rows: [] });
  service.adapter.discover = async id => [{ id: `${id}-model` }];
  const result = await service.refreshAll();
  assert.equal(result.codex.quota.state, 'ok');
  assert.equal(result.codex.models.count, 1);
  assert.equal(result.antigravity.quota.state, 'failed');
  assert.equal(result.antigravity.models.state, 'ok');
  await runtime.dispose();
});

test('Web bridge registers on Harness authenticated carrier and returns only account metadata', async () => {
  let route;
  let quotaRefreshes = 0;
  let refreshAllOptions;
  const service = {
    accounts: { read: async () => ({ accessToken: 'never-return-me', refreshToken: 'refresh-secret', email: 'fixture@example.test' }) },
    adapter: { modelEntries: () => [], status: () => ({ state: 'cached' }) },
    quotas: {
      status: () => ({ state: 'ok', rows: [{ label: '5 小时额度', remainingPercent: 75, scope: 'account', windowKind: 'five-hour', windowSeconds: 18000 }] }),
      refresh: async () => { quotaRefreshes += 1; },
    },
    preferences: { get: () => ({}) }, network: { status: () => ({}) },
    logins: { status: new Map(), pending: new Map() },
    refreshAll: async options => { refreshAllOptions = options; },
  };
  web.apply({ connection: { fetch: { register(value) { if (value.path === '/api/cpa-subscriptions') route = value; } } }, cpaSubscriptions: service, get: () => undefined });
  assert.equal(route.path, '/api/cpa-subscriptions');
  const result = await (await route.fetch(new Request('http://localhost/api/cpa-subscriptions'))).text();
  assert.doesNotMatch(result, /never-return-me|refresh-secret/); assert.match(result, /fixture@example.test/);
  assert.deepEqual(JSON.parse(result).accounts[0].quota.composerRows,
    [{ label: '5 小时额度', remainingPercent: 75, scope: 'account', windowKind: 'five-hour', windowSeconds: 18000, key: 'five-hour', shortLabel: '5h' }]);
  const rejected = await route.fetch(new Request('http://localhost/api/cpa-subscriptions', { method: 'POST', body: 'not-json' }));
  assert.equal(rejected.status, 415);
  const quota = await route.fetch(new Request('http://localhost/api/cpa-subscriptions', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'quota', provider: 'codex' }) }));
  assert.equal(quota.status, 200);
  assert.equal(quotaRefreshes, 1);
  assert.match(await quota.text(), /5 小时额度/);
  const all = await route.fetch(new Request('http://localhost/api/cpa-subscriptions', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'quota-all' }) }));
  assert.equal(all.status, 200);
  assert.equal(refreshAllOptions.models, false);
  assert.ok(refreshAllOptions.signal instanceof AbortSignal);
});
