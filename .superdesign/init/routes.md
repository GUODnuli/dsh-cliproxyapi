# Routes and UI Entry Mapping

## Routing model
There is no file-based router or React Router configuration. The plugin is mounted into DSH host slots. The four major views are local tab state inside one settings section and do not change the browser URL.

| Surface / route-like entry | Host path or selector | Component / handler | Layout |
|---|---|---|---|
| CPA settings section | DSH Settings → `settings.section` id `cpa-subscriptions` | `SubscriptionAccounts`, `client.js` lines 1968–2302 | DSH settings shell + `.cpa-container` |
| Account & model tab | internal state `tab === 'models'` | `AccountCard`, `QuotaPanel`, `ModelRow` | `SubscriptionAccounts` |
| Image studio tab | internal state `tab === 'images'` | `ImagePanel` | `SubscriptionAccounts` |
| Network proxy tab | internal state `tab === 'network'` | `NetworkPanel` | `SubscriptionAccounts` |
| Diagnostics tab | internal state `tab === 'diagnostics'` | `DiagnosticsPanel` | `SubscriptionAccounts` |
| Composer quota dock | `conversation.composer.dock` id `cpa-subscription-quota` | `ComposerQuota` | DSH conversation composer |
| State/actions API | `GET`/`POST /api/cpa-subscriptions` | `src/web.js` fetch registration | none (JSON) |
| Image bytes/download API | `GET /api/cpa-images?id=…` | `src/web.js` fetch registration | none (binary) |

## Key page summary
The only page-scale plugin surface is **CLIProxyAPI 订阅服务** in DSH Settings. It has a header/action area, global error callout, four-segment tab control, and the selected view. The initial `models` view combines provider account cards, quota summaries, search/filter chips, and model tuning rows. The plugin also contributes a compact live-quota widget to the conversation composer.

## `package.json` — client/module entry declaration
```json
{
  "name": "dsh-cliproxyapi",
  "version": "2.3.3",
  "description": "Native Codex and Antigravity subscription accounts inside DeepSeek Harness, based on CLIProxyAPI",
  "type": "module",
  "main": "index.js",
  "exports": { ".": "./index.js", "./web": "./src/web.js", "./client": "./client.js", "./package.json": "./package.json" },
  "files": ["index.js", "client.js", "src/", "cordis.patch.yml", "README_CN.md", "LICENSE", "THIRD_PARTY_NOTICES.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "inject": ["@deepseek-ai/dsh-api-remotes", "@deepseek-ai/dsh-client-connection", "@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-model-selection", "@deepseek-ai/dsh-client-ui-settings"], "platform": "web" }
  },
  "engines": { "node": ">=22.19.0" },
  "license": "MIT",
  "peerDependencies": {
    "@deepseek-ai/dsh-llm": "^0.1.5-rc.1",
    "@deepseek-ai/dsh-credentials": "^0.1.5-rc.1",
    "@deepseek-ai/schemastery": "^3.18.0",
    "@deepseek-ai/dsh-tools": "^0.1.5-rc.1"
  },
  "peerDependenciesMeta": {
    "@deepseek-ai/dsh-llm": { "optional": true },
    "@deepseek-ai/dsh-credentials": { "optional": true },
    "@deepseek-ai/schemastery": { "optional": true },
    "@deepseek-ai/dsh-tools": { "optional": true }
  },
  "dependencies": { "https-proxy-agent": "7.0.6" },
  "scripts": {
    "test": "node --test test/*.test.js",
    "test:integration": "node --test test/integration.test.js",
    "pack:plugin": "npm pack --ignore-scripts"
  },
  "devDependencies": {
    "@deepseek-ai/dsh": "0.1.5-rc.1",
    "pnpm": "11.7.0"
  }
}
```

## `cordis.patch.yml` — plugin composition entries

```yaml
- insert:
    - id: cpa-subscriptions
      name: dsh-cliproxyapi
    - id: cpa-subscriptions-web
      name: dsh-cliproxyapi/web
```

## `src/web.js` — complete HTTP route source

