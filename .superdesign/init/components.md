# Shared UI Components

## Repository UI profile
- Framework: React loaded by the DSH browser module loader (`require('react')`), using `React.createElement`; no JSX/transpilation and no standalone SPA bootstrap.
- Component library: custom components only; no shadcn/ui, Ant Design, MUI, Chakra, Radix, or Tailwind.
- Styling: one injected vanilla-CSS template literal (`STYLE`) in `client.js`; component-local inline style objects supplement it.
- Shared component location: there is no components directory. All reusable UI functions live in the monolithic `client.js` module.
- External runtime dependencies: `react`, `react-dom`, DSH Cordis slots/model/session services. These are host-provided, not local source dependencies.

The code blocks below are exact source ranges from `client.js`. Helper constants/functions needed by a component are kept with that component range.
## Icon
- File: `client.js` (lines 8–48)
- Description: Shared SVG icon primitive backed by the local ICONS path catalog.
- Key props: name, size=16, className="", spin=false, style={}

```js
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
```
## ComposerQuota
- File: `client.js` (lines 1060–1237)
- Description: Conversation-composer quota display plus model-effort memory helpers and quota refresh behavior.
- Key props: directory, controller, session

```js
  const effortNames = {
    none: '鍏抽棴', off: '鍏抽棴', minimal: '鏈€浣?, low: '浣?, medium: '涓?,
    high: '楂?, xhigh: '鏋侀珮', max: '鏈€楂?, ultra: '瓒呴珮'
  };

  const CPA_ROUTES = Object.freeze({
    'cpa-codex': { account: 'codex', label: 'Codex 棰濆害' },
    'cpa-antigravity': { account: 'antigravity', label: 'Gemini 棰濆害' }
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
        const description = `${quota.label} 路 ${row.label}锛氬墿浣?${rounded}%${reset ? `锛?{reset}` : ''}`;
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
```
## Switch
- File: `client.js` (lines 1239–1248)
- Description: Accessible checkbox-based switch primitive.
- Key props: checked, onChange, disabled=false, label, title

```js
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
```
## ModelRow
- File: `client.js` (lines 1250–1437)
- Description: Expandable model card with enable switch, context window, reasoning, verbosity, vision, save/reset states.
- Key props: model (renamed m), provider, run, busy

