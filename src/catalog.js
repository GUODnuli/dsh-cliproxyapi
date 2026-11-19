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

export function catalogEntries(raw, provider) {
  const source = raw?.models ?? raw?.data;
  if (!Array.isArray(source)) return source && typeof source === 'object' ? Object.entries(source) : [];
  return source.map(value => provider === 'antigravity' && typeof value === 'string'
    ? [value, {}]
    : [value?.slug || value?.id || (provider === 'antigravity' && typeof value?.name === 'string'
      && /^[a-z][a-z0-9._-]*$/.test(value.name) ? value.name : undefined), value]);
}

export const isGemini4 = id => typeof id === 'string' && /^gemini-4(?:[.-]|$)/i.test(id);

const LEVELS = ['low', 'medium', 'high', 'xhigh'];
const INTERNAL_SLOTS = new Map([['gemini-4-hydrogen-sonar', '[Internal Sonar / Low-Thinking]']]);

/** An entry the account may not call: an explicit flag, or a `-disabled` catalog placeholder. */
export const isDisabledPlaceholder = (id, value) => value?.disabled === true || value?.available === false || /-disabled$/i.test(id);

/**
 * Read one model's remaining quota. Proto3 omits a zero-valued float, so an
 * entry that carries `quotaInfo` without `remainingFraction` is 0% remaining,
 * while a missing `quotaInfo` says nothing and must not be read as zero.
 */
export function quotaOf(value) {
  const info = value?.quotaInfo ?? value?.quota_info;
  if (!info || typeof info !== 'object') return { present: false };
  const raw = info.remainingFraction ?? info.remaining_fraction;
  const fraction = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : undefined;
  return { present: true, remaining: Number.isFinite(fraction) ? fraction : 0 };
}

export const isQuotaExhausted = value => {
  const quota = quotaOf(value);
  return quota.present && quota.remaining <= 0;
};

const titleWord = token => token.charAt(0).toUpperCase() + token.slice(1);
const LEVEL_LABELS = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh' };
const levelLabel = token => LEVEL_LABELS[token] ?? titleWord(token);

function nameWords(tokens) {
  const words = [];
  let numeric = [];
  const flush = () => {
    if (!numeric.length) return;
    words.push(numeric.join('.'));
    numeric = [];
  };
  for (const token of tokens) {
    if (token === 'tiered' || LEVELS.includes(token)) { flush(); continue; }
    if (/^\d+$/.test(token)) { numeric.push(token); continue; }
    flush();
    words.push(titleWord(token));
  }
  flush();
  return words;
}

/** Deterministic display name from the model id, so an upstream label cannot misreport the version. */
export function modelDisplayName(id) {
  const [family, ...rest] = String(id).split('-');
  const tiered = rest.indexOf('tiered');
  const tier = tiered >= 0 && rest[tiered + 1] ? ` (Tiered ${levelLabel(rest[tiered + 1])})` : '';
  // A level suffix names a distinct route, so it stays readable in the picker.
  const levels = tier ? [] : rest.filter(token => LEVELS.includes(token)).map(levelLabel);
  const words = nameWords(rest);
  if (!words.length) return undefined;
  return `${titleWord(family)} ${words.join(' ')}${tier}${levels.length ? ` (${levels.join(' / ')})` : ''}`;
}

function declaredLevels(value) {
  const declared = value?.supported_reasoning_levels ?? value?.supportedReasoningLevels;
  if (!Array.isArray(declared)) return undefined;
  const levels = declared.map(item => typeof item === 'string' ? item : item?.effort)
    .filter(item => typeof item === 'string' && item)
    .map(item => item.toLowerCase())
    .filter(item => LEVELS.includes(item));
  return levels.length ? [...new Set(levels)] : undefined;
}

function familyLevels(id) {
  const family = /^gemini-4-([a-z]+)/i.exec(id)?.[1]?.toLowerCase();
  if (!family) return undefined;
  // Extra (xhigh) is documented for Hydrogen and Neon; Carbon and Argon stop at High.
  return family === 'hydrogen' || family === 'neon' ? ['low', 'medium', 'high', 'xhigh'] : ['low', 'medium', 'high'];
}

function reasoningMetadata(id, value, provider) {
  if (provider !== 'antigravity' || !isGemini4(id)) {
    const levels = declaredLevels(value);
    const supplied = value?.default_reasoning_level ?? value?.defaultReasoningLevel;
    return { efforts: levels, defaultReasoning: typeof supplied === 'string' ? supplied : undefined };
  }
  if (INTERNAL_SLOTS.has(id)) {
    // An internal safety slot has no documented level control; expose one only
    // when the catalog names it.
    return { efforts: declaredLevels(value), defaultReasoning: undefined };
  }
  if (value?.supportsThinking === false) return { efforts: undefined, defaultReasoning: undefined };
  const suffix = String(id).split('-').filter(token => LEVELS.includes(token));
  let efforts = declaredLevels(value) ?? familyLevels(id);
  // A route whose id names a level keeps that level selectable even when this
  // build knows nothing about its family.
  if (!efforts && suffix.length) efforts = ['low', 'medium', 'high', ...(suffix.includes('xhigh') ? ['xhigh'] : [])];
  if (efforts && suffix.some(level => !efforts.includes(level))) {
    efforts = [...new Set([...efforts, ...suffix])].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b));
  }
  const supplied = (value?.default_reasoning_level ?? value?.defaultReasoningLevel)?.toLowerCase();
  const preferred = [supplied, ...suffix.slice().reverse()].find(level => level && efforts?.includes(level));
  return { efforts: efforts?.length ? efforts : undefined, defaultReasoning: preferred };
}

