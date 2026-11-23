# run-03 学生端补采脚本（可复跑）

- `r03_capture.py`：主采集器（Python 3 + Playwright，headless Chromium，1672×941/DPR=1）。
  分阶段：`library` / `library2` / `library3` / `resources` / `errors` / `classroom` / `play` / `me`
  ```
  python r03_capture.py library2 play
  ```
  - 登录走真实 `/login` UI，演示码取页面 `.demo-note`（并可用挑战响应 `demo_code` 兜底）；遇 `AUTH_RATE_LIMITED` 按响应 `retry_after` 等待重试；
  - 所有请求由 UI 操作触发；`page.on('response')` 记录完整 URL（含 query）+ 响应原文；
  - 同一 `METHOD path?query` 只落一份原文（`api/bodies/`），重复出现记入 `seenIn`；
  - 已有 `api/index.json` 会被载入并合并写出，可安全分阶段重跑。
- `build_report.py`：由 `api/index.json` + `api/bodies/` 生成逐页请求表格（`report_tables.md`）。
- `compose_report.py`：把正文与表格拼成 `REPORT.md`。
- `run-retry.ps1`：带重试的包装（宿主可能清理长时间无交互的进程/浏览器）。