```js
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
        return run(null, '涓婁笅鏂?Token 闀垮害蹇呴』濉啓姝ｆ暣鏁般€?);
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
            title: `寮€鏀炬垨鍏抽棴妯″瀷 ${m.id}`
          }),
          h('div', { className: 'cpa-model-info' },
            h('div', { className: 'cpa-model-title-row' },
              h('span', { className: 'cpa-model-name' }, m.name || m.id),
              h('code', { className: 'cpa-model-id' }, m.id),
              imageOnly && h('span', { className: 'cpa-badge cpa-badge-amber' }, h(Icon, { name: 'image', size: 12 }), '鍥剧墖鐢熸垚'),
              m.efforts?.length ? h('span', { className: 'cpa-badge cpa-badge-purple' }, h(Icon, { name: 'sliders', size: 12 }), '鎺ㄧ悊鎬濊€?) : null,
              m.vision ? h('span', { className: 'cpa-badge cpa-badge-brand' }, h(Icon, { name: 'eye', size: 12 }), '瑙嗚璇嗗埆') : null,
              m.visible === false && h('span', { className: 'cpa-badge' }, '涓婃父闅愯棌')
            ),
            !imageOnly && h('div', { className: 'cpa-model-meta' },
              h('span', null, `鏈夋晥涓婁笅鏂? `, h('strong', { style: { fontFamily: 'monospace' } }, (m.effectiveContext || m.maximumContext || 0).toLocaleString()), ' Token'),
              h('span', { style: { opacity: 0.5 } }, '鈥?),
              h('span', null, `涓婇檺: ${(m.maximumContext || 0).toLocaleString()} Token`)
            )
          )
        ),
        !imageOnly && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('button', {
            className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
            onClick: () => setExpanded(!expanded),
            title: expanded ? '鏀惰捣閰嶇疆' : '灞曞紑鍙傛暟璋冧紭'
          },
          h(Icon, { name: expanded ? 'chevronDown' : 'chevronRight', size: 14 }),
          expanded ? '鏀惰捣' : '璋冧紭'
        ))
      ),
      !imageOnly && expanded && h('div', { className: 'cpa-model-drawer' },
        h('div', { className: 'cpa-grid-2' },
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' },
              '涓婁笅鏂?Token 绐楀彛',
              h('span', { className: 'cpa-field-hint' }, `涓婇檺 ${m.maximumContext}`)
            ),
            h('input', {
              className: 'cpa-input',
              inputMode: 'numeric',
              value: draft.contextWindow,
              placeholder: `榛樿 ${m.contextWindow || m.effectiveContext}`,
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
              }, '鏈€澶у€?),
              h('button', {
                className: 'cpa-preset-btn',
                onClick: () => update('contextWindow', '')
              }, '鎭㈠榛樿')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '鎬濊€冩帹鐞嗗己搴?),
            h('select', {
              className: 'cpa-select',
              value: draft.reasoningEffort,
              disabled: !m.efforts?.length,
              onChange: e => update('reasoningEffort', e.target.value)
            },
              h('option', { value: '' }, m.efforts?.length ? '璺熼殢涓婃父榛樿' : '姝ゆā鍨嬩笉鏀寔鎬濊€冭皟鑺?),
              ...(m.efforts || []).map(v => h('option', { key: v, value: v }, `${effortNames[v] || v} (${v})`))
            ),
            h('span', { className: 'cpa-field-hint' }, '瀵硅瘽涓嫢鏄惧紡鎸囧畾寮哄害锛屽皢浠ヤ細璇濊缃负鍑?)
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '杈撳嚭璇︾暐'),
            h('select', {
              className: 'cpa-select',
              value: draft.verbosity,
              disabled: !m.supportsVerbosity,
              onChange: e => update('verbosity', e.target.value)
            },
              h('option', { value: '' }, m.supportsVerbosity ? '璺熼殢涓婃父榛樿' : '涓婃父鏈０鏄庢敮鎸?),
              h('option', { value: 'low' }, '绠€鐣?(Low)'),
              h('option', { value: 'medium' }, '鏍囧噯 (Medium)'),
              h('option', { value: 'high' }, '璇︾粏 (High)')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '鍥剧墖璇嗗埆 (Vision)'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, height: 32 } },
              h(Switch, {
                checked: draft.vision,
                onChange: v => update('vision', v),
                label: draft.vision ? '鍏佽鍙戦€佸浘鐗囩粰妯″瀷鍒嗘瀽锛堝凡寮€鍚瑙夛級' : '鍏抽棴鍥剧墖璇嗗埆锛堜粎澶勭悊鏂囨湰锛?
              })
            )
          )
        ),
        h('div', { className: 'cpa-model-footer' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            dirty && h('span', { className: 'cpa-dirty-tag' }, h(Icon, { name: 'info', size: 13 }), '鍙傛暟宸蹭慨鏀癸紝灏氭湭淇濆瓨'),
            savedNotice && h('span', { className: 'cpa-badge cpa-badge-success' }, h(Icon, { name: 'check', size: 12 }), '閰嶇疆宸茬敓鏁?)
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            dirty && h('button', {
              className: 'cpa-btn cpa-btn-ghost cpa-btn-sm',
              disabled: busy,
              onClick: () => { setDraft(saved()); setDirty(false); }
            }, '鏀惧純淇敼'),
            h('button', {
              className: `cpa-btn cpa-btn-sm ${dirty ? 'cpa-btn-primary' : 'cpa-btn-secondary'}`,
              disabled: busy || !dirty,
              onClick: save
            },
            h(Icon, { name: 'check', size: 14 }),
            '淇濆瓨璁剧疆'
          ))
        )
      )
    );
  }
```
## QuotaPanel
- File: `client.js` (lines 1439–1489)
- Description: Account quota summary with progress rows, timestamps, thresholds, and empty/error/loading states.
- Key props: account, brandColor

