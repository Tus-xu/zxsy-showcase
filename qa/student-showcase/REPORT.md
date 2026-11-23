# 学生端离线复刻 · 实施与验收报告（run-03）

> 目标：只完善**学生端**离线发行包，让现役学生端所有有数据的功能都能从真实入口点到结果；断网可运行；每条成功业务链与关键视觉状态都有可复查证据。
> 分支：`codex/student-showcase-data-visual`（基于 `bf82865967a2b51c14bd479c6d2b0e3fef4cd65e`）
> 工作树：`D:/zxsy-math-arena-showcase-student`

## 0. 结论摘要

| 维度 | 结果 |
|---|---|
| 候选发行包 | `release/开始演示.html`，**20,993,756 B**，SHA-256 `D34F4A18240D2B6F29930BFC737EC21C853104C06FB6AB080A20A0C43A443300` |
| 覆盖清单 | `qa/student-showcase/coverage.csv`（48 行，分母不删）：**通过 21 / BLOCKED 5 / 待验 2 / 待采证 20** |
| 独立功能 QA | 12 条：**PASS 10 / FAIL 0 / BLOCKED 2**（外部依赖、现役缺陷）— `qa/student-showcase/fqa/REPORT.md` |
| 独立视觉 QA | 10 页：**PASS 10 / FAIL 0 / BLOCKED 0** — `qa/student-showcase/vqa/REPORT.md` |
| 断网审计 | 20 路由（学生 7 / 教师 8 / 科研 5，含教师沉浸式工作台）+ 样板一：**0 http(s)/ws 请求、0 pageerror** |
| 三题导学 | **三题均未收束（BLOCKED，现役缺陷）**，离线不伪造结论（§5） |
| 最终判定 | **PARTIAL**（见 §7） |

## 1. 环境与基线

- 记录见 `qa/student-showcase/baseline/BASELINE.md`：typecheck 通过；单测 **1112 passed / 1 个既有失败**（`test/teacher-prep-v2/quick-actions.test.ts` 依赖后端目录，离线仓库不含）；离线构建在本工作树内可重复。
- 本轮修复了**构建换行漂移**（`.gitattributes` 固定文本源为 LF；未对 `app/public` 二进制生效，已回滚验证 PNG 与 HEAD 一致）。

## 2. 采证（现役真机）

| 目录 | 内容 |
|---|---|
| `evidence/live/run-02/` | 上一轮三端全量（学生 7 页 + 三题；教师 8 页 + 备课；科研） |
| `evidence/live/run-03/data/` | 学生端列表类补采：**77 接口**（题库 13 组参数、视频 5 topic + 搜索、错题 5 筛选、课堂 5 页课件逐页、作业批改结果）+ 59 截图 |
| `evidence/live/run-03/guide/` | 三题导学重测（A 10 轮 / B、C 见该目录 REPORT）：逐轮 SSE、截图、flows |
| `evidence/live/run-03b/` | 缺口补采：历史会话消息、错题详情、资源封面原图、重新基线化端点 |

关键事实（用于回放，均已逐字节保存）：

- `GET /api/v1/questions?limit=1` → `total=24, items=1`；`limit=30&offset=0` → `items=24`；`q_type`/`difficulty`/`q=函数|导数` 各自不同集合。
- `GET /api/student/error-records?limit=1` **并不按 limit 返回**（实返 20 条，total=24）——与题库不同，回放层分别落库。
- 学生查看反馈可达：`GET /api/student/assignments/{id}` + `.../result`（`status=graded, total_score=30`，5 项 10/0/10/10/0；`teacher_feedback` 为 null 属现役数据）。
- 课件《函数的单调性：从图像到导数》：5 页，`POST classroom-coursewares/{id}/open` → `GET classroom/sessions/{sid}`，逐页 `PATCH progress`；TTS `POST /api/classroom/tts` 200。

## 3. 实现（学生端回放层）

1. `app/src/offline/fixtures.js` 重写匹配：
   - 按 `(method, path, query)` 语义匹配，候选参数集必须与请求**全等**；不再用「前缀退化」兜底。
   - 新增 `roleName()`：角色取 `fixtures/` 后的第一段，兼容 `student/run03/` 嵌套采集目录（原 `dirName` 会把 `run03` 当角色，导致 77 个端点被静默丢弃）。
   - 文件按「角色/目录/文件名」挂载，避免跨目录同名覆盖。
