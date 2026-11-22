# Mathesis 离线复刻版 · 独立验收最终报告（verify-final · DA5025 终版）

> **验收者**：verify-final（独立于实现者；只读 `app/ src/ release/ evidence/`，全部产出仅写入 `qa/verify-final/`；未修改任何产品代码）
> **验收/复核时间**：2026-11-22 04:07–05:20（+08:00；终版复核 05:03–05:20）
> **被验对象（终版）**：`release/开始演示.html`
> **SHA-256**：`DA50257354C4BE16FF46C3CEE3EB4B0936F1F2255D025DB7C6E43FF849AD88B8`（18,472,743 字节，构建 2026-11-22 05:00:49；`release/README-启动说明.txt` 记载一致）
> **版本沿革**：`ba0239c3…`（v1，首轮）→ `782faff3…`（v2，新对话修复）→ **`DA5025…`（终版，本报告全部结论）**；旧版结果留档于 `*-sha-ba0239c3.json`、`*-sha-782faff3.json`。
> **现役基线**：`http://127.0.0.1:5176`（未重启；真实短信登录三端） · **视口**：1672×941 / DPR=1 / headless Chromium（Playwright）
> **证据**：`qa/verify-final/verify.json`、`template1.json`、`template1_off_clean.json`、`template2.json`、`live_extra.json`、`host_check.json`、`shots/**`（84+ 张 PNG，含 32 张并排图）

---

## 0. 最终结论（STATUS / VERDICT）

**STATUS：终版复核完成。VERDICT：通过（PASS）—— 无 BLOCKER、无 MAJOR；剩余 5 项 MINOR（含 1 项已声明的"已知偏差"，需在演示口径中披露）。**

| 维度 | 终版 `DA5025…` 结果 |
|---|---|
| 20 页逐屏并排 | **11 一致 + 9 差异（全部为可解释的真实数据/时间/AI 文案漂移，附证据）+ 0 未通过**；主区域布局盒最大偏移 **0px**；破图 **0/0**；可见控件 disabled 状态全部相同 |
| 补充：写作页真实路由 | 规格路由 `/research-workspace/write` 两侧同重定向到启动页（一致）；真实写作页 `/research-workspace/e49…/write` 一致（仅编译时间戳漂移） |
| 样板一（学生） | 离线 **9/9 轮**与采证 SSE 逐轮一致（中文内容保留率 **1.0**）；终点与现役一致（**未收束：前置补课卡 + 0/1 空已填**）；刷新后 **18 条 user→ai 交替、首条「请分析我上传的文件」、末条为第 9 轮文本、无「附件已丢失」**；断网 0 请求 |
| 样板二（教师） | PPT **0/0**、7 工具 **disabled**、发布课堂 **disabled**、导出三卡 **disabled**、教案未生成、无发布成功态/班级列表/导出产物；**「重试」已修复**：课堂设计页两侧 409 + 同句文案，沉浸式两侧同款冲突卡（仅 request_id 不同），**无 ErrorBoundary、无 pageerror** |
| 交互核对 | 输入/点击/返回/教师刷新/科研刷新同态；「＋新对话」= `#/dialog/offline-<ts>` 空态；**学生刷新恢复核心要素全部通过**，卡片面板不重建/无附件缩略图为**已声明已知偏差（MINOR）** |
| 断网审计 | 21 页 SPA 导航：**0 个 http(s)/ws 请求、0 pageerror、0 console error、0 破图**；冷启动/每次整页加载另有 **2 条 MathLive console error**（渲染正常，MINOR） |
| 编造项核查 | 可见界面对指定自造内容 **0 命中**；嘉宾界面 **无主持人浮标**；主持人面板默认隐藏（`Ctrl+Shift+H` 可开） |
| `未通过项.md` A 段 | 抽查 5 条：T2/T4/T6/T7 与现役一致；**T3 现已两侧逐字一致（课堂设计页 409 文案；沉浸式冲突卡）**；T7 引用 title 仍为过期文案（MINOR） |

> **一句话**：终版把两条阻断项（重试崩溃、刷新恢复）都修好了；逐屏 11 一致 + 9 可解释漂移、0 未通过，样板一逐轮 9/9 且终点一致，样板二全部核对项一致，断网 0 请求/0 pageerror/0 破图 —— **判定通过**，遗留 5 项 MINOR（详见 §9），其中"刷新后卡片面板不重建"为已声明的已知偏差，需在演示口径中如实披露。

---

## 1. 终版修复复核（v2 `782faff3` → 终版 `DA5025`）

