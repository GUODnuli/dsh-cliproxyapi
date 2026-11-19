import { Accounts } from './src/accounts.js';
import { Config, PROVIDERS, providerOf } from './src/config.js';
import { OAuthLogins } from './src/oauth.js';
import { SubscriptionAdapter } from './src/adapter.js';
import { createNetwork, validateProxy } from './src/network.js';
import { Images, createImageTool } from './src/images.js';
import { Quotas } from './src/quota.js';

export { Config };
export const name = 'cpa-subscriptions';
export const inject = ['llm', 'credentials', 'commands', 'settings'];

const HELP = `CPA 订阅账号插件（直接连接上游）
/cpa login codex — 登录 ChatGPT / Codex
/cpa login antigravity — 登录 Google / Antigravity
/cpa status — 查看授权状态
/cpa models codex — 刷新 Codex 模型
/cpa models antigravity — 刷新 Antigravity 模型
/cpa diagnose antigravity — 打印 fetchAvailableModels 原始 Gemini 4 的 disabled / 剩余额度
/cpa quota codex — 刷新 Codex 模型额度（可改为 antigravity）
/cpa cancel codex — 取消尚未完成的授权
/cpa logout codex — 退出对应账号（可改为 antigravity）
登录完成后，在 Harness 模型选择器选择“Codex 订阅 · CPA”或“Antigravity 订阅 · CPA”。
首次使用每个渠道只有引导模型；刷新后以账号实际返回的列表为准。`;

