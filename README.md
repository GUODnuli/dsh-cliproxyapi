# dsh-cliproxyapi

[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-compatible-blue.svg)](https://github.com/topics/dsh-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Native Codex and Antigravity subscription accounts inside DeepSeek Harness, based on CLIProxyAPI.  
无需单独启动或运行外部 CLIProxyAPI 后台，直接在 DeepSeek Harness 内无缝使用 Codex、Antigravity（Gemini）订阅账号。

---

## 特性亮点 (Highlights)

- **原生内嵌协议桥接**：直接在 Harness 内对接 Codex (OpenAI OAuth) 与 Antigravity (Google OAuth) 订阅接口，无需本地额外起端口监听或常驻进程。
- **现代化设置面板**：原生风格“订阅账号”管理界面，提供账号连接、模型列表、额度概览、思考强度微调、多模态视觉开关及代理配置。
- **智能额度展示与记忆**：状态栏与会话输入框额度圆环，支持 5 小时与周额度自适应排布；按模型智能记忆推理思考档位（Thinking Effort）。
- **工具调用与多模态全面兼容**：完美支持复杂 JSON Schema 模式（联合类型、约束字段等）平滑转换到 Gemini 严格子集，子智能体与复杂工具流零阻碍运行。
- **图片生成与编辑**：集成 `cpa_image_generate` 工具与 Harness 附件体系，支持 GPT Image 与 Gemini 多模态图生图、参考图编辑与高清查看。

---

## 安装说明 (Installation)

### 方式一：在 DeepSeek Harness 设置页中安装（推荐）

1. 此分支适用于 DSH 0.2.2，离线验证版本为 0.2.2-rc.5。运行 `npm run pack:plugin` 生成 `dsh-cliproxyapi-2.3.6-dsh.8.tgz`。
2. 打开 DeepSeek Harness → 设置 → 插件管理，选择“从本地包安装”，选取该 `.tgz` 文件。
3. 若安装时保持停用，准备授权时再启用。它注册独立的 `cpa-codex` 和 `cpa-antigravity` 路由，不替换已有供应商或导入其 OAuth 凭据。授权及模型可用性仍由上游决定。

### 方式二：命令行安装 (CLI)

```bash
# Web profile 模式
dsh plugin --profile web add ./dsh-cliproxyapi-2.3.5.tgz

# 或者使用 npx
npx @deepseek-ai/dsh plugin --profile web add ./dsh-cliproxyapi-2.3.5.tgz
```

---

## 快速使用 (Usage)

1. 进入 Harness **设置 → 订阅账号**。
2. 在 **Codex** 或 **Antigravity** 卡片中点击“登录账号”，通过浏览器授权完成登录。
3. 在“模型设置”中开启你想要使用的模型（如 `gpt-5.4`、`gemini-3.8-flash` 等）。
4. 新建会话，在模型选择器中切换到对应的订阅模型即可畅快使用。

---

## 本地开发与测试 (Development)

```bash
npm install
npm test
npm run pack:plugin
```

详细更新日志与说明请参阅 [README_CN.md](README_CN.md)。

## 开源协议 (License)

[MIT](LICENSE)