```js
import { PROVIDERS, providerOf } from './config.js';
import { decodeImage } from './images.js';
import { composerQuotaRows } from './quota.js';

export const name = 'cpa-subscriptions-web';
export const inject = ['connection', 'cpaSubscriptions'];

export async function statusOf(service) {
  const rows = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    const account = await service.accounts.read(id);
    const quota = account ? (service.quotas?.status(id) ?? { state: 'idle', rows: [], message: '鐐瑰嚮鈥滃埛鏂伴搴︹€濇煡鐪嬪綋鍓嶆ā鍨嬩綑閲忋€? })
      : { state: 'idle', rows: [], message: '鐧诲綍鍚庡彲鍒锋柊妯″瀷棰濆害銆? };
    rows.push({ id, name: provider.label, loggedIn: !!account?.accessToken,
      email: account?.email || '', status: service.logins.status.get(id) || (account ? '宸茬櫥褰? : '鏈櫥褰?),
      pending: service.logins.pending.has(id), loginURL: service.logins.pending.get(id)?.url,
      models: service.adapter.modelEntries(id), catalog: service.adapter.status(id),
      quota: { ...quota, composerRows: composerQuotaRows(id, quota.rows) } });
  }
  return rows;
}

export function apply(ctx) {
  const service = ctx.cpaSubscriptions;
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const state = async () => ({ accounts: await statusOf(service), preferences: service.preferences.get(), network: service.network.status(),
    imagesAvailable: !!ctx.get('cpaImages'), gallery: ctx.get('cpaImages')?.list() ?? [] });
  ctx.connection.fetch.register({ path: '/api/cpa-subscriptions', methods: ['GET', 'POST'], requestBody: 'buffered',
    async fetch(request) {
      try {
        if (request.method === 'GET') return reply(await state());
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply({ error: '闇€瑕?JSON 璇锋眰銆? }, 415);
        const data = await request.json(), { action, provider: id } = data;
        if (action === 'preferences') { await service.updatePreferences(data.patch); return reply(await state()); }
        if (action === 'generate') {
          const images = ctx.get('cpaImages');
          if (!images) throw new Error('Harness 鍥剧墖鏈嶅姟鏈氨缁€?);
          const args = data.args || {}; images.options(args);
          if (data.references !== undefined) {
            if (!Array.isArray(data.references) || !data.references.length || data.references.length > 5) throw new Error('璇烽€夋嫨 1鈥? 寮犲弬鑰冨浘鐗囥€?);
            const limit = Math.min(20971520, images.attachments.imageLimits.maxMessageImageBytes);
            let total = 0;
            const inputs = data.references.map(ref => {
              const bytes = decodeImage(ref.data, ref.mediaType, limit); total += bytes.byteLength;
              if (total > limit) throw new Error('鍙傝€冨浘鐗囨€诲ぇ灏忚秴闄愩€?);
              return { data: bytes, mediaType: ref.mediaType, name: 'reference-image' };
            });
            args.referenceImages = await images.attachments.saveImages(inputs);
          }
          const generated = await images.generate(args, request.signal);
          return reply({ ...await state(), generated });
        }
        if (action === 'quota-all') {
          await service.refreshAll({ signal: request.signal, models: false });
          return reply(await state());
        }
        providerOf(id);
        if (action === 'model-update') { await service.adapter.updateModel(id, data.model, data.patch); return reply(await state()); }
        if (action === 'login') { const { url } = await service.logins.start(id); return reply({ url }); }
        if (action === 'cancel') service.logins.cancel(id);
        else if (action === 'logout') {
          service.logins.cancel(id); service.adapter.invalidate(id); service.quotas.invalidate(id); await service.accounts.logout(id); service.logins.status.delete(id);
        } else if (action === 'models') await service.adapter.discover(id, request.signal);
        else if (action === 'quota') await service.quotas.refresh(id, request.signal);
        else return reply({ error: '鏈煡鎿嶄綔銆? }, 400);
        return reply(await state());
      } catch (error) { return reply({ error: error.message, code: error.code, status: error.failure?.status }, 400); }
    },
  });
  ctx.connection.fetch.register({ path: '/api/cpa-images', methods: ['GET'], requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url), images = ctx.get('cpaImages');
      const item = images?.list().find(entry => entry.id === url.searchParams.get('id'));
      if (!item) return reply({ error: '鍥剧墖涓嶅瓨鍦ㄦ垨宸蹭笉鍦ㄦ渶杩戠敓鎴愬垪琛ㄤ腑銆? }, 404);
      try {
        let bytes;
        if (url.searchParams.get('original') === '1') {
          const chunks = [];
          for await (const chunk of images.attachments.readFileStream(item.original, request.signal)) chunks.push(chunk);
          bytes = Buffer.concat(chunks);
        } else bytes = (await images.attachments.readImage(item.image, request.signal)).data;
        return new Response(bytes, { headers: { 'content-type': url.searchParams.get('original') === '1' ? item.mediaType : item.image.mediaType, 'cache-control': 'private, max-age=300',
          'x-content-type-options': 'nosniff', ...(url.searchParams.get('download') === '1' ? {
            'content-disposition': `attachment; filename="${item.original.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"` } : {}) } });
      } catch { return reply({ error: '鏃犳硶璇诲彇鍥剧墖闄勪欢銆? }, 404); }
    },
  });
}
```

## `client.js` — complete slot registration source (lines 2304–2333)

```js
    inject: ['slots', 'modelDirectories'],
    apply(ctx) {
      ensureStyles();
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'cpa-subscriptions',
        order: 15,
        label: () => '璁㈤槄璐﹀彿 (CPA)'
      }, SubscriptionAccounts));
      const installComposer = scope => {
        const models = scope.get('modelDirectories');
        const sessions = scope.get('sessions');
        scope.slots.inject('conversation.composer.dock', () => scope.slots.register({
          name: 'conversation.composer.dock',
          id: 'cpa-subscription-quota',
          order: 10,
          inject: sessionId => {
            const controller = models.directoryFor(sessionId);
            const session = sessions.binding(sessionId)?.session;
            if (!session) throw new Error(`CPA quota could not resolve session ${String(sessionId)}`);
            return { controller, directory: controller.store, session };
          }
        }, ComposerQuota));
      };
      if (ctx.get('remote.session') === undefined) installComposer(ctx);
      else ctx.inject(['remote.session'], installComposer);
    }
  };
}});
```

