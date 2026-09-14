# Extractable Components

Because the frontend is monolithic, every source path is `client.js`; exact line ranges identify the reusable unit. Props listed here are only state/navigation/data inputs that may vary between host surfaces. Labels, icons, classes, and CSS remain hardcoded unless noted.

## Layout Components

## SubscriptionAccounts
- Source: `client.js` lines 1968–2302
- Category: layout
- Description: Complete CPA settings-section shell with header actions, four tabs, and conditional content regions.
- Extractable props: none currently; potential `initialTab` and externally supplied state/actions would require refactoring.
- Hardcoded: product title/version, four tab labels/icons, `.cpa-container` shell, all DSH slot expectations.

## ComposerQuota
- Source: `client.js` lines 1157–1237
- Category: layout
- Description: Inline/fallback quota strip mounted into the DSH conversation composer dock.
- Extractable props: `directory`, `controller`, `session`.
- Hardcoded: provider route map, five-minute refresh cadence, ring geometry, Chinese quota labels, DSH composer selectors.

## Basic Components

## Icon
- Source: `client.js` lines 8–48
- Category: basic
- Description: SVG icon renderer for the plugin's fixed local path catalog.
- Extractable props: `name`, `size`, `className`, `spin`, `style`.
- Hardcoded: SVG view box, stroke icon list, all path data, fallback to `info`.

## Switch
- Source: `client.js` lines 1240–1248
- Category: basic
- Description: Checkbox-backed toggle with optional label and tooltip.
- Extractable props: `checked`, `onChange`, `disabled`, `label`, `title`.
- Hardcoded: `cpa-switch` class structure and inline label spacing/type.

## ModelRow
- Source: `client.js` lines 1251–1437
- Category: basic
- Description: Expandable model capability/configuration card with dirty and saved states.
- Extractable props: `model`, `provider`, `run`, `busy`.
- Hardcoded: tuning field labels, context presets, badge/icon mapping, button copy, CSS classes.

## QuotaPanel
- Source: `client.js` lines 1452–1489
- Category: basic
- Description: Quota panel with progress rows, reset metadata, and refresh/error/empty states.
- Extractable props: `account`, `brandColor`.
- Hardcoded: threshold colors, labels, progress structure, icons, CSS classes.

## AccountCard
- Source: `client.js` lines 1492–1588
- Category: basic
- Description: Subscription-provider account card containing identity, OAuth status, quota, catalog status, and account actions.
- Extractable props: `account`, `busy`, `run`.
- Hardcoded: Codex/Antigravity brand colors and icons, login/action text, account-card composition.

## NetworkPanel
- Source: `client.js` lines 1591–1679
- Category: basic
- Description: Three-choice network routing selector with conditional manual proxy input and save state.
- Extractable props: `settings`, `route`, `run`, `busy`.
- Hardcoded: auto/direct/manual options, descriptions, icons, proxy example, CSS classes.

## ImagePanel
- Source: `client.js` lines 1682–1934
- Category: basic
- Description: Image-generation preferences, test playground, reference thumbnails, and recent-image gallery.
- Extractable props: `state`, `run`, `busy`.
- Hardcoded: provider/model option copy, maximum five references, accepted MIME types, gallery endpoints, icons and labels.

## DiagnosticsPanel
- Source: `client.js` lines 1937–1965
- Category: basic
- Description: Diagnostics JSON card with clipboard action and copied feedback.
- Extractable props: `state`, `run`, `busy` (`run` and `busy` are currently unused).
- Hardcoded: heading/subtitle/button copy, `JSON.stringify` display, CSS classes.

## Shared patterns worth future extraction after refactor
- **Button variants**: CSS-only `.cpa-btn` + primary/secondary/ghost/danger/small/save modifiers; no standalone React component today.
- **Card shell**: CSS-only `.cpa-card`, `.cpa-card-header`, `.cpa-card-title`, `.cpa-card-inner`; repeated across tabs but no component function today.
- **Badge/Chip**: CSS-only `.cpa-badge*` and `.cpa-chip`; repeated inline and good candidates for components.
- **Field controls**: CSS-only `.cpa-field`, `.cpa-input`, `.cpa-select`; repeated inline without a shared component.
- **Alert**: CSS-only `.cpa-alert-box` variants; repeated inline without a shared component.

Do not register the CSS-only patterns as existing DraftComponents until they are actually extracted or represented by a concrete design component; the function components above are the current reusable source units.
