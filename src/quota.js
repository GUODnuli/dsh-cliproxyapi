import { LlmError } from '@deepseek-ai/dsh-llm';
import { providerOf } from './config.js';
import { checkedFetch, requestHeaders } from './http.js';
import { antigravityHeaders } from './oauth.js';

const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const ANTIGRAVITY_QUOTA_URLS = [
  'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:retrieveUserQuotaSummary',
  'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
];

const identity = account => JSON.stringify([account?.accountId, account?.email, account?.projectId]);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;

function waitAbortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function numberValue(value) {
  if (record(value) && Object.hasOwn(value, 'val')) return numberValue(value.val);
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value) {
  const parsed = numberValue(value);
  return parsed === null ? null : Math.max(0, Math.min(100, parsed));
}

function remainingFromUsed(value) {
  const used = clampPercent(value);
  return used === null ? null : Math.max(0, Math.min(100, 100 - used));
}

function remainingFraction(value) {
  if (typeof value === 'string' && value.trim().endsWith('%')) {
    const percent = clampPercent(value.trim().slice(0, -1));
    return percent === null ? null : percent / 100;
  }
  const parsed = numberValue(value);
  return parsed === null ? null : Math.max(0, Math.min(1, parsed));
}

function resetAt(value, relativeSeconds) {
  if (value !== undefined && value !== null && value !== '') {
    const numeric = numberValue(value);
    const millis = numeric === null ? Date.parse(String(value)) : numeric > 100_000_000_000 ? numeric : numeric * 1000;
    if (Number.isFinite(millis)) return new Date(millis).toISOString();
  }
  const seconds = numberValue(relativeSeconds);
  return seconds !== null && seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : undefined;
}

const durationLabel = (seconds, fallback) => seconds === 18_000 ? '5 小时额度'
  : seconds === 604_800 ? '每周额度'
  : seconds >= 28 * 86_400 && seconds <= 31 * 86_400 ? '每月额度'
  : seconds > 0 && seconds % 86_400 === 0 ? `${seconds / 86_400} 天额度`
  : seconds > 0 && seconds % 3_600 === 0 ? `${seconds / 3_600} 小时额度`
  : fallback;

const durationKind = (seconds, fallback) => seconds === 18_000 ? 'five-hour'
  : seconds === 604_800 ? 'week'
  : seconds === null && fallback === '5 小时额度' ? 'five-hour'
  : seconds === null && fallback === '每周额度' ? 'week'
  : undefined;

const namedWindowKind = value => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
  return ['5h', 'five-hour'].includes(normalized) ? 'five-hour'
    : ['weekly', 'week'].includes(normalized) ? 'week' : undefined;
};

export function parseCodexQuota(payload) {
  const value = record(payload);
  if (!value) return [];
  const windows = [];
  const addRateLimit = (raw, prefix = '') => {
    const limit = record(raw);
    if (!limit) return;
    const entries = [
      { value: record(limit.primary_window ?? limit.primaryWindow), fallback: '5 小时额度', order: 0 },
      { value: record(limit.secondary_window ?? limit.secondaryWindow), fallback: '每周额度', order: 1 },
    ].filter(entry => entry.value);
    entries.sort((a, b) => {
      const rank = entry => {
        const seconds = numberValue(entry.value.limit_window_seconds ?? entry.value.limitWindowSeconds);
        return seconds === 18_000 ? 0 : seconds === 604_800 || (seconds >= 28 * 86_400 && seconds <= 31 * 86_400) ? 1 : entry.order;
      };
      return rank(a) - rank(b);
    });
    for (const entry of entries) windows.push({ ...entry, prefix, source: limit });
  };

  addRateLimit(value.rate_limit ?? value.rateLimit);
  addRateLimit(value.code_review_rate_limit ?? value.codeReviewRateLimit, '代码审查 · ');
  const additional = value.additional_rate_limits ?? value.additionalRateLimits;
  if (Array.isArray(additional)) additional.forEach((item, index) => {
    const limit = record(item);
    if (!limit) return;
    const name = String(limit.limit_name ?? limit.limitName ?? limit.metered_feature ?? limit.meteredFeature ?? `额外额度 ${index + 1}`).trim();
    addRateLimit(limit.rate_limit ?? limit.rateLimit, `${name} · `);
  });

  return windows.map(({ value: window, fallback, prefix, source }) => {
    const seconds = numberValue(window.limit_window_seconds ?? window.limitWindowSeconds);
    const reset = resetAt(window.reset_at ?? window.resetAt, window.reset_after_seconds ?? window.resetAfterSeconds);
    const reached = source.limit_reached === true || source.limitReached === true || source.allowed === false;
    const windowKind = durationKind(seconds, fallback);
    return {
      label: `${prefix}${durationLabel(seconds, fallback)}`,
      remainingPercent: remainingFromUsed(window.used_percent ?? window.usedPercent) ?? (reached && reset ? 0 : null),
      scope: prefix ? 'additional' : 'account',
      ...(windowKind ? { windowKind } : {}),
      ...(seconds !== null ? { windowSeconds: seconds } : {}),
      ...(reset ? { resetAt: reset } : {}),
    };
  });
}

