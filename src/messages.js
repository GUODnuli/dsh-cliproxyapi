import { createHash } from 'node:crypto';
import { requestImageDimensions } from '@deepseek-ai/dsh-attachment';
import { LlmError, offloadedImageText, projectOffloadedImages } from '@deepseek-ai/dsh-llm';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const textOf = blocks => blocks.filter(b => b.type === 'text').map(b => b.text).join('\n');

export function history(options) {
  const messages = [...options.messages];
  let system = options.system;
  if (messages[0]?.role === 'system') {
    const first = messages.shift();
    system ??= textOf(first.content);
  }
  if (messages.some(m => m.role === 'system')) throw new LlmError('此渠道暂不支持对话中间的 system 消息。', 'UNSUPPORTED_OPTION');
  for (const m of messages) for (const block of m.content) {
    if (!['text', 'reasoning', 'tool-call', 'tool-result'].includes(block.type) && !(block.type === 'image' && options.imagePayloads?.has(block.attachment?.attachmentId)))
      throw new LlmError('图片尚未通过附件服务解析，或消息包含未展开的文件附件。', 'UNSUPPORTED_OPTION');
    if (block.type === 'tool-result' && block.content.some(b => b.type !== 'text' && !(b.type === 'image' && options.imagePayloads?.has(b.attachment?.attachmentId))))
      throw new LlmError('工具结果包含未解析的附件。', 'UNSUPPORTED_OPTION');
  }
  return { messages, system: system || '' };
}

export function replayFor(message, options, protocol) {
  const state = message.source?.replayState?.response;
  if (message.source?.provider !== options.provider || message.source?.model !== options.model
    || state?.version !== 1 || state?.protocol !== protocol || state?.hash !== digest(message.content)) return;
  return state;
}

export function codexRequest(options, { verbosity } = {}) {
  if (options.stop?.length) throw new LlmError('Codex 订阅接口不支持 stop 参数。', 'UNSUPPORTED_OPTION');
  const { messages, system } = history(options);
  const input = [];
  for (const message of messages) {
    const replay = replayFor(message, options, 'codex');
    if (replay?.items) { input.push(...structuredClone(replay.items)); continue; }
    for (const block of message.content) {
      if (block.type === 'text' && block.text) input.push({ role: message.role,
        content: [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text: block.text }] });
      if (block.type === 'image') input.push({ role: 'user', content: codexImageParts(block, options) });
      if (block.type === 'tool-call') input.push({ type: 'function_call', call_id: block.id, name: block.name, arguments: block.arguments });
      if (block.type === 'tool-result') {
        input.push({ type: 'function_call_output', call_id: block.toolCallId, output: textOf(block.content) });
        for (const image of block.content.filter(b => b.type === 'image')) input.push({ role: 'user', content: codexImageParts(image, options) });
      }
    }
  }
  return { model: options.model, instructions: system, input, stream: true, store: false,
    include: ['reasoning.encrypted_content'], parallel_tool_calls: true,
    ...(options.tools?.length ? { tools: options.tools.map(t => ({ type: 'function', ...t, strict: false })), tool_choice: 'auto' } : {}),
    ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort, summary: 'auto' } } : {}),
    ...(verbosity ? { text: { verbosity } } : {}),
    ...(options.sessionId ? { prompt_cache_key: options.sessionId } : {}) };
}

const schemaMetadata = new Set(['$schema', '$id', '$defs', 'definitions', '$comment', 'additionalProperties',
  'default', 'examples', 'example', 'title', 'format', 'deprecated', 'readOnly', 'writeOnly']);
const schemaConstraints = new Set(['minLength', 'maxLength', 'pattern', 'minimum', 'maximum', 'exclusiveMinimum',
  'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties']);

function appendDescription(schema, text) {
  if (!text) return schema;
  schema.description = schema.description ? `${schema.description} ${text}` : text;
  return schema;
}

function preferredType(types) {
  if (types.length === 1) return types[0];
  if (types.includes('string')) return 'string';
  if (types.includes('number') || types.includes('integer')) return 'number';
  return types[0] ?? 'string';
}

