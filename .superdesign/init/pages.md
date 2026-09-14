# Page Dependency Trees

These trees list local repository files only. `client.js` has no local ESM imports: it obtains React/ReactDOM from the DSH browser module loader. Runtime API dependencies are shown because the UI fetches them dynamically rather than importing them.

## DSH Settings → 订阅账号 (CPA)
Entry: `client.js` — `SubscriptionAccounts` (lines 1968–2302)
Dependencies:
- `client.js`
  - `Icon` (lines 8–48)
  - `STYLE` / `ensureStyles` (lines 50–1047)
  - `api` (lines 1049–1058)
  - `Switch` (lines 1240–1248)
  - `ModelRow` (lines 1251–1437)
    - `Switch`
    - `Icon`
  - `QuotaPanel` (lines 1452–1489)
    - `quotaPercent` / `quotaResetLabel` (lines 1439–1450)
    - `Icon`
  - `AccountCard` (lines 1492–1588)
    - `QuotaPanel`
    - `Icon`
  - `NetworkPanel` (lines 1591–1679)
    - `Icon`
  - `ImagePanel` (lines 1682–1934)
    - `Switch`
    - `Icon`
  - `DiagnosticsPanel` (lines 1937–1965)
    - `Icon`
- Runtime JSON endpoint: `src/web.js`
  - `src/config.js`
  - `src/images.js`
    - `src/http.js`
    - `src/oauth.js`
      - `src/accounts.js`
        - `src/config.js`
        - `src/http.js`
      - `src/http.js`
  - `src/quota.js`
    - `src/config.js`
    - `src/http.js`
    - `src/oauth.js`

## Account & Model View (default tab)
Entry: `client.js` — `SubscriptionAccounts`, state `tab === 'models'` (lines 2168–2286)
Dependencies:
- `client.js`
  - `AccountCard`
    - `QuotaPanel`
      - `Icon`
  - `ModelRow`
    - `Switch`
    - `Icon`
  - `api`
- Runtime state/action endpoint: `src/web.js`
  - `src/config.js`
  - `src/quota.js`
  - `src/images.js`

## Image Studio View
Entry: `client.js` — `ImagePanel` (lines 1682–1934; selected at 2288–2289)
Dependencies:
- `client.js`
  - `ImagePanel`
    - `Switch`
    - `Icon`
  - `api`
- State/generation endpoint: `src/web.js`
  - `src/images.js`
    - `src/http.js`
    - `src/oauth.js`
      - `src/accounts.js`
      - `src/http.js`
- Gallery bytes endpoint: `src/web.js` (`/api/cpa-images`)

## Network Proxy View
Entry: `client.js` — `NetworkPanel` (lines 1591–1679; selected at 2291–2297)
Dependencies:
- `client.js`
  - `NetworkPanel`
    - `Icon`
  - `api`
- Preference/state endpoint: `src/web.js`
- Host service implementation: `index.js`
  - `src/network.js`
  - `src/catalog.js`
  - `src/config.js`

## Diagnostics View
Entry: `client.js` — `DiagnosticsPanel` (lines 1937–1965; selected at 2299–2300)
Dependencies:
- `client.js`
  - `DiagnosticsPanel`
    - `Icon`
  - `api`
- Runtime state endpoint: `src/web.js`

## Conversation Composer Quota Dock
Entry: `client.js` — `ComposerQuota` (lines 1157–1237), registered at lines 2314–2330
Dependencies:
- `client.js`
  - `ComposerQuota`
    - `installEffortMemory` and local-storage helpers (lines 1075–1151)
    - `quotaColor` (lines 1153–1155)
    - `quotaResetLabel` (lines 1445–1450; function declaration is hoisted)
    - `api`
- Quota endpoint: `src/web.js`
  - `src/quota.js`
    - `src/config.js`
    - `src/http.js`
    - `src/oauth.js`

## Context-selection note
For a future design call, start with `client.js` plus the compact top of `theme.md`. Add `src/web.js` only when behavior/data contracts matter; add its transitive server files selectively rather than passing all backend implementation.
