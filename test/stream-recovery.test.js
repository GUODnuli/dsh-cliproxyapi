import test from 'node:test';
import assert from 'node:assert/strict';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { readSSE } from '../src/http.js';
import { codexStream, antigravityStream } from '../src/streams.js';
import { SubscriptionAdapter } from '../src/adapter.js';
import { collect, sse } from './helpers.js';

function brokenStream(events, error) {
  let index = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(events[index++])}\n\n`));
      } else controller.error(error);
    },
  }));
}

const retryPolicy = () => new SubscriptionAdapter().providerRetryPolicy();

for (const [name, error] of [
  ['Node proxy aborted/ECONNRESET', Object.assign(new Error('aborted'), { code: 'ECONNRESET' })],
  ['Undici terminated/socket', new TypeError('terminated', { cause: { code: 'UND_ERR_SOCKET' } })],
  ['upstream AbortError without caller cancellation', new DOMException('remote closed', 'AbortError')],
]) {
  test(`SSE ${name} becomes a retryable NETWORK failure`, async () => {
    const response = brokenStream([], error);
    await assert.rejects(collect(readSSE(response, new AbortController().signal)), failure => {
      assert.ok(failure instanceof LlmError);
      assert.equal(failure.code, 'NETWORK');
      assert.ok(retryPolicy().retryableCodes.includes(failure.code));
      assert.equal(retryPolicy().maxRetries, 2);
      return true;
    });
    assert.equal(response.body.locked, false);
  });
}

for (const [name, decode, events] of [
  ['Codex', codexStream, [
    { type: 'response.output_item.added', output_index: 0,
      item: { type: 'function_call', id: 'fc_pending', call_id: 'call_pending', name: 'pwsh', arguments: '' } },
    { type: 'response.function_call_arguments.delta', output_index: 0, delta: '{"command":"echo test"}' },
  ]],
  ['Antigravity', antigravityStream, [
    { response: { candidates: [{ content: { parts: [{ functionCall: { name: 'pwsh', args: { command: 'echo test' } } }] } }] } },
  ]],
]) {
  test(`${name} mid-tool disconnect never commits unfinished calls or success`, async () => {
    const chunks = [];
    await assert.rejects(async () => {
      for await (const chunk of decode(brokenStream(events, new Error('aborted')))) chunks.push(chunk);
    }, failure => failure.code === 'NETWORK');
    assert.ok(chunks.some(chunk => chunk.type === 'tool-call-delta'));
    assert.equal(chunks.some(chunk => chunk.type === 'block-end' || chunk.type === 'finish'), false);
  });
}

test('caller abort reason takes precedence over a simultaneous reader error', async () => {
  const controller = new AbortController();
  const reason = new Error('user stopped the turn');
  const response = new Response(new ReadableStream({ pull(stream) {
    controller.abort(reason);
    stream.error(new Error('aborted'));
  } }));
  await assert.rejects(collect(readSSE(response, controller.signal)), error => error === reason);
  assert.equal(response.body.locked, false);
});

test('already-cancelled caller stays cancelled and closes the reader', async () => {
  const controller = new AbortController();
  controller.abort(new Error('already stopped'));
  const response = sse([{ ok: true }]);
  await assert.rejects(collect(readSSE(response, controller.signal)), error => error === controller.signal.reason);
  assert.equal(response.body.locked, false);
});

test('protocol errors remain INVALID_RESPONSE rather than retryable network errors', async () => {
  await assert.rejects(collect(readSSE(new Response('data: not-json\n\n'))), error => error.code === 'INVALID_RESPONSE');
});

test('response-read failures never expose upstream secrets or request details', async () => {
  const secret = 'secret-token-and-private-url';
  await assert.rejects(collect(readSSE(brokenStream([], new Error(secret)))), error => {
    assert.equal(error.code, 'NETWORK');
    assert.equal(JSON.stringify(error).includes(secret), false);
    assert.equal(String(error).includes(secret), false);
    return true;
  });
});
