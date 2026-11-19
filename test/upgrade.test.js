import test from 'node:test';
import assert from 'node:assert/strict';
import { Config } from '../src/config.js';
import { SubscriptionAdapter } from '../src/adapter.js';
import { Accounts } from '../src/accounts.js';
import { PreferencesSchema, normalizeModels, modelDisplayName } from '../src/catalog.js';
import { antigravityHeaders, antigravityUserAgent } from '../src/oauth.js';
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

test('Antigravity discovery queries the authorized project and publishes only returned models', async t => {
  const seen = [];
  const accounts = new Accounts(memoryCredentials(), Config({}), async (url, init) => {
    seen.push({ url, method: init.method, body: JSON.parse(init.body) });
    return json({ models: { 'gemini-4-carbon-high': { displayName: 'Gemini 4 Carbon (High)' } } });
  });
  const adapter = new SubscriptionAdapter(accounts, store(catalogData()));
  t.after(() => { adapter.dispose(); accounts.dispose(); });
  await accounts.save('antigravity', { accessToken: 'fixture', projectId: 'authorized-project', expiresAt: Date.now() + 3600000 });
  await adapter.discover('antigravity');
  assert.deepEqual(seen, [{ url: 'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
    method: 'POST', body: { project: 'authorized-project' } }]);
  assert.deepEqual((await adapter.listModels('cpa-antigravity')).map(model => model.id), ['gemini-4-carbon-high']);
  assert.match(adapter.status('antigravity').message, /上游返回 1 个 Gemini 4/);
});

test('Gemini 4 catalog preserves route IDs, supported efforts and upstream availability', async () => {
  const models = normalizeModels({ models: [
    { id: 'gemini-4-carbon-high', maxTokens: 1048576, maxOutputTokens: 65536 },
    { name: 'gemini-4-argon-medium', supportedReasoningLevels: ['LOW', { effort: 'MEDIUM' }] },
    'gemini-4-neon-xhigh',
    { id: 'gemini-4-hydrogen' },
    { id: 'gemini-4-hydrogen-sonar' },
    { id: 'gemini-4-carbon-disabled', disabled: true },
    { id: 'gemini-4-argon-low', available: false },
  ] }, 'antigravity');
  assert.deepEqual(models.map(model => [model.id, model.efforts, model.defaultReasoning]), [
    ['gemini-4-carbon-high', ['low', 'medium', 'high'], 'high'],
    ['gemini-4-argon-medium', ['low', 'medium'], 'medium'],
    ['gemini-4-neon-xhigh', ['low', 'medium', 'high', 'xhigh'], 'xhigh'],
    ['gemini-4-hydrogen', ['low', 'medium', 'high', 'xhigh'], undefined],
    ['gemini-4-hydrogen-sonar', undefined, undefined],
  ]);
  assert.equal(models[0].contextWindow, 1048576);
  assert.equal(models[0].maxTokens, 65536);
  assert.deepEqual(normalizeModels({ models: { 'gemini-4-neon-high': { supportsThinking: false } } }, 'antigravity')[0].efforts, undefined);
  assert.deepEqual(normalizeModels({ models: { 'gemini-4-carbon-high': { disabled: true } } }, 'antigravity'), []);
  assert.throws(() => normalizeModels({ models: {} }, 'antigravity'), { code: 'INVALID_RESPONSE' });
});

test('advertised Gemini 4 suffix maps to the default wire effort without changing the model ID', async t => {
  let body;
  const accounts = new Accounts(memoryCredentials(), Config({}), async (_url, init) => {
    body = JSON.parse(init.body);
    return sse([{ response: { candidates: [{ content: { parts: [{ text: 'OK' }] }, finishReason: 'STOP' }] } }]);
  });
  await accounts.save('antigravity', { accessToken: 'fixture', projectId: 'fixture-project', expiresAt: Date.now() + 3600000 });
  const model = 'gemini-4-carbon-high';
  const antigravity = normalizeModels({ models: { [model]: {} } }, 'antigravity');
  const adapter = new SubscriptionAdapter(accounts, store({ antigravity }));
  t.after(() => { adapter.dispose(); accounts.dispose(); });
  assert.equal((await adapter.resolveModel('cpa-antigravity', model)).reasoning.defaultEffort, 'high');
  await collect(adapter.stream({ provider: 'cpa-antigravity', model, messages: [] }));
  assert.equal(body.model, model);
  assert.deepEqual(body.request.generationConfig.thinkingConfig, { thinkingLevel: 'HIGH', includeThoughts: true });
});

test('Antigravity wire identity is the hub client fingerprint without harness attribution', () => {
  assert.equal(antigravityUserAgent(Config({}), 'darwin', 'arm64'),
    'antigravity/hub/2.32.2 (aidev_client; os_type=macos; arch=arm64; cl=1022991777)');
  assert.equal(antigravityUserAgent(Config({ antigravityVersion: '9.9.9', antigravityChangelist: 42,
    antigravityOsType: 'linux', antigravityArch: 'x64' }), 'darwin', 'arm64'),
  'antigravity/hub/9.9.9 (aidev_client; os_type=linux; arch=x64; cl=42)');
  const headers = antigravityHeaders(Config({}), 'fixture-token');
  assert.equal(headers['user-agent'], antigravityUserAgent(Config({})));
  assert.doesNotMatch(JSON.stringify(headers), /deepseek-harness/);
  assert.equal(headers.authorization, 'Bearer fixture-token');
  assert.equal(headers['content-type'], 'application/json');
});