function mergeAlternatives(values) {
  const nullable = values.some(value => value?.type === 'null' || value?.nullable);
  const schemas = values.filter(value => value?.type !== 'null');
  if (!schemas.length) return { type: 'string', nullable: true };
  if (schemas.length === 1) return { ...schemas[0], ...(nullable ? { nullable: true } : {}) };
  const types = [...new Set(schemas.map(value => value.type).filter(Boolean))];
  if (types.length === 1 && types[0] === 'object') {
    const names = [...new Set(schemas.flatMap(value => Object.keys(value.properties ?? {})))];
    const properties = Object.fromEntries(names.map(name => {
      const variants = schemas.map(value => value.properties?.[name]).filter(Boolean);
      return [name, variants.length === 1 ? variants[0] : mergeAlternatives(variants)];
    }));
    const required = [...(schemas[0].required ?? [])].filter(name => schemas.every(value => value.required?.includes(name)));
    return { type: 'object', ...(Object.keys(properties).length ? { properties } : {}), ...(required.length ? { required } : {}),
      ...(nullable ? { nullable: true } : {}) };
  }
  const type = preferredType(types);
  const result = { type, ...(nullable ? { nullable: true } : {}) };
  const enums = schemas.every(value => Array.isArray(value.enum)) ? [...new Set(schemas.flatMap(value => value.enum))] : [];
  if (enums.length && enums.every(value => typeof value === 'string')) result.enum = enums;
  if (types.length > 1) appendDescription(result, `Accepted JSON types: ${types.join(' or ')}.`);
  return result;
}

function mergeSchemas(base, extension) {
  const result = { ...extension, ...base };
  if (extension.properties || base.properties) result.properties = { ...(extension.properties ?? {}), ...(base.properties ?? {}) };
  const required = [...new Set([...(extension.required ?? []), ...(base.required ?? [])])];
  if (required.length) result.required = required;
  if (extension.nullable || base.nullable) result.nullable = true;
  if (extension.description && base.description) result.description = `${extension.description} ${base.description}`;
  return result;
}

// Antigravity accepts only a strict subset of JSON Schema. Project unions and move unsupported
// validation constraints into descriptions instead of letting one declaration reject the request.
export function geminiSchema(value, options = {}) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => geminiSchema(item, options));
  if ('$ref' in value) throw new LlmError('工具参数包含尚未展开的 JSON Schema $ref。', 'UNSUPPORTED_OPTION');
  const result = {}, hints = [];
  let alternatives, intersections;
  let emptyConstraint = false;
  for (const [key, val] of Object.entries(value)) {
    if (schemaMetadata.has(key)) continue;
    if (schemaConstraints.has(key)) { hints.push(`${key}=${JSON.stringify(val)}`); continue; }
    if (key === 'oneOf' || key === 'anyOf') { alternatives = val; continue; }
    if (key === 'allOf') { intersections = val; continue; }
    if (key === 'properties') result.properties = Object.fromEntries(Object.entries(val).map(([name, schema]) => [name, geminiSchema(schema, { property: true })]));
    else if (key === 'items') result.items = geminiSchema(val, { property: true });
    else if (key === 'required') result.required = [...val];
    else if (key === 'description' || key === 'nullable') result[key] = val;
    else if (key === 'enum') {
      // Google rejects an empty enum value, so `enum: ["a", ""]` is not sendable.
      const values = Array.isArray(val) ? val.filter(item => typeof item === 'string' && item !== '') : [];
      if (values.length) result.enum = [...new Set(values)];
      else emptyConstraint = true;
      if (!values.length || values.length !== val.length) hints.push(`enum=${JSON.stringify(val)}`);
    } else if (key === 'const') {
      if (typeof val === 'string' && val !== '') result.enum = [...new Set([...(result.enum ?? []), val])];
      else if (val === '') emptyConstraint = true;
      else {
        // Gemini enums carry strings only; a non-string constant keeps its JSON
        // type and moves the exact value into the description.
        if (!result.type) result.type = typeof val === 'boolean' ? 'boolean'
          : typeof val === 'number' ? (Number.isInteger(val) ? 'integer' : 'number') : undefined;
        hints.push(`const=${JSON.stringify(val)}`);
      }
    } else if (key === 'type' && Array.isArray(val)) {
      const types = [...new Set(val.filter(type => type !== 'null'))];
      result.type = preferredType(types);
      if (val.includes('null')) result.nullable = true;
      if (types.length > 1) hints.push(`accepted JSON types: ${types.join(' or ')}`);
    } else if (key === 'type') result.type = val;
  }
  if (!result.type && result.properties) result.type = 'object';
  if (!result.type && result.items) result.type = 'array';
  if (result.type === 'array' && !result.items) result.items = { type: 'string' };
  let projected = result;
  const branches = Array.isArray(alternatives) ? alternatives.map(item => geminiSchema(item, { property: true }))
    .filter(branch => branch && Object.keys(branch).length) : [];
  if (branches.length) projected = mergeSchemas(projected, mergeAlternatives(branches));
  if (Array.isArray(intersections)) for (const schema of intersections) projected = mergeSchemas(projected, geminiSchema(schema, { property: true }));
  if (projected.enum && !projected.type) projected.type = 'string';
  if (Array.isArray(projected.enum)) {
    const values = [...new Set(projected.enum.filter(item => typeof item === 'string' && item !== ''))];
    if (values.length) projected.enum = values; else delete projected.enum;
  }
  if (projected.properties && projected.required) projected.required = projected.required.filter(name => name in projected.properties);
  // A property schema with no type, members or enum is what Protobuf rejects
  // first; declare the neutral JSON projection instead of sending an empty one.
  if (options.property && !emptyConstraint && !projected.type && !projected.properties && !projected.items && !projected.enum) {
    projected = { ...projected, type: 'string' };
    hints.push('untyped schema projected as string');
  }
  return appendDescription(projected, hints.length ? `Constraints: ${hints.join('; ')}.` : '');
}