function parseMaybeBody(payload) {
  const value = record(payload);
  if (!value) return undefined;
  if (Array.isArray(value.groups)) return value;
  if (typeof value.body === 'string') {
    try { return record(JSON.parse(value.body)); } catch { return value; }
  }
  return record(value.body) ?? value;
}

const antigravityWindowLabel = value => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (['5h', 'five-hour'].includes(normalized)) return '5 小时额度';
  if (['weekly', 'week'].includes(normalized)) return '每周额度';
  return String(value ?? '').trim();
};

export function parseAntigravityQuota(payload) {
  const value = parseMaybeBody(payload);
  const groups = Array.isArray(value?.groups) ? value.groups : [];
  return groups.flatMap(groupValue => {
    const group = record(groupValue);
    if (!group || !Array.isArray(group.buckets)) return [];
    const buckets = [...group.buckets].sort((a, b) => {
      const rank = bucket => {
        const window = String(record(bucket)?.window ?? '').toLowerCase().replace(/_/g, '-');
        return ['5h', 'five-hour'].includes(window) ? 0 : ['weekly', 'week'].includes(window) ? 1 : 2;
      };
      return rank(a) - rank(b);
    });
    const groupLabel = String(group.display_name ?? group.displayName ?? '模型额度').trim();
    const groupDetail = typeof group.description === 'string' ? group.description : undefined;
    return buckets.map((bucketValue, index) => {
      const bucket = record(bucketValue);
      if (!bucket) return null;
      const remaining = remainingFraction(bucket.remaining_fraction ?? bucket.remainingFraction);
      if (remaining === null) return null;
      const rawWindow = bucket.display_name ?? bucket.displayName ?? bucket.window;
      const window = antigravityWindowLabel(rawWindow);
      const windowKind = namedWindowKind(bucket.window ?? rawWindow);
      const label = window && (buckets.length > 1 || window !== groupLabel) ? `${groupLabel} · ${window}` : groupLabel || `模型额度 ${index + 1}`;
      const reset = resetAt(bucket.reset_time ?? bucket.resetTime);
      const detail = typeof bucket.description === 'string' ? bucket.description : groupDetail;
      return { label, remainingPercent: remaining * 100, scope: 'account', ...(windowKind ? { windowKind } : {}),
        ...(reset ? { resetAt: reset } : {}), ...(detail ? { detail } : {}) };
    }).filter(Boolean);
  });
}

const COMPOSER_WINDOWS = [
  { key: 'five-hour', label: '5 小时额度', shortLabel: '5h' },
  { key: 'week', label: '每周额度', shortLabel: '周' },
];

export function composerQuotaRows(id, rows) {
  providerOf(id);
  if (!Array.isArray(rows)) return [];
  return COMPOSER_WINDOWS.flatMap(window => {
    const row = rows.find(candidate => record(candidate) && candidate.scope === 'account'
      && candidate.windowKind === window.key && Number.isFinite(candidate.remainingPercent));
    return row ? [{ ...row, key: window.key, shortLabel: window.shortLabel }] : [];
  });
}

export class Quotas {
  constructor(accounts) {
    this.accounts = accounts;
    this.states = new Map();
    this.refreshes = new Map();
  }

