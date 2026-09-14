# Source attribution

Version 0.2.0 also adapts model-catalog metadata, proxy selection, and subscription
image endpoint conventions from dsh-codex-subscription 2.1.0-beta.5, supplied
locally by the user. Repository: https://github.com/WSL043/dsh-codex-subscription

Copyright (c) 2026 WSL043. These portions are distributed under the same MIT
License text reproduced below, including its permission grant and disclaimer.

This plugin ports the Codex OAuth/PKCE, Google Antigravity OAuth and project
onboarding, and direct provider request conventions from CLIProxyAPI.

Reference repository: https://github.com/router-for-me/CLIProxyAPI
Local reference commit: 09a29bd345bc44c473abe7fd07859e32df2ea543

Reference files:
- internal/auth/codex/openai_auth.go
- internal/auth/antigravity/constants.go
- internal/auth/antigravity/auth.go
- internal/runtime/executor/codex_executor_request.go
- internal/runtime/executor/antigravity_executor_request.go
- sdk/cliproxy/antigravity_models.go
- cmd/fetch_codex_models/main.go

Original license:

MIT License

Copyright (c) 2025-2005.9 Luis Pater
Copyright (c) 2025.9-present Router-For.ME

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

DeepSeek Harness packages are supplied by the host application, under their
respective MIT licenses. Their public plugin, LLM, settings, and credential
APIs are used without modifying the host's files.
