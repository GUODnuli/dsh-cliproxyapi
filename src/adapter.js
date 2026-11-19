import { randomUUID } from 'node:crypto';
import { LlmAdapter, LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm';
import { PROVIDERS, providerOf } from './config.js';
import { checkedFetch, requestHeaders } from './http.js';
import { antigravityHeaders } from './oauth.js';
import { codexRequest, antigravityRequest, imageRequestTarget, projectImages } from './messages.js';
import { codexStream, antigravityStream } from './streams.js';
import { gemini4Report, isGemini4, modelSettings, validateModelPatch, PreferencesSchema, normalizeModels } from './catalog.js';
export { INITIAL_MODELS, normalizeModels } from './catalog.js';

const fallbackPreferences = PreferencesSchema({});
const identity = account => JSON.stringify([account?.accountId, account?.email, account?.projectId]);

function defaultEffort(id, model) {
  return [model.reasoningEffort, id === 'antigravity' && isGemini4(model.id) ? model.defaultReasoning : undefined]
    .find(effort => model.efforts?.includes(effort));
}

function waitAbortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export class SubscriptionAdapter extends LlmAdapter {
  constructor(accounts, catalog, changed = () => {}, preferences, attachments) {
    super(); this.accounts = accounts; this.catalog = catalog; this.changed = changed;
    this.preferences = preferences ?? { get: () => fallbackPreferences };
    this.attachments = attachments; this.refreshes = new Map(); this.catalogStatus = new Map(); this.etags = new Map();
    this.catalogDiagnostics = new Map();
  }
  /** Last sanitized Gemini 4 catalog report for one provider, or undefined before a refresh. */
  diagnostics(id) { return this.catalogDiagnostics.get(id); }
  idOf(route) {
    const id = Object.keys(PROVIDERS).find(id => PROVIDERS[id].route === route);
    if (!id) throw new LlmError('未知的 CPA 渠道。', 'NO_ADAPTER');
    return id;
  }
  providerInfo(route) { return { id: route, name: PROVIDERS[this.idOf(route)].label }; }
  imageRequestTarget(_provider, _model, ref) { return imageRequestTarget(ref, this.accounts.config); }
  providerRetryPolicy() { return resolveRetryPolicy({ mode: 'normal', maxRetries: 2,
    // A 429 states when the caller may retry; retrying it on a fixed backoff
    // turns one user action into a burst of identical upstream requests.
    retryableCodes: ['NETWORK', 'SERVER'] }, 'cpa-subscriptions'); }
  modelEntries(id) { return this.catalog.get()[id].map(model => modelSettings(model, this.preferences.get(), id)); }
  selected(id, model, { imageGeneration = false } = {}) {
    const entry = this.modelEntries(id).find(m => m.id === model);
    if (!entry) throw new LlmError('该模型不在目录中，请先刷新模型目录。', 'UNKNOWN_MODEL');
    if (!entry.enabled) throw new LlmError(`模型 ${model} 已关闭，请先在订阅账号设置中开放。`, 'MODEL_DISABLED');
    if (!imageGeneration && entry.output?.includes('image') && !entry.output?.includes('text'))
      throw new LlmError('这是图片生成模型，请通过图片生成工具使用。', 'UNSUPPORTED_OPTION');
    return entry;
  }
  async updateModel(id, modelId, patch) {
    providerOf(id);
    const model = this.catalog.get()[id].find(model => model.id === modelId);
    if (!model) throw new Error('模型不存在，请刷新目录后重试。');
    validateModelPatch(model, patch);
    await this.preferences.update({ models: { [id]: { [modelId]: patch } } });
    this.changed();
  }
  async listModels(route) {
    return this.modelEntries(this.idOf(route)).filter(model => model.enabled && (!model.output?.includes('image') || model.output?.includes('text')))
      .map(model => ({ provider: route, id: model.id, name: model.name, inputModalities: model.vision ? ['text', 'image'] : ['text'] }));
  }
  metadata(route, model) {
    const id = this.idOf(route), item = this.selected(id, model);
    const selectedEffort = defaultEffort(id, item);
    return { provider: route, id: model, name: item.name, inputModalities: item.vision ? ['text', 'image'] : ['text'],
      context: { contextWindow: item.effectiveContext },
      ...(item.efforts?.length ? { reasoning: { efforts: item.efforts.map(id => ({ id, name: id })),
        ...(selectedEffort ? { defaultEffort: selectedEffort } : {}) } } : {}) };
  }
  async resolveModel(route, model) { return this.metadata(route, model); }
  async prepareCall(route, model) {
    const snapshot = this.selected(this.idOf(route), model);
    return { model: this.metadata(route, model), stream: options => this.streamWithModel(options, snapshot) };
  }
  status(id) { return this.catalogStatus.get(id) ?? { state: 'cached', message: '尚未在本次运行中刷新目录' }; }
  invalidate(id) {
    this.refreshes.get(id)?.controller.abort(new Error('账号已变更。'));
    this.refreshes.delete(id); this.etags.delete(id); this.catalogStatus.delete(id); this.catalogDiagnostics.delete(id);
  }
  dispose() { for (const id of [...this.refreshes.keys()]) this.invalidate(id); }
  async discover(id, signal) {
    providerOf(id);
    signal?.throwIfAborted();
    if (this.refreshes.has(id)) return waitAbortable(this.refreshes.get(id).promise, signal);
    const controller = new AbortController();
    const requestSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(this.accounts.config.catalogTimeoutMs ?? 15000)]);
    const flight = { controller };
    this.catalogStatus.set(id, { state: 'refreshing', message: '正在获取上游模型目录' });
    flight.promise = this.fetchCatalog(id, requestSignal).then(({ models, report }) => {
      const message = report === undefined ? '目录已更新'
        : `目录已更新：上游返回 ${report.length} 个 Gemini 4，其中 ${report.filter(entry => entry.excluded).length} 个不可用；目录收录 ${models.filter(model => /^gemini-4/i.test(model.id)).length} 个。`;
      if (this.refreshes.get(id) === flight) this.catalogStatus.set(id, { state: 'ok', message, fetchedAt: new Date().toISOString() });
      return models;
    }).catch(error => {
      if (this.refreshes.get(id) === flight) this.catalogStatus.set(id, { state: 'failed',
        message: requestSignal.aborted ? '模型刷新已取消或超时；保留上次目录。' : error.message });
      throw requestSignal.aborted ? new LlmError('模型刷新已取消或超时；保留上次目录。', 'NETWORK') : error;
    }).finally(() => { if (this.refreshes.get(id) === flight) this.refreshes.delete(id); });
    this.refreshes.set(id, flight);
    return waitAbortable(flight.promise, signal);
  }
  async fetchCatalog(id, signal) {
    let account = await this.accounts.current(id, signal);
    const owner = identity(account), provider = this.accounts.provider(id);
    const cached = this.etags.get(id);
    const url = id === 'codex' ? `${provider.apiURL}/models?client_version=${encodeURIComponent(this.accounts.config.codexClientVersion)}`
      : `${provider.generationURL || provider.apiURL}/v1internal:fetchAvailableModels`;
    const request = () => checkedFetch(this.accounts.fetcher, url, id === 'codex'
      ? { method: 'GET', headers: this.codexHeaders(account, { catalog: true,
          etag: cached?.owner === owner ? cached.value : undefined }), signal }
      : { method: 'POST', headers: antigravityHeaders(this.accounts.config, account.accessToken),
          body: JSON.stringify(account.projectId ? { project: account.projectId } : {}), signal }, { allowNotModified: true });
    let response;
    try { response = await request(); }
    catch (error) {
      if (error.failure?.status !== 401) throw error;
      account = await this.accounts.current(id, signal, { rejectedToken: account.accessToken });
      if (identity(account) !== owner) throw new LlmError('账号已切换，请重新刷新目录。', 'AUTH');
      response = await request();
    }
    signal.throwIfAborted();
    if (identity(await this.accounts.read(id)) !== owner) throw new LlmError('账号已切换，忽略旧账号的模型目录。', 'AUTH');
    if (response.status === 304) return { models: this.catalog.get()[id] };
    let raw; try { raw = await response.json(); } catch { throw new LlmError('上游模型目录不是有效 JSON；保留上次目录。', 'INVALID_RESPONSE'); }
    const models = normalizeModels(raw, id);
    signal.throwIfAborted();
    if (identity(await this.accounts.read(id)) !== owner) throw new LlmError('账号已切换，忽略旧账号的模型目录。', 'AUTH');
    await this.catalog.update({ [id]: models });
    const etag = response.headers.get('etag');
    if (etag) this.etags.set(id, { owner, value: etag }); else this.etags.delete(id);
    const report = id === 'antigravity' ? gemini4Report(raw, id) : undefined;
    if (report !== undefined) this.catalogDiagnostics.set(id, { fetchedAt: new Date().toISOString(), total: report.length, gemini4: report });
    this.changed();
    return { models, report };
  }
  codexHeaders(account, { catalog = false, etag } = {}) {
    if (typeof account.accountId !== 'string' || !account.accountId) throw new LlmError('Codex 账号缺少账号标识，请重新登录。', 'AUTH');
    const headers = requestHeaders(account.accessToken, { 'chatgpt-account-id': account.accountId, originator: 'pi' });
    if (catalog) { delete headers['content-type']; if (etag) headers['if-none-match'] = etag; }
    else headers['openai-beta'] = 'responses=experimental';
    return headers;
  }
  async *stream(options) { yield* this.streamWithModel(options, this.selected(this.idOf(options.provider), options.model)); }
  async *streamWithModel(options, model) {
    const id = this.idOf(options.provider);
    this.selected(id, options.model);
    const effort = options.reasoningEffort ?? defaultEffort(id, model);
    if (effort && !model.efforts?.includes(effort)) throw new LlmError('该模型不支持所选思考强度。', 'UNSUPPORTED_OPTION');
    const projected = await projectImages({ ...options, reasoningEffort: effort }, this.attachments?.(), model.vision, this.accounts.config);
    const account = await this.accounts.current(id, options.signal), provider = this.accounts.provider(id);
    if (id === 'codex') {
      const body = codexRequest(projected, { verbosity: model.supportsVerbosity ? model.verbosity : null });
      const headers = { ...this.codexHeaders(account), accept: 'text/event-stream',
        ...(body.prompt_cache_key ? { 'session-id': body.prompt_cache_key } : {}) };
      const response = await checkedFetch(this.accounts.fetcher, `${provider.apiURL}/responses`, {
        method: 'POST', headers, body: JSON.stringify(body), signal: options.signal });
      yield* codexStream(response, options.signal);
    } else {
      if (!account.projectId) throw new LlmError('Antigravity 账号缺少项目标识，请重新登录。', 'AUTH');
      const body = antigravityRequest(projected, account.projectId, this.accounts.config); body.requestId = `agent-${randomUUID()}`;
      const response = await checkedFetch(this.accounts.fetcher, `${provider.generationURL || provider.apiURL}/v1internal:streamGenerateContent?alt=sse`, {
        method: 'POST', headers: { ...antigravityHeaders(this.accounts.config, account.accessToken), accept: 'text/event-stream' },
        body: JSON.stringify(body), signal: options.signal });
      yield* antigravityStream(response, options.signal);
    }
  }
}