```js
  function quotaPercent(value) {
    if (!Number.isFinite(value)) return '浣欓噺鏈煡';
    const rounded = Math.round(value * 10) / 10;
    return `鍓╀綑 ${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  }

  function quotaResetLabel(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `閲嶇疆浜?${date.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
  }

  function QuotaPanel({ account, brandColor }) {
    const quota = account.quota || { state: 'idle', rows: [] };
    const rows = Array.isArray(quota.rows) ? quota.rows : [];
    const updated = quota.fetchedAt ? new Date(quota.fetchedAt) : null;
    return h('div', { className: 'cpa-quota-panel', 'aria-live': 'polite', 'aria-busy': quota.state === 'refreshing' },
      h('div', { className: 'cpa-quota-header' },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 } },
          h(Icon, { name: 'cpu', size: 13 }),
          quota.plan ? `妯″瀷棰濆害 路 ${quota.plan}` : '妯″瀷棰濆害'
        ),
        updated && !Number.isNaN(updated.getTime()) && h('span', null, `鏇存柊浜?${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      ),
      rows.length ? h('div', { className: 'cpa-quota-grid' }, ...rows.map((row, index) => {
        const percent = Number.isFinite(row.remainingPercent) ? Math.max(0, Math.min(100, row.remainingPercent)) : null;
        const color = percent !== null && percent <= 10 ? '#ef4444' : percent !== null && percent <= 30 ? '#f59e0b' : brandColor;
        const meta = [row.detail, quotaResetLabel(row.resetAt)].filter(Boolean).join(' 路 ');
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
        h('span', null, quota.message || (account.loggedIn ? '鐐瑰嚮鈥滃埛鏂伴搴︹€濇煡鐪嬪綋鍓嶆ā鍨嬩綑閲忋€? : '鐧诲綍鍚庡彲鍒锋柊妯″瀷棰濆害銆?))
      )
    );
  }
```
## AccountCard
- File: `client.js` (lines 1491–1588)
- Description: Provider account card for OAuth state, quota, catalog state, refresh/login/logout actions.
- Key props: account, busy, run

```js
  // Account Card Component
  function AccountCard({ account, busy, run }) {
    const isCodex = account.id === 'codex';
    const brandColor = isCodex ? '#10a37f' : '#4285f4';
    const connectionState = account.pending ? 'pending' : (account.loggedIn ? 'connected' : 'disconnected');
    const connectionLabel = account.pending ? '绛夊緟鎺堟潈' : (account.loggedIn ? '宸茶繛鎺? : '鏈櫥褰?);
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
              account.email && h('span', { 'aria-hidden': 'true' }, '路'),
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
            h('strong', { style: { display: 'block', fontSize: 13, color: '#b45309' } }, '姝ｅ湪绛夊緟缃戦〉鎺堟潈瀹屾垚'),
            h('span', { style: { fontSize: 12, color: '#92400e' } }, '鍦ㄦ祻瑙堝櫒瀹屾垚瀹樻柟鎺堟潈鍚庯紝Harness 浼氳嚜鍔ㄥ悓姝ヨ处鍙枫€?)
          )
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          account.loginURL && h('a', {
            href: account.loginURL, target: '_blank', rel: 'noopener noreferrer',
            className: 'cpa-btn cpa-btn-primary'
          }, '鎵撳紑鎺堟潈椤甸潰', h(Icon, { name: 'externalLink', size: 13 })),
          h('button', {
            className: 'cpa-btn cpa-btn-secondary',
            disabled: busy,
            onClick: () => run({ action: 'cancel', provider: account.id })
          }, '鍙栨秷鎺堟潈')
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

      h('div', { className: 'cpa-account-actions', 'aria-label': `${account.name} 鎿嶄綔` },
        !account.loggedIn && !account.pending && h('button', {
          className: 'cpa-btn cpa-btn-primary',
          disabled: busy,
          onClick: () => run({ action: 'login', provider: account.id })
        }, h(Icon, { name: 'user', size: 13 }), `鐧诲綍 ${isCodex ? 'Codex' : 'Google'}`),
        h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy || !account.loggedIn,
          onClick: refreshQuota,
          title: '浠庡畼鏂规帴鍙ｈ鍙栬繖涓处鍙风殑妯″瀷棰濆害'
        }, h(Icon, { name: 'refresh', size: 12, spin: quotaBusy }), quotaBusy ? '鍒锋柊涓? : '鍒锋柊棰濆害'),
        h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy || !account.loggedIn,
          onClick: () => run({ action: 'models', provider: account.id }),
          title: '浠庡畼鏂规帴鍙ｅ悓姝ヨ繖涓处鍙风殑鍙敤妯″瀷鐩綍'
        }, h(Icon, { name: 'cpu', size: 12 }), '鍒锋柊妯″瀷'),
        account.loggedIn && h('span', { className: 'cpa-account-action-spacer', 'aria-hidden': 'true' }),
        account.loggedIn && h('button', {
          className: 'cpa-btn cpa-btn-secondary',
          disabled: busy,
          onClick: () => run({ action: 'login', provider: account.id })
        }, '閲嶆柊鐧诲綍'),
        account.loggedIn && h('button', {
          className: 'cpa-btn cpa-btn-danger',
          disabled: busy,
          onClick: () => run({ action: 'logout', provider: account.id })
        }, h(Icon, { name: 'trash', size: 12 }), '閫€鍑?)
      )
    );
  }