/** Normalize upstream entries without creating new route IDs or enabling denied models. */
export function normalizeModels(raw, provider) {
  const seen = new Set(), models = [];
  let unavailable = 0;
  for (const [id, value] of catalogEntries(raw, provider)) {
    if (typeof id !== 'string' || !id || id.length > 192 || !value || typeof value !== 'object' || seen.has(id)) continue;
    if (provider === 'antigravity' && (!/gemini|claude/i.test(id) || /video|veo/i.test(id))) continue;
    seen.add(id);
    if (provider === 'antigravity' && isDisabledPlaceholder(id, value)) { unavailable += 1; continue; }
    const internal = provider === 'antigravity' && INTERNAL_SLOTS.get(id);
    if (provider === 'antigravity' && !internal && isQuotaExhausted(value)) { unavailable += 1; continue; }
    const known = INITIAL_MODELS[provider]?.find(m => m.id === id);
    const contextWindow = positive(value.context_window) ?? positive(value.contextWindow) ?? positive(value.inputTokenLimit)
      ?? positive(value.maxInputTokens) ?? positive(value.max_context_window)
      ?? (provider === 'antigravity' ? positive(value.contextLength) ?? positive(value.maxTokens) : undefined) ?? known?.contextWindow;
    const maximum = positive(value.max_context_window) ?? positive(value.maxContextWindow);
    const declaredInput = modalities(value.input_modalities ?? value.inputModalities ?? value.supportedInputModalities ?? value.input);
    const input = declaredInput
      ?? known?.input
      ?? ((provider === 'antigravity' && /gemini|claude/i.test(id)) || (provider === 'codex' && !/embedding|moderation/i.test(id)) ? ['text', 'image'] : ['text']);
    const output = modalities(value.output_modalities ?? value.outputModalities ?? value.supportedOutputModalities ?? value.output)
      ?? (/image|imagen/i.test(id) ? ['image'] : ['text']);
    const { efforts, defaultReasoning } = reasoningMetadata(id, value, provider);
    const upstreamName = [value.display_name, value.displayName, value.name].find(x => typeof x === 'string' && x.trim());
    const name = internal ?? (provider === 'antigravity' ? modelDisplayName(id) : undefined) ?? upstreamName ?? id;
    models.push(clean({ id, name,
      contextWindow, maxContextWindow: maximum === undefined ? contextWindow : Math.max(maximum, contextWindow ?? 0),
      maxTokens: positive(value.max_output_tokens) ?? positive(value.outputTokenLimit)
        ?? (provider === 'antigravity' ? positive(value.maxOutputTokens) ?? positive(value.maxCompletionTokens) : undefined)
        ?? (internal ? 65536 : undefined), input, output,
      efforts,
      visible: internal ? false : value.visibility === undefined || value.visibility === 'list', priority: Number.isFinite(value.priority) ? value.priority : 0,
      supportsVerbosity: value.support_verbosity === true || (value.support_verbosity === undefined && known?.supportsVerbosity === true),
      defaultReasoning,
      defaultVerbosity: ['low', 'medium', 'high'].includes(value.default_verbosity) ? value.default_verbosity : undefined }));
  }
  if (!models.length && !unavailable) throw new LlmError('上游模型目录为空或格式不正确；已保留上次成功获取的目录。', 'INVALID_RESPONSE');
  return models.sort((a, b) => b.priority - a.priority);
}

/** Sanitized view of every Gemini 4 key the catalog returned, for the diagnostics surface. */
export function gemini4Report(raw, provider = 'antigravity') {
  return catalogEntries(raw, provider).filter(([id]) => isGemini4(id)).map(([id, value]) => {
    const quota = quotaOf(value);
    return { id, disabled: value?.disabled === true, available: value?.available !== false,
      placeholder: /-disabled$/i.test(id), internal: INTERNAL_SLOTS.has(id),
      quotaInfo: value?.quotaInfo ?? value?.quota_info ?? null,
      remainingFraction: quota.present ? quota.remaining : null,
      excluded: isDisabledPlaceholder(id, value) || (!INTERNAL_SLOTS.has(id) && isQuotaExhausted(value)) };
  }).sort((a, b) => a.id.localeCompare(b.id));
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
