import Schema from '@deepseek-ai/schemastery';
import { LlmError } from '@deepseek-ai/dsh-llm';

const positive = value => Number.isSafeInteger(value) && value > 0 ? value : undefined;
const modalities = value => Array.isArray(value) ? [...new Set(value.map(x => String(x).toLowerCase()).filter(x => ['text', 'image'].includes(x)))] : undefined;
const clean = value => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));

export const INITIAL_MODELS = {
  codex: [{ id: 'gpt-5.4', name: 'GPT-5.4', contextWindow: 272000, maxContextWindow: 1050000, input: ['text', 'image'], output: ['text'],
    efforts: ['low', 'medium', 'high', 'xhigh'], supportsVerbosity: true }],
  antigravity: [
    { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro', contextWindow: 1048576, input: ['text', 'image'], output: ['text'] },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', contextWindow: 1048576, input: ['text', 'image'], output: ['text'] },
  ],
};

const Model = Schema.object({ id: Schema.string().required(), name: Schema.string().required(),
  contextWindow: Schema.number().min(1).step(1), maxContextWindow: Schema.number().min(1).step(1),
  maxTokens: Schema.number().min(1).step(1), efforts: Schema.array(Schema.string()),
  input: Schema.array(Schema.string()), output: Schema.array(Schema.string()),
  visible: Schema.boolean(), priority: Schema.number(), supportsVerbosity: Schema.boolean(),
  defaultReasoning: Schema.string(), defaultVerbosity: Schema.string() });
export const CatalogSchema = Schema.object({ codex: Schema.array(Model).default(INITIAL_MODELS.codex),
  antigravity: Schema.array(Model).default(INITIAL_MODELS.antigravity) });

/** Normalize the actual Codex catalog and Antigravity map without discarding capabilities. */
export function normalizeModels(raw, provider) {
  const source = raw?.models ?? raw?.data;
  const entries = Array.isArray(source) ? source.map(value => [value?.slug || value?.id, value])
    : source && typeof source === 'object' ? Object.entries(source) : [];
  const seen = new Set(), models = [];
  for (const [id, value] of entries) {
    if (typeof id !== 'string' || !id || id.length > 192 || !value || typeof value !== 'object' || seen.has(id)) continue;
    if (provider === 'antigravity' && (!/gemini|claude/i.test(id) || /video|veo/i.test(id))) continue;
    seen.add(id);
    const known = INITIAL_MODELS[provider]?.find(m => m.id === id);
    const contextWindow = positive(value.context_window) ?? positive(value.contextWindow) ?? positive(value.inputTokenLimit)
      ?? positive(value.maxInputTokens) ?? positive(value.max_context_window) ?? known?.contextWindow;
    const maximum = positive(value.max_context_window) ?? positive(value.maxContextWindow);
    const declaredInput = modalities(value.input_modalities ?? value.inputModalities ?? value.supportedInputModalities ?? value.input);
    const input = declaredInput
      ?? known?.input
      ?? ((provider === 'antigravity' && /gemini|claude/i.test(id)) || (provider === 'codex' && !/embedding|moderation/i.test(id)) ? ['text', 'image'] : ['text']);
    const output = modalities(value.output_modalities ?? value.outputModalities ?? value.supportedOutputModalities ?? value.output)
      ?? (/image|imagen/i.test(id) ? ['image'] : ['text']);
    const efforts = Array.isArray(value.supported_reasoning_levels)
      ? [...new Set(value.supported_reasoning_levels.map(item => typeof item === 'string' ? item : item?.effort).filter(x => typeof x === 'string' && x))] : undefined;
    models.push(clean({ id, name: [value.display_name, value.displayName, value.name].find(x => typeof x === 'string' && x) || id,
      contextWindow, maxContextWindow: maximum === undefined ? contextWindow : Math.max(maximum, contextWindow ?? 0),
      maxTokens: positive(value.max_output_tokens) ?? positive(value.outputTokenLimit), input, output,
      efforts: efforts?.length ? efforts : undefined,
      visible: value.visibility === undefined || value.visibility === 'list', priority: Number.isFinite(value.priority) ? value.priority : 0,
      supportsVerbosity: value.support_verbosity === true || (value.support_verbosity === undefined && known?.supportsVerbosity === true),
      defaultReasoning: typeof value.default_reasoning_level === 'string' ? value.default_reasoning_level : undefined,
      defaultVerbosity: ['low', 'medium', 'high'].includes(value.default_verbosity) ? value.default_verbosity : undefined }));
  }
  if (!models.length) throw new LlmError('上游模型目录为空或格式不正确；已保留上次成功获取的目录。', 'INVALID_RESPONSE');
  return models.sort((a, b) => b.priority - a.priority);
}

export const MAX_CONTEXT = 16000000;
const Preference = Schema.object({ enabled: Schema.boolean(), vision: Schema.boolean(),
  contextWindow: Schema.union([Schema.number().min(1).max(MAX_CONTEXT).step(1), Schema.const(null)]),
  reasoningEffort: Schema.union([Schema.string(), Schema.const(null)]),
  verbosity: Schema.union(['low', 'medium', 'high', Schema.const(null)]) });
export const PreferencesSchema = Schema.object({
  models: Schema.dict(Schema.dict(Preference)).default({}),
  network: Schema.object({ mode: Schema.union(['auto', 'direct', 'manual']).default('auto'), proxyURL: Schema.string().default('') }).default({}),
  images: Schema.object({ enabled: Schema.boolean().default(true), provider: Schema.union(['codex', 'antigravity']).default('codex'),
    model: Schema.string().default('gpt-image-2'), quality: Schema.union(['auto', 'low', 'medium', 'high']).default('auto') }).default({}),
});

export function modelSettings(model, preferences, provider) {
  const own = preferences.models?.[provider];
  const overrides = own && Object.hasOwn(own, model.id) ? own[model.id] : {};
  const maximum = model.maxContextWindow ?? model.contextWindow ?? MAX_CONTEXT;
  return { ...model, enabled: overrides.enabled ?? model.visible ?? true,
    vision: overrides.vision ?? model.input?.includes('image') ?? false,
    reasoningEffort: overrides.reasoningEffort ?? null, verbosity: overrides.verbosity ?? null,
    requestedContext: overrides.contextWindow ?? null,
    effectiveContext: Math.min(overrides.contextWindow ?? model.contextWindow ?? 262144, maximum),
    maximumContext: maximum };
}

export function validateModelPatch(model, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(k => !['enabled', 'vision', 'contextWindow', 'reasoningEffort', 'verbosity'].includes(k)))
    throw new Error('无效的模型设置。');
  for (const key of ['enabled', 'vision']) if (Object.hasOwn(patch, key) && typeof patch[key] !== 'boolean') throw new Error('模型开关必须是布尔值。');
  if (patch.reasoningEffort != null && !model.efforts?.includes(patch.reasoningEffort)) throw new Error('该模型不支持这个思考强度。');
  if (patch.verbosity != null && (!model.supportsVerbosity || !['low', 'medium', 'high'].includes(patch.verbosity))) throw new Error('该模型不支持这个输出详略选项。');
  if (Object.hasOwn(patch, 'contextWindow') && patch.contextWindow !== null) {
    const cap = model.maxContextWindow ?? model.contextWindow ?? MAX_CONTEXT;
    if (!positive(patch.contextWindow) || patch.contextWindow > cap) throw new Error(`上下文长度必须是 1 到 ${cap} 之间的整数。`);
  }
  return patch;
}
