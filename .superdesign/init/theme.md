# Theme and Design Tokens

## Part 1 — Compact token summary

### Theme ownership
- The plugin does **not** declare `:root`, `.dark`, `[data-theme]`, a theme provider, Tailwind config, CSS Modules, or separate CSS files.
- It inherits the DSH host theme through `--dsw-alias-*` variables and supplies light-safe fallback values. Dark mode therefore follows host alias values rather than plugin-owned selectors.
- Font family is `inherit`. Monospace data uses `ui-monospace, SFMono-Regular, Consolas, monospace` (or inline `monospace`).

### Color palette (host token → fallback / explicit accents)
- Labels: `--dsw-alias-label-primary` → `#1e293b` / active tab `#0f172a`; secondary → `#475569`; tertiary → `#64748b`; dimmed → `#94a3b8`; caption → `#8b95a7`.
- Surfaces: `--dsw-alias-bg-layer-1` → `#ffffff` or `rgba(255,255,255,.72/.5)`; `--dsw-alias-bg-module-platform` → `rgba(140,150,170,.05–.12)`.
- Borders: `--dsw-alias-border-l1/l2/l3` → blue-gray `rgba(140,150,170,.13–.40)`; quota track can fall back to `#d5d9e2`.
- Brand/action: `--dsw-alias-brand-primary` → `#2563eb` / focus `#3b82f6`; white text `#ffffff`.
- Provider accents: Codex `#10a37f`; Antigravity `#4285f4`.
- Semantic: success `#10b981`, save `#059669/#047857`; warning `#f59e0b`, `#d97706`, `#b45309`, `#92400e`; error `#ef4444`; purple/image `#9333ea/#7c3aed`.

### Typography
- Base family: inherited from DSH host.
- UI sizes used: 9, 10, 11, 12, 13, 14, 15, and 20px.
- Main title: 20px, weight 680, letter-spacing `-0.025em`.
- Section/model titles: 14–15px, weight 600; key quota number: 15px, weight 700.
- Captions/meta: 9–12px; body/form controls: 12–13px.
- Line heights: captions/body commonly 1.35–1.5; quota value uses 1.

### Spacing and sizing
- Main shell: column gap 16px, `max-width: 820px`, centered; bottom padding 32px. Mobile media reduces shell gap to 12px.
- Common gaps: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16px.
- Card padding: 16px; account card: `13px 14px 12px 17px`; compact inner panels: 10–14px.
- Controls: standard buttons/inputs 32px high; tabs 34px; small buttons 26px; switches 36×20px; account icons 34px.
- Composer quota fallback width: `max-width: var(--dsh-chat-content-width, 748px)`.
- Grid minima: quota 150px, gallery/network 220px, two-column forms 260px.

### Radius and elevation
- Radius scale: 4, 6, 7, 8, 9, 10, 12, 20, 999px; circles use 50%.
- Active tab shadow: `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)`.
- Cards: subtle `0 1px 2px rgba(0,0,0,.025)`; gallery `0 1px 3px rgba(0,0,0,.05)`.
- Primary action: `0 1px 2px rgba(37,99,235,.2)`, hover `0 2px 5px rgba(37,99,235,.3)`.

### Responsive breakpoints and motion
- Container query at 420px hides composer quota source label.
- Container query at 520px stacks header/overview, makes action buttons flexible, and collapses quota grid to one column.
- Media query at 640px tightens the main gap and tab typography/padding.
- Motion: 150–240ms transitions; 1s spin; 1.8s pulse. `prefers-reduced-motion: reduce` disables quota transitions and loading animations.

## Part 2 — Raw source dumps

No Tailwind/global CSS/theme-provider file exists. The complete theme source is the `STYLE` template literal plus its style injector in `client.js`.