  status(id) {
    return this.states.get(id) ?? { state: 'idle', rows: [], message: '点击“刷新额度”查看当前模型余量。' };
  }

  invalidate(id) {
    this.refreshes.get(id)?.controller.abort(new Error('账号已变更。'));
    this.refreshes.delete(id);
    this.states.delete(id);
  }

  dispose() {
    for (const id of [...this.refreshes.keys()]) this.invalidate(id);
  }

  async refresh(id, signal) {
    providerOf(id);
    signal?.throwIfAborted();
    if (this.refreshes.has(id)) return waitAbortable(this.refreshes.get(id).promise, signal);
    const controller = new AbortController();
    const requestSignal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(this.accounts.config.quotaTimeoutMs ?? 20_000),
    ]);
    const flight = { controller };
    this.states.set(id, { state: 'refreshing', rows: this.status(id).rows ?? [], message: '正在读取官方额度…' });
    flight.promise = this.fetch(id, requestSignal).then(result => {
      const state = { state: 'ok', rows: result.rows, fetchedAt: new Date().toISOString(), ...(result.plan ? { plan: result.plan } : {}) };
      if (this.refreshes.get(id) === flight) this.states.set(id, state);
      return state;
    }).catch(error => {
      const state = { state: 'failed', rows: [], message: requestSignal.aborted ? '额度刷新已取消或超时，请重试。' : error.message };
      if (this.refreshes.get(id) === flight) this.states.set(id, state);
      return state;
    }).finally(() => { if (this.refreshes.get(id) === flight) this.refreshes.delete(id); });
    this.refreshes.set(id, flight);
    return waitAbortable(flight.promise, signal);
  }

  async fetch(id, signal) {
    let account = await this.accounts.current(id, signal);
    const owner = identity(account);
    const request = async (url, initFor) => {
      let response;
      try { response = await checkedFetch(this.accounts.fetcher, url, initFor(account)); }
      catch (error) {
        if (error.failure?.status !== 401) throw error;
        account = await this.accounts.current(id, signal, { rejectedToken: account.accessToken });
        if (identity(account) !== owner) throw new LlmError('账号已切换，请重新刷新额度。', 'AUTH');
        response = await checkedFetch(this.accounts.fetcher, url, initFor(account));
      }
      signal.throwIfAborted();
      if (identity(await this.accounts.read(id)) !== owner) throw new LlmError('账号已切换，忽略旧账号额度。', 'AUTH');
      try { return await response.json(); }
      catch { throw new LlmError('上游额度响应不是有效 JSON。', 'INVALID_RESPONSE'); }
    };

    if (id === 'codex') {
      if (!account.accountId) throw new LlmError('Codex 账号缺少账号标识，请重新登录。', 'AUTH');
      const payload = await request(CODEX_USAGE_URL, current => ({ method: 'GET', signal, headers: requestHeaders(current.accessToken, {
        'chatgpt-account-id': current.accountId,
        'user-agent': `codex-tui/${this.accounts.config.codexClientVersion}`,
      }) }));
      const rows = parseCodexQuota(payload);
      if (!rows.length) throw new LlmError('Codex 返回成功，但没有可识别的额度窗口。', 'INVALID_RESPONSE');
      const plan = typeof payload?.plan_type === 'string' ? payload.plan_type : typeof payload?.planType === 'string' ? payload.planType : undefined;
      return { rows, plan };
    }

    if (!account.projectId) throw new LlmError('Antigravity 账号缺少项目标识，请重新登录。', 'AUTH');
    let lastError;
    for (const url of ANTIGRAVITY_QUOTA_URLS) {
      try {
        const payload = await request(url, current => ({ method: 'POST', signal,
          headers: antigravityHeaders(this.accounts.config, current.accessToken),
          body: JSON.stringify({ project: current.projectId }) }));
        const rows = parseAntigravityQuota(payload);
        if (rows.length) return { rows };
        lastError = new LlmError('Antigravity 返回成功，但没有可识别的额度分组。', 'INVALID_RESPONSE');
      } catch (error) {
        if (error.code === 'AUTH' || signal.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError ?? new LlmError('Antigravity 没有返回可识别的额度。', 'INVALID_RESPONSE');
  }
}