| 复核项 | 终版实测 | 判定 |
|---|---|---|
| **B1 根因（未采证 POST 误配 / 重试崩溃）** | ① 未采证端点回归 404 信封：`POST /api/foo/bar` → **404 · code=40401**；`POST /api/agent/conversations/xyz/actions` → **404 · code=40401**；`GET /api/nonexistent/path` → **404 · code=40401**（不再误配短信 fixture、不再泄漏 `demo_code`）。② `POST /teacher-v3/prep/conversations/f5c8…/actions` → **409 · code=40900 · error_key=conflict**（现役同款）。 | **已修复** |
| **B1 界面行为** | 课堂设计页「重试」：现役/离线均显示同句「动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）」；**无 ErrorBoundary、无 pageerror**。沉浸式工作台「重试」：现役/离线均显示冲突卡「会话已被其他操作更新 / 服务端已有更新的版本。请刷新以获取最新内容，避免覆盖他人修改。 / 刷新查看新版本 / 重试 / request_id: …」——归一化文本逐字一致，**仅 request_id 不同**（现役 `0f6e38ca56e545c5`，离线 `41a022f006504879`）。 | **已修复（BLOCKER 关闭）** |
| **M1 刷新恢复** | 9 轮后刷新：**18 条**消息、角色序列 `user,ai` ×9 **交替**、首条用户消息「**请分析我上传的文件**」、**末条为第 9 轮文本**（对采证 SSE 第 9 轮中文保留率 **1.0**）、**无「附件已丢失」**、0 pageerror、URL 保持 `#/dialog/1d9dcbb2…`。 | **核心已修复** |
| M1 残留偏差 | 刷新后**交互卡片面板不重建**（补课/填空/式子卡 0 个、`0/1 空已填` 不出现）、**无附件缩略图**；现役刷新会保留卡片。已在 `未通过项.md` §C 声明。 | **已知偏差 → MINOR（§9 m5）** |
| 「＋新对话」 | `POST /api/agent/conversations` → 本地会话 `offline-1795295489155`；URL `#/dialog/offline-…`；0 条 AI 消息 + 4 个入口卡（现役同态）。 | **通过** |

证据：`tools/probe_actions_da5025.log`、`tools/probe_unknown_da5025.log`、`template2.json`、`template1_off_clean.json`、`shots/side-template2-retry.png`、`shots/side-template2-conflict.png`、`shots/side-sample1-refresh.png`。

**关于 M1 残留偏差的判定依据（lead 要求明确 MINOR 还是未通过）**：
1. 需求 #4 的验收点是"学生刷新后对话恢复？"——终版已恢复**会话身份、条数（18）、顺序（user→ai 交替）、首条、末条（第 9 轮原文）**，且无附件丢失文案、0 pageerror，属**核心恢复成功**。
2. 缺失项（卡片面板不重建、无附件缩略图）是**离线回放层对"交互态组件"的已知取舍**，已在 `未通过项.md` §C 声明；它**不产生无现役依据内容、不伪造轮次、不阻断继续输入**（输入条可用）。
3. 判定口径"未通过=结构不同/缺控件/内容不一致/断网或交互失败"：此处页面结构、消息内容、断网与交互主链路均未失败；缺失的是"历史消息重放时对交互组件与附件缩略图的再渲染"，属**可见性/完整度偏差**而非交互失败。
4. **因此判为 MINOR（已声明的已知偏差，接受但需在演示口径披露）**；若产品侧要求"刷新后与现役逐控件一致"，该项应升级为未通过 —— 该口径需产品/验收方确认，已写入 `未通过项.md` §C。

---

## 2. 逐屏判定表（终版，20 页 + 1 张补充页）

> 控件 L/O = 可见按钮数（现役/离线），disabled L/O = 其中 disabled 数；破图 L/O；文本 = 可见行数（现役/离线）与差异块数。截图路径相对 `qa/verify-final/`。现役与离线均在终版复核会话（05:05–05:12）同场重采。