### `client.js` lines 50–1047 — complete `STYLE` and `ensureStyles`
```js
  // DeepSeek Harness Client CSS Styles
  const STYLE = `
    .cpa-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 820px;
      margin: 0 auto;
      color: var(--dsw-alias-label-primary, #1e293b);
      font-family: inherit;
      box-sizing: border-box;
      container-type: inline-size;
      padding-bottom: 32px;
    }
    .cpa-container *, .cpa-container *::before, .cpa-container *::after {
      box-sizing: border-box;
    }
    .cpa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding: 4px 2px 8px;
    }
    .cpa-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 340px);
    }
    .cpa-title {
      font-size: 20px;
      font-weight: 680;
      letter-spacing: -0.025em;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--dsw-alias-label-primary);
    }
    .cpa-subtitle {
      font-size: 12px;
      line-height: 1.45;
      color: var(--dsw-alias-label-tertiary, #64748b);
      margin: 0;
    }
    .cpa-header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 7px;
      flex-wrap: wrap;
    }
    .cpa-overview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 38px;
      padding: 8px 12px;
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
      border-radius: 10px;
      background: var(--dsw-alias-bg-layer-1, #ffffff);
    }
    .cpa-overview-stats {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }
    .cpa-overview-item {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      min-width: 0;
    }
    .cpa-overview-label {
      color: var(--dsw-alias-label-tertiary, #64748b);
      font-size: 11px;
      white-space: nowrap;
    }
    .cpa-overview-value {
      overflow: hidden;
      color: var(--dsw-alias-label-primary, #1e293b);
      font-size: 12px;
      font-weight: 650;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cpa-overview-sync {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: none;
      color: var(--dsw-alias-label-secondary, #475569);
      font-size: 11px;
      white-space: nowrap;
    }
    .cpa-account-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cpa-tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 3px;
      padding: 3px;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.08));
      border-radius: 10px;
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
    }
    .cpa-tab {
      min-width: 0;
      height: 34px;
      border: 0;
      border-radius: 7px;
      padding: 0 10px;
      background: transparent;
      color: var(--dsw-alias-label-secondary, #475569);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 160ms cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      white-space: nowrap;
    }
    .cpa-tab:hover:not([data-active="true"]) {
      color: var(--dsw-alias-label-primary);
      background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05));
    }
    .cpa-tab[data-active="true"] {
      background: var(--dsw-alias-bg-layer-1, #ffffff);
      color: var(--dsw-alias-label-primary, #0f172a);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
      font-weight: 600;
    }
    .cpa-card {
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      border-radius: 12px;
      background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.72));
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.025);
      position: relative;
    }
    .cpa-card[data-provider] {
      overflow: hidden;
      gap: 10px;
      padding: 13px 14px 12px 17px;
    }
    .cpa-card[data-provider]::before {
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--cpa-account-color, var(--dsw-alias-brand-primary, #2563eb));
      content: '';
    }
    .cpa-account-identity {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }
    .cpa-account-icon {
      width: 34px;
      height: 34px;
      border: 1px solid color-mix(in srgb, var(--cpa-account-color) 20%, transparent);
      border-radius: 9px;
      background: color-mix(in srgb, var(--cpa-account-color) 10%, transparent);
      color: var(--cpa-account-color);
      display: flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .cpa-account-copy {
      min-width: 0;
    }
    .cpa-account-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-top: 3px;
      color: var(--dsw-alias-label-tertiary, #64748b);
      font-size: 12px;
    }
    .cpa-account-email {
      overflow: hidden;
      color: var(--dsw-alias-label-secondary, #475569);
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cpa-connection-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 26px;
      padding: 4px 9px;
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.2));
      border-radius: 999px;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.08));
      color: var(--dsw-alias-label-secondary, #475569);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    .cpa-account-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.13));
    }
    .cpa-account-actions .cpa-btn {
      height: 27px;
      padding: 0 9px;
      font-size: 11px;
    }
    .cpa-account-action-spacer {
      flex: 1 1 auto;
    }
    .cpa-card-inner {
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.08));
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
      border-radius: 10px;
      padding: 12px 14px;
    }
    .cpa-quota-panel {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: hidden;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.075));
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
      border-radius: 9px;
      padding: 0;
    }
    .cpa-quota-header, .cpa-quota-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .cpa-quota-header {
      min-height: 32px;
      padding: 0 10px;
      border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.13));
      color: var(--dsw-alias-label-secondary, #475569);
      font-size: 10px;
    }
    .cpa-quota-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1px;
      background: var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.13));
    }
    .cpa-quota-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
      padding: 10px;
      background: var(--dsw-alias-bg-layer-1, #ffffff);
    }
    .cpa-quota-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 500;
      color: var(--dsw-alias-label-primary, #1e293b);
    }
    .cpa-quota-value {
      flex-shrink: 0;
      font-size: 15px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: var(--dsw-alias-label-primary, #1e293b);
    }
    .cpa-quota-track {
      height: 4px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.18));
    }
    .cpa-quota-fill {
      height: 100%;
      border-radius: inherit;
      background: var(--cpa-quota-color, #10a37f);
      transition: width 240ms ease;
    }
    .cpa-quota-meta {
      overflow: hidden;
      color: var(--dsw-alias-label-tertiary, #64748b);
      font-size: 9px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cpa-quota-empty {
      min-height: 44px;
      padding: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--dsw-alias-label-tertiary, #64748b);
      font-size: 11px;
    }
    .cpa-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .cpa-card-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--dsw-alias-label-primary);
      margin: 0;
    }
    .cpa-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      background: #94a3b8;
    }
    .cpa-dot[data-state="connected"] {
      background: var(--dsw-alias-state-success-primary, #10b981);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
    }
    .cpa-dot[data-state="pending"] {
      background: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
      animation: cpa-pulse 1.8s infinite;
    }
    .cpa-dot[data-state="disconnected"] {
      background: var(--dsw-alias-state-error-primary, #ef4444);
    }
    .cpa-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.2;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.12));
      color: var(--dsw-alias-label-secondary, #475569);
      border: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.2));
    }
    .cpa-badge-brand {
      background: rgba(59, 130, 246, 0.12);
      color: #2563eb;
      border-color: rgba(59, 130, 246, 0.25);
    }
    .cpa-badge-success {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border-color: rgba(16, 185, 129, 0.25);
    }
    .cpa-badge-purple {
      background: rgba(147, 51, 234, 0.12);
      color: #7c3aed;
      border-color: rgba(147, 51, 234, 0.25);
    }
    .cpa-badge-amber {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border-color: rgba(245, 158, 11, 0.25);
    }
    .cpa-btn {
      height: 32px;
      padding: 0 13px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 150ms ease;
      border: 1px solid transparent;
      user-select: none;
      white-space: nowrap;
      text-decoration: none;
      outline: none;
    }
    .cpa-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary, #3b82f6);
    }
    .cpa-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
    }
    .cpa-btn-primary {
      background: var(--dsw-alias-brand-primary, #2563eb);
      color: #ffffff !important;
      border: 0;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
    }
    .cpa-btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
      box-shadow: 0 2px 5px rgba(37, 99, 235, 0.3);
    }
    .cpa-btn-secondary {
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.1));
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.25));
      color: var(--dsw-alias-label-primary);
    }
    .cpa-btn-secondary:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover, rgba(140, 150, 170, 0.18));
      border-color: var(--dsw-alias-border-l3, rgba(140, 150, 170, 0.4));
    }
    .cpa-btn-ghost {
      background: transparent;
      border-color: transparent;
      color: var(--dsw-alias-label-secondary);
    }
    .cpa-btn-ghost:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover, rgba(140, 150, 170, 0.1));
      color: var(--dsw-alias-label-primary);
    }
    .cpa-btn-danger {
      background: transparent;
      color: var(--dsw-alias-state-error-primary, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .cpa-btn-danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .cpa-btn-sm {
      height: 26px;
      padding: 0 9px;
      font-size: 12px;
      border-radius: 6px;
    }
    .cpa-btn-save {
      background: #059669;
      color: #ffffff;
      border: 0;
    }
    .cpa-btn-save:hover:not(:disabled) {
      background: #047857;
    }
    .cpa-switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .cpa-switch input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    .cpa-switch-track {
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: var(--dsw-alias-border-l3, #cbd5e1);
      transition: background 180ms cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .cpa-switch-thumb {
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cpa-switch input:checked + .cpa-switch-track {
      background: var(--dsw-alias-brand-primary, #2563eb);
    }
    .cpa-switch input:checked + .cpa-switch-track .cpa-switch-thumb {
      transform: translateX(16px);
    }
    .cpa-switch input:disabled + .cpa-switch-track {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .cpa-input, .cpa-select {
      height: 32px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.25));
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.08));
      color: var(--dsw-alias-label-primary);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 150ms, box-shadow 150ms;
      width: 100%;
    }
    .cpa-input:focus, .cpa-select:focus {
      border-color: var(--dsw-alias-brand-primary, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    .cpa-input::placeholder {
      color: var(--dsw-alias-label-dimmed, #94a3b8);
    }
    .cpa-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .cpa-search-icon {
      position: absolute;
      left: 10px;
      pointer-events: none;
      color: var(--dsw-alias-label-tertiary);
    }
    .cpa-search-input {
      padding-left: 34px !important;
      padding-right: 32px !important;
    }
    .cpa-search-clear {
      position: absolute;
      right: 8px;
      background: transparent;
      border: 0;
      color: var(--dsw-alias-label-tertiary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
    }
    .cpa-search-clear:hover {
      color: var(--dsw-alias-label-primary);
    }
    .cpa-filter-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .cpa-chip {
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 12px;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.08));
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
      transition: all 150ms ease;
      user-select: none;
    }
    .cpa-chip:hover {
      border-color: var(--dsw-alias-border-l3);
      color: var(--dsw-alias-label-primary);
    }
    .cpa-chip[data-active="true"] {
      background: var(--dsw-alias-brand-primary, #2563eb);
      color: #ffffff;
      border-color: var(--dsw-alias-brand-primary, #2563eb);
      font-weight: 500;
    }
    .cpa-model-card {
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      border-radius: 10px;
      background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.5));
      overflow: hidden;
      transition: border-color 150ms ease;
    }
    .cpa-model-card:hover {
      border-color: var(--dsw-alias-border-l3, rgba(140, 150, 170, 0.35));
    }
    .cpa-model-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      gap: 12px;
    }
    .cpa-model-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    .cpa-model-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .cpa-model-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cpa-model-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--dsw-alias-label-primary);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .cpa-model-id {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.1));
      color: var(--dsw-alias-label-tertiary);
    }
    .cpa-model-meta {
      font-size: 11px;
      color: var(--dsw-alias-label-tertiary);
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .cpa-model-drawer {
      border-top: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.05));
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    .cpa-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }
    .cpa-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .cpa-field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--dsw-alias-label-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cpa-field-hint {
      font-size: 11px;
      color: var(--dsw-alias-label-tertiary);
    }
    .cpa-presets {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .cpa-preset-btn {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      background: var(--dsw-alias-bg-layer-1);
      color: var(--dsw-alias-label-secondary);
      cursor: pointer;
    }
    .cpa-preset-btn:hover {
      background: var(--dsw-alias-interactive-bg-hover);
      color: var(--dsw-alias-label-primary);
    }
    .cpa-model-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-top: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.15));
      padding-top: 10px;
    }
    .cpa-dirty-tag {
      font-size: 11px;
      color: #f59e0b;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }
    .cpa-auth-banner {
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.08);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .cpa-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    .cpa-gallery-card {
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      border-radius: 10px;
      background: var(--dsw-alias-bg-layer-1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .cpa-gallery-img-wrap {
      position: relative;
      width: 100%;
      padding-top: 75%;
      background: #00000010;
      overflow: hidden;
    }
    .cpa-gallery-img-wrap img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 200ms ease;
    }
    .cpa-gallery-card:hover .cpa-gallery-img-wrap img {
      transform: scale(1.03);
    }
    .cpa-gallery-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--dsw-alias-bg-layer-1);
      border-top: 1px solid var(--dsw-alias-border-l1);
      font-size: 11px;
    }
    .cpa-dropzone {
      border: 2px dashed var(--dsw-alias-border-l2, #cbd5e1);
      border-radius: 10px;
      padding: 18px 16px;
      text-align: center;
      cursor: pointer;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.05));
      transition: all 160ms ease;
    }
    .cpa-dropzone:hover {
      border-color: var(--dsw-alias-brand-primary, #3b82f6);
      background: rgba(59, 130, 246, 0.05);
    }
    .cpa-thumb-grid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .cpa-thumb-item {
      position: relative;
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--dsw-alias-border-l2);
    }
    .cpa-thumb-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cpa-thumb-del {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      color: #ffffff;
      border: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .cpa-network-modes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    .cpa-network-mode {
      border: 1px solid var(--dsw-alias-border-l2, rgba(140, 150, 170, 0.2));
      border-radius: 10px;
      padding: 12px 14px;
      background: var(--dsw-alias-bg-module-platform, rgba(140, 150, 170, 0.06));
      cursor: pointer;
      transition: all 150ms ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }
    .cpa-network-mode:hover {
      border-color: var(--dsw-alias-border-l3);
      background: var(--dsw-alias-interactive-bg-hover);
    }
    .cpa-network-mode[data-selected="true"] {
      border-color: var(--dsw-alias-brand-primary, #2563eb);
      background: var(--dsw-alias-bg-layer-2, rgba(59, 130, 246, 0.06));
      box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary, #2563eb);
    }
    .cpa-network-mode-title {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--dsw-alias-label-primary);
    }
    .cpa-network-mode-desc {
      font-size: 11px;
      color: var(--dsw-alias-label-tertiary);
      line-height: 1.4;
    }
    .cpa-alert-box {
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .cpa-alert-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--dsw-alias-state-error-primary, #ef4444);
    }
    .cpa-alert-info {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: #2563eb;
    }
    .cpa-pre {
      max-height: 320px;
      margin: 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: var(--dsw-alias-bg-module-platform, #0f172a);
      color: var(--dsw-alias-label-secondary, #e2e8f0);
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
    }
    [data-composer-stats] {
      flex-wrap: wrap;
      row-gap: 0;
    }
    .cpa-composer-quota-marker {
      display: none;
    }
    .cpa-composer-quota {
      box-sizing: border-box;
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-width: max-content;
      margin: 0;
      padding: 1px 8px;
      color: var(--dsw-alias-label-tertiary, #64748b);
      font: inherit;
      line-height: inherit;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .cpa-composer-quota[data-inline="false"] {
      display: flex;
      width: 100%;
      max-width: var(--dsh-chat-content-width, 748px);
      margin: 0 auto;
      padding-right: calc(var(--dsh-composer-side-clearance, 0px) + 16px);
      padding-left: calc(var(--dsh-composer-side-clearance, 0px) + 16px);
    }
    .cpa-composer-quota-source {
      color: var(--dsw-alias-label-caption, #8b95a7);
      font: inherit;
      font-weight: 500;
      white-space: nowrap;
    }
    .cpa-composer-quota-window {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      white-space: nowrap;
    }
    .cpa-composer-quota-ring {
      display: block;
      flex: none;
      width: 14px;
      height: 14px;
    }
    .cpa-composer-quota-track {
      fill: none;
      stroke: var(--dsw-alias-border-l3, #d5d9e2);
      stroke-width: 2px;
    }
    .cpa-composer-quota-fill {
      fill: none;
      stroke: var(--cpa-composer-quota-color, var(--dsw-alias-label-tertiary, #7c879b));
      stroke-width: 2px;
      stroke-linecap: round;
      transition: stroke-dasharray 240ms ease;
    }
    .cpa-composer-quota-label {
      color: var(--dsw-alias-label-tertiary, #64748b);
    }
    .cpa-composer-quota-value {
      color: var(--dsw-alias-label-secondary, #475569);
      font-weight: 500;
    }
    @container (width <= 420px) {
      .cpa-composer-quota-source { display: none; }
      .cpa-composer-quota { gap: 8px; }
    }
    @container (width <= 520px) {
      .cpa-header { align-items: stretch; }
      .cpa-header-actions { justify-content: stretch; width: 100%; }
      .cpa-header-actions .cpa-btn { flex: 1 1 auto; }
      .cpa-overview { align-items: flex-start; flex-direction: column; gap: 7px; }
      .cpa-overview-stats { justify-content: space-between; gap: 8px; width: 100%; }
      .cpa-overview-sync { padding-top: 6px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.13)); width: 100%; }
      .cpa-quota-grid { grid-template-columns: 1fr; }
      .cpa-card-header { align-items: flex-start; }
      .cpa-account-action-spacer { display: none; }
      .cpa-account-actions .cpa-btn { flex: 1 1 calc(50% - 6px); }
      .cpa-account-actions .cpa-btn-danger { flex: 0 0 auto; }
    }
    @media (max-width: 640px) {
      .cpa-container { gap: 12px; }
      .cpa-tab { padding-inline: 6px; font-size: 11px; }
    }
    @keyframes cpa-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.92); }
    }
    @keyframes cpa-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .cpa-spin {
      animation: cpa-spin 1s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .cpa-quota-fill, .cpa-composer-quota-fill { transition: none; }
      .cpa-spin, .cpa-dot[data-state="pending"] { animation: none; }
    }
  `;

  function ensureStyles() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('dsh-cpa-styles')) {
      const tag = document.createElement('style');
      tag.id = 'dsh-cpa-styles';
      tag.textContent = STYLE;
      document.head.append(tag);
    }
  }
```