export function apply(ctx, config) {
  const entryId = ctx.fiber.entry?.options.id ?? name;
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
  const settings = key => ({
    get: () => config[key].get(),
    update: patch => ctx.settings.update(entryId, { [key]: patch }),
  });
  const preferences = settings('preferences');
  const network = createNetwork(() => preferences.get().network);
  const accounts = new Accounts(ctx.credentials, config, network.fetch);
  const catalog = settings('catalog');
  let registration;
  const adapter = new SubscriptionAdapter(accounts, catalog, () => registration.replace(Object.values(PROVIDERS).map(p => p.route)), preferences, () => ctx.get('attachments'));
  registration = ctx.llm.registerAdapter(Object.values(PROVIDERS).map(p => p.route), adapter);
  const quotas = new Quotas(accounts);
  const refreshAll = async ({ signal, models = true, quota = true } = {}) => {
    const results = {};
    await Promise.all(Object.keys(PROVIDERS).map(async id => {
      try {
        signal?.throwIfAborted();
        const account = await accounts.read(id);
        if (!account?.accessToken) {
          results[id] = { skipped: true };
          return;
        }
        const tasks = [];
        if (quota) tasks.push(['quota', quotas.refresh(id, signal)]);
        if (models) tasks.push(['models', adapter.discover(id, signal)]);
        results[id] = Object.fromEntries(await Promise.all(tasks.map(async ([key, promise]) => {
          try {
            const value = await promise;
            return [key, key === 'models' ? { state: 'ok', count: value.length } : value];
          } catch (error) {
            return [key, { state: 'failed', message: error?.message || '刷新失败。' }];
          }
        })));
      } catch (error) {
        results[id] = { state: 'failed', message: error?.message || '刷新失败。' };
      }
    }));
    signal?.throwIfAborted();
    return results;
  };
  const logCatalog = id => {
    const report = adapter.diagnostics(id);
    if (!report) return;
    ctx.logger?.info('[cpa] %s fetchAvailableModels Gemini 4: %s', id, JSON.stringify(report.gemini4));
  };
  const logins = new OAuthLogins(accounts, async id => {
    adapter.invalidate(id); quotas.invalidate(id);
    try { await adapter.discover(id); logCatalog(id); }
    catch (error) { logins.status.set(id, '已登录；' + error.message); }
  });
  const updatePreferences = async patch => {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !['network', 'images'].includes(key))) throw new Error('无效的偏好设置。');
    if (patch.network) {
      if (!['auto', 'manual', 'direct'].includes(patch.network.mode)) throw new Error('代理模式无效。');
      const proxyURL = validateProxy(patch.network.proxyURL ?? '');
      if (patch.network.mode === 'manual' && !proxyURL) throw new Error('手动代理模式需要填写地址。');
      patch = { ...patch, network: { mode: patch.network.mode, proxyURL } };
    }
    if (patch.images && (Object.keys(patch.images).some(k => !['enabled', 'provider', 'model', 'quality'].includes(k))
      || typeof patch.images.enabled !== 'boolean' || !['codex', 'antigravity'].includes(patch.images.provider)
      || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(patch.images.model ?? '') || !['auto','low','medium','high'].includes(patch.images.quality))) throw new Error('图片设置无效。');
    await preferences.update(patch); network.reset(); adapter.changed();
  };
  const startupRefresh = new AbortController();
  ctx.provide('cpaSubscriptions', { accounts, adapter, quotas, logins, preferences, network, updatePreferences, refreshAll });
  if (config.refreshOnStartup) void refreshAll({ signal: startupRefresh.signal }).catch(() => {
    // Individual refresh failures are reflected in quota/catalog status; startup must remain non-blocking.
  });
  ctx.on('dispose', () => {
    startupRefresh.abort(new Error('CPA 插件已停止。'));
    logins.dispose(); adapter.dispose(); quotas.dispose(); accounts.dispose();
  });
  ctx.inject(['tools', 'attachments'], imageCtx => {
    const gallery = settings('gallery');
    const images = new Images(accounts, adapter, imageCtx.attachments, preferences, gallery);
    imageCtx.provide('cpaImages', images);
    let toolDisposer;
    const syncTool = () => {
      if (preferences.get().images.enabled && !toolDisposer) toolDisposer = imageCtx.tools.register(createImageTool(images,
        sessionId => imageCtx.get('sessions')?.get?.(sessionId)?.deriveMessages?.() ?? []));
      else if (!preferences.get().images.enabled && toolDisposer) { toolDisposer(); toolDisposer = undefined; }
    };
    syncTool();
    imageCtx.effect(() => ctx.on('loader/volatile-update', paths => {
      if (paths.some(([key]) => key === 'preferences')) syncTool();
    }));
    imageCtx.on('dispose', () => { toolDisposer?.(); });
  });
  ctx.commands.register({ name: 'cpa', description: '管理 Codex / Antigravity 订阅账号',
    input: { hint: 'login codex | status | models antigravity | diagnose antigravity | quota codex' }, recordInput: false,
    async handler({ rawInput, signal }) {
      const [action = 'help', id, ...rest] = rawInput.trim().split(/\s+/).filter(Boolean);
      try {
        if (action === 'help') return { kind: 'success', text: HELP };
        if (action === 'status') {
          const lines = [];
          for (const id of Object.keys(PROVIDERS)) {
            const account = await accounts.read(id);
            lines.push(`${PROVIDERS[id].label}：${account ? '已保存账号' : '未登录'}${account?.email ? '（' + account.email + '）' : ''}`
              + (logins.status.has(id) ? '；' + logins.status.get(id) : ''));
          }
          return { kind: 'success', text: lines.join('\n') };
        }
        providerOf(id);
        if (rest.length) throw new Error('命令参数过多。输入 /cpa help 查看用法。');
        if (action === 'login') {
          const login = await logins.start(id);
          return { kind: 'success', text: `请点击链接完成 ${id} 官方账号授权：\n${login.url}\n授权完成后返回 Harness；使用 /cpa status 查看结果。` };
        }
        if (action === 'cancel') { logins.cancel(id); return { kind: 'success', text: '已取消该渠道未完成的授权。' }; }
        if (action === 'logout') {
          logins.cancel(id); adapter.invalidate(id); quotas.invalidate(id); await accounts.logout(id); logins.status.delete(id);
          return { kind: 'success', text: '已从 Harness 凭据存储中移除该渠道账号。' };
        }
        if (action === 'quota') {
          const quota = await quotas.refresh(id, signal);
          if (quota.state === 'failed') return { kind: 'error', text: quota.message };
          return { kind: 'success', text: quota.rows.map(row => `${row.label}：${row.remainingPercent === null ? '未知' : `${Math.round(row.remainingPercent)}%`}`).join('\n') };
        }
        if (action === 'models') {
          const models = await adapter.discover(id, signal);
          logCatalog(id);
          return { kind: 'success', text: `已刷新 ${models.length} 个模型：\n${models.map(m => m.id).join('\n')}` };
        }
        if (action === 'diagnose') {
          let report = adapter.diagnostics(id);
          if (!report) { await adapter.discover(id, signal); report = adapter.diagnostics(id); }
          if (!report) return { kind: 'error', text: '上游没有返回可解析的 Gemini 4 条目；请先完成授权或刷新模型。' };
          const lines = report.gemini4.map(entry => `${entry.id} | disabled=${entry.disabled} | remaining=${entry.remainingFraction ?? 'n/a'}${entry.internal ? ' | internal' : ''}`);
          return { kind: 'success', text: `fetchAvailableModels 返回 ${report.total} 个 Gemini 4（${report.fetchedAt}）：\n${lines.join('\n') || '(none)'}` };
        }
        throw new Error('未知操作。输入 /cpa help 查看用法。');
      } catch (error) { return { kind: 'error', text: error.message }; }
    },
  });
}