2. `app/src/offline/fixtures/student/run03/`：run-03 补采的 77 个端点响应原文（`scripts/import_run03_fixtures.py` 可复跑）。
3. TDD：先写 `app/src/offline/fixtures.test.js`（9 断言，**先红后绿**）覆盖题库 limit=1/30、筛选、关键词、视频 topic、错题 limit=1、未知端点必须 null。
4. `app/vitest.offline.config.ts`：`src/**/*.test.js` 独立配置，不改现役 `test/**` 布局。
5. 三题导学：`scripts/import_run03_flows.py` 把 run-03 flows 装成 `fixtures/student/flow-{A,B,C}.json` 并同步 `uploads.json`（新 file_id）。

## 4. 功能验收（独立）

见 `qa/student-showcase/fqa/REPORT.md`：12 条 → **10 PASS / 0 FAIL / 2 BLOCKED**。

- BLOCKED-06：资源中心卡片跳**站外**（bilibili），断网不可达；页面内 11 卡/9 分组/封面标题时长全部通过。
- BLOCKED-11：`/me` 体验反馈 Tab → `GET /api/api/trial/metrics` 恒 404（现役缺陷，前端拼出双 `/api`）。
- 另记录两处数据覆盖缺口（补采中）：历史会话消息、错题详情各只采 1 条。

## 5. 三题导学（本轮重测）

- 数学校对稿（独立、干净上下文）：`qa/student-showcase/math/PROOFREAD.md` → **A=D(2√2)、B=BD、C=61/25=2.44**，均可复跑脚本复核。
- 采集策略纠正：上轮「重复提交同一算式」问题本轮改为**逐轮读卡片提问、每轮换内容**；A 题 10 轮逐轮推进正常（平台认可「b=√7a」「c²=a²+b²」）。
- **现役未收束**：第 9 轮平台先说「前置你其实已经会了——那我们直接回原题」，随后又把「a、b、c 之间固定关系式」重复提问 → socratic solver 出现重复追问循环。B/C 结果见 `evidence/live/run-03/guide/REPORT.md`。
- 结论：**三题对应覆盖行 BLOCKED（现役缺陷）**，离线不伪造结论；离线回放按真实 SSE 逐轮原文，终点同样是「未收束」。

## 6. 视觉验收（独立，有否决权）

见 `qa/student-showcase/vqa/REPORT.md`：10 页 **PASS 10 / FAIL 0**；DOM 盒模型量化（topbar 1440×60、sidebar 240×840、main 1200）双端一致；公式/图形 200% 放大无重叠裁切。

- 差异均为**现役数据演进**（共享演示账号在快照后被继续使用）：错题 24→25、课件进度 80%→100%、待复习 22→24、综合分 73→74。
- 处理：补采代理重新基线化这些端点（`evidence/live/run-03b/baseline/`），重新导入后复拍。

## 7. 判定

**PARTIAL** —— 学生端可复刻部分已全部实现并独立验收通过；剩余阻塞全部来自现役缺陷与外部依赖，且已逐条留证：

| 类别 | 条目 | 证据 |
|---|---|---|
| 已通过（功能 21 行 + 视觉 10 页） | 首页/会话/题库（含搜索筛选分页边界）/错题（列表+7 条详情+5 筛选）/资源（12 封面内联）/课堂三卡/课件 5 页播放与续播/作业已批改反馈/我的学情与掌握地图 | coverage.csv、qa/、qa/、probes/ |
| BLOCKED-现役缺陷（3） | 三题导学 A/B/C 均未收束；三类缺陷原话见 §5 | evidence/live/run-03/guide/REPORT.md |
| BLOCKED-现役缺陷（1） | /me 体验反馈 GET /api/api/trial/metrics 恒 404 | qa/student-showcase/fqa/REPORT.md #11 |
| BLOCKED-外部依赖（1） | 资源卡跳转 bilibili（站内检查全通过） | qa/student-showcase/fqa/REPORT.md #06 |
| 待验 / 待采证（22 行） | 练题作答与判分、模考、错题重解/复习、资料原文与引用、班级页、课件内问答、作业作答提交、首次引导、H5 等 | 保留在分母，未计入通过 |

**未通过（FAIL）：0。**

### 已知偏差（不掩盖）
- 刷新后对话只还原文本与顺序，交互卡面板不重建、无附件缩略图（未通过项.md §C）。
- 冷启动 2 条 MathLive 字体告警（渲染正常）。
- 现役数据在快照后继续演进（错题 24→26、课件 80%→100%、综合分 73→74）；已按 run-03b 重新基线化，候选包与当前现役一致。