```
## NetworkPanel
- File: `client.js` (lines 1590–1679)
- Description: Network mode selector and manual HTTP proxy form.
- Key props: settings, route, run, busy

```js
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
          h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'globe', size: 18 }), '缃戠粶涓庝唬鐞嗚缃?),
          h('p', { className: 'cpa-subtitle', style: { marginTop: 3 } }, '閫夋嫨 CPA 璁块棶 OpenAI 涓?Google 绔偣鏃舵墍鐢ㄧ殑缃戠粶閫氳矾')
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          savedNotice && h('span', { className: 'cpa-badge cpa-badge-success' }, h(Icon, { name: 'check', size: 12 }), '缃戠粶璁剧疆宸叉洿鏂?),
          h('button', {
            className: `cpa-btn ${dirty ? 'cpa-btn-primary' : 'cpa-btn-secondary'}`,
            disabled: busy || !dirty,
            onClick: save
          }, h(Icon, { name: 'check', size: 14 }), '淇濆瓨缃戠粶閰嶇疆')
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
            '鑷姩妫€娴?(鎺ㄨ崘)'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '璇诲彇 Harness 鐜銆佺郴缁?HTTP_PROXY / HTTPS_PROXY 鍙?Windows 娉ㄥ唽琛ㄧ郴缁熶唬鐞嗐€?)
        ),
        h('div', {
          className: 'cpa-network-mode',
          'data-selected': mode === 'direct',
          onClick: () => { setMode('direct'); setDirty(true); }
        },
          h('div', { className: 'cpa-network-mode-title' },
            h(Icon, { name: 'check', size: 15 }),
            '鐩磋繛妯″紡'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '缁曡繃鎵€鏈夋湰鍦颁唬鐞嗭紝鐩存帴閫氳繃鍘熺敓缃戠粶杩炴帴涓婃父 API 鏈嶅姟绔€?)
        ),
        h('div', {
          className: 'cpa-network-mode',
          'data-selected': mode === 'manual',
          onClick: () => { setMode('manual'); setDirty(true); }
        },
          h('div', { className: 'cpa-network-mode-title' },
            h(Icon, { name: 'sliders', size: 15 }),
            '鎸囧畾 HTTP 浠ｇ悊'
          ),
          h('div', { className: 'cpa-network-mode-desc' }, '鎵嬪姩鎸囧畾涓撶敤 HTTP 浠ｇ悊鍦板潃锛堜緥濡?Clash銆乿2rayN銆丼urge 绛夛級銆?)
        )
      ),

      mode === 'manual' && h('div', { className: 'cpa-field', style: { marginTop: 4 } },
        h('label', { className: 'cpa-field-label' }, 'HTTP 浠ｇ悊鏈嶅姟鍣ㄥ湴鍧€'),
        h('input', {
          className: 'cpa-input',
          value: url,
          placeholder: 'http://127.0.0.1:7890',
          onChange: e => { setURL(e.target.value); setDirty(true); }
        }),
        h('span', { className: 'cpa-field-hint' }, '鏍煎紡鏀寔 http://127.0.0.1:7890 鎴栧寘鍚璇佺殑 http://user:pass@127.0.0.1:7890')
      ),

      h('div', { className: 'cpa-card-inner', style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 } },
        h(Icon, { name: 'info', size: 15, style: { color: 'var(--dsw-alias-brand-primary, #3b82f6)' } }),
        h('span', null, '褰撳墠瀹為檯鐢熸晥缃戠粶璺敱: ', h('strong', { style: { fontFamily: 'monospace' } }, route || '鑷姩妫€娴嬩腑鈥?))
      )
    );
  }
