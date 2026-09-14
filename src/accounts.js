import { credentialKey } from '@deepseek-ai/dsh-credentials';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { providerOf } from './config.js';
import { requestHeaders, requestJSON } from './http.js';

export const accountKey = id => credentialKey('cpa-subscriptions', id);

export function tokenPayload(raw, previous = {}, now = Date.now()) {
  if (typeof raw.access_token !== 'string' || !raw.access_token.trim())
    throw new LlmError('授权没有返回有效访问令牌。', 'AUTH');
  const claims = jwtClaims(raw.id_token || raw.access_token);
  const auth = claims['https://api.openai.com/auth'] || {};
  const result = { ...previous, accessToken: raw.access_token,
    refreshToken: raw.refresh_token || previous.refreshToken,
    expiresAt: now + (Number(raw.expires_in) > 0 ? Number(raw.expires_in) * 1000 : 3600000),
    accountId: auth.chatgpt_account_id || previous.accountId,
    email: claims.email || previous.email,
  };
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}

// Claims are metadata only; authentication is established by the provider token endpoint.
function jwtClaims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); }
  catch { return {}; }
}

export class Accounts {
  constructor(credentials, config, fetcher = fetch, providers) {
    this.credentials = credentials; this.config = config; this.fetcher = fetcher;
    this.providers = providers; this.refreshing = new Map(); this.controller = new AbortController();
  }
  dispose() { this.controller.abort(new Error('CPA 账号服务已停止。')); }
  provider(id) { return this.providers?.[id] || providerOf(id); }
  async read(id) {
    const record = await this.credentials.readRecord(accountKey(id));
    return record?.kind === 'grant' ? record.payload : undefined;
  }
  async save(id, payload, signal) {
    signal?.throwIfAborted();
    await this.credentials.modifyRecord(accountKey(id), () => {
      signal?.throwIfAborted(); return { kind: 'grant', payload };
    });
  }
  async logout(id) { await this.credentials.deleteRecord(accountKey(id)); }
  async current(id, signal, { rejectedToken } = {}) {
    signal?.throwIfAborted();
    const value = await this.read(id);
    if (!value?.accessToken) throw new LlmError(`请先在 Harness 输入 /cpa login ${id}。`, 'MISSING_CREDENTIAL');
    if (value.expiresAt > Date.now() + this.config.refreshSkewMs && value.accessToken !== rejectedToken) return value;
    if (!this.refreshing.has(id)) {
      const refresh = this.credentials.modifyRecord(accountKey(id), async record => {
        const existing = record?.kind === 'grant' ? record.payload : undefined;
        if (!existing?.accessToken) throw new LlmError('账号已退出，请重新登录。', 'MISSING_CREDENTIAL');
        if (existing.expiresAt > Date.now() + this.config.refreshSkewMs && existing.accessToken !== rejectedToken) return record;
        if (!existing.refreshToken) throw new LlmError('账号缺少刷新令牌，请重新登录。', 'AUTH');
        const provider = this.provider(id);
        const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: provider.clientId,
          refresh_token: existing.refreshToken, ...(provider.clientSecret ? { client_secret: provider.clientSecret } : {}) });
        const raw = await requestJSON(this.fetcher, provider.tokenURL, { method: 'POST',
          headers: requestHeaders(null, { 'content-type': 'application/x-www-form-urlencoded' }), body,
          signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(this.config.tokenTimeoutMs)]) });
        return { kind: 'grant', payload: tokenPayload(raw, existing) };
      }).then(record => record.payload).finally(() => this.refreshing.delete(id));
      this.refreshing.set(id, refresh);
    }
    const result = await waitAbortable(this.refreshing.get(id), signal);
    signal?.throwIfAborted();
    return result;
  }
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