export function antigravityRequest(options, projectId, config) {
  const { messages, system } = history(options);
  const contents = [], names = new Map();
  for (const message of messages) for (const block of message.content)
    if (block.type === 'tool-call') names.set(block.id, block.name);
  for (const message of messages) {
    const replay = replayFor(message, options, 'antigravity');
    const parts = replay?.parts ? structuredClone(replay.parts) : [];
    if (!replay?.parts) for (const block of message.content) {
      if (block.type === 'text' && block.text) parts.push({ text: block.text });
      if (block.type === 'image') parts.push(...geminiImageParts(block, options));
      if (block.type === 'tool-call') {
        let args; try { args = JSON.parse(block.arguments); }
        catch { throw new LlmError('历史工具参数不是有效 JSON。', 'INVALID_REQUEST'); }
        parts.push({ functionCall: { name: block.name, args, id: block.id } });
      }
      if (block.type === 'tool-result') {
        const name = names.get(block.toolCallId);
        if (!name) throw new LlmError('工具结果缺少对应的调用记录。', 'INVALID_REQUEST');
        parts.push({ functionResponse: { name, id: block.toolCallId, response: { output: textOf(block.content),
          ...(block.isError ? { error: true } : {}) } } });
        for (const image of block.content.filter(b => b.type === 'image')) parts.push(...geminiImageParts(image, options));
      }
    }
    if (parts.length) {
      const role = message.role === 'assistant' ? 'model' : 'user';
      if (contents.at(-1)?.role === role) contents.at(-1).parts.push(...parts);
      else contents.push({ role, parts });
    }
  }
  const generationConfig = {
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.stop?.length ? { stopSequences: options.stop } : {}),
    ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
    ...(options.reasoningEffort ? { thinkingConfig: { thinkingLevel: options.reasoningEffort.toUpperCase(), includeThoughts: true } } : {}),
  };
  const carried = carrySystemInstruction(contents, system, config?.systemInstructionMode);
  const request = { contents: carried.contents,
    ...(carried.system ? { systemInstruction: { parts: [{ text: carried.system }] } } : {}), generationConfig,
    ...(options.tools?.length ? { tools: [{ functionDeclarations: options.tools.map(t => ({
      name: t.name, description: t.description, parameters: geminiSchema(t.parameters) })) }] } : {}),
    ...(options.sessionId ? { sessionId: options.sessionId } : {}) };
  return { model: options.model, project: projectId, userAgent: 'antigravity', requestType: 'agent', request };
}