| 端 | 路由 | 判定 | 布局盒 | 控件 L/O | disabled L/O | 破图 | 文本 | 并排证据 |
|---|---|---|---|---|---|---|---|---|
| 学生 | `/dialog` | **差异**（数据漂移） | 0px | 25/25 | 1/1 | 0/0 | 157/158·3 | `shots/side-student-dialog.png` |
| 学生 | `/practice` | **差异**（数据漂移） | 0px | 7/7 | 0/0 | 0/0 | 46/46·4 | `shots/side-student-practice.png` |
| 学生 | `/errors` | **一致** | 0px | 17/17 | 1/1 | 0/0 | 201/201·5 | `shots/side-student-errors.png` |
| 学生 | `/library` | **一致** | 0px | 22/22 | 0/0 | 0/0 | 107/107·0 | `shots/side-student-library.png` |
| 学生 | `/resources` | **一致** | 0px | 6/6 | 0/0 | 0/0 | 87/87·0 | `shots/side-student-resources.png` |
| 学生 | `/classroom` | **一致** | 0px | 14/14 | 0/0 | 0/0 | 62/62·0 | `shots/side-student-classroom.png` |
| 学生 | `/me` | **差异**（数据漂移） | 0px | 18/18 | 0/0 | 0/0 | 131/131·8 | `shots/side-student-me.png` |
| 教师 | `/teacher-v3/prep` | **差异**（数据漂移） | 0px | 18/16 | 1/1 | 0/0 | 63/55·2 | `shots/side-teacher-prep.png` |
| 教师 | `/teacher-v3/classes` | **一致** | 0px | 10/10 | 0/0 | 0/0 | 70/70·0 | `shots/side-teacher-classes.png` |
| 教师 | `/teacher-v3/bank` | **一致** | 0px | 10/10 | 0/0 | 0/0 | 68/68·0 | `shots/side-teacher-bank.png` |
| 教师 | `/teacher-v3/assign` | **一致** | 0px | 9/9 | 1/1 | 0/0 | 63/63·0 | `shots/side-teacher-assign.png` |
| 教师 | `/teacher-v3/insights` | **差异**（数据漂移） | 0px | 4/4 | 0/0 | 0/0 | 60/60·3 | `shots/side-teacher-insights.png` |
| 教师 | `/teacher-v3/resources` | **差异**（数据漂移） | 0px | 4/4 | 0/0 | 0/0 | 81/85·2 | `shots/side-teacher-resources.png` |
| 教师 | `/teacher-v3/grading` | **差异**（数据漂移） | 0px | 18/18 | 2/2 | 0/0 | 114/113·1 | `shots/side-teacher-grading.png` |
| 教师 | `/teacher-v3/prep-immersive/f5c84551-18a7-454d-b49c-8f115e816299` | **一致** | 0px | 9/9 | 3/3 | 0/0 | 54/54·0 | `shots/side-teacher-workbench.png` |
| 科研 | `/research-workspace` | **一致** | 0px | 17/17 | 0/0 | 0/0 | 92/92·0 | `shots/side-researcher-landing.png` |
| 科研 | `/research-workspace/workspace` | **差异**（AI 概览文案重生成） | 0px | 41/41 | 5/5 | 0/0 | 63/63·1 | `shots/side-researcher-workspace.png` |
| 科研 | `/research-workspace/e49b27e2…/read` | **差异**（AI 概览文案 + 时间） | 0px | 58/58 | 2/2 | 0/0 | 306/306·2 | `shots/side-researcher-read.png` |
| 科研 | `/research-workspace/write` | **一致**（两侧同重定向到启动页） | 0px | 17/17 | 0/0 | 0/0 | 92/92·0 | `shots/side-researcher-write.png` |
| 科研 | `/research-workspace/e49b27e2…/write`（补充：真实写作页） | **一致**（时间戳漂移） | 0px | 72/72 | 6/6 | 0/0 | 309/309·2 | `shots/side-researcher-write-canonical.png` |
| 科研 | `/research-workspace/account` | **一致** | 0px | 13/13 | 0/0 | 0/0 | 55/55·0 | `shots/side-researcher-account.png` |

**差异项证据（均为真实数据/时间/AI 文案漂移，非结构差异）**：学生 `/dialog` 会话列表新增与「— 到底啦 —」标记、`/practice`/`/me` 最薄弱知识点与综合分（73↔72）；教师 `/prep` 备课历史 2↔1 条、`/insights` 平均掌握度 57%↔61% 与错因人次、`/resources` 推荐视频刷新（11↔12 张封面，离线封面均可用）、`/grading` 多「课前预习」行；科研 `/workspace`、`/read` 的项目 AI 概览由服务端重新生成（结构与计数一致，仅文案/时间戳不同）。

**抽查 6 页并排（lead 指定）**

