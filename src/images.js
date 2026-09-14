import { randomUUID } from 'node:crypto';
import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { checkedFetch } from './http.js';
import { antigravityHeaders } from './oauth.js';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MEDIA = new Set(['image/png', 'image/jpeg', 'image/webp']);
const imageRefSpec = { type: 'object', additionalProperties: false, properties: {
  attachmentId: { type: 'string', required: true }, mediaType: { type: 'string', required: true },
  bytes: { type: 'integer', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true },
  name: { type: 'string' }, originalDimensions: { type: 'object', additionalProperties: false, properties: { width: { type: 'integer' }, height: { type: 'integer' } } },
} };
export const GallerySchema = Schema.object({ entries: Schema.array(Schema.any()).default([]) });

export async function readBoundedJSON(response, maxBytes, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('图片接口没有返回响应体。');
  const chunks = []; let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted(); const { done, value } = await reader.read(); signal?.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error('图片响应超过大小限制。');
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks, total).toString('utf8')); }
    catch { throw new Error('图片接口没有返回有效 JSON。'); }
  } finally { signal?.removeEventListener('abort', abort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function decodeImage(value, mediaType, limit = MAX_IMAGE_BYTES) {
  if (!MEDIA.has(mediaType) || typeof value !== 'string' || !value || value.length > Math.ceil(limit / 3) * 4
    || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    throw new Error('图片接口返回了无效或过大的图像数据。');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > limit) throw new Error('图片超过大小限制。');
  const valid = mediaType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mediaType === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid) throw new Error('返回的图片内容与媒体类型不匹配。');
  return new Uint8Array(bytes);
}

export class Images {
  constructor(accounts, adapter, attachments, preferences, gallery) {
    this.accounts = accounts; this.adapter = adapter; this.attachments = attachments;
    this.preferences = preferences; this.gallery = gallery; this.saving = Promise.resolve();
  }
  list() { return this.gallery.get().entries; }
  options(args) {
    const settings = this.preferences.get().images;
    if (!settings.enabled) throw new Error('图片生成功能已关闭。');
    const provider = args.provider ?? settings.provider, model = args.model ?? settings.model;
    const quality = args.quality ?? settings.quality, size = args.size ?? 'auto', background = args.background ?? 'auto';
    if (!['codex', 'antigravity'].includes(provider) || typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(model)) throw new Error('图片模型或渠道无效。');
    if (typeof args.prompt !== 'string' || !args.prompt.trim() || args.prompt.length > 32000) throw new Error('请输入 1–32000 字符的图片描述。');
    if (!['auto', 'low', 'medium', 'high'].includes(quality) || !['auto', 'transparent', 'opaque'].includes(background)) throw new Error('图片质量或背景设置无效。');
    if (size !== 'auto') {
      const match = /^(\d+)x(\d+)$/.exec(size), width = Number(match?.[1]), height = Number(match?.[2]);
      if (!match || width % 16 || height % 16 || Math.max(width, height) > 3840 || Math.max(width, height) > Math.min(width, height) * 3
        || width * height < 655360 || width * height > 8294400) throw new Error('图片尺寸不受支持，请使用 auto 或有效的宽x高。');
    }
    if (provider === 'antigravity') {
      const item = this.adapter.selected(provider, model, { imageGeneration: true });
      if (!item.output?.includes('image')) throw new Error('所选 Antigravity 模型未声明图片生成能力。');
      if (size !== 'auto' || quality !== 'auto' || background !== 'auto') throw new Error('Antigravity 当前使用模型默认的尺寸、质量和背景，请将这些选项设为 auto。');
    }
    return { provider, model, quality, size, background, prompt: args.prompt.trim() };
  }
  async generate(args, signal, callId = randomUUID()) {
    const opt = this.options(args), account = await this.accounts.current(opt.provider, signal);
    if (!this.attachments) throw new Error('Harness 附件服务不可用。');
    const provider = this.accounts.provider(opt.provider), limit = Math.min(MAX_IMAGE_BYTES, this.attachments.imageLimits.maxImageBytes);
    let references;
    if (args.referenceImages !== undefined) {
      if (!Array.isArray(args.referenceImages) || !args.referenceImages.length || args.referenceImages.length > 5) throw new Error('编辑图片需要 1–5 张明确指定的参考图。');
      references = []; let bytes = 0;
      for (const ref of args.referenceImages) {
        const image = await this.attachments.readImage(ref, signal);
        bytes += image.data.byteLength;
        if (bytes > this.attachments.imageLimits.maxMessageImageBytes) throw new Error('参考图片总大小超限。');
        references.push({ mediaType: image.ref.mediaType, base64: Buffer.from(image.data).toString('base64') });
      }
    }
    signal?.throwIfAborted(); this.options(args);
    let url, init;
    if (opt.provider === 'codex') {
      url = `${provider.apiURL}/images/${references ? 'edits' : 'generations'}`;
      init = { method: 'POST', headers: { ...this.adapter.codexHeaders(account), accept: 'application/json', 'x-codex-image-turn-id': String(callId) },
        body: JSON.stringify({ model: opt.model, prompt: opt.prompt, size: opt.size, quality: opt.quality, background: opt.background,
          ...(references ? { images: references.map(image => ({ image_url: `data:${image.mediaType};base64,${image.base64}` })) } : {}) }), signal };
    } else {
      url = `${provider.generationURL || provider.apiURL}/v1internal:generateContent`;
      init = { method: 'POST', headers: antigravityHeaders(this.accounts.config, account.accessToken), signal,
        body: JSON.stringify({ model: opt.model, project: account.projectId, userAgent: 'antigravity', requestType: 'image_gen',
          requestId: `image_gen/${Date.now()}/${randomUUID()}/12`, request: { contents: [{ role: 'user', parts: [
            { text: opt.prompt }, ...(references ?? []).map(image => ({ inlineData: { mimeType: image.mediaType, data: image.base64 } }))] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } } }) };
    }
    const response = await checkedFetch(this.accounts.fetcher, url, init);
    const value = await readBoundedJSON(response, Math.ceil(limit / 3) * 4 + 1048576, signal);
    let data, mediaType;
    if (opt.provider === 'codex') { data = value.data?.[0]?.b64_json; mediaType = 'image/png'; }
    else {
      const parts = (value.response ?? value).candidates?.[0]?.content?.parts ?? [];
      const image = parts.find(part => part.inlineData)?.inlineData; data = image?.data; mediaType = image?.mimeType;
    }
    const bytes = decodeImage(data, mediaType, limit);
    signal?.throwIfAborted();
    const id = randomUUID(), ext = mediaType === 'image/jpeg' ? 'jpg' : mediaType === 'image/webp' ? 'webp' : 'png';
    const name = `cpa-${opt.provider}-${id}.${ext}`;
    await this.attachments.validateImage({ data: bytes, mediaType, name });
    const original = await this.attachments.saveFile({ data: bytes, name });
    const image = await this.attachments.saveImage({ data: bytes, mediaType, name });
    const entry = { id, provider: opt.provider, model: opt.model, createdAt: new Date().toISOString(), image, original,
      mediaType, ...(this.attachments.fileHostPath(original) ? { localPath: this.attachments.fileHostPath(original) } : {}) };
    const save = this.saving.catch(() => {}).then(() => this.gallery.update({ entries: [entry, ...this.list()].slice(0, 50) }));
    this.saving = save; await save;
    return entry;
  }
}

export function createImageTool(images, getMessages) {
  return defineTool({ name: 'cpa_image_generate',
    description: 'Generate an image only when the user requests image output. Uses the selected subscription image provider. To edit an existing image, specify referenceImages using exact attachment IDs from this conversation; never substitute unrelated images or silently change an edit into new generation. The host saves and displays the resulting image. Never retry with another provider or model without user direction.',
    parameters: { prompt: { type: 'string', required: true }, provider: { type: 'string', enum: ['codex', 'antigravity'] },
      model: { type: 'string' }, size: { type: 'string' }, quality: { type: 'string', enum: ['auto','low','medium','high'] },
      background: { type: 'string', enum: ['auto','transparent','opaque'] },
      referenceImages: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { attachmentId: { type: 'string', required: true } } } } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { id: { type: 'string', required: true }, image: { ...imageRefSpec, required: true },
      provider: { type: 'string', required: true }, model: { type: 'string', required: true }, createdAt: { type: 'string', required: true },
      mediaType: { type: 'string', required: true }, localPath: { type: 'string' },
      original: { type: 'object', additionalProperties: false, properties: { attachmentId: { type: 'string', required: true }, name: { type: 'string', required: true }, bytes: { type: 'integer', required: true } }, required: true } } },
      render: (_args, value) => [{ type: 'text', text: `Image generated with ${value.model}.${value.localPath ? '\nOriginal file on the Harness host: ' + JSON.stringify(value.localPath) : ''}` },
        { type: 'image', attachment: value.image }] },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      let referenceImages;
      if (args.referenceImages !== undefined) {
        const available = new Map();
        const visit = blocks => { for (const block of blocks ?? []) {
          if (block.type === 'image') available.set(block.attachment.attachmentId, block.attachment);
          if (block.type === 'tool-result') visit(block.content);
        } };
        for (const message of await getMessages(exec.agent?.id) ?? []) visit(message.content);
        referenceImages = args.referenceImages.map(ref => {
          const actual = available.get(ref.attachmentId);
          if (!actual) throw new Error('参考图不在当前会话中，请先读取或上传所需图片，不能改用其他图片。');
          return actual;
        });
      }
      const value = await images.generate({ ...args, ...(referenceImages ? { referenceImages } : {}) }, exec.signal, exec.callId);
      if (exec.parent !== undefined) exec.deferContext(createUserMessage({ content: [
        { type: 'text', text: `Generated image: ${value.localPath || value.id}` }, { type: 'image', attachment: value.image }],
        source: { kind: 'plugin', plugin: 'cpa-subscriptions' } }));
      return value;
    },
  });
}
