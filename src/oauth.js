import { createServer } from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { tokenPayload } from './accounts.js';
import { requestHeaders, requestJSON } from './http.js';

export function antigravityHeaders(config, token) {
  const headers = requestHeaders(token);
  // Keep Harness attribution while retaining the provider's version negotiation token.
  headers['user-agent'] = `antigravity/${config.antigravityVersion} ${headers['user-agent']}`;
  return headers;
}

function projectOf(value) {
  for (const key of ['cloudaicompanionProject', 'projectId', 'project']) {
    const candidate = value?.[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (typeof candidate?.id === 'string' && candidate.id.trim()) return candidate.id;
  }
}

export async function completeAntigravity(accounts, token, signal) {
  const p = accounts.provider('antigravity');
  const headers = antigravityHeaders(accounts.config, token.accessToken);
  const user = await requestJSON(accounts.fetcher, p.userInfoURL, { headers, signal });
  const loaded = await requestJSON(accounts.fetcher, `${p.apiURL}/v1internal:loadCodeAssist`, {
    method: 'POST', headers, signal, body: JSON.stringify({ metadata: { ideType: 'ANTIGRAVITY' } }) });
  let projectId = projectOf(loaded);
  const tier = loaded.allowedTiers?.find(tier => tier.isDefault)?.id || loaded.currentTier?.id || 'free-tier';
  for (let attempt = 0; !projectId && attempt < 5; attempt++) {
    const onboard = await requestJSON(accounts.fetcher, `${p.onboardURL}/v1internal:onboardUser`, {
      method: 'POST', headers, signal,
      body: JSON.stringify({ tier_id: tier, metadata: { ide_type: 'ANTIGRAVITY',
        ide_version: accounts.config.antigravityVersion, ide_name: 'antigravity' } }) });
    if (onboard.done) { projectId = projectOf(onboard.response); break; }
    await delay(2000, undefined, { signal });
  }
  if (!projectId) throw new Error('Google 授权成功，但没有获得 Antigravity 项目权限。请确认该账号已开通 Antigravity。');
  return { ...token, projectId, email: user.email };
}

export class OAuthLogins {
  constructor(accounts, onChanged = async () => {}) {
    this.accounts = accounts; this.onChanged = onChanged; this.pending = new Map(); this.status = new Map();
  }
  async start(id) {
    if (this.pending.has(id)) throw new Error('该渠道已有授权进行中；请完成授权或先 /cpa cancel ' + id);
    const p = this.accounts.provider(id), config = this.accounts.config;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(config.loginTimeoutMs)]);
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const callbackPath = id === 'codex' ? '/auth/callback' : '/oauth-callback';
    const port = id === 'codex' ? config.codexCallbackPort : config.antigravityCallbackPort;
    const redirect = `http://localhost:${port}${callbackPath}`;
    let busy = false, done;
    const completion = new Promise(resolve => { done = resolve; });
    const server = createServer(async (req, res) => {
      let url;
      try { url = new URL(req.url, redirect); }
      catch { res.writeHead(400); res.end('Invalid callback URL'); return; }
      const incoming = Buffer.from(url.searchParams.get('state') || '');
      const expected = Buffer.from(state);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (req.method !== 'GET' || url.pathname !== callbackPath || incoming.length !== expected.length
        || !timingSafeEqual(incoming, expected)) { res.writeHead(400); res.end('无效授权回调。'); return; }
      if (busy) { res.writeHead(409); res.end('授权正在处理。'); return; }
      busy = true;
      try {
        signal.throwIfAborted();
        if (url.searchParams.has('error') || !url.searchParams.get('code')) throw new Error('授权已被拒绝，请回到 Harness 重新登录。');
        const body = new URLSearchParams({ client_id: p.clientId, grant_type: 'authorization_code',
          code: url.searchParams.get('code'), redirect_uri: redirect,
          ...(id === 'codex' ? { code_verifier: verifier } : { client_secret: p.clientSecret }) });
        const raw = await requestJSON(this.accounts.fetcher, p.tokenURL, { method: 'POST', body,
          headers: requestHeaders(null, { 'content-type': 'application/x-www-form-urlencoded' }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(config.tokenTimeoutMs)]) });
        let token = tokenPayload(raw);
        if (id === 'codex' && !token.accountId) throw new Error('授权响应缺少 ChatGPT 账号标识。');
        if (id === 'antigravity') token = await completeAntigravity(this.accounts, token, signal);
        await this.accounts.save(id, token, signal);
        if (this.pending.get(id) === entry) this.status.set(id, '已登录');
        await this.onChanged(id);
        res.end('授权完成，请关闭此页并返回 DeepSeek Harness。');
        done({ status: 'authorized' });
      } catch (error) {
        if (this.pending.get(id) === entry) this.status.set(id, signal.aborted ? '授权已取消或超时' : '授权失败：' + error.message);
        res.writeHead(400); res.end('授权未完成，请返回 Harness 使用 /cpa status 查看结果。');
        done({ status: 'failed' });
      } finally { this.finish(id, entry); }
    });
    const entry = { controller, server, completion, done, signal, onAbort: undefined };
    this.pending.set(id, entry);
    entry.onAbort = () => { this.status.set(id, '授权已取消或超时'); done({ status: 'cancelled' }); this.finish(id, entry); };
    signal.addEventListener('abort', entry.onAbort, { once: true });
    try {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    } catch {
      this.finish(id, entry); done({ status: 'failed' });
      throw new Error(`授权回调端口 ${port} 不可用，可能有另一个登录流程正在使用。`);
    }
    const url = new URL(p.authURL);
    const parameters = { client_id: p.clientId, redirect_uri: redirect, response_type: 'code', scope: p.scope, state,
      ...(id === 'codex' ? { code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256', prompt: 'login', id_token_add_organizations: 'true', codex_cli_simplified_flow: 'true' }
        : { access_type: 'offline', prompt: 'consent' }) };
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    entry.url = url.toString();
    this.status.set(id, '等待浏览器授权');
    return { url: url.toString(), completion };
  }
  finish(id, expected) {
    const entry = this.pending.get(id);
    if (!entry || (expected && expected !== entry)) return;
    entry.signal.removeEventListener('abort', entry.onAbort);
    entry.server.close(); entry.server.closeIdleConnections(); this.pending.delete(id);
  }
  cancel(id) { this.pending.get(id)?.controller.abort(); }
  dispose() { for (const id of [...this.pending.keys()]) this.cancel(id); }
}
