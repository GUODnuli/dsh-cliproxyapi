import { LlmError, attributionHeaders } from '@deepseek-ai/dsh-llm';

export function requestHeaders(token, extra = {}) {
  return { 'content-type': 'application/json', accept: 'application/json',
    ...attributionHeaders(), ...extra, ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

const DETAIL_TEXT_LIMIT = 120;
const detailText = value => typeof value === 'string' && value.length <= DETAIL_TEXT_LIMIT && !/[\r\n]/.test(value) ? value : undefined;
const providerText = value => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const cleaned = value.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:ya29\.|sk-|eyJ)[A-Za-z0-9._-]{8,}/g, '[redacted]');
  return cleaned ? cleaned.slice(0, 500) : undefined;
};
const durationMs = value => {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(String(value ?? ''));
  return match ? Math.round(Number(match[1]) * 1000) : undefined;
};

/**
 * Turn one upstream error body into the small, safe fact set a caller may act
 * on: reason codes, quota signals and delays. Free-form text is not copied, so
 * a provider message cannot carry request content into a session or a log.
 * @param providerError - parsed `error` object from the response body.
 * @param headers - response headers, when the failure arrived with a status.
 * @returns reasons, retry delay, and whether the body said anything at all.
 */
export function upstreamFailureDetails(providerError, headers) {
  const details = Array.isArray(providerError?.details) ? providerError.details : [];
  const reasons = [...new Set(details.map(item => detailText(item?.reason)).filter(Boolean))];
  const quotaResetDelayMs = details.map(item => durationMs(item?.quotaResetDelay ?? item?.metadata?.quotaResetDelay))
    .find(value => value !== undefined);
  const retryDelayMs = details.map(item => durationMs(item?.retryDelay)).find(value => value !== undefined);
  // BadRequest names the rejected field; keep the identifier, not the prose.
  const message = providerText(providerError?.message);
  const googleStatus = typeof providerError?.status === 'string' && /^[A-Z][A-Z_]{2,39}$/.test(providerError.status)
    ? providerError.status : undefined;
  const fields = [...new Set(details.flatMap(item => Array.isArray(item?.fieldViolations) ? item.fieldViolations : [])
    .map(violation => typeof violation?.field === 'string' && violation.field.length <= 160 && /^[A-Za-z0-9_.\[\]$-]+$/.test(violation.field)
      ? violation.field : undefined)
    .filter(Boolean))];
  const header = headers?.get?.('retry-after');
  const headerMs = header === undefined || header === null ? undefined
    : Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  const retryAfterMs = [headerMs, retryDelayMs, quotaResetDelayMs].find(value => Number.isFinite(value) && value > 0);
  return {
    reasons,
    fields,
    ...(googleStatus === undefined ? {} : { googleStatus }),
    ...(message === undefined ? {} : { providerMessage: message }),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    ...(quotaResetDelayMs === undefined ? {} : { quotaResetDelayMs }),
    capacity: reasons.includes('MODEL_CAPACITY_EXHAUSTED'),
    quota: reasons.includes('QUOTA_EXHAUSTED'),
    bare: reasons.length === 0 && fields.length === 0 && retryAfterMs === undefined,
  };
}

/** Render the reason set without inventing a cause the response did not state. */
export function describeUpstreamFailure(status, failure) {
  const reasons = (failure.reasons ?? []).join(', ');
  const label = failure.googleStatus === undefined ? `${status}` : `${status}（${failure.googleStatus}）`;
  if (status === 429 && failure.quota) return `上游返回 HTTP ${label}。上游报告配额耗尽（${reasons}）。`;
  if (status === 429 && failure.capacity) return `上游返回 HTTP ${label}。上游报告模型容量暂时耗尽（${reasons}），不是账号额度结论。`;
  if (status === 429 && reasons) return `上游返回 HTTP ${label}。上游原因：${reasons}。`;
  if (status === 429) return `上游返回 HTTP ${label}。该响应未提供 Retry-After 或 error.details，不能据此判断是否额度耗尽。`;
  if (status === 401) return '上游返回 HTTP 401。请在 Harness 内重新登录。';
  if (status === 403) return '上游返回 HTTP 403。该授权账号可能没有此资源的权限。';
  if (failure.reasons?.length) return `上游返回 HTTP ${label}。上游原因：${failure.reasons.join(', ')}。`;
  if (failure.providerMessage !== undefined) return `上游返回 HTTP ${label}。上游说明：${failure.providerMessage}`;
  if (failure.fields?.length) return `上游返回 HTTP ${label}。上游拒绝字段：${failure.fields.join(', ')}。`;
  return `上游返回 HTTP ${label}。`;
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
    const failure = upstreamFailureDetails(providerError, response.headers);
    // OpenAI-style bodies name the same condition outside `details`.
    const exhausted = failure.quota || ['usage_limit_reached', 'insufficient_quota'].includes(providerError.type ?? providerError.code);
    const code = response.status === 401 ? 'AUTH' : response.status === 403 ? 'PERMISSION'
      : response.status === 429 && exhausted ? 'QUOTA'
      : response.status === 429 ? 'RATE_LIMIT' : response.status >= 500 ? 'SERVER' : 'INVALID_REQUEST';
    const retry = failure.retryAfterMs;
    throw new LlmError(`${describeUpstreamFailure(response.status, failure)}${retry > 0 ? ` 建议等待 ${Math.ceil(retry / 1000)} 秒。` : ''}`, code,
      { status: response.status, ...(retry > 0 ? { providerRetryAfterMs: retry } : {}) });
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
