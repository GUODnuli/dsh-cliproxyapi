# Shared Layouts

## Layout architecture
The plugin has one page-scale frontend entry. `client.js` is monolithic, so the complete relevant layout implementations are preserved as exact source segments rather than duplicating unrelated component/theme sections.

- Root layout component: `SubscriptionAccounts` (`client.js` lines 1968–2302).
- Host attachment: Cordis slot `settings.section`, id `cpa-subscriptions`, order `15`, label `订阅账号 (CPA)` (`client.js` lines 2308–2313).
- Secondary cross-surface attachment: Cordis slot `conversation.composer.dock`, id `cpa-subscription-quota`, order `10` (`client.js` lines 2314–2330).
- No plugin-owned global navbar, sidebar, breadcrumb, or footer. Those belong to the DSH host shell.
- Content shell: `.cpa-container`, centered with `max-width: 820px` and vertical flow.

## SubscriptionAccounts root layout
- File: `client.js` lines 1968–2302
- Description: Complete settings-section shell: data polling/action state, title/actions, global error, four-tab navigation, and conditional content regions.
- Dependencies represented in `components.md`: `Icon`, `AccountCard`, `ModelRow`, `ImagePanel`, `NetworkPanel`, `DiagnosticsPanel`.
```js
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
        if (mounted.current) setError(action.signal.aborted ? '宸插仠姝㈢瓑寰咃紱鍚庡彴鍏变韩鍒锋柊鍙兘浠嶄細瀹屾垚銆? : e.message);
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
      : (state ? '绛夊緟棣栨鍚屾' : '姝ｅ湪璇诲彇鈥?);
    const refreshingAllQuotas = busyAction === 'quota-all';

    return h('section', { className: 'cpa-container' },
      // Top Navigation & Branding Header
      h('div', { className: 'cpa-header' },
        h('div', { className: 'cpa-title-group' },
          h('h2', { className: 'cpa-title' },
            'CLIProxyAPI 璁㈤槄鏈嶅姟',
            h('span', { className: 'cpa-badge cpa-badge-brand' }, '2.3.3')
          ),
          h('p', { className: 'cpa-subtitle' },
            '绠＄悊璁㈤槄璐﹀彿銆佹ā鍨嬭兘鍔涗笌瀹炴椂棰濆害'
          )
        ),
        h('div', { className: 'cpa-header-actions' },
          busy && h('button', {
            className: 'cpa-btn cpa-btn-danger cpa-btn-sm',
            onClick: () => actionController.current?.abort(),
            title: '鍋滄绛夊緟褰撳墠椤甸潰鎿嶄綔锛涘叡浜埛鏂板彲鑳戒粛鍦ㄥ悗鍙板畬鎴?
          }, h(Icon, { name: 'x', size: 13 }), '鍋滄绛夊緟'),
          h('button', {
            className: 'cpa-btn cpa-btn-primary',
            disabled: busy || loggedInCount === 0,
            onClick: () => run({ action: 'quota-all' }),
            title: loggedInCount ? '浠庡畼鏂规帴鍙ｅ埛鏂版墍鏈夊凡鐧诲綍璐﹀彿鐨勯搴? : '鐧诲綍璐﹀彿鍚庡彲鎵归噺鍒锋柊棰濆害'
          }, h(Icon, { name: 'refresh', size: 14, spin: refreshingAllQuotas }), refreshingAllQuotas ? '姝ｅ湪鍒锋柊鍏ㄩ儴棰濆害' : '鍒锋柊鎵€鏈夐搴?),
          h('button', {
            className: 'cpa-btn cpa-btn-secondary cpa-btn-sm',
            disabled: busy,
            onClick: () => load(),
            title: '閲嶆柊璇诲彇鎻掍欢褰撳墠缂撳瓨鐘舵€侊紝涓嶈姹備笂娓告帴鍙?
          }, h(Icon, { name: 'refresh', size: 13 }), '閲嶆柊璇诲彇')
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
          '璐﹀彿涓庢ā鍨?,
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
          '鍥剧墖宸ュ潑',
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
          '缃戠粶浠ｇ悊'
        ),
        h('button', {
          className: 'cpa-tab',
          role: 'tab',
          'aria-selected': tab === 'diagnostics',
          'data-active': tab === 'diagnostics',
          onClick: () => setTab('diagnostics')
        },
          h(Icon, { name: 'sliders', size: 16 }),
          '绯荤粺璇婃柇'
        )
      ),

      // Tab 1: 璐﹀彿涓庢ā鍨?      tab === 'models' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { className: 'cpa-overview', 'aria-label': '璁㈤槄鏈嶅姟姒傝' },
          h('div', { className: 'cpa-overview-stats' },
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '璐﹀彿'),
              h('span', { className: 'cpa-overview-value' }, `${loggedInCount}/${accounts.length || 2}`)
            ),
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '寮€鏀炬ā鍨?),
              h('span', { className: 'cpa-overview-value' }, state ? `${enabledCount}` : '璇诲彇涓€?)
            ),
            h('div', { className: 'cpa-overview-item' },
              h('span', { className: 'cpa-overview-label' }, '棰濆害鍚屾'),
              h('span', { className: 'cpa-overview-value' }, latestQuotaLabel)
            )
          ),
          h('span', { className: 'cpa-overview-sync' },
            h('span', { className: 'cpa-dot', 'data-state': 'connected' }),
            '鍚姩鑷姩鍚屾宸插紑鍚?
          )
        ),
        state ? h('div', { className: 'cpa-account-list' },
          ...accounts.map(row => h(AccountCard, { key: row.id, account: row, busy, run }))
        ) : h('div', { className: 'cpa-card cpa-card-inner', role: 'status' },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 } },
            h(Icon, { name: 'refresh', size: 15, spin: true }), '姝ｅ湪璇诲彇璁㈤槄璐﹀彿銆侀搴︿笌妯″瀷淇℃伅鈥?
          )
        ),

        // Unified Model Catalog & Filter Bar
        state && h('div', { className: 'cpa-card' },
          h('div', { className: 'cpa-card-header' },
            h('div', null,
              h('h3', { className: 'cpa-card-title' },
                h(Icon, { name: 'cpu', size: 18 }),
                '妯″瀷鐩綍涓庤兘鍔涜皟浼?,
                h('span', { className: 'cpa-badge cpa-badge-success' }, `${enabledCount} 涓凡寮€鏀綻)
              ),
              h('p', { className: 'cpa-subtitle', style: { marginTop: 2 } },
                '鍕鹃€夊紑鏀炬ā鍨嬶紝灞曞紑鍙畾鍒朵笂涓嬫枃 Token 闀垮害銆佹€濊€冨己搴︺€佽鐣ュ害涓庤瑙夊紑鍏?
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
                placeholder: '鎼滅储妯″瀷鍚嶇О鎴?ID (濡?gpt-4o, o3-mini, gemini-2.5-pro)...',
                onChange: e => setQuery(e.target.value)
              }),
              query && h('button', {
                className: 'cpa-search-clear',
                onClick: () => setQuery('')
              }, h(Icon, { name: 'x', size: 14 }))
            ),
            h('div', { className: 'cpa-filter-chips' },
              h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginRight: 2 } }, '娓犻亾:'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'all',
                onClick: () => setProviderFilter('all')
              }, '鍏ㄩ儴娓犻亾'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'codex',
                onClick: () => setProviderFilter('codex')
              }, 'Codex 璁㈤槄'),
              h('span', {
                className: 'cpa-chip',
                'data-active': providerFilter === 'antigravity',
                onClick: () => setProviderFilter('antigravity')
              }, 'Antigravity 璁㈤槄'),

              h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', marginLeft: 8, marginRight: 2 } }, '鐗规€?'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'all',
                onClick: () => setFeatureFilter('all')
              }, '鍏ㄩ儴'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'enabled',
                onClick: () => setFeatureFilter('enabled')
              }, '浠呭凡寮€鏀?),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'vision',
                onClick: () => setFeatureFilter('vision')
              }, '瑙嗚妯″瀷'),
              h('span', {
                className: 'cpa-chip',
                'data-active': featureFilter === 'image',
                onClick: () => setFeatureFilter('image')
              }, '鍥剧墖鐢熸垚')
            )
          ),

          // Models List
          filteredModels.length === 0 ? h('div', {
            style: { padding: '32px 0', textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)' }
          },
            h(Icon, { name: 'search', size: 32, style: { opacity: 0.4, marginBottom: 8 } }),
            h('div', { style: { fontSize: 13 } }, '娌℃湁鎵惧埌鍖归厤鐨勬ā鍨嬶紝璇峰皾璇曚慨鏀瑰叧閿瘝鎴栬繃婊ゆ潯浠?)
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

      // Tab 2: 鍥剧墖宸ュ潑
      tab === 'images' && state && h(ImagePanel, { state, run, busy }),

      // Tab 3: 缃戠粶浠ｇ悊
      tab === 'network' && state && h(NetworkPanel, {
        settings: state.preferences?.network,
        route: state.network?.route,
        run,
        busy
      }),

      // Tab 4: 璇婃柇
      tab === 'diagnostics' && h(DiagnosticsPanel, { state, run, busy })
    );
  }

```

## Cordis slot layout registration
- File: `client.js` lines 2304–2333
- Description: Mounts the settings root and the composer quota component into DSH host layouts.

```js
    inject: ['slots', 'modelDirectories'],
    apply(ctx) {
      ensureStyles();
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'cpa-subscriptions',
        order: 15,
        label: () => '璁㈤槄璐﹀彿 (CPA)'
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
```

