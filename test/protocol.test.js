import test from 'node:test';
import assert from 'node:assert/strict';
import { codexStream, antigravityStream, usageOf } from '../src/streams.js';
import { codexRequest, antigravityRequest, geminiSchema } from '../src/messages.js';
import { checkedFetch, readSSE } from '../src/http.js';
import { normalizeModels, SubscriptionAdapter, INITIAL_MODELS } from '../src/adapter.js';
import { sse, json, collect, message, memoryCredentials } from './helpers.js';
import { Accounts } from '../src/accounts.js';
import { Config } from '../src/config.js';

test('Codex tool stream preserves arguments, encrypted replay, and cache-disjoint usage', async () => {
  const item = { type: 'function_call', id: 'fc_one', call_id: 'call_one', name: 'read_file', arguments: '{"path":"中文.txt"}' };
  const reason = { type: 'reasoning', id: 'rs_one', encrypted_content: 'opaque-reasoning', summary: [] };
  const result = await collect(codexStream(sse([
    { type: 'response.output_item.done', output_index: 0, item: reason },
    { type: 'response.output_item.added', output_index: 1, item: { ...item, arguments: '' } },
    { type: 'response.function_call_arguments.delta', output_index: 1, delta: '{"path":' },
    { type: 'response.function_call_arguments.delta', output_index: 1, delta: '"中文.txt"}' },
    { type: 'response.output_item.done', output_index: 1, item },
    { type: 'response.completed', response: { status: 'completed', output: [reason, item],
      usage: { input_tokens: 100, output_tokens: 12, input_tokens_details: { cached_tokens: 80 }, total_tokens: 112 } } },
  ])));
  const content = result.filter(e => e.type === 'block-end').map(e => e.block);
  assert.equal(content.length, 1); assert.equal(content[0].arguments, item.arguments);
  assert.equal(result.at(-1).reason.kind, 'tool-calls');
  assert.deepEqual(result.find(e => e.type === 'usage').usage, { inputTokens: 20, outputTokens: 12, cacheReadTokens: 80, totalTokens: 112 });
  const options = { provider: 'cpa-codex', model: 'test-codex', messages: [
    message('assistant', content, { kind: 'model', provider: 'cpa-codex', model: 'test-codex', replayState: result.at(-1).replayState }),
    message('user', [{ type: 'tool-result', toolCallId: 'call_one', content: [{ type: 'text', text: 'file content' }] }]),
  ] };
  const next = codexRequest(options);
  assert.equal(next.input[0].encrypted_content, 'opaque-reasoning');
  assert.equal(next.input[1].call_id, next.input[2].call_id);
  options.messages[0].content[0].arguments = '{}';
  assert.equal(codexRequest(options).input.some(i => i.encrypted_content), false, 'edited history must not resurrect stale replay');
});

test('provider requests ignore assistant-only blocks embedded in user notices', () => {
  const notice = message('user', [
    { type: 'text', text: 'Background subagent failed before it finished.' },
    { type: 'reasoning', text: 'unfinished child reasoning' },
    { type: 'tool-call', id: 'call_orphan', name: 'read', arguments: '{"file_path":"unfinished.txt"}' },
  ], { kind: 'subagent-settled', form: 'notice' });

  const codex = codexRequest({ provider: 'cpa-codex', model: 'test-codex', messages: [notice] });
  assert.deepEqual(codex.input, [{ role: 'user', content: [{
    type: 'input_text', text: 'Background subagent failed before it finished.',
  }] }]);

  const antigravity = antigravityRequest({ provider: 'cpa-antigravity', model: 'gemini-test', messages: [notice] }, 'project-one');
  assert.deepEqual(antigravity.request.contents, [{ role: 'user', parts: [{
    text: 'Background subagent failed before it finished.',
  }] }]);
});