```
## ImagePanel
- File: `client.js` (lines 1681–1934)
- Description: Image-tool preferences, prompt/reference-image playground, and recent image gallery.
- Key props: state, run, busy

```js
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
      ? [['gpt-image-2', 'GPT Image 2 (璁㈤槄鐢诲浘)']]
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
        if (file.size > 20971520) return run(null, '鍗曞紶鍙傝€冨浘涓嶈兘瓒呰繃 20 MB銆?);
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
              h('h3', { className: 'cpa-card-title' }, '鍥剧墖鐢熸垚宸ュ叿涓庤兘鍔?),
              h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } }, '鍦ㄤ細璇濅腑鍚戞櫤鑳戒綋寮€鏀?cpa_image_generate 宸ュ叿')
            )
          ),
          h(Switch, {
            checked: enabled,
            disabled: busy,
            onChange: v => { setEnabled(v); run({ action: 'preferences', patch: { images: { enabled: v, provider, model, quality } } }); },
            label: enabled ? '宸ュ叿宸插紑鍚? : '宸ュ叿宸插叧闂?
          })
        ),
        h('div', { className: 'cpa-grid-2' },
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '榛樿鐢熷浘娓犻亾'),
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
              h('option', { value: 'codex' }, 'OpenAI Codex 璁㈤槄'),
              h('option', { value: 'antigravity' }, 'Google Antigravity 璁㈤槄')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '榛樿鍥剧墖妯″瀷'),
            h('select', {
              className: 'cpa-select',
              value: model,
              onChange: e => setModel(e.target.value)
            },
              h('option', { value: '' }, '閫夋嫨鐢熷浘妯″瀷鈥?),
              ...candidates.map(([v, t]) => h('option', { key: v, value: v }, t))
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '鍥剧墖璐ㄩ噺'),
            h('select', {
              className: 'cpa-select',
              value: quality,
              disabled: provider === 'antigravity',
              onChange: e => setQuality(e.target.value)
            },
              h('option', { value: 'auto' }, '鑷姩 (Auto)'),
              h('option', { value: 'low' }, '浣庤川閲?(鐪佹祦)'),
              h('option', { value: 'medium' }, '涓瓑璐ㄩ噺'),
              h('option', { value: 'high' }, '楂樻竻鏅板害 (High)')
            )
          ),
          h('div', { className: 'cpa-field' },
            h('label', { className: 'cpa-field-label' }, '鍥剧墖灏哄'),
            h('input', {
              className: 'cpa-input',
              value: size,
              disabled: provider === 'antigravity',
              placeholder: 'auto 鎴?1024x1024',
              onChange: e => setSize(e.target.value)
            })
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 4 } },
          h('button', {
            className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
            disabled: busy || !model,
            onClick: savePreferences
          }, h(Icon, { name: 'check', size: 14 }), '淇濆瓨涓洪粯璁ょ敓鍥惧亸濂?)
        )
      ),

      // Interactive Testing Playground
      h('div', { className: 'cpa-card' },
        h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'sparkles', size: 18 }), '鍒涗綔涓庝慨鍥句綋楠屽尯'),
        h('div', { className: 'cpa-field' },
          h('label', { className: 'cpa-field-label' }, '鎻愮ず璇?(Prompt)'),
          h('textarea', {
            className: 'cpa-input',
            style: { minHeight: 80, height: 'auto', padding: '10px 12px', resize: 'vertical' },
            value: prompt,
            placeholder: '鎻忚堪鎯宠鐢熸垚鐨勫浘鐗囩粏鑺傘€佽壓鏈鏍笺€佽壊褰╀笌姘涘洿锛涜嫢涓婁紶浜嗗弬鑰冨浘鐗囷紝璇锋槑纭啓鍑轰慨鏀规垨铻嶅悎瑕佹眰銆?,
            onChange: e => setPrompt(e.target.value)
          })
        ),

        // Drag & Drop Reference Image Area
        h('div', { className: 'cpa-field' },
          h('label', { className: 'cpa-field-label' },
            '鍙傝€冨浘鐗?(鍙€夛紝鏈€澶?5 寮?',
            h('span', { className: 'cpa-field-hint' }, `宸查€?${files.length}/5 寮?路 鏀寔 PNG/JPG/WebP`)
          ),
          h('div', {
            className: 'cpa-dropzone',
            onClick: () => fileInputRef.current?.click()
          },
            h(Icon, { name: 'upload', size: 28, style: { color: 'var(--dsw-alias-label-tertiary)', marginBottom: 6 } }),
            h('div', { style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '鐐瑰嚮鎴栨嫋鎷藉弬鑰冨浘鐗囧埌姝ゅ'),
            h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', marginTop: 2 } }, '鐢ㄤ簬鍥惧儚閲嶇粯銆佸浘鐢熷浘鎴栧鍥惧悎鎴?)
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
              h('img', { src: url, alt: '鍙傝€冨浘' }),
              h('button', {
                className: 'cpa-thumb-del',
                onClick: () => removeFile(idx),
                title: '绉婚櫎姝ゅ浘'
              }, '脳')
            ))
          )
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 } },
          h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } },
            '浣跨敤鎵€閫夎闃呰处鍙风敓鎴愶紝澶辫触涓嶄細鑷姩鍒囨崲鍏朵粬浠樿垂娓犻亾'
          ),
          h('button', {
            className: 'cpa-btn cpa-btn-primary',
            disabled: busy || !model || !prompt.trim(),
            onClick: () => generate().catch(e => run(null, e.message))
          },
            h(Icon, { name: busy ? 'refresh' : 'sparkles', size: 15, spin: busy }),
            busy ? '姝ｅ湪鐢熸垚鍥惧儚鈥? : (files.length ? '鍩轰簬鍙傝€冨浘閲嶇粯' : '绔嬪嵆鐢熸垚鍥剧墖')
          )
        )
      ),

      // Gallery Section
      h('div', { className: 'cpa-card' },
        h('div', { className: 'cpa-card-header' },
          h('h3', { className: 'cpa-card-title' },
            h(Icon, { name: 'image', size: 18 }),
            '鏈€杩戠敓鎴愮殑鍥剧墖',
            h('span', { className: 'cpa-badge' }, `${state.gallery?.length || 0} 寮燻)
          )
        ),
        (!state.gallery || state.gallery.length === 0) ? h('div', {
          style: { padding: '36px 0', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' }
        },
          h(Icon, { name: 'image', size: 36, style: { opacity: 0.4, marginBottom: 8 } }),
          h('div', { style: { fontSize: 13 } }, '鏆傛棤宸茬敓鎴愮殑鍥剧墖璁板綍锛屽湪涓婃柟杈撳叆鎻愮ず璇嶅垱浣滃惂')
        ) : h('div', { className: 'cpa-gallery-grid' },
          state.gallery.map(img => h('div', { key: img.id, className: 'cpa-gallery-card' },
            h('div', { className: 'cpa-gallery-img-wrap' },
              h('img', {
                src: `/api/cpa-images?id=${img.id}`,
                alt: `${img.model} 鐢熸垚鐨勫浘鐗嘸,
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
                  title: '鍦ㄦ柊绐楀彛鏌ョ湅鏃犳崯鍘熷浘'
                }, h(Icon, { name: 'externalLink', size: 13 }), '鍘熷浘'),
                h('a', {
                  href: `/api/cpa-images?id=${img.id}&original=1&download=1`,
                  className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
                  title: '涓嬭浇鍘熷浘鍒版湰鍦?
                }, h(Icon, { name: 'download', size: 13 }), '涓嬭浇')
              )
            )
          ))
        )
      )
    );
  }
```
## DiagnosticsPanel
- File: `client.js` (lines 1936–1965)
- Description: Runtime diagnostics card with JSON display and clipboard copy.
- Key props: state, run, busy

```js
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
          h('h3', { className: 'cpa-card-title' }, h(Icon, { name: 'sliders', size: 18 }), '杩愯鐜涓庤瘖鏂暟鎹?),
          h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } }, '妫€鏌ユ彃浠跺唴閮ㄨ繍琛屾椂鐘舵€併€佷細璇濅笌妯″瀷鍏冩暟鎹?)
        ),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', {
            className: 'cpa-btn cpa-btn-secondary',
            onClick: copyData
          }, h(Icon, { name: copied ? 'check' : 'copy', size: 14 }), copied ? '宸插鍒?JSON' : '澶嶅埗璇婃柇 JSON')
        )
      ),
      h('pre', { className: 'cpa-pre' },
        state ? JSON.stringify(state, null, 2) : '姝ｅ湪璇诲彇鐘舵€佲€?
      )
    );
  }
```

