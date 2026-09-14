import test from 'node:test';
import assert from 'node:assert/strict';
import { Config } from '../src/config.js';
import { SubscriptionAdapter } from '../src/adapter.js';
import { Accounts } from '../src/accounts.js';
import { PreferencesSchema, normalizeModels } from '../src/catalog.js';
import { projectImages, codexRequest, antigravityRequest } from '../src/messages.js';
import { Images, createImageTool } from '../src/images.js';
import { checkedFetch } from '../src/http.js';
import { createNetwork } from '../src/network.js';
import { memoryCredentials, json, sse, message, collect } from './helpers.js';

function store(value) {
  const merge = (a, b) => { for (const [k,v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v; return a; };
  let state = structuredClone(value);
  return { get: () => state, update: async patch => { state = merge(structuredClone(state), patch); } };
}
const catalogData = () => ({ codex: [{ id: 'gpt-test', name: 'Test', contextWindow: 272000, maxContextWindow: 872000,
  input: ['text','image'], output: ['text'], efforts: ['low','high','ultra'], supportsVerbosity: true }],
  antigravity: [{ id: 'gemini-3-flash', name: 'Gemini', input: ['text','image'], output: ['text'] }] });

test('catalog uses current client version, conditional GET, 401 refresh, and preserves model preferences', async () => {
  const seen = []; let tries = 0;
  const accounts = new Accounts(memoryCredentials(), Config({}), async (url, init) => {
    seen.push({url, init});
    if (url.endsWith('/token')) return json({ access_token: 'renewed', expires_in: 3600 });
    if (++tries === 1) return new Response('{}', { status: 401 });
    if (tries === 3) return new Response(null, { status: 304 });
    return new Response(JSON.stringify({ models: [{ slug:'gpt-test', display_name:'Test', visibility:'list', input_modalities:['text','image'], context_window:272000, max_context_window:872000 }] }), { headers:{etag:'v1'} });
  });
  await accounts.save('codex', { accessToken:'old', refreshToken:'refresh', expiresAt:Date.now()+3600000, accountId:'a' });
  const prefs = store(PreferencesSchema({ models: { codex: { 'gpt-test': { enabled:false, contextWindow:500000 } } } }));
  const adapter = new SubscriptionAdapter(accounts, store(catalogData()), () => {}, prefs);
  await adapter.discover('codex'); await adapter.discover('codex');
  assert.match(seen[0].url, /client_version=0\.153\.3/);
  assert.equal(seen[0].init.headers.originator, 'pi');
  assert.equal(seen.at(-1).init.headers['if-none-match'], 'v1');
  assert.equal(adapter.modelEntries('codex')[0].requestedContext, 500000);
  assert.equal((await adapter.listModels('cpa-codex')).length, 0);
  await assert.rejects(collect(adapter.stream({provider:'cpa-codex',model:'gpt-test',messages:[]})), /已关闭/);
});

test('cancelling one catalog waiter does not cancel the shared provider refresh', async () => {
  let release;
  const accounts = new Accounts(memoryCredentials(), Config({}), () => new Promise(resolve => { release = resolve; }));
  await accounts.save('codex', { accessToken: 'token', accountId: 'a', expiresAt: Date.now() + 3600000 });
  const adapter = new SubscriptionAdapter(accounts, store(catalogData()));
  const controller = new AbortController();
  const first = adapter.discover('codex', controller.signal);
  const second = adapter.discover('codex');
  while (!release) await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  release(json({ models: [{ slug: 'gpt-new', display_name: 'New Model', context_window: 100000 }] }));
  assert.equal((await second)[0].id, 'gpt-new');
  adapter.dispose(); accounts.dispose();
});

test('model settings affect context, request reasoning and verbosity; unsupported overrides reject', async () => {
  let sent;
  const accounts = new Accounts(memoryCredentials(), Config({}), async (_url, init) => { sent = JSON.parse(init.body); return sse([{type:'response.completed',response:{status:'completed',output:[]}}]); });
  await accounts.save('codex',{accessToken:'token',accountId:'a',expiresAt:Date.now()+3600000});
  const adapter = new SubscriptionAdapter(accounts, store(catalogData()), () => {}, store(PreferencesSchema({})));
  await adapter.updateModel('codex','gpt-test',{contextWindow:500000,reasoningEffort:'ultra',verbosity:'high'});
  assert.equal((await adapter.resolveModel('cpa-codex','gpt-test')).context.contextWindow,500000);
  await collect(adapter.stream({provider:'cpa-codex',model:'gpt-test',messages:[]}));
  assert.equal(sent.reasoning.effort,'ultra'); assert.equal(sent.text.verbosity,'high');
  await assert.rejects(adapter.updateModel('codex','gpt-test',{contextWindow:900000}), /872000/);
  await assert.rejects(adapter.updateModel('codex','gpt-test',{reasoningEffort:'unknown'}), /思考强度/);
});

test('consumer Gemini generation uses daily, while project discovery stays on prod', async () => {
  let url;
  const accounts = new Accounts(memoryCredentials(),Config({}),async value=>{url=value;return sse([{response:{candidates:[{content:{parts:[{text:'OK'}]},finishReason:'STOP'}]}}]);});
  await accounts.save('antigravity',{accessToken:'token',projectId:'project',expiresAt:Date.now()+3600000});
  const adapter = new SubscriptionAdapter(accounts,store(catalogData()));
  await collect(adapter.stream({provider:'cpa-antigravity',model:'gemini-3-flash',messages:[message('user',[{type:'text',text:'hello'}])]}));
  assert.equal(new URL(url).hostname,'daily-cloudcode-pa.googleapis.com');
  assert.equal(new URL(accounts.provider('antigravity').apiURL).hostname,'cloudcode-pa.googleapis.com');
});

test('image recognition projects real attachment bytes in both provider protocols without modifying history', async () => {
  const ref={attachmentId:'sha256:test'}, original={messages:[message('user',[{type:'image',attachment:ref}])]};
  const attachments={readImageRequest:async()=>({data:new Uint8Array([1,2,3]),mediaType:'image/png',width:10,height:12})};
  const prepared=await projectImages(original,attachments,true,Config({}));
  assert.equal(codexRequest(prepared).input[0].content[1].image_url,'data:image/png;base64,AQID');
  assert.equal(antigravityRequest(prepared,'p').request.contents[0].parts[1].inlineData.data,'AQID');
  assert.equal(original.imagePayloads,undefined);
  await assert.rejects(projectImages(original,attachments,false,Config({})), /未开放/);
});

test('image generation is a native tool, persists original bytes, and never silently changes provider', async () => {
  const png=Buffer.from([137,80,78,71,13,10,26,10,0]); let request;
  const accounts=new Accounts(memoryCredentials(),Config({}),async(url,init)=>{request={url,body:JSON.parse(init.body)};return json({data:[{b64_json:png.toString('base64')}]});});
  await accounts.save('codex',{accessToken:'token',accountId:'a',expiresAt:Date.now()+3600000});
  const prefs=store(PreferencesSchema({})), adapter=new SubscriptionAdapter(accounts,store(catalogData()),()=>{},prefs);
  const image={attachmentId:'sha256:image',mediaType:'image/png',bytes:9,width:1,height:1};
  let original;
  const attachments={imageLimits:{maxImageBytes:1024,maxMessageImageBytes:2048},validateImage:async()=>{},
    saveFile:async value=>{original=value.data;return {attachmentId:'sha256:file',name:value.name,bytes:value.data.length};},
    saveImage:async()=>image,fileHostPath:()=>'/test/original.png'};
  const images=new Images(accounts,adapter,attachments,prefs,store({entries:[]}));
  const tool=createImageTool(images,async()=>[]);
  const value=await tool.execute({prompt:'A test image'}, {signal:new AbortController().signal,callId:'call-test'});
  assert.equal(request.url,'https://chatgpt.com/backend-api/codex/images/generations');
  assert.equal(request.body.model,'gpt-image-2'); assert.deepEqual(Buffer.from(original),png);
  assert.equal(images.list().length,1); assert.equal(tool.output.render({},value)[1].type,'image');
});

test('429 resource exhaustion is not automatically reported as exhausted account quota', async () => {
  await assert.rejects(checkedFetch(async()=>new Response(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED'}}),{status:429}),'https://example.test',{}),e=>e.code==='RATE_LIMIT' && e.message.includes('不能证明'));
  await assert.rejects(checkedFetch(async()=>new Response(JSON.stringify({error:{details:[{reason:'QUOTA_EXHAUSTED'}]}}),{status:429}),'https://example.test',{}),e=>e.code==='QUOTA');
});

test('plugin proxy selection does not replace global fetch or bypass explicit direct mode', async () => {
  const original=globalThis.fetch; let proxy;
  const net=createNetwork(()=>({mode:'auto'}),{env:{HTTPS_PROXY:'http://127.0.0.1:7890'},proxyFetch:async(_u,_i,p)=>{proxy=p;return json({});}});
  await net.fetch('https://chatgpt.com/backend-api/codex/models',{});
  assert.equal(proxy,'http://127.0.0.1:7890'); assert.equal(globalThis.fetch,original);
  let direct=false;
  await createNetwork(()=>({mode:'direct'}),{env:{HTTPS_PROXY:'http://127.0.0.1:7890'},directFetch:async()=>{direct=true;return json({});}}).fetch('https://chatgpt.com/test',{});
  assert.equal(direct,true);
});
