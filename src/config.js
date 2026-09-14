import Schema from '@deepseek-ai/schemastery';

export const Config = Schema.object({
  codexCallbackPort: Schema.number().min(1).max(65535).step(1).default(1455),
  antigravityCallbackPort: Schema.number().min(1).max(65535).step(1).default(51121),
  loginTimeoutMs: Schema.number().min(1000).default(300000),
  tokenTimeoutMs: Schema.number().min(1000).default(30000),
  refreshSkewMs: Schema.number().min(0).default(60000),
  antigravityVersion: Schema.string().default('2.9.1'),
  codexClientVersion: Schema.string().default('0.153.3'),
  catalogTimeoutMs: Schema.number().min(1000).max(120000).default(15000),
  quotaTimeoutMs: Schema.number().min(1000).max(120000).default(20000),
  maxRequestImageBytes: Schema.number().min(1024).default(20971520),
  imagePixelBudget: Schema.number().min(1).default(4194304),
  imageByteTarget: Schema.number().min(1024).default(1048576),
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
