import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadClient(localStorage) {
  let registration;
  const filename = new URL('../client.js', import.meta.url);
  const original = await readFile(filename, 'utf8');
  const source = original.replace(
    "  return {\n    inject: ['slots', 'modelDirectories'],",
    "  return {\n    __test: { installEffortMemory },\n    inject: ['slots', 'modelDirectories'],",
  );
  assert.notEqual(source, original, 'client test hook insertion point must remain stable');
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load(value) { registration = value; } }, localStorage },
    console,
    AbortController,
    Math,
    Date,
    JSON,
    Object,
  }, { filename: 'client.js' });
  return registration.factory((id) => {
    if (id === 'react') return { createElement() {} };
    if (id === 'react-dom') return { createPortal() {} };
    throw new Error(`unexpected client dependency: ${id}`);
  }).__test;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

const group = {
  id: 'cpa-antigravity',
  models: [
    { id: 'reasoning-a', reasoning: { efforts: [{ id: 'low' }, { id: 'high' }], defaultEffort: 'low' } },
    { id: 'plain-b' },
  ],
};

test('composer quota joins the stats row as one non-splitting flex item', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  assert.match(source, /\[data-composer-stats\]\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(source, /\.cpa-composer-quota\s*\{[^}]*flex:\s*0 0 auto[^}]*min-width:\s*max-content[^}]*white-space:\s*nowrap/s);
  assert.match(source, /createPortal\(content, statsTarget\)/);
  assert.match(source, /return h\(React\.Fragment, null, marker, statsTarget \? createPortal\(content, statsTarget\) : content\)/);
});

test('settings UI exposes batch quota refresh and responsive account overview', async () => {
  const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
  assert.match(source, /run\(\{ action: 'quota-all' \}\)/);
  assert.match(source, /'刷新所有额度'/);
  assert.match(source, /className: 'cpa-overview'/);
  assert.match(source, /可手动刷新模型和额度/);
  assert.match(source, /className: 'cpa-quota-grid'/);
  assert.match(source, /max-width:\s*640px/);
  assert.match(source, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(source, /\.cpa-quota-row:first-child:nth-last-child\(odd\)\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(source, /@container \(width <= 520px\)[\s\S]*\.cpa-quota-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(source, /\.cpa-account-actions\s*\{/);
  assert.match(source, /'aria-selected': tab === 'models'/);
  assert.match(source, /'DSH 0\.2\.2'/);
  assert.match(source, /重新读取插件当前缓存状态，不请求上游接口/);
  assert.match(source, /label: \(\) => '订阅账号'/);
  assert.doesNotMatch(source, /label: \(\) => '订阅账号 \(CPA\)'/);
});

test('client remembers an explicit reasoning effort per model and restores it after switching back', async () => {
  const localStorage = memoryStorage();
  const { installEffortMemory } = await loadClient(localStorage);
  let state = { current: { provider: 'cpa-antigravity', model: 'reasoning-a', reasoningEffort: 'low' }, groups: [group] };
  const calls = [];
  const prototype = { async select(selection) { calls.push({ ...selection }); state = { ...state, current: selection }; } };
  const controller = Object.create(prototype);
  controller.store = { getSnapshot: () => state };
  const dispose = installEffortMemory(controller);

  await controller.select({ provider: 'cpa-antigravity', model: 'reasoning-a', reasoningEffort: 'high' });
  await controller.select({ provider: 'cpa-antigravity', model: 'plain-b' });
  await controller.select({ provider: 'cpa-antigravity', model: 'reasoning-a', reasoningEffort: 'low' });

  assert.equal(calls[0].reasoningEffort, 'high');
  assert.equal(calls[1].reasoningEffort, undefined);
  assert.equal(calls[2].reasoningEffort, 'high');
  dispose();
  assert.equal(Object.hasOwn(controller, 'select'), false);
});

test('client remembers provider-default effort and ignores models without effort tiers', async () => {
  const localStorage = memoryStorage();
  const { installEffortMemory } = await loadClient(localStorage);
  let state = { current: { provider: 'cpa-antigravity', model: 'reasoning-a', reasoningEffort: 'high' }, groups: [group] };
  const calls = [];
  const controller = {
    store: { getSnapshot: () => state },
    async select(selection) { calls.push({ ...selection }); state = { ...state, current: selection }; },
  };
  const original = controller.select;
  const dispose = installEffortMemory(controller);

  await controller.select({ provider: 'cpa-antigravity', model: 'reasoning-a' });
  await controller.select({ provider: 'cpa-antigravity', model: 'plain-b', reasoningEffort: 'forged' });
  await controller.select({ provider: 'cpa-antigravity', model: 'reasoning-a', reasoningEffort: 'low' });

  assert.equal(calls[0].reasoningEffort, undefined);
  assert.equal(calls[1].reasoningEffort, 'forged');
  assert.equal(calls[2].reasoningEffort, undefined);
  dispose();
  assert.equal(controller.select, original);
});
