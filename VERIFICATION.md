# 验证记录

## 2.3.0：输入框额度圆环与按模型记忆思考强度（2026-09-12）

- `npm test`：44 项全部通过；新增覆盖 Codex/Gemini 5 小时及周窗口筛选、缺失窗口不占位、排除 Codex 附加/代码审查额度、Web 返回脱敏 composer 数据、与 StatsPills 同行且额度整组不可拆分的布局契约，以及支持/不支持推理档位模型的记忆与恢复。
- `node --check client.js src/quota.js src/web.js`：三个修改入口均通过语法检查。
- 额度窗口现在携带稳定的 `scope`、`windowKind`、`windowSeconds` 机器字段；composer 不依赖中文标签判断窗口，只显示 `scope=account` 且百分比有限的 `five-hour`/`week`。
- 客户端仅在当前会话路由为 `cpa-codex` 或 `cpa-antigravity` 时读取缓存；无缓存或缓存超过 5 分钟时调用现有 Host 额度接口，后续每 5 分钟刷新。切走 CPA 路由即卸载显示并取消请求。
- 思考档位使用版本化浏览器本地映射 `provider + model -> effort/provider-default`；只对目录明确声明 reasoning efforts 的模型生效，恢复前重新校验该档位仍受模型支持。
- 视觉检查：按现有 InputBar、StatsPills 与 ContextMeter 尺寸验证宽屏和窄屏布局；额度完整分组与 Token/缓存命中统计同行，空间不足时仅整组换行，5 小时与周额度始终保持在一起；圆环使用 14×14 SVG，临时预览文件已删除。
- 当前另启 Chrome 访问 `http://127.0.0.1:43120` 因没有 Electron 会话凭据返回 `forbidden`；没有伪称在现有已登录 GUI 中完成实装验证。Desktop profile 仍安装 2.2.2，需在插件管理器安装 2.3.0 包并重启后做最终实机确认。

## 2.2.2：任务更新后 `aborted / UNKNOWN`（2026-09-12）

- 定位依据：受影响会话第 7 轮第 12 步的 `todo_write` 返回 `isError: false`，任务快照持久化并正常结束。第 13 步收到两个 `pwsh` 工具参数流后，在模型响应完成前报 `aborted / UNKNOWN`，没有对应工具执行记录。
- 根因：`src/http.js` 的 `readSSE()` 未捕获 `reader.read()` 的传输异常；DSH 将普通网络 Error 归类为 `UNKNOWN`，因此未命中订阅适配器已有的 NETWORK/SERVER/RATE_LIMIT 有限重试策略。
- 最小修复：仅在读取响应体失败处转换为脱敏的 `LlmError(..., 'NETWORK')`；调用方已取消时优先抛出原始取消原因。未改任务工具、主循环、代理设置、账号凭据或 UI。
- 修复前：新增 9 项测试中 6 项失败，复现原始 `aborted` 和未归类的断流；3 项取消/协议测试通过。
- 修复后：`node --test --test-isolation=none test/*.test.js`，33 项全部通过。关闭测试进程隔离是为了在 Windows 沙箱中避免子进程输出管道；测试未调用实际任务工具、真实模型或外部订阅接口。
- 已检查 Desktop 打包版主循环：失败响应仅记录为 `assistant/attempt`；完整成功响应之后才分发工具，因此有限重试不会重复执行失败响应中的未提交工具调用。
- 范围限制：修复错误分类与恢复机会，不保证消除上游/代理实际断连；两次重试均失败时仍会报告 NETWORK。当前 Desktop 的安装和重启状态应另行确认，不能以离线测试替代实机验证。

## 0.2.0（2026-09-11）

- 24 项回归测试全部通过。
- 使用用户现有账号进行最小请求对照，未输出或复制登录令牌。
- Gemini 同模型同请求：旧 production 生成端点返回 429；daily 订阅端点返回 200 并正常回复。
- Codex 模型目录：client_version 0.114.0 返回 Spark 与隐藏 Auto Review；0.153.3 返回 6 个可见模型及 2 个隐藏模型。
- Codex Luna：通过系统 HTTP 代理约 1947 ms 完成，回复 OK。
- 真实 Harness 设置页：模型开放、上下文、思考强度、输出详略、识图控件已显示；保存 200000 Token 后接口读回 200000。
- 原生图片工具注册成功；图片识别字节转换、图片生成接口和原图存储通过模拟测试。未进行真实付费图片生成。
- 自动升级真实 desktop profile 被 Harness 拒绝：该 profile 由 Electron 独占管理。需从应用内插件管理器安装 0.2.0 包并重启；现有安装未被命令行改动。

以下为上一版的历史验证记录。

日期：2026-09-11

交付文件：`dsh-cliproxyapi-0.1.1.tgz`。

SHA-256：`877432AC67D5DF17F4105E5BB704118C8105FC99F4F0DD62AA5C41372D1E5B48`

## 通过

- `npm test`：17 项全部通过。
- 实际 Cordis：加载插件、注册两个原生模型渠道、注册 `/cpa` 命令、流式返回、卸载后释放注册。
- 模拟 OAuth：Codex PKCE、错误 state 拒绝、重复登录拒绝、有效回调保存；Antigravity 用户信息与项目 onboarding。
- 取消授权后拒绝迟到的凭据写入，并释放回调监听器。
- 并发刷新只发出一次请求；刷新失败保留旧凭据；取消单个等待者不会破坏共享刷新。
- Codex 工具调用与加密 reasoning 回放；Antigravity thought signature 和工具调用 ID 回放。
- SSE 任意 UTF-8 切分、工具结果续接、缓存 token 独立计数、断流报错。
- 管理接口返回账号描述，不返回 access token 或 refresh token。
- Harness Web：设置中出现“订阅账号”；两条渠道均可创建授权链接并取消。
- 未带 Harness 登录凭据访问 `/api/cpa-subscriptions` 返回 HTTP 401。
- 最终 0.1.1 tarball 已安装至隔离测试 profile，核对安装版本及 manifest 后成功启动。
- 包中仅有 15 个运行文件／文档，不包含开发依赖、测试数据、账号凭据或 CLIProxyAPI 二进制。
- 原 `CLIProxyAPI` 工作树 `git status --short` 为空。

## 尚未验证

- 真实 ChatGPT / Antigravity 订阅的登录授权、模型权限与推理。
- Electron 桌面版的插件 UI；已验证的是官方 Harness Web profile。

测试安装与数据位于本项目的 `.test-home`，不是用户已有的 Harness 数据目录。
界面截图见 `test/settings-preview.png`。`0.1.0` tarball 为先前测试产物，交付以 `0.1.1` 为准。