| 页面 | 判定 | 关键核对 | 并排图 |
|---|---|---|---|
| 学生 `/dialog` | 差异（数据漂移） | 布局盒 0px；控件 25/25、disabled 1/1；破图 0/0；文本 157/158·3（会话条目/到底标记/掌握度 20%↔16%） | `shots/side-student-dialog.png` |
| 学生 `/classroom` | **一致** | 布局盒 0px；控件 14/14；文本 62/62 逐行一致；破图 0/0 | `shots/side-student-classroom.png` |
| 教师 `/teacher-v3/prep` | 差异（数据漂移） | 布局盒 0px；控件 18/16（现役多 1 条备课历史）；文本 63/55·2 | `shots/side-teacher-prep.png` |
| 教师 `/teacher-v3/grading` | 差异（数据漂移） | 布局盒 0px；控件 18/18、disabled 2/2；文本 114/113·1（现役多「课前预习」行） | `shots/side-teacher-grading.png` |
| 科研 `/research-workspace/write` | **一致**（两侧同重定向启动页） | 布局盒 0px；控件 17/17；文本 92/92 逐行一致 | `shots/side-researcher-write.png` |
| 科研 `/research-workspace/account` | **一致** | 布局盒 0px；控件 13/13；文本 55/55 逐行一致；破图 0/0 | `shots/side-researcher-account.png` |

6 页断网：全程 **0 http(s)/ws 请求、0 pageerror、0 console error**；破图 0。

---

## 3. 样板一（学生）：上传 `题1.png` → 逐轮 → 逐轮比对（终版）

- 上传：现役正常学生入口「📷 拍一道不会的题」上传 `D:\zxsy-math-arena\docs\superpowers\plans\题1.png`（30,184 字节，SHA-256 与采证一致）；离线同图。两侧附件卡均到「已就绪」并自动发出「请分析我上传的文件」。
- 清洁复跑（终版）：从空态 hero 直接上传；9 轮全部用**交互卡输入/提交**（式子卡 `.ix-ei-input`→「写好了」；标注/二元/补课卡走卡底「改用打字」）或输入条，逐轮推进成功。
- 判据：以 `evidence/live/run-02/student/api/flow-A.json` 的 `turns[].input` 逐轮驱动；每轮把采证 SSE `token` 文本与离线渲染回复比较——主判据为**仅中文字符序列的采证保留率**（KaTeX 将公式渲染为 MathML+HTML 两份文本，全文比对会被公式重复拉低）。

| 轮 | 采证类型 | 离线输入方式 | 中文内容保留率 | 全文相似度 | 判定 |
|---:|---|---|---:|---:|---|
| 0 | image-only | 仅点发送（附图） | **1.0** | 0.728 | 一致 |
| 1 | text | 输入条 | **1.0** | 0.529 | 一致 |
| 2 | text | 输入条 | **1.0** | 0.589 | 一致 |
| 3 | text | 输入条 | **1.0** | 0.584 | 一致 |
| 4 | text | 输入条 | **1.0** | 0.390 | 一致 |
| 5 | form_text（标注卡） | 卡底「改用打字」 | **1.0** | 0.492 | 一致 |
| 6 | form_expr（式子卡） | 卡片输入 `e=2√2` + 提交 | **1.0** | 0.318 | 一致 |
| 7 | form_expr（式子卡） | 卡底「改用打字」 | **1.0** | 0.241 | 一致 |
| 8 | form_text（二元卡） | 卡底「改用打字」 | **1.0** | 0.113 | 一致 |

**逐轮一致率：9/9 = 100%**。

- **终点与现役一致**：两侧均**未收束**——离线含「🧭 先补 5 分钟：集合与常用逻辑用语」前置补课卡 + 填空检验卡（`0/1 空已填`，徽标「第 2 步/共 3 步」），无「已完成本题/最终答案」；现役 05:11 现场复跑同样停在**前置补课 + 填空检验卡**（`0/1 空已填`），补课知识点因模型非确定性为不同知识点（内容漂移，**终点结构一致**）。
- **刷新恢复（终版）**：刷新前/后均为 **18 条消息**、`user,ai` ×9 **交替**；首条用户消息「**请分析我上传的文件**」；**末条 AI = 第 9 轮文本**（对采证 SSE 第 9 轮中文保留率 **1.0**）；无「附件已丢失」；0 pageerror；URL 保持 `#/dialog/1d9dcbb2…`。**残留**：卡片面板不重建、无附件缩略图（已知偏差 MINOR，见 §9 m5）。
- 断网：离线全程 **0 请求 / 0 pageerror**。
- 证据：`shots/template1/offclean-*.png`、`shots/side-sample1-upload.png`、`shots/side-sample1-terminal.png`、`shots/side-sample1-refresh.png`、`template1_off_clean.json`。

