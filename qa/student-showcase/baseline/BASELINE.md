# 学生端离线演示 · 基线记录（任务一）

记录时间：2026-11-23 00:5x（+08:00，本机）
记录人：lead（实施负责人）

## 1. Git 状态

| 项 | 值 |
|---|---|
| 离线仓库 | `D:\zxsy-math-arena-showcase` |
| 基线分支 | `rework/live-fidelity` |
| 基线提交 | `bf82865967a2b51c14bd479c6d2b0e3fef4cd65e` |
| 基线时 `git status --short --branch` | 干净（仅分支行） |
| 工作树 | `D:/zxsy-math-arena-showcase`（rework/live-fidelity）<br>`D:/zxsy-math-arena-showcase-student`（**本轮开发分支** `codex/student-showcase-data-visual`，基于 bf82865） |
| 本轮分支创建方式 | `git worktree add -b codex/student-showcase-data-visual D:/zxsy-math-arena-showcase-student bf82865` |
| 远端 | `origin` = https://github.com/Tus-xu/zxsy-showcase.git；`origin/rework/live-fidelity` = bf82865（已推送）；`origin/main` = 9e483d8 |

## 2. 基线发行包

| 项 | 值 |
|---|---|
| 文件 | `release/开始演示.html` |
| SHA-256 | `DA50257354C4BE16FF46C3CEE3EB4B0936F1F2255D025DB7C6E43FF849AD88B8` |
| 字节数 | 18,472,743 |

## 3. 基线构建/测试（在开发工作树复跑）

| 项 | 命令 | 结果 |
|---|---|---|
| 依赖安装 | `cd app && pnpm install --frozen-lockfile` | 成功（12.3 s） |
| 类型检查 | `pnpm typecheck`（vue-tsc --noEmit） | **通过**（exit 0） |
| 单元测试 | `pnpm test`（vitest） | **1112 passed**；108 个测试文件中 **1 个失败**：`test/teacher-prep-v2/quick-actions.test.ts` 读取 `services/teacher-platform/app/ppt_v2/service/regen.py` 不存在（离线仓库不含后端目录）→ **既有失败，非本轮引入** |
| 离线构建 | `VITE_OFFLINE=1 … pnpm exec vite build --config vite.config.offline.mjs` | 成功 |

日志：`qa/student-showcase/baseline/{install,typecheck,test,build}.log`

### 3.1 构建可复现性（本轮新发现并修复）

- 现象：同一提交在**不同 worktree** 构建出的 HTML 字节不一致（`DA5025…` vs `FDEC9A…` vs `C00CA4BE…`→`93B7729E…`）。
- 根因：Windows `core.autocrlf=true` 让 checkout 把文本源写成 CRLF；Vite 对 `index.html` 原样内联、对源码字符串中的换行也会保留 → 产物随工作树换行状态漂移。
- 处理：`.gitattributes` 仅对文本源固定 LF（`app/index.html`、`app/vite.config.offline.mjs`、`app/src/**`、`.gitattributes`）。
  **不使用 `app/**`**——实测会把 `app/public/*.png` 当文本转换并损坏二进制（已回滚，PNG 与 HEAD 一致）。
- 修复提交：`061575d`（+ 其后续小修）；同类构建在同一工作树内已验证**可重复**（连续两次构建 SHA 相同）。
- 因此：本轮 LF 工作树构建基线 = `93B7729E05410BF1730AF7BE7562455C63CFB5725F8F277D44E41273CE3B707C`（18,469,853 B），与上一轮交付包 `DA5025…` **不可字节比较**（换行归一化所致，内容语义不变）。后续验收一律以**最终候选包自身的 SHA** 为准。

## 4. 本轮角色分工（任务一要求）

| 角色 | 责任代理 | 状态 |
|---|---|---|
| 采证（学生三题导学） | `r03-guide` | 进行中 |
| 采证（学生端列表/课堂/反馈数据） | `r03-data` | 进行中 |
| 数学校对稿（独立解题） | `r03-math` | **已完成**：A=D(2√2)、B=BD、C=61/25=2.44（`qa/student-showcase/math/PROOFREAD.md`） |
| 实现（回放层学生场景） | lead（共享回放与打包串行负责） | 待开始 |
| 功能 QA（独立） | 待派（任务三后） | 未开始 |
| 视觉 QA（独立，有否决权） | 待派（任务四） | 未开始 |

## 5. 现役运行环境（只读采证用）

| 项 | 值 |
|---|---|
| 前端 | http://127.0.0.1:5176（Vite dev，title「智学数研 · 数学智能助学平台（v4）」） |
| 服务 | API 8000、教师 8100、PPT 8200、Presenton 8201、科研 8300 本轮启动时均在线 |
| 登录 | `/login`：`#preferred-role` + `#auth-phone` + 页面显示的 6 位演示码 + 「安全登录」 |
| 演示账号 | 学生 13800001001（小林）；教师 13800001002；科研 13800001003 |
| 主仓 | `D:\zxsy-math-arena`（只读调查/隔离环境运行） |