test('Antigravity preserves thought signatures and function ids across tool-result continuation', async () => {
  const result = await collect(antigravityStream(sse([
    { response: { candidates: [{ content: { parts: [{ text: '思考', thought: true, thoughtSignature: 'signed-reason' }] } }] } },
    { response: { candidates: [{ content: { parts: [{ functionCall: { name: 'read_file', args: { path: 'a.txt' } }, thoughtSignature: 'signed-call' }] } }] } },
    { response: { candidates: [{ finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, cachedContentTokenCount: 60,
      candidatesTokenCount: 7, thoughtsTokenCount: 3, totalTokenCount: 110 } } },
  ])));
  const content = result.filter(e => e.type === 'block-end').map(e => e.block), call = content[1];
  const request = antigravityRequest({ provider: 'cpa-antigravity', model: 'gemini-test', messages: [
    message('assistant', content, { kind: 'model', provider: 'cpa-antigravity', model: 'gemini-test', replayState: result.at(-1).replayState }),
    message('user', [{ type: 'tool-result', toolCallId: call.id, content: [{ type: 'text', text: 'OK' }] }]),
  ] }, 'project-one');
  assert.equal(request.request.contents[0].parts[1].thoughtSignature, 'signed-call');
  assert.equal(request.request.contents[1].parts[0].functionResponse.id, call.id);
  assert.equal(request.request.contents[1].parts[0].functionResponse.name, 'read_file');
  assert.deepEqual(result.find(e => e.type === 'usage').usage,
    { inputTokens: 40, cacheReadTokens: 60, outputTokens: 10, reasoningTokens: 3, totalTokens: 110 });
});

test('incomplete streams fail instead of silently reporting success', async () => {
  await assert.rejects(collect(codexStream(sse([{ type: 'response.output_text.delta', delta: 'partial' }]))), /断开/);
  await assert.rejects(collect(antigravityStream(sse([{ response: { candidates: [{ content: { parts: [{ text: 'partial' }] } }] } }]))), /断开/);
});

test('SSE handles multiline data and aborts pending readers', async () => {
  const response = new Response('data: {"x":\r\ndata: "中文"}\r\n\r\n');
  assert.deepEqual(await collect(readSSE(response)), [{ x: '中文' }]);
  const controller = new AbortController();
  const stalled = new Response(new ReadableStream({ start() {} }));
  const waiting = collect(readSSE(stalled, controller.signal)); controller.abort();
  await assert.rejects(waiting, { name: 'AbortError' });
});

test('errors never echo upstream response bodies or credential values', async () => {
  await assert.rejects(checkedFetch(async () => new Response('secret-token', { status: 401 }), 'https://example.test', {}),
    error => error.code === 'AUTH' && !error.message.includes('secret-token'));
});

test('schema conversion preserves property names; unsupported attachments are refused', () => {
  assert.deepEqual(geminiSchema({ type: 'object', properties: { default: { type: ['string', 'null'], default: 'x' } }, additionalProperties: false }),
    { type: 'object', properties: { default: { type: 'string', nullable: true } } });
  assert.throws(() => geminiSchema({ $ref: '#/definitions/X' }), /\$ref/);
  assert.throws(() => codexRequest({ messages: [message('user', [{ type: 'image' }])] }), /图片/);
});

test('Antigravity projects Harness unions and constraints into a compatible tool schema', () => {
  const parameters = { type: 'object', properties: {
    plugin: { oneOf: [
      { type: 'object', additionalProperties: false, properties: {
        kind: { type: 'string', const: 'new' }, idPrefix: { type: 'string' },
      }, required: ['kind', 'idPrefix'] },
      { type: 'object', additionalProperties: false, properties: {
        kind: { type: 'string', const: 'existing' }, pluginId: { type: 'string' },
      }, required: ['kind', 'pluginId'] },
    ] },
    requestId: { type: 'string', minLength: 1 },
    pages: { type: 'array', items: { oneOf: [{ type: 'integer' }, { type: 'string' }] } },
    pattern: { type: 'string' },
  }, required: ['plugin', 'requestId', 'pattern'], additionalProperties: false };
  const body = antigravityRequest({ model: 'gemini-test', messages: [message('user', [{ type: 'text', text: 'hello' }])],
    tools: [{ name: 'problematic_tool', description: 'fixture', parameters }] }, 'project-one');
  const schema = body.request.tools[0].functionDeclarations[0].parameters;
  assert.deepEqual(schema.properties.plugin, { type: 'object', properties: {
    kind: { type: 'string', enum: ['new', 'existing'] }, idPrefix: { type: 'string' }, pluginId: { type: 'string' },
  }, required: ['kind'] });
  assert.deepEqual(schema.properties.requestId, { type: 'string', description: 'Constraints: minLength=1.' });
  assert.deepEqual(schema.properties.pages.items, { type: 'string', description: 'Accepted JSON types: integer or string.' });
  assert.deepEqual(schema.properties.pattern, { type: 'string' }, 'property names that match schema keywords must survive');
  assert.doesNotMatch(JSON.stringify(schema), /"(?:oneOf|const|minLength|additionalProperties)"\s*:/);
});

test('model discovery accepts Codex and Antigravity response formats without inventing ids', () => {
  assert.equal(normalizeModels({ models: [{ slug: 'gpt-test', display_name: 'GPT Test', context_window: 1000 }] }, 'codex')[0].id, 'gpt-test');
  const google = normalizeModels({ models: { 'gemini-test': { displayName: 'Gemini Test' }, 'gemini-image': {}, 'claude-test': {} } }, 'antigravity');
  assert.deepEqual(google.map(m => m.id), ['gemini-test', 'gemini-image', 'claude-test']);
});

test('direct adapter sends provider request and Harness attribution, without a local CPA server', async () => {
  const calls = [];
  const accounts = new Accounts(memoryCredentials(), Config({}), async (url, init) => {
    calls.push({ url, init });
    return sse([{ type: 'response.completed', response: { status: 'completed', output: [{ type: 'message',
      content: [{ type: 'output_text', text: 'hello' }] }] } }]);
  });
  await accounts.save('codex', { accessToken: 'test-token', accountId: 'account-one', expiresAt: Date.now() + 3600000 });
  const adapter = new SubscriptionAdapter(accounts, { get: () => INITIAL_MODELS });
  const chunks = await collect(adapter.stream({ provider: 'cpa-codex', model: 'gpt-5.4', sessionId: 'session-stable',
    messages: [message('user', [{ type: 'text', text: 'hello' }])] }));
  assert.equal(calls[0].url, 'https://chatgpt.com/backend-api/codex/responses');
  assert.match(calls[0].init.headers['user-agent'], /deepseek-harness/);
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-token');
  assert.equal(calls[0].init.headers['session-id'], 'session-stable');
  assert.equal(JSON.parse(calls[0].init.body).prompt_cache_key, 'session-stable');
  assert.equal(chunks.at(-1).reason.kind, 'stop');
});
