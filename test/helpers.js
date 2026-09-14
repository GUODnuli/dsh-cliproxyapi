export function memoryCredentials() {
  const records = new Map(), queues = new Map();
  return {
    records,
    async readRecord(key) { return structuredClone(records.get(key)); },
    modifyRecord(key, mutate) {
      const result = (queues.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
        const next = await mutate(structuredClone(records.get(key)));
        if (next !== undefined) records.set(key, structuredClone(next));
        return structuredClone(records.get(key));
      });
      queues.set(key, result); return result;
    },
    async deleteRecord(key) {
      await (queues.get(key) || Promise.resolve()).catch(() => {}); records.delete(key);
    },
  };
}

export function sse(events, split = 7) {
  const bytes = new TextEncoder().encode(events.map(e => 'data: ' + JSON.stringify(e) + '\r\n\r\n').join(''));
  let i = 0;
  return new Response(new ReadableStream({ pull(controller) {
    if (i >= bytes.length) { controller.close(); return; }
    controller.enqueue(bytes.slice(i, i + split)); i += split;
  } }), { headers: { 'content-type': 'text/event-stream' } });
}

export const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
export const collect = async stream => { const values = []; for await (const value of stream) values.push(value); return values; };
export const message = (role, content, source = { kind: 'user' }) => ({ id: 'msg-test', role, content, source });
export const jwt = claims => `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.test-signature`;
