import { randomUUID } from 'node:crypto';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { digest } from './messages.js';
import { readSSE } from './http.js';

class Blocks {
  constructor() { this.entries = []; this.keys = new Map(); }
  *delta(key, type, text, fields = {}) {
    let item = this.keys.get(key);
    if (!item) {
      item = { index: this.entries.length, block: type === 'tool-call'
        ? { type, id: fields.id, name: fields.name || '', arguments: '' } : { type, text: '' } };
      this.keys.set(key, item); this.entries.push(item);
      yield { type: 'block-start', index: item.index, blockType: type };
    }
    if (type === 'tool-call') {
      if (fields.name) item.block.name = fields.name;
      item.block.arguments += text;
      yield { type: 'tool-call-delta', index: item.index, id: item.block.id, name: item.block.name, argumentsDelta: text };
    } else {
      item.block.text += text;
      yield { type: type === 'text' ? 'text-delta' : 'reasoning-delta', index: item.index, text };
    }
  }
  *end() { for (const item of this.entries) yield { type: 'block-end', ...item }; }
  content() { return this.entries.map(e => e.block); }
}

export function usageOf(raw, protocol) {
  const input = protocol === 'codex' ? raw.input_tokens : raw.promptTokenCount;
  const cached = protocol === 'codex' ? raw.input_tokens_details?.cached_tokens : raw.cachedContentTokenCount;
  const reasoning = protocol === 'codex' ? raw.output_tokens_details?.reasoning_tokens : raw.thoughtsTokenCount;
  const output = protocol === 'codex' ? raw.output_tokens : (raw.candidatesTokenCount ?? 0) + (reasoning ?? 0);
  return { inputTokens: Math.max(0, (input ?? 0) - (cached ?? 0)), outputTokens: output ?? 0,
    ...(cached !== undefined ? { cacheReadTokens: cached } : {}),
    ...(reasoning !== undefined ? { reasoningTokens: reasoning } : {}),
    ...((raw.total_tokens ?? raw.totalTokenCount) !== undefined ? { totalTokens: raw.total_tokens ?? raw.totalTokenCount } : {}) };
}

export async function* codexStream(response, signal) {
  const blocks = new Blocks(), items = new Map(), toolKeys = new Map();
  let terminal;
  for await (const event of readSSE(response, signal)) {
    const i = event.output_index ?? 0;
    if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
      const item = event.item; toolKeys.set(i, item);
      yield* blocks.delta(`tool:${i}`, 'tool-call', '', { id: item.call_id || item.id, name: item.name });
    } else if (event.type === 'response.output_text.delta') {
      yield* blocks.delta(`text:${i}:${event.content_index ?? 0}`, 'text', event.delta || '');
    } else if (event.type === 'response.reasoning_summary_text.delta' || event.type === 'response.reasoning_text.delta') {
      yield* blocks.delta(`reason:${i}:${event.summary_index ?? event.content_index ?? 0}`, 'reasoning', event.delta || '');
    } else if (event.type === 'response.function_call_arguments.delta') {
      const item = toolKeys.get(i);
      if (!item) throw new LlmError('工具参数流缺少调用标识。', 'INVALID_RESPONSE');
      yield* blocks.delta(`tool:${i}`, 'tool-call', event.delta || '', { id: item.call_id || item.id, name: item.name });
    } else if (event.type === 'response.output_item.done') {
      items.set(i, event.item);
      yield* completeItem(event.item, i, blocks);
    } else if (['response.completed', 'response.incomplete', 'response.failed'].includes(event.type)) {
      terminal = event.response;
      for (const [index, item] of (terminal.output || []).entries()) { items.set(index, item); yield* completeItem(item, index, blocks); }
      break;
    } else if (event.type === 'error') throw new LlmError('Codex 返回了流式错误。', 'SERVER');
  }
  if (!terminal) throw new LlmError('Codex 响应在完成事件之前断开。', 'NETWORK');
  if (terminal.status === 'failed') throw new LlmError('Codex 请求执行失败。', 'SERVER');
  yield* blocks.end();
  if (terminal.usage) yield { type: 'usage', usage: usageOf(terminal.usage, 'codex') };
  const content = blocks.content();
  yield { type: 'finish', reason: { kind: terminal.status === 'incomplete' ? 'max-tokens'
    : content.some(b => b.type === 'tool-call') ? 'tool-calls' : 'stop' },
    replayState: { response: { version: 1, protocol: 'codex', hash: digest(content), items: [...items.entries()].sort((a,b) => a[0]-b[0]).map(e => e[1]) } } };
}

function* completeItem(item, i, blocks) {
  if (item.type === 'function_call') {
    const key = `tool:${i}`, current = blocks.keys.get(key)?.block.arguments || '';
    const args = item.arguments || '{}';
    if (!args.startsWith(current)) throw new LlmError('工具参数流与完成事件不一致。', 'INVALID_RESPONSE');
    yield* blocks.delta(key, 'tool-call', args.slice(current.length), { id: item.call_id || item.id, name: item.name });
  } else {
    const parts = item.type === 'reasoning' ? item.summary || [] : item.content || [];
    for (const [index, part] of parts.entries()) {
      if (typeof part.text !== 'string' || !part.text) continue;
      const type = item.type === 'reasoning' ? 'reasoning' : 'text';
      const key = `${type === 'text' ? 'text' : 'reason'}:${i}:${index}`;
      const current = blocks.keys.get(key)?.block.text || '';
      if (part.text.startsWith(current) && part.text.length > current.length) yield* blocks.delta(key, type, part.text.slice(current.length));
    }
  }
}

export async function* antigravityStream(response, signal) {
  const blocks = new Blocks(), parts = [];
  let usage, finish, activeType, activeKey, serial = 0;
  for await (const envelope of readSSE(response, signal)) {
    const event = envelope.response || envelope;
    if (event.error) throw new LlmError('Antigravity 返回了流式错误。', 'SERVER');
    if (event.usageMetadata) usage = event.usageMetadata;
    const candidate = event.candidates?.[0];
    for (const part of candidate?.content?.parts || []) {
      parts.push(structuredClone(part));
      if (part.functionCall) {
        const call = part.functionCall;
        // Preserve an upstream id or mint one once, then replay this same id with the tool result.
        const id = call.id || `call_${randomUUID().replaceAll('-', '')}`;
        parts.at(-1).functionCall.id = id;
        yield* blocks.delta(`tool:${serial++}`, 'tool-call', JSON.stringify(call.args || {}), { id, name: call.name });
        activeType = undefined;
      } else if (typeof part.text === 'string' && part.text) {
        const type = part.thought ? 'reasoning' : 'text';
        if (activeType !== type) { activeType = type; activeKey = `${type}:${serial++}`; }
        yield* blocks.delta(activeKey, type, part.text);
      }
    }
    if (candidate?.finishReason) finish = candidate.finishReason;
  }
  if (!finish) throw new LlmError('Antigravity 响应在完成事件之前断开。', 'NETWORK');
  if (!['STOP', 'MAX_TOKENS'].includes(finish)) throw new LlmError(`Antigravity 停止生成：${finish}。`, 'INVALID_RESPONSE');
  yield* blocks.end();
  if (usage) yield { type: 'usage', usage: usageOf(usage, 'antigravity') };
  const content = blocks.content();
  yield { type: 'finish', reason: { kind: finish === 'MAX_TOKENS' ? 'max-tokens'
    : content.some(b => b.type === 'tool-call') ? 'tool-calls' : 'stop' },
    replayState: { response: { version: 1, protocol: 'antigravity', hash: digest(content), parts } } };
}
