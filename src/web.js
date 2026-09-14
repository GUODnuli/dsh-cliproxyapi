import { PROVIDERS, providerOf } from './config.js';
import { decodeImage } from './images.js';
import { composerQuotaRows } from './quota.js';

export const name = 'cpa-subscriptions-web';
export const inject = ['connection', 'cpaSubscriptions'];

export async function statusOf(service) {
  const rows = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    const account = await service.accounts.read(id);
    const quota = account ? (service.quotas?.status(id) ?? { state: 'idle', rows: [], message: '点击“刷新额度”查看当前模型余量。' })
      : { state: 'idle', rows: [], message: '登录后可刷新模型额度。' };
    rows.push({ id, name: provider.label, loggedIn: !!account?.accessToken,
      email: account?.email || '', status: service.logins.status.get(id) || (account ? '已登录' : '未登录'),
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
        if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply({ error: '需要 JSON 请求。' }, 415);
        const data = await request.json(), { action, provider: id } = data;
        if (action === 'preferences') { await service.updatePreferences(data.patch); return reply(await state()); }
        if (action === 'generate') {
          const images = ctx.get('cpaImages');
          if (!images) throw new Error('Harness 图片服务未就绪。');
          const args = data.args || {}; images.options(args);
          if (data.references !== undefined) {
            if (!Array.isArray(data.references) || !data.references.length || data.references.length > 5) throw new Error('请选择 1–5 张参考图片。');
            const limit = Math.min(20971520, images.attachments.imageLimits.maxMessageImageBytes);
            let total = 0;
            const inputs = data.references.map(ref => {
              const bytes = decodeImage(ref.data, ref.mediaType, limit); total += bytes.byteLength;
              if (total > limit) throw new Error('参考图片总大小超限。');
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
        else return reply({ error: '未知操作。' }, 400);
        return reply(await state());
      } catch (error) { return reply({ error: error.message, code: error.code, status: error.failure?.status }, 400); }
    },
  });
  ctx.connection.fetch.register({ path: '/api/cpa-images', methods: ['GET'], requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url), images = ctx.get('cpaImages');
      const item = images?.list().find(entry => entry.id === url.searchParams.get('id'));
      if (!item) return reply({ error: '图片不存在或已不在最近生成列表中。' }, 404);
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
      } catch { return reply({ error: '无法读取图片附件。' }, 404); }
    },
  });
}
