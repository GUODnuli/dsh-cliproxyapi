window.__ModuleLoader__.load({ id: 'dsh-cliproxyapi', factory: require => {
  const React = require('react');
  const { createPortal } = require('react-dom');
  const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useSyncExternalStore } = React;
  const h = React.createElement;

  // Modern SVG Icons for DeepSeek Harness
  const ICONS = {
    codex: 'M12 2a10 10 0 0 1 10 10c0 2.21-.72 4.25-1.93 5.91l-1.42-1.42A7.96 7.96 0 0 0 20 12a8 8 0 1 0-8 8c1.68 0 3.23-.52 4.5-1.42l1.42 1.42A9.96 9.96 0 0 1 12 22 10 10 0 0 1 2 12 10 10 0 0 1 12 2zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    antigravity: 'M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2zm0 4.5l1.5 4.5 4.5 1.5-4.5 1.5L12 18.5 10.5 14 6 12.5l4.5-1.5L12 6.5z',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    refresh: 'M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.35-4.35',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4 1.5l1.8-1-1.8-3.1 2-1.2-1-1.7-2.3.5a7.9 7.9 0 0 0-1.6-1.6l.5-2.3-1.7-1-1.2 2-3.1-1.8-1 1.8 1.2 2a7.9 7.9 0 0 0-1.6 1.6l-2.3-.5-1 1.7 2 1.2-1.8 3.1 1.8 1-1.2 2a7.9 7.9 0 0 0 1.6 1.6l-.5 2.3 1.7 1 1.2-2 3.1 1.8 1-1.8-1.2-2a7.9 7.9 0 0 0 1.6-1.6l2.3.5 1-1.7-2-1.2 1.8-3.1z',
    sliders: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6',
    sparkles: 'M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3zm7 13l.9 2.3L22.2 19l-2.3.9L19 22.2l-.9-2.3L15.8 19l2.3-.9L19 16zM4.5 16l.6 1.6L6.7 18l-1.6.6L4.5 20.2l-.6-1.6L2.3 18l1.6-.6L4.5 16z',
    image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zm-5-7l-3 4-2-2.5L6 18h12l-4-6zM8.5 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
    globe: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm7.93 9h-3.9a15.4 15.4 0 0 0-1.23-5.07A8.02 8.02 0 0 1 19.93 11zM12 4.07a13.7 13.7 0 0 1 1.9 6.93h-3.8A13.7 13.7 0 0 1 12 4.07zM4.07 13h3.9a15.4 15.4 0 0 0 1.23 5.07A8.02 8.02 0 0 1 4.07 13zm3.9-2H4.07a8.02 8.02 0 0 1 3.2-5.07A15.4 15.4 0 0 0 7.97 11zm4.03 8.93a13.7 13.7 0 0 1-1.9-6.93h3.8a13.7 13.7 0 0 1-1.9 6.93zm2.8-8.93h3.9a8.02 8.02 0 0 1-3.2 5.07 15.4 15.4 0 0 0 1.2-5.07z',
    user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6z',
    externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3',
    copy: 'M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2zm-4 4v12a2 2 0 0 0 2 2h8',
    trash: 'M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5 5-5m-5 5V3',
    chevronDown: 'M6 9l6 6 6-6',
    chevronRight: 'M9 18l6-6-6-6',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 5a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
    cpu: 'M4 4h16v16H4zm5 5h6v6H9zm-7 2h2m-2 4h2m16-4h2m-2 4h2M11 2v2m4-2v2m-4 16v2m4-2v2',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    alert: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    info: 'M12 16v-4m0-4h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z'
  };

  function Icon({ name, size = 16, className = '', spin = false, style = {} }) {
    const d = ICONS[name] || ICONS.info;
    const isStroke = ['check', 'x', 'refresh', 'sliders', 'sparkles', 'externalLink', 'copy', 'trash', 'upload', 'download', 'chevronDown', 'chevronRight', 'alert'].includes(name);
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24',
      className: `${className} ${spin ? 'cpa-spin' : ''}`.trim(),
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style },
      fill: isStroke ? 'none' : 'currentColor',
      stroke: isStroke ? 'currentColor' : 'none',
      strokeWidth: isStroke ? 2 : 0,
      strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': 'true'
    }, h('path', { d }));
  }

  // DeepSeek Harness Client CSS Styles
  const STYLE = `
    .cpa-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 640px;
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
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      background: var(--dsw-alias-border-l1, rgba(140, 150, 170, 0.13));
    }
    .cpa-quota-row:first-child:nth-last-child(odd) {
      grid-column: 1 / -1;
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

  // API Client
  async function api(body, signal) {
    const response = await fetch('/api/cpa-subscriptions', {
      credentials: 'same-origin', signal,
      ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    return value;
  }

  const effortNames = {
    none: '关闭', off: '关闭', minimal: '最低', low: '低', medium: '中',
    high: '高', xhigh: '极高', max: '最高', ultra: '超高'
  };

  const CPA_ROUTES = Object.freeze({
    'cpa-codex': { account: 'codex', label: 'Codex 额度' },
    'cpa-antigravity': { account: 'antigravity', label: 'Gemini 额度' }
  });
  const EFFORT_MEMORY_KEY = 'dsh:model-reasoning-effort:v1';
  const QUOTA_REFRESH_MS = 5 * 60 * 1000;
  const QUOTA_RADIUS = 5.5;
  const QUOTA_CIRCUMFERENCE = 2 * Math.PI * QUOTA_RADIUS;
  const effortMemoryInstalls = new WeakMap();

  function readEffortMemory() {
    try {
      const value = JSON.parse(window.localStorage.getItem(EFFORT_MEMORY_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }

  function effortMemoryId(provider, model) {
    return JSON.stringify([provider, model]);
  }

  function writeRememberedEffort(provider, model, effort) {
    try {
      const values = readEffortMemory();
      values[effortMemoryId(provider, model)] = typeof effort === 'string' && effort ? effort : null;
      window.localStorage.setItem(EFFORT_MEMORY_KEY, JSON.stringify(values));
    } catch { /* Browser storage may be unavailable; selection still succeeds. */ }
  }

  function modelChoice(state, selection) {
    for (const group of state?.groups || []) {
      if (group.id !== selection?.provider) continue;
      const model = (group.models || []).find(item => item.id === selection.model);
      if (model) return model;
    }
  }

  function releaseEffortMemory(controller, entry) {
    entry.count -= 1;
    if (entry.count > 0) return;
    if (controller.select === entry.wrapped) {
      if (entry.owned) controller.select = entry.previous;
      else delete controller.select;
    }
    effortMemoryInstalls.delete(controller);
  }

  function installEffortMemory(controller) {
    const installed = effortMemoryInstalls.get(controller);
    if (installed) {
      installed.count += 1;
      return () => releaseEffortMemory(controller, installed);
    }
    const owned = Object.hasOwn(controller, 'select');
    const previous = controller.select;
    const entry = { count: 1, previous, owned, wrapped: null };
    entry.wrapped = async selection => {
      const state = controller.store.getSnapshot();
      const model = modelChoice(state, selection);
      const efforts = Array.isArray(model?.reasoning?.efforts) ? model.reasoning.efforts.map(item => item.id) : [];
      if (!efforts.length) return previous.call(controller, selection);
      const current = state.current;
      const switching = current?.provider !== selection.provider || current?.model !== selection.model;
      let next = selection;
      if (switching) {
        const values = readEffortMemory();
        const key = effortMemoryId(selection.provider, selection.model);
        if (Object.hasOwn(values, key)) {
          const remembered = values[key];
          if (remembered === null) {
            const { reasoningEffort: _ignored, ...withoutEffort } = selection;
            next = withoutEffort;
          } else if (efforts.includes(remembered)) next = { ...selection, reasoningEffort: remembered };
          else {
            delete values[key];
            try { window.localStorage.setItem(EFFORT_MEMORY_KEY, JSON.stringify(values)); } catch { /* noop */ }
          }
        }
      }
      const result = await previous.call(controller, next);
      if (!switching) writeRememberedEffort(selection.provider, selection.model, next.reasoningEffort);
      return result;
    };
    controller.select = entry.wrapped;
    effortMemoryInstalls.set(controller, entry);
    return () => releaseEffortMemory(controller, entry);
  }

  function quotaColor(percent) {
    return percent <= 10 ? '#ef4444' : percent <= 30 ? '#f59e0b' : 'var(--dsw-alias-label-tertiary, #7c879b)';
  }

  function ComposerQuota({ directory, controller, session }) {
    const modelState = useSyncExternalStore(listener => directory.subscribe(listener), () => directory.getSnapshot());
    const sessionState = useSyncExternalStore(listener => session.subscribe(listener), () => session.getSnapshot());
    const running = sessionState.running === true;
    const route = CPA_ROUTES[modelState.current?.provider];
    const markerRef = useRef(null);
    const [quota, setQuota] = useState();
    const [statsTarget, setStatsTarget] = useState(null);

    useEffect(() => installEffortMemory(controller), [controller]);
    useLayoutEffect(() => {
      const marker = markerRef.current;
      const scope = marker?.closest?.('[data-composer-seat]') || marker?.parentElement || document.body;
      const sync = () => {
        const next = scope.querySelector?.('[data-composer-stats]') || null;
        setStatsTarget(current => current === next ? current : next);
      };
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(scope, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      setQuota(undefined);
      if (!route) return undefined;
      let live = true;
      const abort = new AbortController();
      const applyQuota = value => {
        const account = value?.accounts?.find(item => item.id === route.account);
        if (!account?.loggedIn) {
          if (live) setQuota(undefined);
          return account;
        }
        const rows = Array.isArray(account.quota?.composerRows) ? account.quota.composerRows : [];
        if (live) setQuota(rows.length ? { rows, label: route.label } : undefined);
        return account;
      };
      const refresh = async () => {
        try { applyQuota(await api({ action: 'quota', provider: route.account }, abort.signal)); }
        catch { /* Preserve the last successful reading on transient failures. */ }
      };
      const load = async () => {
        try {
          const account = applyQuota(await api(null, abort.signal));
          if (running && account?.loggedIn) await refresh();
        } catch { if (live) setQuota(undefined); }
      };
      void load();
      if (!running) return () => { live = false; abort.abort(); };
      const timer = window.setInterval(refresh, QUOTA_REFRESH_MS);
      return () => { live = false; abort.abort(); window.clearInterval(timer); };
    }, [route?.account, running]);

    const marker = h('span', { ref: markerRef, className: 'cpa-composer-quota-marker', 'aria-hidden': 'true' });
    if (!route || !quota?.rows?.length) return marker;
    const content = h(statsTarget ? 'span' : 'div', {
      className: 'cpa-composer-quota',
      'aria-label': quota.label,
      'data-cpa-composer-quota': route.account,
      'data-inline': statsTarget ? 'true' : 'false'
    },
      h('span', { className: 'cpa-composer-quota-source' }, quota.label),
      ...quota.rows.map(row => {
        const percent = Math.max(0, Math.min(100, row.remainingPercent));
        const rounded = Math.round(percent);
        const reset = quotaResetLabel(row.resetAt);
        const description = `${quota.label} · ${row.label}：剩余 ${rounded}%${reset ? `，${reset}` : ''}`;
        return h('span', { className: 'cpa-composer-quota-window', key: row.key, title: description, 'aria-label': description },
          h('svg', { className: 'cpa-composer-quota-ring', viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': 'true' },
            h('circle', { className: 'cpa-composer-quota-track', cx: 7, cy: 7, r: QUOTA_RADIUS }),
            h('circle', { className: 'cpa-composer-quota-fill', cx: 7, cy: 7, r: QUOTA_RADIUS,
              strokeDasharray: `${QUOTA_CIRCUMFERENCE * percent / 100} ${QUOTA_CIRCUMFERENCE}`,
              transform: 'rotate(-90 7 7)', style: { '--cpa-composer-quota-color': quotaColor(percent) } })
          ),
          h('span', { className: 'cpa-composer-quota-label' }, row.shortLabel),
          h('span', { className: 'cpa-composer-quota-value' }, `${rounded}%`)
        );
      })
    );
    return h(React.Fragment, null, marker, statsTarget ? createPortal(content, statsTarget) : content);
  }

  // Reusable Switch Component
  function Switch({ checked, onChange, disabled = false, label, title }) {
    return h('label', { className: 'cpa-switch', title },
      h('input', { type: 'checkbox', checked, disabled, onChange: e => onChange(e.target.checked) }),
      h('span', { className: 'cpa-switch-track' },
        h('span', { className: 'cpa-switch-thumb' })
      ),
      label && h('span', { style: { marginLeft: 8, fontSize: 13, color: 'var(--dsw-alias-label-primary)' } }, label)
    );
  }

  // Model Row Component
  function ModelRow({ model: m, provider, run, busy }) {
    const [expanded, setExpanded] = useState(false);
    const saved = () => ({
      enabled: m.enabled,
      vision: m.vision,
      contextWindow: m.requestedContext === null ? '' : String(m.requestedContext),
      reasoningEffort: m.reasoningEffort || '',
      verbosity: m.verbosity || ''
    });
    const [draft, setDraft] = useState(saved);
    const [dirty, setDirty] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    useEffect(() => {
      if (!dirty) setDraft(saved());
    }, [m.enabled, m.vision, m.requestedContext, m.reasoningEffort, m.verbosity, dirty]);

    const update = (key, value) => {
      setDraft(d => ({ ...d, [key]: value }));
      setDirty(true);
      setSavedNotice(false);
    };

    const save = async () => {
      if (draft.contextWindow !== '' && !/^\d+$/.test(draft.contextWindow)) {
        return run(null, '上下文 Token 长度必须填写正整数。');
      }
      const ok = await run({
        action: 'model-update', provider, model: m.id,
        patch: {
          ...draft,
          contextWindow: draft.contextWindow === '' ? null : Number(draft.contextWindow),
          reasoningEffort: draft.reasoningEffort || null,
          verbosity: draft.verbosity || null
        }
      });
      if (ok) {
        setDirty(false);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    };

    const toggleEnabled = (checked) => {
      update('enabled', checked);
      // Auto save enabled change immediately for seamless feel
      run({
        action: 'model-update', provider, model: m.id,
        patch: {
          ...draft,
          enabled: checked,
          contextWindow: draft.contextWindow === '' ? null : Number(draft.contextWindow),
          reasoningEffort: draft.reasoningEffort || null,
          verbosity: draft.verbosity || null
        }
      }).then(ok => { if (ok) setDirty(false); });
    };

    const imageOnly = m.output?.includes('image') && !m.output?.includes('text');

    return h('div', { className: 'cpa-model-card' },
      h('div', { className: 'cpa-model-head' },
        h('div', { className: 'cpa-model-main' },
          h(Switch, {
            checked: draft.enabled,
            onChange: toggleEnabled,
            disabled: busy,
            title: `开放或关闭模型 ${m.id}`
          }),
          h('div', { className: 'cpa-model-info' },
            h('div', { className: 'cpa-model-title-row' },
              h('span', { className: 'cpa-model-name' }, m.name || m.id),
              h('code', { className: 'cpa-model-id' }, m.id),
              imageOnly && h('span', { className: 'cpa-badge cpa-badge-amber' }, h(Icon, { name: 'image', size: 12 }), '图片生成'),
              m.efforts?.length ? h('span', { className: 'cpa-badge cpa-badge-purple' }, h(Icon, { name: 'sliders', size: 12 }), '推理思考') : null,
              m.vision ? h('span', { className: 'cpa-badge cpa-badge-brand' }, h(Icon, { name: 'eye', size: 12 }), '视觉识别') : null,
              m.visible === false && h('span', { className: 'cpa-badge' }, '上游隐藏')
            ),
            !imageOnly && h('div', { className: 'cpa-model-meta' },
              h('span', null, `有效上下文: `, h('strong', { style: { fontFamily: 'monospace' } }, (m.effectiveContext || m.maximumContext || 0).toLocaleString()), ' Token'),
              h('span', { style: { opacity: 0.5 } }, '•'),
              h('span', null, `上限: ${(m.maximumContext || 0).toLocaleString()} Token`)
            )
          )
        ),
        !imageOnly && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('button', {
            className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
            onClick: () => setExpanded(!expanded),
            title: expanded ? '收起配置' : '展开参数调优'
          },
          h(Icon, { name: expanded ? 'chevronDown' : 'chevronRight', size: 14 }),
          expanded ? '收起' : '调优'
        ))
      ),
      !imageOnly && expanded && h('div', { className: 'cpa-model-drawer' },
        h('div', { className: 'cpa-grid-2' },
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' },
              '上下文 Token 窗口',
              h('span', { className: 'cpa-field-hint' }, `上限 ${m.maximumContext}`)
            ),
            h('input', {
              className: 'cpa-input',
              inputMode: 'numeric',
              value: draft.contextWindow,
              placeholder: `默认 ${m.contextWindow || m.effectiveContext}`,
              onChange: e => update('contextWindow', e.target.value)
            }),
            h('div', { className: 'cpa-presets' },
              [32768, 65536, 131072].filter(n => n <= m.maximumContext).map(n =>
                h('button', {
                  key: n, className: 'cpa-preset-btn',
                  onClick: () => update('contextWindow', String(n))
                }, `${Math.round(n / 1024)}k`)
              ),
              m.maximumContext && h('button', {
                className: 'cpa-preset-btn',
                onClick: () => update('contextWindow', String(m.maximumContext))
              }, '最大值'),
              h('button', {
                className: 'cpa-preset-btn',
                onClick: () => update('contextWindow', '')
              }, '恢复默认')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '思考推理强度'),
            h('select', {
              className: 'cpa-select',
              value: draft.reasoningEffort,
              disabled: !m.efforts?.length,
              onChange: e => update('reasoningEffort', e.target.value)
            },
              h('option', { value: '' }, m.efforts?.length ? '跟随上游默认' : '此模型不支持思考调节'),
              ...(m.efforts || []).map(v => h('option', { key: v, value: v }, `${effortNames[v] || v} (${v})`))
            ),
            h('span', { className: 'cpa-field-hint' }, '对话中若显式指定强度，将以会话设置为准')
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '输出详略'),
            h('select', {
              className: 'cpa-select',
              value: draft.verbosity,
              disabled: !m.supportsVerbosity,
              onChange: e => update('verbosity', e.target.value)
            },
              h('option', { value: '' }, m.supportsVerbosity ? '跟随上游默认' : '上游未声明支持'),
              h('option', { value: 'low' }, '简略 (Low)'),
              h('option', { value: 'medium' }, '标准 (Medium)'),
              h('option', { value: 'high' }, '详细 (High)')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '图片识别 (Vision)'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, height: 32 } },
              h(Switch, {
                checked: draft.vision,
                onChange: v => update('vision', v),
                label: draft.vision ? '允许发送图片给模型分析（已开启视觉）' : '关闭图片识别（仅处理文本）'
              })
            )
          )
        ),
        h('div', { className: 'cpa-model-footer' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            dirty && h('span', { className: 'cpa-dirty-tag' }, h(Icon, { name: 'info', size: 13 }), '参数已修改，尚未保存'),
            savedNotice && h('span', { className: 'cpa-badge cpa-badge-success' }, h(Icon, { name: 'check', size: 12 }), '配置已生效')
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            dirty && h('button', {
              className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
              disabled: busy,
              onClick: () => { setDraft(saved()); setDirty(false); }
            }, '放弃修改'),
            h('button', {
              className: `cpa-btn cpa-btn-sm ${dirty ? 'cpa-btn-primary' : 'cpa-btn-secondary'}`,
              disabled: busy || !dirty,
              onClick: save
            },
            h(Icon, { name: 'check', size: 14 }),
            '保存设置'
          ))
        )
      )
    );
  }

  function quotaPercent(value) {
    if (!Number.isFinite(value)) return '余量未知';
    const rounded = Math.round(value * 10) / 10;
    return `剩余 ${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  }

  function quotaResetLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `重置于 ${date.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
  }

  function QuotaPanel({ account, brandColor }) {
    const quota = account.quota || { state: 'idle', rows: [] };
    const rows = Array.isArray(quota.rows) ? quota.rows : [];
    const updated = quota.fetchedAt ? new Date(quota.fetchedAt) : null;
    return h('div', { className: 'cpa-quota-panel', 'aria-live': 'polite', 'aria-busy': quota.state === 'refreshing' },
      h('div', { className: 'cpa-quota-header' },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 } },
          h(Icon, { name: 'cpu', size: 13 }),
          quota.plan ? `模型额度 · ${quota.plan}` : '模型额度'
        ),
        updated && !Number.isNaN(updated.getTime()) && h('span', null, `更新于 ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      ),
      rows.length ? h('div', { className: 'cpa-quota-grid' }, ...rows.map((row, index) => {
        const percent = Number.isFinite(row.remainingPercent) ? Math.max(0, Math.min(100, row.remainingPercent)) : null;
        const color = percent !== null && percent <= 10 ? '#ef4444' : percent !== null && percent <= 30 ? '#f59e0b' : brandColor;
        const meta = [row.detail, quotaResetLabel(row.resetAt)].filter(Boolean).join(' · ');
        return h('div', { className: 'cpa-quota-row', key: `${row.label}:${index}` },
          h('div', { className: 'cpa-quota-label-row' },
            h('span', { className: 'cpa-quota-label', title: row.label }, row.label),
            h('span', { className: 'cpa-quota-value' }, quotaPercent(percent))
          ),
          h('div', { className: 'cpa-quota-track', role: 'progressbar', 'aria-label': row.label,
            'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuetext': quotaPercent(percent),
            ...(percent === null ? {} : { 'aria-valuenow': percent }) },
            h('div', { className: 'cpa-quota-fill', style: { width: `${percent ?? 0}%`, '--cpa-quota-color': color } })
          ),
          meta && h('div', { className: 'cpa-quota-meta', title: meta }, meta)
        );
      })) : h('div', {
        className: `cpa-quota-empty${quota.state === 'failed' ? ' cpa-alert-error' : ''}`,
        role: quota.state === 'failed' ? 'alert' : 'status'
      },
        quota.state === 'refreshing' && h(Icon, { name: 'refresh', size: 14, spin: true }),
        quota.state === 'failed' && h(Icon, { name: 'alert', size: 14 }),
        h('span', null, quota.message || (account.loggedIn ? '点击“刷新额度”查看当前模型余量。' : '登录后可刷新模型额度。'))
      )
    );
  }

  // Account Card Component
  function AccountCard({ account, busy, run }) {
    const isCodex = account.id === 'codex';
    const brandColor = isCodex ? '#10a37f' : '#4285f4';
    const connectionState = account.pending ? 'pending' : (account.loggedIn ? 'connected' : 'disconnected');
    const connectionLabel = account.pending ? '等待授权' : (account.loggedIn ? '已连接' : '未登录');
    const [quotaBusy, setQuotaBusy] = useState(false);
    const refreshQuota = async () => {
      setQuotaBusy(true);
      try { await run({ action: 'quota', provider: account.id }); }
      finally { setQuotaBusy(false); }
    };

    return h('article', { className: 'cpa-card', 'data-provider': account.id, style: { '--cpa-account-color': brandColor } },
      h('div', { className: 'cpa-card-header' },
        h('div', { className: 'cpa-account-identity' },
          h('div', { className: 'cpa-account-icon' }, h(Icon, { name: isCodex ? 'codex' : 'antigravity', size: 20 })),
          h('div', { className: 'cpa-account-copy' },
            h('h3', { className: 'cpa-card-title' }, account.name),
            h('div', { className: 'cpa-account-meta' },
              account.email && h('span', { className: 'cpa-account-email', title: account.email }, account.email),
              account.email && h('span', { 'aria-hidden': 'true' }, '·'),
              h('span', null, account.status)
            )
          )
        ),
        h('span', { className: 'cpa-connection-pill', title: account.status },
          h('span', { className: 'cpa-dot', 'data-state': connectionState }),
          connectionLabel
        )
      ),

      account.pending && h('div', { className: 'cpa-auth-banner' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h(Icon, { name: 'alert', size: 20, style: { color: '#d97706' } }),
          h('div', null,
            h('strong', { style: { display: 'block', fontSize: 13, color: '#b45309' } }, '正在等待网页授权完成'),
            h('span', { style: { fontSize: 12, color: '#92400e' } }, '在浏览器完成官方授权后，Harness 会自动同步账号。')
          )
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          account.loginURL && h('a', {
            href: account.loginURL, target: '_blank', rel: 'noopener noreferrer',
            className: 'cpa-btn cpa-btn-primary'
          }, '打开授权页面', h(Icon, { name: 'externalLink', size: 13 })),
          h('button', {
            className: 'cpa-btn cpa-btn-secondary',
            disabled: busy,
            onClick: () => run({ action: 'cancel', provider: account.id })
          }, '取消授权')
        )
      ),

      h(QuotaPanel, { account, brandColor }),
      account.catalog?.state !== 'cached' && account.catalog?.message && h('div', {
        className: `cpa-alert-box ${account.catalog.state === 'failed' ? 'cpa-alert-error' : 'cpa-card-inner'}`,
        role: account.catalog.state === 'failed' ? 'alert' : 'status',
        style: { fontSize: 12 }
      },
        h(Icon, { name: account.catalog.state === 'failed' ? 'alert' : 'info', size: 15 }),
        h('span', { style: { flex: 1 } }, account.catalog.message),
        account.catalog.fetchedAt && h('span', { style: { opacity: 0.7 } },
          new Date(account.catalog.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        )
      ),

      h('div', { className: 'cpa-account-actions', 'aria-label': `${account.name} 操作` },
        !account.loggedIn && !account.pending && h('button', {
          className: 'cpa-btn cpa-btn-primary',
          disabled: busy,
          onClick: () => run({ action: 'login', provider: account.id })
        }, h(Icon, { name: 'user', size: 13 }), `登录 ${isCodex ? 'Codex' : 'Google'}`),
        h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy || !account.loggedIn,
          onClick: refreshQuota,
          title: '从官方接口读取这个账号的模型额度'
        }, h(Icon, { name: 'refresh', size: 12, spin: quotaBusy }), quotaBusy ? '刷新中' : '刷新额度'),
        h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy || !account.loggedIn,
          onClick: () => run({ action: 'models', provider: account.id }),
          title: '从官方接口同步这个账号的可用模型目录'
        }, h(Icon, { name: 'cpu', size: 12 }), '刷新模型'),
        account.loggedIn && h('span', { className: 'cpa-account-action-spacer', 'aria-hidden': 'true' }),
        account.loggedIn && h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy,
          onClick: () => run({ action: 'login', provider: account.id })
        }, '重新登录'),
        account.loggedIn && h('button', {
          className: 'cpa-btn cpa-btn-danger',
          disabled: busy,
          onClick: () => run({ action: 'logout', provider: account.id })
        }, h(Icon, { name: 'trash', size: 12 }), '退出')
      )
    );
  }

  // Network Settings Panel
  function NetworkPanel({ settings, route, run, busy }) {
    const [mode, setMode] = useState(settings?.mode || 'auto');
    const [url, setURL] = useState(settings?.proxyURL || '');
    const [dirty, setDirty] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    useEffect(() => {
      setMode(settings?.mode || 'auto');
      setURL(settings?.proxyURL || '');
    }, [settings?.mode, settings?.proxyURL]);

    const save = async () => {
      const ok = await run({ action: 'preferences', patch: { network: { mode, proxyURL: url } } });
      if (ok) {
        setDirty(false);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    };

    return h('div', { className: 'cpa-card' },
      h('div', { className: 'cpa-card-header' },
        h('div', null,
          h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'globe', size: 18 }), '网络与代理设置'),
          h('p', { className: 'cpa-subtitle', style: { marginTop: 3 } }, '选择 CPA 访问 OpenAI 与 Google 端点时所用的网络通路')
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          savedNotice && h('span', { className: 'cpa-badge cpa-badge-success' }, h(Icon, { name: 'check', size: 12 }), '网络设置已更新'),
          h('button', {
            className: `cpa-btn ${dirty ? 'cpa-btn-primary' : 'cpa-btn-secondary'}`,
            disabled: busy || !dirty,
            onClick: save
          }, h(Icon, { name: 'check', size: 14 }), '保存网络配置')
        )
      ),

      h('div', { className: 'cpa-network-modes' },
        h('div', {
          className: 'cpa-network-mode',
          'data-selected': mode === 'auto',
          onClick: () => { setMode('auto'); setDirty(true); }
        },
          h('div', { className: 'cpa-network-mode-title' },
            h(Icon, { name: 'globe', size: 15 }),
            '自动检测 (推荐)'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '读取 Harness 环境、系统 HTTP_PROXY / HTTPS_PROXY 及 Windows 注册表系统代理。')
        ),
        h('div', {
          className: 'cpa-network-mode',
          'data-selected': mode === 'direct',
          onClick: () => { setMode('direct'); setDirty(true); }
        },
          h('div', { className: 'cpa-network-mode-title' },
            h(Icon, { name: 'check', size: 15 }),
            '直连模式'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '绕过所有本地代理，直接通过原生网络连接上游 API 服务端。')
        ),
        h('div', {
          className: 'cpa-network-mode',
          'data-selected': mode === 'manual',
          onClick: () => { setMode('manual'); setDirty(true); }
        },
          h('div', { className: 'cpa-network-mode-title' },
            h(Icon, { name: 'sliders', size: 15 }),
            '指定 HTTP 代理'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '手动指定专用 HTTP 代理地址（例如 Clash、v2rayN、Surge 等）。')
        )
      ),

      mode === 'manual' && h('div', { className: 'cpa-field', style: { marginTop: 4 } },
        h('label', { className: 'cpa-field-label' }, 'HTTP 代理服务器地址'),
        h('input', {
          className: 'cpa-input',
          value: url,
          placeholder: 'http://127.0.0.1:7890',
          onChange: e => { setURL(e.target.value); setDirty(true); }
        }),
        h('span', { className: 'cpa-field-hint' }, '格式支持 http://127.0.0.1:7890 或包含认证的 http://user:pass@127.0.0.1:7890')
      ),

      h('div', { className: 'cpa-card-inner', style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 } },
        h(Icon, { name: 'info', size: 15, style: { color: 'var(--dsw-alias-brand-primary, #3b82f6)' } }),
        h('span', null, '当前实际生效网络路由: ', h('strong', { style: { fontFamily: 'monospace' } }, route || '自动检测中…'))
      )
    );
  }

  // Image Generation & Studio Panel
  function ImagePanel({ state, run, busy }) {
    const initial = state?.preferences?.images || {};
    const [provider, setProvider] = useState(initial.provider || 'codex');
    const [model, setModel] = useState(initial.model || '');
    const [quality, setQuality] = useState(initial.quality || 'auto');
    const [enabled, setEnabled] = useState(!!initial.enabled);
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState('auto');
    const [files, setFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const fileInputRef = useRef(null);

    const candidates = provider === 'codex'
      ? [['gpt-image-2', 'GPT Image 2 (订阅画图)']]
      : (state.accounts.find(a => a.id === 'antigravity')?.models || [])
          .filter(m => m.enabled && m.output?.includes('image'))
          .map(m => [m.id, `${m.name || m.id} (Imagen / Gemini)`]);

    useEffect(() => {
      // Create preview object URLs for selected files
      const urls = files.map(f => URL.createObjectURL(f));
      setPreviewUrls(urls);
      return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
    }, [files]);

    const handleFiles = (newFiles) => {
      const combined = [...files, ...newFiles].slice(0, 5);
      setFiles(combined);
    };

    const removeFile = (index) => {
      setFiles(files.filter((_, i) => i !== index));
    };

    async function generate() {
      const references = [];
      for (const file of files) {
        if (file.size > 20971520) return run(null, '单张参考图不能超过 20 MB。');
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        references.push({ mediaType: file.type, data });
      }
      await run({
        action: 'generate',
        args: { provider, model, prompt, size, quality },
        ...(references.length ? { references } : {})
      });
    }

    const savePreferences = () => {
      run({ action: 'preferences', patch: { images: { enabled, provider, model, quality } } });
    };

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      // Master Tool Switch
      h('div', { className: 'cpa-card' },
        h('div', { className: 'cpa-card-header' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h('div', {
              style: {
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(147, 51, 234, 0.15)', color: '#9333ea',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }
            }, h(Icon, { name: 'sparkles', size: 20 })),
            h('div', null,
              h('h3', { className: 'cpa-card-title' }, '图片生成工具与能力'),
              h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } }, '在会话中向智能体开放 cpa_image_generate 工具')
            )
          ),
          h(Switch, {
            checked: enabled,
            disabled: busy,
            onChange: v => { setEnabled(v); run({ action: 'preferences', patch: { images: { enabled: v, provider, model, quality } } }); },
            label: enabled ? '工具已开启' : '工具已关闭'
          })
        ),
        h('div', { className: 'cpa-grid-2' },
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '默认生图渠道'),
            h('select', {
              className: 'cpa-select',
              value: provider,
              onChange: e => {
                const v = e.target.value;
                setProvider(v);
                setModel(v === 'codex' ? 'gpt-image-2' : '');
                if (v === 'antigravity') { setQuality('auto'); setSize('auto'); }
              }
            },
              h('option', { value: 'codex' }, 'OpenAI Codex 订阅'),
              h('option', { value: 'antigravity' }, 'Google Antigravity 订阅')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '默认图片模型'),
            h('select', {
              className: 'cpa-select',
              value: model,
              onChange: e => setModel(e.target.value)
            },
              h('option', { value: '' }, '选择生图模型…'),
              ...candidates.map(([v, t]) => h('option', { key: v, value: v }, t))
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '图片质量'),
            h('select', {
              className: 'cpa-select',
              value: quality,
              disabled: provider === 'antigravity',
              onChange: e => setQuality(e.target.value)
            },
              h('option', { value: 'auto' }, '自动 (Auto)'),
              h('option', { value: 'low' }, '低质量 (省流)'),
              h('option', { value: 'medium' }, '中等质量'),
              h('option', { value: 'high' }, '高清晰度 (High)')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '图片尺寸'),
            h('input', {
              className: 'cpa-input',
              value: size,
              disabled: provider === 'antigravity',
              placeholder: 'auto 或 1024x1024',
              onChange: e => setSize(e.target.value)
            })
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 4 } },
          h('button', {
            className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
            disabled: busy || !model,
            onClick: savePreferences
          }, h(Icon, { name: 'check', size: 14 }), '保存为默认生图偏好')
        )
      ),

      // Interactive Testing Playground
      h('div', { className: 'cpa-card' },
        h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'sparkles', size: 18 }), '创作与修图体验区'),
        h('div', { className: 'cpa-field' },
          h('label', { className: 'cpa-field-label' }, '提示词 (Prompt)'),
          h('textarea', {
            className: 'cpa-input',
            style: { minHeight: 80, height: 'auto', padding: '10px 12px', resize: 'vertical' },
            value: prompt,
            placeholder: '描述想要生成的图片细节、艺术风格、色彩与氛围；若上传了参考图片，请明确写出修改或融合要求。',
            onChange: e => setPrompt(e.target.value)
          })
        ),

        // Drag & Drop Reference Image Area
        h('div', { className: 'cpa-field' },
          h('label', { className: 'cpa-field-label' },
            '参考图片 (可选，最多 5 张)',
            h('span', { className: 'cpa-field-hint' }, `已选 ${files.length}/5 张 · 支持 PNG/JPG/WebP`)
          ),
          h('div', {
            className: 'cpa-dropzone',
            onClick: () => fileInputRef.current?.click()
          },
            h(Icon, { name: 'upload', size: 28, style: { color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6 } }),
            h('div', { style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '点击或拖拽参考图片到此处'),
            h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 } }, '用于图像重绘、图生图或多图合成')
          ),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/png,image/jpeg,image/webp',
            multiple: true,
            style: { display: 'none' },
            onChange: e => {
              if (e.target.files) handleFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }),
          previewUrls.length > 0 && h('div', { className: 'cpa-thumb-grid' },
            previewUrls.map((url, idx) => h('div', { key: idx, className: 'cpa-thumb-item' },
              h('img', { src: url, alt: '参考图' }),
              h('button', {
                className: 'cpa-thumb-del',
                onClick: () => removeFile(idx),
                title: '移除此图'
              }, '×')
            ))
          )
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 } },
          h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } },
            '使用所选订阅账号生成，失败不会自动切换其他付费渠道'
          ),
          h('button', {
            className: 'cpa-btn cpa-btn-primary',
            disabled: busy || !model || !prompt.trim(),
            onClick: () => generate().catch(e => run(null, e.message))
          },
            h(Icon, { name: busy ? 'refresh' : 'sparkles', size: 15, spin: busy }),
            busy ? '正在生成图像…' : (files.length ? '基于参考图重绘' : '立即生成图片')
          )
        )
      ),

      // Gallery Section
      h('div', { className: 'cpa-card' },
        h('div', { className: 'cpa-card-header' },
          h('h3', { className: 'cpa-card-title' },
            h(Icon, { name: 'image', size: 18 }),
            '最近生成的图片',
            h('span', { className: 'cpa-badge' }, `${state.gallery?.length || 0} 张`)
          )
        ),
        (!state.gallery || state.gallery.length === 0) ? h('div', {
          style: { padding: '36px 0', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' }
        },
          h(Icon, { name: 'image', size: 36, style: { opacity: 0.4, marginBottom: 8 } }),
          h('div', { style: { fontSize: 13 } }, '暂无已生成的图片记录，在上方输入提示词创作吧')
        ) : h('div', { className: 'cpa-gallery-grid' },
          state.gallery.map(img => h('div', { key: img.id, className: 'cpa-gallery-card' },
            h('div', { className: 'cpa-gallery-img-wrap' },
              h('img', {
                src: `/api/cpa-images?id=${img.id}`,
                alt: `${img.model} 生成的图片`,
                loading: 'lazy'
              })
            ),
            h('div', { className: 'cpa-gallery-actions' },
              h('span', { className: 'cpa-badge' }, img.model || 'AI Image'),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('a', {
                  href: `/api/cpa-images?id=${img.id}&original=1`,
                  target: '_blank', rel: 'noopener noreferrer',
                  className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
                  title: '在新窗口查看无损原图'
                }, h(Icon, { name: 'externalLink', size: 13 }), '原图'),
                h('a', {
                  href: `/api/cpa-images?id=${img.id}&original=1&download=1`,
                  className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
                  title: '下载原图到本地'
                }, h(Icon, { name: 'download', size: 13 }), '下载')
              )
            )
          ))
        )
      )
    );
  }

  // Diagnostics Panel
  function DiagnosticsPanel({ state, run, busy }) {
    const [copied, setCopied] = useState(false);

    const copyData = () => {
      if (!state) return;
      navigator.clipboard.writeText(JSON.stringify(state, null, 2)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return h('div', { className: 'cpa-card' },
      h('div', { className: 'cpa-card-header' },
        h('div', null,
          h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'sliders', size: 18 }), '运行环境与诊断数据'),
          h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } }, '检查插件内部运行时状态、会话与模型元数据')
        ),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', {
            className: 'cpa-btn cpa-btn-secondary',
            onClick: copyData
          }, h(Icon, { name: copied ? 'check' : 'copy', size: 14 }), copied ? '已复制 JSON' : '复制诊断 JSON')
        )
      ),
      h('pre', { className: 'cpa-pre' },
        state ? JSON.stringify(state, null, 2) : '正在读取状态…'
      )
    );
  }

  // Main UI Root
  function SubscriptionAccounts() {
    ensureStyles();

    const [tab, setTab] = useState('models');
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyAction, setBusyAction] = useState('');
    const [query, setQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [featureFilter, setFeatureFilter] = useState('all');

    const mounted = useRef(false);
    const controller = useRef(null);
    const actionController = useRef(null);
    const actionInFlight = useRef(false);
    const loadSequence = useRef(0);

    const load = useCallback(async () => {
      const sequence = ++loadSequence.current;
      const value = await api(null, controller.current?.signal);
      if (mounted.current && sequence === loadSequence.current) setState(value);
    }, []);

    useEffect(() => {
      mounted.current = true;
      controller.current = new AbortController();
      let timer;
      const poll = async () => {
        try {
          await load();
        } catch (e) {
          if (mounted.current) setError(e.message);
        }
        if (mounted.current) timer = setTimeout(poll, 3000);
      };
      void poll();
      return () => {
        mounted.current = false;
        clearTimeout(timer);
        controller.current.abort();
        actionController.current?.abort();
      };
    }, [load]);

    async function run(body, message) {
      if (!body) { setError(message); return false; }
      if (actionInFlight.current) return false;
      actionInFlight.current = true;
      setBusy(true);
      setBusyAction(body.action || 'request');
      setError('');
      const action = new AbortController();
      actionController.current = action;
      try {
        await api(body, action.signal);
        await load();
        return true;
      } catch (e) {
        if (mounted.current) setError(action.signal.aborted ? '已停止等待；后台共享刷新可能仍会完成。' : e.message);
        return false;
      } finally {
        actionInFlight.current = false;
        if (actionController.current === action) actionController.current = null;
        if (mounted.current) {
          setBusy(false);
          setBusyAction('');
        }
      }
    }

    // Filter models
    const allModels = useMemo(() => {
      if (!state?.accounts) return [];
      const list = [];
      for (const acc of state.accounts) {
        for (const m of acc.models || []) {
          list.push({ ...m, provider: acc.id, providerName: acc.name });
        }
      }
      return list;
    }, [state?.accounts]);

    const filteredModels = useMemo(() => {
      return allModels.filter(m => {
        if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
        if (featureFilter === 'enabled' && !m.enabled) return false;
        if (featureFilter === 'vision' && !m.vision) return false;
        if (featureFilter === 'image' && !(m.output?.includes('image') && !m.output?.includes('text'))) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          const match = (m.id || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
    }, [allModels, providerFilter, featureFilter, query]);

    const enabledCount = useMemo(() => allModels.filter(m => m.enabled).length, [allModels]);
    const accounts = state?.accounts || [];
    const loggedInCount = accounts.filter(account => account.loggedIn).length;
    const latestQuotaAt = accounts.reduce((latest, account) => {
      const timestamp = Date.parse(account.quota?.fetchedAt || '');
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);
    const latestQuotaLabel = latestQuotaAt
      ? new Date(latestQuotaAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (state ? '等待首次同步' : '正在读取…');
    const refreshingAllQuotas = busyAction === 'quota-all';

    return h('section', { className: 'cpa-container' },
      // Top Navigation & Branding Header
      h('div', { className: 'cpa-header' },
        h('div', { className: 'cpa-title-group' },
          h('h2', { className: 'cpa-title' },
            'CLIProxyAPI 订阅服务',
            h('span', { className: 'cpa-badge cpa-badge-brand' }, '2.3.4')
          ),
          h('p', { className: 'cpa-subtitle' },
            '管理订阅账号、模型能力与实时额度'
          )
        ),
        h('div', { className: 'cpa-header-actions' },
          busy && h('button', {
            className: 'cpa-btn cpa-btn-danger cpa-btn-sm',
            onClick: () => actionController.current?.abort(),
            title: '停止等待当前页面操作；共享刷新可能仍在后台完成'
          }, h(Icon, { name: 'x', size: 13 }), '停止等待'),
          h('button', {
            className: 'cpa-btn cpa-btn-primary',
            disabled: busy || loggedInCount === 0,
            onClick: () => run({ action: 'quota-all' }),
            title: loggedInCount ? '从官方接口刷新所有已登录账号的额度' : '登录账号后可批量刷新额度'
          }, h(Icon, { name: 'refresh', size: 14, spin: refreshingAllQuotas }), refreshingAllQuotas ? '正在刷新全部额度' : '刷新所有额度'),
          h('button', {
            className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
            disabled: busy,
            onClick: () => load(),
            title: '重新读取插件当前缓存状态，不请求上游接口'
          }, h(Icon, { name: 'refresh', size: 13 }), '重新读取')
        )
      ),

      // Global Error Message Callout
      error && h('div', { className: 'cpa-alert-box cpa-alert-error' },
        h(Icon, { name: 'alert', size: 16 }),
        h('span', { style: { flex: 1 } }, error),
        h('button', {
          className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
          style: { padding: 0, height: 'auto' },
          onClick: () => setError('')
        }, h(Icon, { name: 'x', size: 14 }))
      ),

      // Main Segmented Tabs
      h('div', { className: 'cpa-tabs', role: 'tablist' },
        h('button', {
          className: 'cpa-tab',
          role: 'tab',
          'aria-selected': tab === 'models',
          'data-active': tab === 'models',
          onClick: () => setTab('models')
        },
          h(Icon, { name: 'user', size: 16 }),
          '账号与模型',
          allModels.length > 0 && h('span', { className: 'cpa-badge' }, `${enabledCount}/${allModels.length}`)
        ),
        h('button', {
          className: 'cpa-tab',
          role: 'tab',
          'aria-selected': tab === 'images',
          'data-active': tab === 'images',
          onClick: () => setTab('images')
        },
          h(Icon, { name: 'sparkles', size: 16 }),
          '图片工坊',
          state?.gallery?.length ? h('span', { className: 'cpa-badge cpa-badge-amber' }, String(state.gallery.length)) : null
        ),
        h('button', {
          className: 'cpa-tab',
          role: 'tab',
          'aria-selected': tab === 'network',
          'data-active': tab === 'network',
          onClick: () => setTab('network')
        },
          h(Icon, { name: 'globe', size: 16 }),
          '网络代理'
        ),
        h('button', {
          className: 'cpa-tab',
          role: 'tab',
          'aria-selected': tab === 'diagnostics',
          'data-active': tab === 'diagnostics',
          onClick: () => setTab('diagnostics')
        },
          h(Icon, { name: 'sliders', size: 16 }),
          '系统诊断'
        )
      ),

      // Tab 1: 账号与模型
      tab === 'models' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { className: 'cpa-overview', 'aria-label': '订阅服务概览' },
          h('div', { className: 'cpa-overview-stats' },
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '账号'),
              h('span', { className: 'cpa-overview-value' }, `${loggedInCount}/${accounts.length || 2}`)
            ),
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '开放模型'),
              h('span', { className: 'cpa-overview-value' }, state ? `${enabledCount}` : '读取中…')
            ),
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '额度同步'),
              h('span', { className: 'cpa-overview-value' }, latestQuotaLabel)
            )
          ),
          h('span', { className: 'cpa-overview-sync' },
            h('span', { className: 'cpa-dot', 'data-state': 'connected' }),
            '启动自动同步已开启'
          )
        ),
        state ? h('div', { className: 'cpa-account-list' },
          ...accounts.map(row => h(AccountCard, { key: row.id, account: row, busy, run }))
        ) : h('div', { className: 'cpa-card cpa-card-inner', role: 'status' },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 } },
            h(Icon, { name: 'refresh', size: 15, spin: true }), '正在读取订阅账号、额度与模型信息…'
          )
        ),

        // Unified Model Catalog & Filter Bar
        state && h('div', { className: 'cpa-card' },
          h('div', { className: 'cpa-card-header' },
            h('div', null,
              h('h3', { className: 'cpa-card-title' },
                h(Icon, { name: 'cpu', size: 18 }),
                '模型目录与能力调优',
                h('span', { className: 'cpa-badge cpa-badge-success' }, `${enabledCount} 个已开放`)
              ),
              h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } },
                '勾选开放模型，展开可定制上下文 Token 长度、思考强度、详略度与视觉开关'
              )
            )
          ),

          // Search & Filter Row
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { className: 'cpa-search-wrap' },
              h(Icon, { name: 'search', size: 16, className: 'cpa-search-icon' }),
              h('input', {
                className: 'cpa-input cpa-search-input',
                value: query,
                placeholder: '搜索模型名称或 ID (如 gpt-4o, o3-mini, gemini-2.5-pro)...',
                onChange: e => setQuery(e.target.value)
              }),
              query && h('button', {
                className: 'cpa-search-clear',
                onClick: () => setQuery('')
              }, h(Icon, { name: 'x', size: 14 }))
            ),
            h('div', { className: 'cpa-filter-chips' },
              h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginRight: 2 } }, '渠道:'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'all',
                onClick: () => setProviderFilter('all')
              }, '全部渠道'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'codex',
                onClick: () => setProviderFilter('codex')
              }, 'Codex 订阅'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'antigravity',
                onClick: () => setProviderFilter('antigravity')
              }, 'Antigravity 订阅'),

              h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginLeft: 8, marginRight: 2 } }, '特性:'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'all',
                onClick: () => setFeatureFilter('all')
              }, '全部'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'enabled',
                onClick: () => setFeatureFilter('enabled')
              }, '仅已开放'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'vision',
                onClick: () => setFeatureFilter('vision')
              }, '视觉模型'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'image',
                onClick: () => setFeatureFilter('image')
              }, '图片生成')
            )
          ),

          // Models List
          filteredModels.length === 0 ? h('div', {
            style: { padding: '32px 0', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' }
          },
            h(Icon, { name: 'search', size: 32, style: { opacity: 0.4, marginBottom: 8 } }),
            h('div', { style: { fontSize: 13 } }, '没有找到匹配的模型，请尝试修改关键词或过滤条件')
          ) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            filteredModels.map(model => h(ModelRow, {
              key: `${model.provider}:${model.id}`,
              model,
              provider: model.provider,
              run,
              busy
            }))
          )
        )
      ),

      // Tab 2: 图片工坊
      tab === 'images' && state && h(ImagePanel, { state, run, busy }),

      // Tab 3: 网络代理
      tab === 'network' && state && h(NetworkPanel, {
        settings: state.preferences?.network,
        route: state.network?.route,
        run,
        busy
      }),

      // Tab 4: 诊断
      tab === 'diagnostics' && h(DiagnosticsPanel, { state, run, busy })
    );
  }

  return {
    inject: ['slots', 'modelDirectories'],
    apply(ctx) {
      ensureStyles();
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'cpa-subscriptions',
        order: 15,
        label: () => '订阅账号'
      }, SubscriptionAccounts));
      const installComposer = scope => {
        const models = scope.get('modelDirectories');
        const sessions = scope.get('sessions');
        scope.slots.inject('conversation.composer.dock', () => scope.slots.register({
          name: 'conversation.composer.dock',
          id: 'cpa-subscription-quota',
          order: 10,
          inject: sessionId => {
            const controller = models.directoryFor(sessionId);
            const session = sessions.binding(sessionId)?.session;
            if (!session) throw new Error(`CPA quota could not resolve session ${String(sessionId)}`);
            return { controller, directory: controller.store, session };
          }
        }, ComposerQuota));
      };
      if (ctx.get('remote.session') === undefined) installComposer(ctx);
      else ctx.inject(['remote.session'], installComposer);
    }
  };
}});