/**
 * Choose how the Harness system text reaches the model.
 *
 * `native` is a faithful carriage. `user-prefix` moves the same text into the
 * first user turn and leaves a neutral top-level system, which is the
 * documented fallback for a provider that refuses the full system block; it
 * lowers the instruction's priority, so it remains an explicit opt-in.
 * @param contents - built conversation turns.
 * @param system - system text carried from the request, if any.
 * @param mode - configured carriage mode.
 * @returns the turns and top-level system text to send.
 */
export function carrySystemInstruction(contents, system, mode) {
  if (mode !== 'user-prefix' || !system) return { contents, system };
  const prefix = { text: `[System Instructions]\n${system}\n[/System Instructions]\n\n` };
  const turns = [...contents];
  const index = turns.findIndex(turn => turn.role === 'user' && turn.parts?.some(part => typeof part.text === 'string'));
  if (index === -1) turns.unshift({ role: 'user', parts: [prefix] });
  else turns[index] = { ...turns[index], parts: [prefix, ...turns[index].parts] };
  return { contents: turns, system: 'You are a helpful assistant.' };
}

function codexImageParts(block, options) {
  const image = options.imagePayloads.get(block.attachment.attachmentId);
  return [{ type: 'input_text', text: image.description }, { type: 'input_image', image_url: image.url, detail: 'auto' }];
}
function geminiImageParts(block, options) {
  const image = options.imagePayloads.get(block.attachment.attachmentId);
  return [{ text: image.description }, { inlineData: { mimeType: image.mediaType, data: image.base64 } }];
}

/** Resolve the same request dimensions for preflight, token metering and serialization. */
export function imageRequestTarget(ref, config) {
  return { ...requestImageDimensions(ref.width, ref.height, config.imagePixelBudget), maxBytes: config.imageByteTarget };
}

/** Resolve verified Harness attachments into per-request bytes, never mutate durable messages. */
export async function projectImages(options, attachments, vision, config) {
  const messages = projectOffloadedImages(options.messages, offloadedImageText);
  if (messages !== options.messages) options = { ...options, messages };
  const images = [];
  const visit = blocks => { for (const block of blocks) {
    if (block.type === 'image') images.push(block.attachment);
    if (block.type === 'tool-result') visit(block.content);
  } };
  for (const message of options.messages) visit(message.content);
  if (!images.length) return options;
  if (!vision) throw new LlmError('当前模型的图片识别未开放，请在模型设置中开启，或改用支持图片的模型。', 'UNSUPPORTED_OPTION');
  if (!attachments) throw new LlmError('Harness 附件服务不可用。', 'UNSUPPORTED_OPTION');
  const imagePayloads = new Map(); let total = 0;
  for (const ref of images) {
    options.signal?.throwIfAborted();
    if (!ref?.attachmentId) throw new LlmError('图片附件引用无效。', 'INVALID_REQUEST');
    if (!imagePayloads.has(ref.attachmentId)) {
      const image = await attachments.readImageRequest(ref, imageRequestTarget(ref, config), options.signal);
      const base64 = Buffer.from(image.data).toString('base64');
      imagePayloads.set(ref.attachmentId, { mediaType: image.mediaType, base64, url: `data:${image.mediaType};base64,${base64}`,
        description: `Image attachment ${ref.attachmentId}; request image ${image.width}x${image.height} pixels.`, bytes: base64.length });
    }
    total += imagePayloads.get(ref.attachmentId).bytes;
    if (total > (config.maxRequestImageBytes ?? 20971520)) throw new LlmError('图片请求超过容量限制，请减少图片或开启新会话。', 'INVALID_REQUEST');
  }
  return { ...options, imagePayloads };
}
