# run-03b 采证脚本（可复跑）

- `r03b_capture.py`：Playwright headless Chromium 脚本，经现役 `/login` UI 登录（复用
  `D:\zxsy-math-arena-showcase\.work\scripts\live_login.py`），分三阶段采证：
  - `conv`：`/dialog` 历史会话列表响应 + 逐条点开后的 `messages?limit=20` 响应原文与截图；
  - `errors`：`/errors` 筛选列表响应 + 逐条点开后的 `detail` / `butler/error-detail` /
    `butler/error-diagnosis` 响应原文与截图；
  - `covers`：`/resources`「按知识点浏览」Tab 的 `student/videos` 响应 + 全部
    `i*.hdslb.com` 封面原始字节（浏览器响应字节优先，缺图按 UI 里的 `img src` 兜底直取）。
- 运行（需现役 5176 前端 / 8000 API 在线；SMS 60s 频控会自动等待重试）：

```powershell
cd D:\zxsy-math-arena-showcase
python evidence\live\run-03b\scripts\r03b_capture.py
# 或分阶段：
python evidence\live\run-03b\scripts\r03b_capture.py conv
python evidence\live\run-03b\scripts\r03b_capture.py errors
python evidence\live\run-03b\scripts\r03b_capture.py covers
```

- 输出根：`evidence/live/run-03b/`；运行日志与中间产物：`.work/r03b/`（`run-log.json`、
  `steps`、各阶段明细）。脚本不做任何产品代码改动，**不落盘 token / cookie**：只保存响应
  原文（不含 Authorization 头）与图片字节。
- 视口 1672×941、DPR=1、headless；`page.on('response')` 记录完整 URL（含 query）。