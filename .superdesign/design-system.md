# CLIProxyAPI Subscription Settings Design System

## Product and target
A compact account-and-model control panel embedded inside the DeepSeek Harness settings dialog. It manages two subscription providers (OpenAI Codex and Google Antigravity), shows live quota windows, exposes model discovery/configuration, and provides image/network/diagnostic tabs.

Primary job: let users understand account health and remaining quota in seconds, then reach the correct refresh/login/model action without scanning a dense wall of controls.

## Hard platform constraints
- Render only the inner settings-section content; DeepSeek Harness owns the surrounding sidebar, title bar and scroll container.
- Use plain React `createElement`, inline SVG paths and one plugin-scoped CSS string. No JSX, TypeScript, imports, external fonts or new dependencies.
- Preserve all existing actions and states: login, relogin, logout, per-account quota refresh, model refresh, refresh-all-quotas, stop-waiting, tab navigation, loading, error and OAuth pending.
- Preserve semantic Harness CSS variables and work in light and dark themes.
- Optimize primarily for an inner content pane around 584px wide, while supporting up to 820px and narrow mobile widths.

## Visual direction
Quiet, precise, product-native control surface—not a marketing page. Use calm neutral surfaces, strong information hierarchy, restrained provider accents and generous but efficient spacing. Avoid glassmorphism, neon, decorative gradients, oversized hero copy, excessive shadows, dense pill clutter and unrelated illustrations.

## Color
Use only these sources:
- Host semantic variables: `--dsw-alias-label-*`, `--dsw-alias-bg-*`, `--dsw-alias-border-*`, `--dsw-alias-interactive-*`, `--dsw-alias-brand-primary`.
- Provider accents: Codex `#10a37f`; Antigravity `#4285f4`.
- Semantic states: success `#10b981`, warning `#f59e0b`, danger `#ef4444`, capability purple `#9333ea`.
Provider colors should identify accounts and quota fills, not become large saturated backgrounds.

## Typography
Inherit Harness font. Title 20–22px with 650–700 weight. Card headings 14–15px/600. Controls and body 12–13px. Metadata 11–12px. Use monospace only for model IDs and token values. Maintain clear contrast and avoid all-caps labels.

## Layout and density
- Main vertical rhythm: 12–16px.
- Use one compact service toolbar rather than a decorative hero.
- Keep the tab bar visually stable and easy to scan.
- Present account status, quota and actions as one coherent module; prefer a two-column quota summary when width permits and a single column when narrow.
- Prioritize quota values and reset timing over decorative treatment.
- Separate frequent actions (refresh) from destructive logout without scattering controls.
- Model catalog remains below account health and uses compact expandable rows.

## Components
- Buttons: 32px standard, 26–28px compact; 8px radius; visible focus ring; primary only for the highest-priority action.
- Cards: 12–14px radius, 1px semantic border, minimal shadow.
- Status: use a dot plus text; never rely on color alone.
- Quota: clear numeric percentage, thin progress track, explicit reset time; warning/danger thresholds at 30% and 10%.
- Tabs: segmented control using the same surface tokens; active state must remain obvious in dark mode.
- Empty/loading/error: keep layout stable and use concise inline feedback.

## Motion and accessibility
150–240ms functional transitions only. Keep refresh spin and pending pulse; disable motion under `prefers-reduced-motion`. All icon-only actions require titles/labels. Tabs should expose `role=tab`, `aria-selected`; progress bars retain numeric ARIA values. Touch targets should remain usable at compact widths.

## Exact Harness light-theme anchors
Use the host variables first; these values are fallback/visual anchors taken from the installed Harness theme:
- base/layer background: `#ffffff`
- subtle module background: `rgba(140, 150, 170, 0.08)` or neutral `#f9fafb`
- primary text: `#0f1115`
- secondary text: `#61666b`
- tertiary text: `#81858c`
- border: `rgb(0 0 0 / 10%)`
- DeepSeek selection blue: `#4176e6`; light selection surface: `#edf3fe` / `#eff6ff`
- success green: `#22c55e`

Do not use warm brown/orange as a primary visual direction, purple gradients, glassmorphism, large black bands, a marketing hero, illustrations, or an independent website footer. Blue is reserved for selection and Antigravity identity; green is reserved for connection, Codex identity, quota and success.

## Width and composition contract
- Treat the 866×855 screenshot as the visual ground truth for the outer Harness settings window.
- The plugin is only the right settings section; keep the surrounding Harness chrome visually unchanged.
- The plugin container uses `width: 100%; max-width: 640px`; the common live content width is about 584px.
- Do not stretch account cards beyond the section width even on a larger canvas.
- At 584–640px, quota content uses at most two columns. Prefer one full-width total quota followed by two half-width model quotas, or a compact vertical list. Never use four columns.
- At 520px and below, quota content collapses to one column and toolbar/actions wrap without truncating model names or reset times.

## Requested redesign outcome
Refine the existing account-and-model screen so it feels indistinguishable from a native Harness settings module: compact, calm and precise, with faster scanning and no visual discontinuity. Keep the existing feature set and terminology. Use a light service toolbar rather than a hero, preserve the segmented tabs, make account header/status/actions coherent, clearly expose “刷新所有额度”, and make automatic/background synchronization understandable without adding visual noise.