test('Gemini 4 catalog accepts every returned family and drops denied or exhausted entries', () => {
  const models = normalizeModels({ models: {
    'gemini-4-carbon-high': { quotaInfo: { remainingFraction: 0.4 }, maxTokens: 1048576, maxOutputTokens: 65536 },
    'gemini-4-argon-low': { quotaInfo: {} },
    'gemini-4-neon-high': { quotaInfo: { remainingFraction: 0.1 } },
    'gemini-4-hydrogen-tiered-xhigh': { quotaInfo: { remainingFraction: 1 } },
    'gemini-4-hydrogen-disabled': {},
    'gemini-4-carbon-low-disabled': {},
    'gemini-4-neon-low': { quotaInfo: { remainingFraction: 0 } },
    'gemini-4-hydrogen-sonar': {},
    'gemini-2.5-flash': {},
    'gemini-2.5-flash-lite': {},
  } }, 'antigravity');
  assert.deepEqual(models.map(model => model.id),
    ['gemini-4-carbon-high', 'gemini-4-neon-high', 'gemini-4-hydrogen-tiered-xhigh',
      'gemini-4-hydrogen-sonar', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']);
  const byId = Object.fromEntries(models.map(model => [model.id, model]));
  assert.equal(byId['gemini-4-carbon-high'].name, 'Gemini 4 Carbon (High)');
  assert.equal(byId['gemini-4-carbon-high'].contextWindow, 1048576);
  assert.equal(byId['gemini-4-carbon-high'].maxTokens, 65536);
  assert.deepEqual(byId['gemini-4-hydrogen-tiered-xhigh'].efforts, ['low', 'medium', 'high', 'xhigh']);
  assert.equal(byId['gemini-4-hydrogen-tiered-xhigh'].defaultReasoning, 'xhigh');
  assert.equal(byId['gemini-4-hydrogen-tiered-xhigh'].name, 'Gemini 4 Hydrogen (Tiered XHigh)');
  assert.equal(byId['gemini-4-hydrogen-sonar'].name, '[Internal Sonar / Low-Thinking]');
  assert.equal(byId['gemini-4-hydrogen-sonar'].visible, false);
  assert.equal(byId['gemini-4-hydrogen-sonar'].maxTokens, 65536);
  assert.equal(byId['gemini-2.5-flash'].name, 'Gemini 2.5 Flash');
  assert.equal(byId['gemini-2.5-flash-lite'].name, 'Gemini 2.5 Flash Lite');
  assert.equal(modelDisplayName('claude-opus-5-5-high'), 'Claude Opus 5.5 (High)');
});

test('diagnostics expose raw Gemini 4 keys with their disabled and quota state', async t => {
  let requestBody;
  const accounts = new Accounts(memoryCredentials(), Config({}), async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return json({ models: {
      'gemini-4-carbon-high': { quotaInfo: { remainingFraction: 0.5 } },
      'gemini-4-argon-high-disabled': { disabled: true },
      'gemini-4-neon-high': { quotaInfo: {} },
      'gemini-4-hydrogen-sonar': {},
    } });
  });
  await accounts.save('antigravity', { accessToken: 'fixture', projectId: 'fixture-project', expiresAt: Date.now() + 3600000 });
  const adapter = new SubscriptionAdapter(accounts, store(catalogData()));
  t.after(() => { adapter.dispose(); accounts.dispose(); });
  await adapter.discover('antigravity');
  assert.deepEqual(requestBody, { project: 'fixture-project' });
  const report = adapter.diagnostics('antigravity');
  assert.equal(report.total, 4);
  assert.deepEqual(report.gemini4.map(entry => [entry.id, entry.disabled, entry.remainingFraction, entry.excluded]), [
    ['gemini-4-argon-high-disabled', true, null, true],
    ['gemini-4-carbon-high', false, 0.5, false],
    ['gemini-4-hydrogen-sonar', false, null, false],
    ['gemini-4-neon-high', false, 0, true],
  ]);
  assert.match(adapter.status('antigravity').message, /上游返回 4 个 Gemini 4/);
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
  const ref={attachmentId:'sha256:test',width:4000,height:3000}, original={messages:[message('user',[{type:'image',attachment:ref}])]};
  const config=Config({imagePixelBudget:3000000});
  const attachments={readImageRequest:async(_ref,target)=>{
    assert.deepEqual(target, {width:2000,height:1500,maxBytes:config.imageByteTarget});
    return {data:new Uint8Array([1,2,3]),mediaType:'image/png',width:2000,height:1500};
  }};
  const prepared=await projectImages(original,attachments,true,config);
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