---

## 4. 样板二（教师）：备课中心 → 工作台 → PPT / 导出 / 发布 / 重试（终版）

路径：`/teacher-v3/prep` →「继续备课」→ `/teacher-v3/prep/w/<sessionId>/classroom`；顶栏「PPT / 教案」Tab、「导出」对话框；沉浸式工作台 `/teacher-v3/prep-immersive/f5c84551…`。核对会话为规格指定 `f5c84551-18a7-454d-b49c-8f115e816299`（现役「继续备课」当前落到新会话 `393d2558…`，数据漂移；为可比性两侧统一显式打开 f5c84551）。

| 核对项 | 现役实测 | 离线实测（终版） | 判定 |
|---|---|---|---|
| T2 教学蓝图未生成 | 课堂设计页常驻「**本轮生成没有完成，未写入任何内容。**」 | 同左（逐字一致） | **一致** |
| T4 幻灯片 | `幻灯片 0 / 0` | `幻灯片 0 / 0` | **一致** |
| T4 7 个工具 | 添加页 / T 文本 / Σ 公式 / 数学图形 / 图片 / 备注 / 发布课堂 **7/7 disabled** | 同左 **7/7 disabled** | **一致** |
| T7 发布课堂 | disabled（title 为发布能力说明）；点击无对话框、无 /publish 请求、无班级列表/成功态 | 同左（title 逐字一致） | **一致** |
| T6 导出三卡 | 3 卡全 disabled（PPTX/PDF/Markdown），title「尚未生成课件，无法导出」/「尚未生成教案，无法导出」；`/exports`、`/tickets` 请求 **0**；无下载 | 同左（3/3、同 title、0 请求、0 下载） | **一致** |
| 教案 Tab | 「教案尚未生成」、0 个 `contenteditable`、工具栏 **14/14 disabled** | 同左 | **一致** |
| 发布成功态 / 班级列表 / 导出产物 | 从未出现（发布入口不可用） | **未出现**；`published=0`；无下载、无相关可见文本 | **一致** |
| T1 从教材开始 | 点击起点卡：无弹层/无选项/无业务请求；文本无变化 | 同左（0 业务请求、0 弹层） | **一致** |
| **T3 重试（课堂设计页）** | 409 · code=40900 · error_key=conflict；界面显示「动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）」；无崩溃 | **409 · code=40900 · error_key=conflict；同句文案逐字一致；无 ErrorBoundary、无 pageerror** | **一致（BLOCKER 关闭）** |
| **T3 重试（沉浸式工作台）** | 409；显示冲突卡「会话已被其他操作更新 / 服务端已有更新的版本。请刷新以获取最新内容，避免覆盖他人修改。/ 刷新查看新版本 / 重试 / request_id」 | **409；同一冲突卡，归一化文本逐字一致（仅 request_id 不同）**；无 ErrorBoundary | **一致（BLOCKER 关闭）** |
| 刷新后状态 | 刷新后课堂设计页仍「本轮生成没有完成…」+ 重试；PPT 仍 0/0 | 同左 | **一致** |

- 请求与产物：两侧点击发布/导出期间均 **0 次 `/publish`、`/exports`、`/tickets` 请求、0 下载**；离线无任何导出产物文件。
- 证据：`shots/template2/*.png`（含 `*-03-retry-result.png`、`*-09-immersive-retry.png`）、`shots/side-template2-retry.png`、`shots/side-template2-conflict.png`、`shots/side-template2-ppt.png`、`shots/side-template2-export.png`、`template2.json`。

---

## 5. 交互核对（点击 / 输入 / 返回 / 刷新，终版）

