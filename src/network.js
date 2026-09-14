import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { HttpsProxyAgent } from 'https-proxy-agent';

const runFile = promisify(execFile);
const HOSTS = new Set(['chatgpt.com', 'auth.openai.com', 'oauth2.googleapis.com', 'www.googleapis.com',
  'cloudcode-pa.googleapis.com', 'daily-cloudcode-pa.googleapis.com']);

export function validateProxy(value) {
  if (!value) return '';
  let url; try { url = new URL(value.includes('://') ? value : `http://${value}`); } catch { throw new Error('代理地址格式不正确。'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('请填写不含账号密码和路径的 HTTP / HTTPS 代理地址，例如 http://127.0.0.1:7890。');
  return url.origin;
}

export function bypassProxy(host, noProxy = '') {
  return noProxy.split(/[\s,]+/).filter(Boolean).some(item => {
    if (item === '*') return true;
    const target = item.toLowerCase().replace(/^\*?\./, '').replace(/:443$/, '');
    return host === target || host.endsWith(`.${target}`);
  });
}

async function systemProxy() {
  if (process.platform !== 'win32') return '';
  try {
    const { stdout } = await runFile(`${process.env.SystemRoot || 'C:\\Windows'}\\System32\\reg.exe`,
      ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'],
      { encoding: 'utf8', windowsHide: true, timeout: 3000, maxBuffer: 32768 });
    if (!/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(stdout)) return '';
    const raw = /^\s*ProxyServer\s+REG_\w+\s+(.+)$/im.exec(stdout)?.[1];
    const entries = raw?.trim().split(';') ?? [];
    const selected = entries.find(x => x.startsWith('https=')) ?? entries.find(x => x.startsWith('http=')) ?? entries.find(x => !x.includes('='));
    return selected ? validateProxy(selected.replace(/^[^=]+=/, '').trim()) : '';
  } catch { return ''; }
}

export function fetchThroughProxy(input, init, proxy, requestImpl = httpsRequest) {
  const target = new URL(input), headers = new Headers(init?.headers);
  const body = init?.body == null ? undefined : init.body instanceof URLSearchParams ? Buffer.from(init.body.toString()) : Buffer.from(init.body);
  if (body) headers.set('content-length', String(body.length));
  headers.set('accept-encoding', 'identity');
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
  return new Promise((resolve, reject) => {
    const request = requestImpl(target, { method: init?.method || 'GET', headers: Object.fromEntries(headers), agent, signal: init?.signal }, response => {
      response.once('close', () => agent?.destroy());
      const status = response.statusCode ?? 500;
      const empty = init?.method === 'HEAD' || [204, 205, 304].includes(status);
      if (empty) response.resume();
      const outputHeaders = new Headers();
      for (const [key, val] of Object.entries(response.headers)) {
        if (Array.isArray(val)) val.forEach(x => outputHeaders.append(key, x));
        else if (val !== undefined) outputHeaders.set(key, val);
      }
      resolve(new Response(empty ? null : Readable.toWeb(response), { status, headers: outputHeaders }));
    });
    request.once('error', error => { agent?.destroy(); reject(error); });
    if (body) request.write(body);
    request.end();
  });
}

/** A plugin-local fetcher: never patches global fetch or starts another service. */
export function createNetwork(getSettings, options = {}) {
  let cachedSystem, cachedUntil = 0, lastRoute = 'Harness 网络';
  const baseFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
  const fetcher = async (input, init) => {
    const url = new URL(input), setting = getSettings() ?? {}, env = options.env ?? process.env;
    let proxy = '';
    if (url.protocol === 'https:' && HOSTS.has(url.hostname)) {
      if (setting.mode === 'manual') { proxy = validateProxy(setting.proxyURL); if (!proxy) throw new Error('代理模式为手动，但地址为空。'); }
      else if (setting.mode !== 'direct' && !bypassProxy(url.hostname, env.NO_PROXY ?? env.no_proxy)) {
        const configured = env.HTTPS_PROXY ?? env.https_proxy ?? env.ALL_PROXY ?? env.all_proxy ?? env.HTTP_PROXY ?? env.http_proxy;
        if (configured) proxy = validateProxy(configured);
        else {
          if (Date.now() >= cachedUntil) { cachedSystem = await (options.systemProxy ?? systemProxy)(); cachedUntil = Date.now() + 30000; }
          proxy = cachedSystem || '';
        }
      }
    }
    lastRoute = proxy ? 'HTTP 代理' : setting.mode === 'direct' ? '直连' : 'Harness 网络';
    if (proxy) return (options.proxyFetch ?? fetchThroughProxy)(input, init, proxy);
    if (setting.mode === 'direct' && url.protocol === 'https:' && HOSTS.has(url.hostname))
      return (options.directFetch ?? fetchThroughProxy)(input, init, null);
    // Undici dispatcher inherited by Harness may already carry its selected proxy.
    return baseFetch(input, init);
  };
  return { fetch: fetcher, status: () => ({ route: lastRoute }), reset() { cachedUntil = 0; } };
}
