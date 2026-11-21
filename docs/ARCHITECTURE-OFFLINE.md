# 离线复刻架构（现役前端 fork + 服务边界回放）

> 本文件解释「离线演示为什么会长得和现役一模一样」，以及哪些东西是复刻来的、哪些是本地数据。
> 依据：本轮 run-02 实测（`evidence/live/run-02/`）。

## 1. 一句话架构

**页面/组件/图标/样式/编辑器/渲染器 = 现役前端原样 fork；后端 = 本地回放层（用现役采证响应应答）。**

```
app/                        现役 frontend 源文件原样复制（513 个源文件）
├── src/                    ↑ 只改 3 处（见 §4）
├── src/offline/            ← 新增：离线回放层（服务边界）
│   ├── replay.js              fetch/XHR 拦截、登录引导、SSE 回放
│   ├── fixtures.js            run-02 采证响应的打包索引
│   ├── state.js               本地业务对象（会话/发布快照/文件绑定）
│   ├── handlers/agent.js      上传链路 + 导学对话回放（按文件 sha256 绑定案例）
│   └── fixtures/<role>/*.json 现役真实响应原文（采证所得）
└── vite.config.offline.mjs  单文件离线构建（vite-plugin-singlefile）
```

## 2. 为什么不是「重画页面」

上一版离线演示是自建 Vue 页面，逐页模仿现役界面。逐项盘点（`qa/audit-r02/`）显示 194 项里：
- 现役一致 23 项（11.9%）
- 需要恢复 58 项（29.9%）
- **展示版额外添加 79 项（40.7%）**
- 暂未实测 34 项（17.5%）

也就是说旧展示版四成内容是现役没有的自造设计与文案。本轮据此改为**复用现役代码**，
自造内容在结构上不再可能产生：界面上的每一处文字/控件都由现役组件渲染。

## 3. 服务边界在哪

现役前端所有请求都经过 `src/api/client.js`（`BASE='/api'`）与 `src/api/sse.js`（`fetchEventSource`），
最终都落到 `window.fetch`。离线层在 `main.js` 挂载前替换 `window.fetch` 与 `XMLHttpRequest`：

| 请求 | 离线行为 |
|---|---|
| `POST /api/auth/challenges/sms` | 返回采证到的同等信封，`demo_code` 固定 `246810`（现役也是页面展示随机码） |
| `POST /api/auth/login/sms` | 按「进入身份」返回对应角色的真实用户对象（取自采证 `/auth/me`） |
| `GET  /api/**`（页面数据） | 逐端点返回 run-02 采证的真实响应原文 |
| `POST /api/files/upload` | 按请求体里的 **压缩后 sha256** 匹配三道题之一，返回采证的 upload 响应 |
| `POST /api/files/{id}/parse` · `GET /content` | 返回该题采证的解析/内容响应 |
| `POST /api/agent/chat`（SSE） | 按会话游标回放该题**采证到的第 N 轮 SSE 原文**（token/status/card 事件逐条重放） |
| 预签名直传（对象存储） | 视为「已收到字节」（离线无存储服务） |
| **未采证的端点** | 返回 `{code:40401, message:"离线演示未收录该数据…"}` HTTP 404 —— 让现役 UI 显示它**自己的**错误态，绝不返回假成功 |

## 4. 相对现役前端的三处最小改动

| 文件 | 改动 | 理由 |
|---|---|---|
| `src/router/index.js` | 离线构建下用 `createWebHashHistory()` | `file://` 无服务端，`pushState` 不可用 |
| `src/pages/Login.vue` | 科研端登录落点在离线构建下改走 `router.push` | 现役是 `location.assign` 整页跳转，`file://` 会跳到不存在的文件 |
| `src/main.js` | 挂载前调用 `installReplay()`（仅 `VITE_OFFLINE=1`） | 服务边界接管 |

> 三处改动都用 `import.meta.env.VITE_OFFLINE === '1'` 包裹；非离线构建行为与现役完全一致。

## 5. 构建与产物

```bash
cd app
VITE_OFFLINE=1 VITE_PREP_SURFACE=immersive VITE_RESEARCH_SURFACE=immersive \
  pnpm exec vite build --config vite.config.offline.mjs
# → app/dist-offline/index.html（单文件，全资源内联）
```

- 3873 个模块 → 单文件约 11.8 MB（gzip 约 4.0 MB）
- `file://` 直接打开：首屏登录页与现役逐像素一致（同一份组件与 CSS）
- 运行时 **0 个 http(s) 请求**（回放层拦截全部 `/api` 与对象存储直传）

## 6. 已知技术限制

1. **未采证端点会显示错误态**：这是刻意设计（诚实优先）。补采后即消失。
2. **PDF/KaTeX 字体等运行时资源**：bcmap 等 pdfjs 辅助资源在 `file://` 下不可取；CJK PDF 的少数字形可能回退。
3. **交互式导学面板**依赖 SSE 事件（`card`/`action`/`graph`），离线按采证序列重放；**未采证的输入不会生成新回答**，而是返回一条明确标注的「离线演示：该输入未采证」提示。
4. **服务端专有产物**（PPTX/教案导出、LaTeX 编译、AI 生成）在离线包内不伪造；现役若阻塞，离线同样阻塞（见 `未通过项.md`）。