| # | 操作（同一操作两侧各做一次） | 现役实测 | 终版离线实测 | 判定 |
|---|---|---|---|---|
| 1 | 学生 `/dialog` 输入「已知函数 f(x)=x³-3x，求单调区间」 | 计数 `21/4000`，发送 enabled | 同左 | **一致** |
| 2 | 学生点击侧栏「练题」 | → `/practice` | → `#/practice` | **一致** |
| 3 | 学生浏览器返回 | 回到 `/dialog` | 回到 `#/dialog` | **一致** |
| 4 | **学生刷新（9 轮样板一终态后）** | 18 条消息、顺序正确、终态回复/补课卡均在 | **18 条、user→ai 交替、首条上传提示、末条第 9 轮文本、无附件丢失**；仅卡片面板不重建/无附件缩略图（已知偏差） | **通过（附 MINOR 已知偏差）** |
| 5 | 学生「＋新对话」 | 空白新对话：0 条 AI 消息、4 入口卡 | `#/dialog/offline-<ts>`，0 条 AI 消息、4 入口卡 | **一致** |
| 6 | 教师「继续备课」 | → `/teacher-v3/prep/w/393d2558…/classroom`（现役最新会话） | → `#/teacher-v3/prep/w/f5c84551…/classroom`（快照会话） | 差异（数据漂移，可解释） |
| 7 | 教师工作台浏览器返回 | 回 `/teacher-v3/prep` | 回 `#/teacher-v3/prep` | **一致** |
| 8 | 教师工作台**刷新** | 刷新前后均「本轮生成没有完成…」+ 重试（状态不变） | 同左 | **一致** |
| 9 | 科研启动页「进入科研工作台」 | → `/research-workspace/e49…/write`，三栏 + Agent 面板 | → `#/research-workspace/e49…/write`，同态 | **一致** |
| 10 | 科研阅读页**刷新** | 路由/三栏/Agent 面板保持 | 同左 | **一致** |

证据：`shots/inter-*.png`、`shots/side-inter-*.png`、`shots/live-new-chat-click.png`、`shots/off-new-chat-click.png`、`shots/side-sample1-refresh.png`、`verify.json.interactions`。

---

## 6. 断网审计（`offline=True`，终版）

**21 个页面（20 规格页 + 写作页补充）SPA 导航期间：**

| 指标 | 结果 |
|---|---:|
| http(s) / ws 请求总数 | **0** |
| pageerror 总数 | **0** |
| console error 总数 | **0** |
| 破图总数（`naturalWidth===0`） | **0** |
| 逐页核对 | 21/21 页请求=0、pageerror=0、console error=0（`verify.json.offline_audit.per_page`） |

**冷启动 / 整页加载另计：**

| 场景 | 请求 | pageerror | console error |
|---|---:|---:|---:|
| 冷启动登录页（1 次整页加载） | 0 | 0 | **2**（MathLive 字体目录解析失败） |
| 样板一离线（登录 + 终态刷新 = 2 次整页加载） | 0 | 0 | **4**（2 次 ×2） |
| 样板二终版（重试已不崩溃） | 0 | 0 | 仅整页加载产生的 MathLive 错误；**无 ErrorBoundary 错误** |

- MathLive console error 原文：`Can't use relative paths to specify assets location because the source file location could not be determined (unexpected location "    at file:///…:9902:702").` —— 内联单文件无法解析相对字体目录所致，页面数学渲染正常，不影响断网/交互（MINOR m1）。
- 现役侧对应 409 请求会在 Chromium 控制台产生 `Failed to load resource: 409`（预期网络日志，非应用错误）；现役 20 页 SPA 导航应用 console error = 0。
- **B1 修复后未采证端点不再返回短信 fixture**：`POST /api/foo/bar`、`POST /api/agent/conversations/xyz/actions`、`GET /api/nonexistent/path` 全部 **404 · code=40401**（0 请求、无 `demo_code` 泄漏）。

---

## 7. 编造项核查（终版）

| 检索项 | 单文件全文命中 | 可见界面命中（21 页 + 登录页） | 判定 |
|---|---:|---:|---|
| 演示身份卡 / 三题陈列卡 / 内容匹配 | 0 / 0 / 0 | 0 | 通过 |
| SHA-256 | 3 | **0**（仅存在于 JS 哈希实现与图组件 `title`） | 通过（可见界面无） |
| 发布成功 v1 / 发布成功 / 导出成功 | 0 / 0 / 0 | 0 | 通过 |
| 主持人浮标 | 0 | 0（登录页与各页均无 `#host-fab/.host-*`；无右下角可见浮标） | 通过 |
| 主持人工具 | 1 | 默认 **0**（面板 `.msh` 默认 `display:none`；`Ctrl+Shift+H` 打开、Esc 关闭） | 通过（仅快捷键，见 m2） |
| 嘉宾界面固定角浮标 | — | 登录页 `fixedCorner=[]`；`.msh` 默认隐藏 | 通过 |

- 主持人面板实测：默认隐藏；`Ctrl+Shift+H` 打开「主持人工具 · 离线演示」（当前身份/回放数据/会话游标/发布记录/断网 0 请求 + 复位按钮）。截图：`shots/off-host-default.png`、`shots/off-host-open.png`。
- **但**：`主持人手册.md` 称"登录页底部「主持人工具」"入口 —— 登录页无可点元素（`entry_like=[]`）。手册与发行包不一致（MINOR m2）；需求关注的"嘉宾界面无浮标"成立。

