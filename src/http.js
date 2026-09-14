import { LlmError, attributionHeaders } from '@deepseek-ai/dsh-llm';

export function requestHeaders(token, extra = {}) {
  return { 'content-type': 'application/json', accept: 'application/json',
    ...attributionHeaders(), ...extra, ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

export async function checkedFetch(fetcher, url, init, options = {}) {
  let response;
  try { response = await fetcher(url, { ...init, redirect: 'error' }); }
  catch (error) {
    if (init?.signal?.aborted) throw init.signal.reason;
    // Do not surface request objects, tokens, query strings, or upstream bodies.
    const code = String(error?.code ?? error?.cause?.code ?? '');
    const hint = /TIMEOUT|ETIMEDOUT/.test(code) ? '连接超时' : /ENOTFOUND|EAI_AGAIN/.test(code) ? 'DNS 解析失败'
      : /CERT|TLS|SSL/.test(code) ? 'TLS 证书或握手失败' : /ECONN|EPIPE|SOCKET/.test(code) ? '连接被拒绝或中断' : '网络请求失败';
    throw new LlmError(`${hint}；请检查“订阅账号 → 网络”中的代理设置。`, 'NETWORK');
  }
  if (response.status === 304 && options.allowNotModified) return response;
  if (!response.ok) {
    let providerError = {};
    const reader = response.body?.getReader();
    if (reader) {
      const chunks = []; let total = 0;
      try {
        while (total < 65536) { const { done, value } = await reader.read(); if (done) break; total += value.length; chunks.push(value); }
        if (total <= 65536) providerError = JSON.parse(Buffer.concat(chunks).toString()).error ?? {};
      } catch {} finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
    const reasons = (Array.isArray(providerError.details) ? providerError.details : []).map(d => d.reason);
    const exhausted = reasons.includes('QUOTA_EXHAUSTED') || ['usage_limit_reached','insufficient_quota'].includes(providerError.type ?? providerError.code);
    const code = response.status === 401 ? 'AUTH' : response.status === 403 ? 'PERMISSION'
      : response.status === 429 && exhausted ? 'QUOTA'
      : response.status === 429 ? 'RATE_LIMIT' : response.status >= 500 ? 'SERVER' : 'INVALID_REQUEST';
    const header = response.headers.get('retry-after');
    const rawDelay = (providerError.details ?? []).find?.(d => typeof d.retryDelay === 'string')?.retryDelay;
    const retry = header && Number.isFinite(Number(header)) ? Number(header) * 1000 : header ? Date.parse(header) - Date.now()
      : /^\d+(?:\.\d+)?s$/.test(rawDelay ?? '') ? parseFloat(rawDelay) * 1000 : undefined;
    const hint = code === 'AUTH' ? '请在 Harness 内重新登录。' : code === 'QUOTA' ? '上游明确报告配额耗尽。'
      : code === 'RATE_LIMIT' ? '上游返回限流或资源暂不可用；该状态本身不能证明账号额度已用尽。' : '';
    throw new LlmError(`上游返回 HTTP ${response.status}。${hint}${retry > 0 ? ` 建议等待 ${Math.ceil(retry / 1000)} 秒。` : ''}`, code,
      { status: response.status, ...(retry > 0 && Number.isFinite(retry) ? { providerRetryAfterMs: retry } : {}) });
  }
  return response;
}

export async function requestJSON(fetcher, url, init) {
  const response = await checkedFetch(fetcher, url, init);
  try { return await response.json(); }
  catch { throw new LlmError('上游返回了无法解析的 JSON。', 'INVALID_RESPONSE'); }
}

// Decode arbitrarily split UTF-8 and SSE lines; a truncated protocol is handled by the adapter.
export async function* readSSE(response, signal) {
  if (!response.body) throw new LlmError('上游没有返回响应流。', 'INVALID_RESPONSE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', data = [];
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      let result;
      try { result = await reader.read(); }
      catch {
        // A response-body disconnect (e.g. Node's "aborted"/ECONNRESET) is
        // retryable, but an explicit caller cancellation must keep its reason.
        signal?.throwIfAborted();
        throw new LlmError('上游响应流连接中断；请检查“订阅账号 → 网络”中的代理设置。', 'NETWORK');
      }
      const { done, value } = result;
      signal?.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (line === '') {
          if (data.length) { yield parseEvent(data.join('\n')); data = []; }
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (buffer.length > 8 * 1024 * 1024) throw new LlmError('上游事件过大。', 'INVALID_RESPONSE');
      if (done) break;
    }
    if (buffer.startsWith('data:')) data.push(buffer.slice(5).replace(/^ /, '').trimEnd());
    if (data.length) yield parseEvent(data.join('\n'));
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function parseEvent(data) {
  if (data === '[DONE]') return { type: 'sse.done' };
  try { return JSON.parse(data); }
  catch { throw new LlmError('上游 SSE 事件不是有效 JSON。', 'INVALID_RESPONSE'); }
}
