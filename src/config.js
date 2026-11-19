import Schema from '@deepseek-ai/schemastery';
import { CatalogSchema, PreferencesSchema } from './catalog.js';

export const Config = Schema.object({
  codexCallbackPort: Schema.number().min(1).max(65535).step(1).default(1455),
  antigravityCallbackPort: Schema.number().min(1).max(65535).step(1).default(51121),
  loginTimeoutMs: Schema.number().min(1000).default(300000),
  tokenTimeoutMs: Schema.number().min(1000).default(30000),
  refreshSkewMs: Schema.number().min(0).default(60000),
  antigravityVersion: Schema.string().default('2.32.2'),
  antigravityChangelist: Schema.number().min(1).step(1).default(1022991777),
  antigravityOsType: Schema.string().default(''),
  antigravityArch: Schema.string().default(''),
  codexClientVersion: Schema.string().default('0.153.3'),
  catalogTimeoutMs: Schema.number().min(1000).max(120000).default(15000),
  refreshOnStartup: Schema.boolean().default(false),
  // `native` sends the Harness system text as `systemInstruction`. The
  // `user-prefix` fallback prepends it to the first user turn and keeps a
  // neutral top-level system; it changes instruction priority and is never
  // selected implicitly.
  systemInstructionMode: Schema.union(['native', 'user-prefix']).default('native'),
  quotaTimeoutMs: Schema.number().min(1000).max(120000).default(20000),
  maxRequestImageBytes: Schema.number().min(1024).default(20971520),
  imagePixelBudget: Schema.number().min(1).default(4194304),
  imageByteTarget: Schema.number().min(1024).default(1048576),
  preferences: PreferencesSchema.default({}).volatile(),
  catalog: CatalogSchema.default({}).volatile(),
  gallery: Schema.object({ entries: Schema.array(Schema.any()).default([]) }).default({}).volatile(),
});

export const PROVIDERS = Object.freeze({
  codex: {
    route: 'cpa-codex', label: 'Codex 订阅 · CPA',
    clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
    authURL: 'https://auth.openai.com/oauth/authorize',
    tokenURL: 'https://auth.openai.com/oauth/token',
    scope: 'openid email profile offline_access',
    apiURL: 'https://chatgpt.com/backend-api/codex',
  },
  antigravity: {
    route: 'cpa-antigravity', label: 'Antigravity 订阅 · CPA',
    clientId: ['1071006060591', 'tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com'].join('-'),
    // Public installed-application OAuth client value from CLIProxyAPI.
    clientSecret: ['GOCSPX', 'K58FWR486LdLJ1mLB8sXC4z6qDAf'].join('-'),
    authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo?alt=json',
    scope: ['cloud-platform', 'userinfo.email', 'userinfo.profile', 'cclog', 'experimentsandconfigs']
      .map(scope => `https://www.googleapis.com/auth/${scope}`).join(' '),
    apiURL: 'https://cloudcode-pa.googleapis.com',
    generationURL: 'https://daily-cloudcode-pa.googleapis.com',
    onboardURL: 'https://daily-cloudcode-pa.googleapis.com',
  },
});

export function providerOf(id) {
  const value = Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id] : undefined;
  if (!value) throw new Error('渠道只能是 codex 或 antigravity。');
  return value;
}