---

## 8. 未通过项 A 段抽查（5 条 + 追加，终版）

| ID | 文档断言 | 现役实测 | 文档与现役 | 离线（终版） |
|---|---|---|---|---|
| **T2** 教学蓝图 | 常驻「本轮生成没有完成，未写入任何内容。」；blueprint null | 逐字出现；PPT/教案为空 | **一致** | 逐字一致 ✔ |
| **T3** 重试 | 点「重试」→ 原文「动作 'retry_run' 不可执行…」；409 / code=40900 | **一致**：409、code=40900、error_key=conflict；课堂设计页显示同句原文；沉浸式显示冲突卡（85 字） | **一致** | **已两侧一致**（409 回放；冲突卡仅 request_id 不同）✔ |
| **T4** PPT 工作台 | 幻灯片 0/0；7 项全部 disabled | 一致 | **一致** | 同左 ✔ |
| **T6** 导出 | 三卡 disabled + 理由；`/exports`、`/tickets` 0 次 | 一致（title 按产物拆分） | **一致** | 同左 ✔ |
| **T7** 发布 | 发布课堂 disabled（title「先完成课件生成」）；无对话框/班级列表/版本号 | 状态一致；**但 title 实际为**「发布到班级课堂：…（发布当前课件快照，不改动备课内容）」 | **状态一致，title 引用过期** | 同左 ✔ |
| 追加 T1 | 「从教材开始」无弹层/无业务请求 | 一致 | **一致** | 同左 ✔ |
| 追加 T9 | 题库「0/0」与作业页「786 道校本题」矛盾 | 一致（题库 0/0、题库为空；作业页 786 道） | **一致** | 同左 ✔ |
| 追加 T10 | 工作台「高二年级」vs「高一(3)班」矛盾 | 一致 | **一致** | 同左 ✔ |
| 追加 A3 | 三题未收束；A 题终点补课+填空卡 | 未收束、终点为补课+「0/1 空已填」；补课知识点漂移 | **状态一致** | 同结构补课卡 ✔ |

**结论**：A 段 5 条抽查全部与现役一致；**T3 的"离线逐字一致"在终版成立**（课堂设计页 409 文案；沉浸式冲突卡归一化后逐字一致）；T7 引用的 title 仍需更新（MINOR m3）。追加项 T1/T9/T10/A3 均一致。

---

## 9. 未通过清单（终版）

> **无 BLOCKER、无 MAJOR。** 以下 5 项 MINOR 均为已知偏差/口径问题，不影响主演示链路。

- **m1 · 整页加载时 2 条 MathLive console error**（字体目录解析失败，file:// 单文件内联所致；SPA 内导航 0 条；渲染正常）。断网请求/pageerror 均为 0；"console error=0"仅在 SPA 导航口径成立。证据：`verify.json.offline_audit`。
- **m2 · 主持人入口文档与发行包不一致**：手册称"登录页底部主持人工具"，实际登录页无可点元素（`entry_like=[]`）；仅隐藏面板 + `Ctrl+Shift+H`。嘉宾界面无浮标符合要求。证据：`host_check.json`、`shots/off-host-default.png`、`shots/off-host-open.png`。
- **m3 · `未通过项.md` T7 引用的发布按钮 title「先完成课件生成」已过期**：现役/离线实际 title 为「发布到班级课堂：…（发布当前课件快照，不改动备课内容）」。
- **m4 · 数据漂移 9 页（非缺陷）**：学生 `/dialog`、`/practice`、`/me`；教师 `/prep`、`/insights`、`/resources`、`/grading`；科研 `/workspace`、`/read`。均为"采证快照 vs 现役实时"的真实数据/时间/AI 文案差异，已附证据（§2）。
- **m5 · 刷新后交互卡片面板不重建 / 无附件缩略图（已知偏差，需披露）**：终版刷新已恢复会话身份、18 条消息、user→ai 交替、首条/末条文本、无附件丢失且 0 pageerror；但补课/填空/式子卡面板与附件缩略图不重建。现役刷新会保留卡片。该偏差已在 `未通过项.md` §C 声明；判定为 **MINOR（接受但需在演示口径明示）**，依据见 §1 末尾；若验收标准要求"刷新后逐控件同现役"，应升级为未通过（需产品确认口径）。

---

## 10. 限制与如实说明

1. 现役 AI 与 AI 概览非确定性：样板一现役逐轮文本与 02:xx 采证不完全相同（离线回放采证原文）；已按"离线 vs 采证"核对逐轮、"现役 vs 离线"核对其余。
2. 现役「继续备课」当前落到新会话 `393d2558…`（现役备课历史 2 条），离线快照只有 `f5c84551…`；为可比性统一显式打开 f5c84551 会话核对。
3. 现役短信验证码有 60s 频控、上传 10 次/小时限流；本次现役仅 1 次上传（未触发 429），登录均真实短信验证，无绕过。
4. `/research-workspace/write` 不是写作编辑器路由（两侧同重定向到启动页）；真实写作页为 `/research-workspace/<projectId>/write`，已补充采证并判定一致。
5. 终版复核时，逐屏现役/离线截图于 05:05–05:12 同场重采；样板二 05:14、样板一离线 05:12 重跑。
6. 本报告只读源码用于根因定位（`app/src/offline/*.js`），**未修改任何实现文件**；所有产出仅写入 `qa/verify-final/`。

---

## 11. 证据索引与复跑

**机器数据**

| 文件 | 内容 |
|---|---|
| `verify.json` | 21 页逐页：路由/布局盒/控件/可见数字/破图/文本 diff/判定 + 离线审计 + 嘉宾页 + 发行包扫描（终版 SHA）+ 包版本（v1/v2/final）+ B1 修复核对 + 样板一/二摘要 |
| `template1_off_clean.json` | 样板一：终版离线清洁复跑 9 轮 + 刷新前后 18 条消息/顺序/首末文本/卡片状态 + 新对话 |
| `template2.json` | 样板二：终版 T1–T7、重试（课堂设计页 409 文案 + 沉浸式冲突卡）、导出/发布/教案、控制台/请求/下载 |
| `template1.json` | 样板一现役侧 9 轮/终点/刷新（05:11 前的现役会话） |
| `live_extra.json` | 现役补充：新对话行为、科研 read 概览采样 |
| `host_check.json` | 主持人面板默认隐藏 / 快捷键 / 登录页无入口 |
| `*-sha-ba0239c3.json`、`*-sha-782faff3.json` | 旧版留档（v1/v2），用于版本沿革对照 |
| `side_extra.json` | 补充并排图清单 |

**截图（`shots/`）**：`live-<role>-<slug>.png`、`off-<role>-<slug>.png`、`side-<role>-<slug>.png`（20 页 + 补充页 + 登录页 + 3 组交互态）、`side-sample1-{upload,terminal,refresh}.png`、`side-template2-{retry,conflict,ppt,export}.png`、`template1/**`、`template2/**`、`off-host-*.png`。

**复跑（仅写 `qa/verify-final/`）**

```powershell
python qa/verify-final/tools/run_parity.py                    # 20 页并排 + 断网/嘉宾/编造项 + audit
python qa/verify-final/tools/run_template1_off_clean.py       # 样板一离线 9 轮 + 刷新 + 新对话
python qa/verify-final/tools/run_template2.py                 # 样板二 T1–T7 + 重试（两入口）+ 导出/发布/教案
python qa/verify-final/tools/run_template1.py                 # 样板一现役侧（上传+9轮）
python qa/verify-final/tools/run_live_extra.py                # 现役补充（新对话/科研 read）
python qa/verify-final/tools/check_host.py                    # 主持人口径
python qa/verify-final/tools/probe_actions.py                 # 重试/冲突卡根因探针
python qa/verify-final/tools/probe_unknown_endpoints.py       # 未采证端点 404 信封核查
python qa/verify-final/tools/rejudge.py ; python qa/verify-final/tools/finalize_verify.py
```

---

## 12. 一句话交付

终版 `DA5025…`：**重试崩溃（B1）与刷新恢复（M1）均已修复**——重试两侧 409/冲突卡逐字一致且不再崩溃；刷新后 18 条消息顺序/首末文本/无附件丢失全部恢复（卡片面板与附件缩略图不重建为已声明 MINOR 已知偏差）。逐屏 20 页 **11 一致 + 9 可解释漂移 + 0 未通过**（布局盒 0px、破图 0/0、控件 disabled 全同）；样板一逐轮 **9/9**、终点一致；样板二全部核对项一致、无发布成功态/班级列表/导出产物；断网 **0 请求 / 0 pageerror / 0 破图**；编造项可见界面 0 命中、嘉宾界面 0 浮标。**最终 VERDICT：通过（PASS，附 5 项 MINOR 已知偏差/口径项）。**

VERIFY-FINAL-RECHECK-DONE