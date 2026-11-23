# run-03b · 离线包三处数据缺口补采报告（现役实测）

> 目标：补齐离线包相对现役缺失的三类数据（历史会话消息 / 错题详情 / 资源中心外链封面），
> 并追加 lead 要求的「重新基线化」端点快照（快照后现役数据被继续使用而过期）。

| 项 | 实测 |
|---|---|
| 采证对象 | 现役前端 `http://127.0.0.1:5176`（Vite dev，同源 `/api` → API `8000`），`/api/health = {"status":"ok"}` |
| 采证时间 | 2026-11-23 03:08–03:11（+08:00），单次登录会话内一气采完（含追加基线化） |
| 浏览器 | Playwright headless Chromium，viewport **1672×941**、DPR=**1** |
| 账号 | 学生演示 **13800001001**，全程走 `/login` 正常 UI（`#preferred-role`=student → `#auth-phone` →「获取验证码」→ **页面 `.demo-note` 的随机 6 位演示码** →「安全登录」） |
| 证据根 | `evidence/live/run-03b/`（`shots/` 46 张、4 组 `index.json`、`bodies/` 响应原文、`baseline/`） |
| 采集纪律 | **只通过 UI 操作触发请求**；未直调业务 API 造数据；未修改现役/离线任何代码；未上传文件；**token/cookie 不落盘** |
| 复跑脚本 | `scripts/r03b_capture.py`（阶段 `conv` / `errors` / `covers` / `baseline`）、`scripts/build_report.py`（本报告） |

## 摘要（逐项条数）

| # | 缺口 | 目标 | 实测拿到 | 判定 |
|---|---|---|---|---|
| A | `/dialog` 历史会话消息 | ≥6 条（置顶/今天各 ≥1） | **30 条**全部点开（19 条有消息、11 条空会话「新对话」）；置顶 5 / 今天 6 / 7 天内 19；messages 响应原文 30 份 | ✅ 超额 |
| B | `/errors` 错题详情 | ≥6 条不同错题 | **7 条**不同错题 × 3 端点（detail + butler error-detail + butler error-diagnosis，全部 HTTP 200），共 21 份响应原文；当前列表 `total=26` | ✅ |
| C | `/resources`「按知识点浏览」封面 | 10 张外链封面 | **12 张** （featured 分类 12 张卡全命中，`i0/i1/i2.hdslb.com` 全部 image/jpeg），合计 **1,240,510 B**，DOM 缺图 **0** | ✅ 超额 |
| D | 追加：重新基线化（lead 指定 3 组端点） | 6–7 个端点 | **8 个端点** 响应原文落盘（含附加 `classroom/sessions?limit=5`）；错题 `total=26`、课件进度 **100.0%**、播放页页码 **第 5 / 5 页** | ✅ |

---

## A. 历史会话（/dialog 左侧列表 → 逐条点开）

- 列表响应：`http://127.0.0.1:5176/api/agent/conversations?limit=30` → HTTP 200，**11,801 B** 原文见 `conversations/bodies/conversations_limit30.json`；响应 `data.items=30`（本次渲染的 30 条）、`data.total=112`、`data.hasMore=True`。
- 侧栏分组（现役原话）：置顶 / 今天 / 7 天内 / 30 天内 / 更早；本次首页 30 条覆盖 **置顶+今天+7 天内** 三组。
- 每条点开都会触发 `GET /api/agent/conversations/{id}/messages?limit=20`；**完整 URL（含 query）**与响应原文逐条落盘，同时截图。11 条空会话（「新对话」）响应原文为 `{"items":[],"hasMore":false…}`（112 B），如实收录，未伪造。

| # | 会话 id | 标题（列表原话） | 分组 | 消息条数 | 响应字节 | 响应原文 | 截图 |
|---|---|---|---|---|---|---|---|
| 01 | `476cd423-eb5c-4afa-ae92-de859a3d23d0` | 错题本录入 · 极值点判断 | 置顶 | 2 | 1,471 | `conversations/bodies/conv-476cd423.json` | `shots/02-conv-01-476cd423.png` |
| 02 | `9467100a-51db-4485-a50d-4f5765c4d0e0` | 可视化讲解 · 导数与极值 | 置顶 | 2 | 20,663 | `conversations/bodies/conv-9467100a.json` | `shots/03-conv-02-9467100a.png` |
| 03 | `1fa3e4c2-58b3-49d7-8425-191d148f27a5` | 举一反三 · 三次函数变式链 | 置顶 | 2 | 2,767 | `conversations/bodies/conv-1fa3e4c2.json` | `shots/04-conv-03-1fa3e4c2.png` |
| 04 | `192cb473-6f2d-4e85-9c06-fa22f855e2dd` | 引导式解题 · 三次函数极值 | 置顶 | 16 | 32,389 | `conversations/bodies/conv-192cb473.json` | `shots/05-conv-04-192cb473.png` |
| 05 | `fe3c4e7f-b14a-485c-9a8d-54a459968b39` | 导数的几何意义怎么理解 | 置顶 | 4 | 2,590 | `conversations/bodies/conv-fe3c4e7f.json` | `shots/06-conv-05-fe3c4e7f.png` |
| 06 | `0cd000d9-900c-47f1-9bbc-82722149d28c` | 分析用户上传的文件 | 今天 | 16 | 29,142 | `conversations/bodies/conv-0cd000d9.json` | `shots/07-conv-06-0cd000d9.png` |
| 07 | `e3cbe343-41f8-43a5-a7e9-ca9abd2be841` | 分析用户上传的文件 | 今天 | 20 | 29,091 | `conversations/bodies/conv-e3cbe343.json` | `shots/08-conv-07-e3cbe343.png` |
| 08 | `8e006e4c-33ae-4f00-bff7-4afb4aed4d90` | 分析用户上传的文件 | 今天 | 20 | 28,782 | `conversations/bodies/conv-8e006e4c.json` | `shots/09-conv-08-8e006e4c.png` |
| 09 | `722f0537-389a-4613-bdbf-37238b7abf04` | 分析用户上传的文件 | 今天 | 6 | 8,232 | `conversations/bodies/conv-722f0537.json` | `shots/10-conv-09-722f0537.png` |
| 10 | `ec14940f-cf52-4b7c-a960-91a0d8629505` | 分析用户上传的文件 | 今天 | 2 | 1,770 | `conversations/bodies/conv-ec14940f.json` | `shots/11-conv-10-ec14940f.png` |
| 11 | `13327ffb-dd21-4555-8691-c44fc56bee70` | 新对话 | 今天 | 0 | 112 | `conversations/bodies/conv-13327ffb.json` | `shots/12-conv-11-13327ffb.png` |
| 12 | `68e6a596-8062-4784-ba68-9596fc7d644c` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-68e6a596.json` | `shots/13-conv-12-68e6a596.png` |
| 13 | `ea17910d-71c8-4e2b-aae6-221784ea20f1` | 分析用户上传的文件内容 | 7 天内 | 18 | 60,968 | `conversations/bodies/conv-ea17910d.json` | `shots/14-conv-13-ea17910d.png` |
| 14 | `986d06b9-cde8-4289-958f-2fb914395a0c` | 分析用户上传的文件 | 7 天内 | 20 | 63,242 | `conversations/bodies/conv-986d06b9.json` | `shots/15-conv-14-986d06b9.png` |
| 15 | `48a40680-8475-4427-bd69-a62534312598` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-48a40680.json` | `shots/16-conv-15-48a40680.png` |
| 16 | `08f6d709-7efd-4169-8e97-62906c175c0d` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-08f6d709.json` | `shots/17-conv-16-08f6d709.png` |
| 17 | `8b369e0d-3d8a-4b42-9872-26bf0d591a70` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-8b369e0d.json` | `shots/18-conv-17-8b369e0d.png` |
| 18 | `98845d07-66d8-4895-a3af-6c08dfe9ca97` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-98845d07.json` | `shots/19-conv-18-98845d07.png` |
| 19 | `d3745af2-95d8-423b-a95d-5aa181c61226` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-d3745af2.json` | `shots/20-conv-19-d3745af2.png` |
| 20 | `34c4e233-6f62-4ef9-862f-ec4a3664b124` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-34c4e233.json` | `shots/21-conv-20-34c4e233.png` |
| 21 | `c5f06344-5a0c-4252-98fb-a10fc8095223` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-c5f06344.json` | `shots/22-conv-21-c5f06344.png` |
| 22 | `05615358-c283-4fd5-8b99-4d395f4af67a` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-05615358.json` | `shots/23-conv-22-05615358.png` |
| 23 | `2c48f3fe-e914-4343-813e-dce19065a68e` | 新对话 | 7 天内 | 0 | 112 | `conversations/bodies/conv-2c48f3fe.json` | `shots/24-conv-23-2c48f3fe.png` |
| 24 | `2ff94adc-b92b-4250-8002-66bf139e89f9` | 分析用户上传的文件 | 7 天内 | 3 | 2,286 | `conversations/bodies/conv-2ff94adc.json` | `shots/25-conv-24-2ff94adc.png` |
| 25 | `78b08d93-7007-46dd-8860-26f843c03a2b` | 请求分析上传的文件 | 7 天内 | 4 | 4,818 | `conversations/bodies/conv-78b08d93.json` | `shots/26-conv-25-78b08d93.png` |
| 26 | `b2710c62-0068-4de6-aae4-3803e91046da` | 分析用户上传的文件 | 7 天内 | 6 | 9,753 | `conversations/bodies/conv-b2710c62.json` | `shots/27-conv-26-b2710c62.png` |
| 27 | `dd3c1f3c-6d77-42e3-9f73-6a19de9848aa` | 分析用户上传的文件内容 | 7 天内 | 6 | 6,711 | `conversations/bodies/conv-dd3c1f3c.json` | `shots/28-conv-27-dd3c1f3c.png` |
| 28 | `604ea8e7-eb54-4ab7-9753-69b9e65dd945` | 分析用户上传的文件 | 7 天内 | 6 | 10,507 | `conversations/bodies/conv-604ea8e7.json` | `shots/29-conv-28-604ea8e7.png` |
| 29 | `1a6ef7c1-ef97-4427-bc09-f28063aaf18f` | 分析用户上传的文件 | 7 天内 | 3 | 2,131 | `conversations/bodies/conv-1a6ef7c1.json` | `shots/30-conv-29-1a6ef7c1.png` |
| 30 | `a7bc0909-0154-428f-885d-f2e0e12847a2` | 分析用户上传的文件内容 | 7 天内 | 10 | 13,051 | `conversations/bodies/conv-a7bc0909.json` | `shots/31-conv-30-a7bc0909.png` |

> 说明：① `message_count` 是本次 `messages?limit=20` 响应里的 `items` 条数（单页上限 20；若会话更多消息需向上翻页，本次未翻，如实记录）。
> ② 「置顶」5 条均非空；「今天」6 条中 5 条非空、1 条为新对话；其余空会话集中在 7 天内组。

---

## B. 错题详情（/errors 列表 → 逐条打开）

- 列表响应：`http://127.0.0.1:5176/api/student/error-records/filter?page=1&size=50` → HTTP 200，**9,676 B** 原文见 `errors/bodies/error-records_filter_page1_size50.json`；`data.total=26`、`items=26`（现役当前态）。
- 进入 `/errors` 时 `loadDue()` 会自动打开到期队列首题（本轮首题为新入本的正三棱柱多选题），已先截图 `shots/32-errors-auto-detail-modal.png` 再关闭；随后逐条点列表 7 条。
- 每次打开触发 3 个端点：`GET /api/student/error-records/{id}/detail`、`GET /api/butler/error-detail/{id}`、`GET /api/butler/error-diagnosis/{id}`，均为 200。

| # | record_id | 知识点 | 错因 | detail | butler detail | butler diagnosis | 截图 |
|---|---|---|---|---|---|---|---|
| 01 | `8302acd3-86d7-4df7-9221-bdd1dc415a76` | 5.1 直线与平面垂直 | calculation | 847 B | 2,697 B | 444 B | `shots/34-errors-detail-01-8302acd3.png` |
| 02 | `ca8852d6-62d7-4e29-a5cb-e10f4622497d` | 圆锥曲线 | calculation | 744 B | 1,325 B | 392 B | `shots/35-errors-detail-02-ca8852d6.png` |
| 03 | `434ad34f-ea93-4201-a1d8-7d9d8fc1bd28` | 圆锥曲线 | calculation | 749 B | 2,109 B | 428 B | `shots/36-errors-detail-03-434ad34f.png` |
| 04 | `cda80afd-df3f-4a51-83b8-91dca1916685` | 圆锥曲线 | reading | 734 B | 2,079 B | 393 B | `shots/37-errors-detail-04-cda80afd.png` |
| 05 | `37abd118-372c-4bf4-aa4e-559f609dde98` | 导数的运算法则与复合求导 | calculation | 750 B | 1,299 B | 527 B | `shots/38-errors-detail-05-37abd118.png` |
| 06 | `e1db7dc7-df08-4943-9922-a2c0b631bf37` | 集合与常用逻辑用语 | — | 910 B | 1,340 B | 441 B | `shots/39-errors-detail-06-e1db7dc7.png` |
| 07 | `5f202cdf-5cb5-40d1-943d-4f87a69fefbf` | 集合与常用逻辑用语 | concept | 921 B | 1,837 B | 394 B | `shots/40-errors-detail-07-5f202cdf.png` |

- 7 条详情原文合计 21,360 B；每条记录在 `errors/index.json` 内保留了 3 个完整 URL（含 id 路径）与文件映射。
- 列表另有 `due-queue`（到期队列）与 `memory-heatmap`（热力图）响应一并落盘（`errors/bodies/api-student-error-records-due-queue.json` 等），便于离线对齐。

---

## C. 资源中心外链封面（/resources →「按知识点浏览」Tab）

- 该 Tab 的列表响应：`http://127.0.0.1:5176/api/student/videos?topic=featured&page_size=12` → HTTP 200，**8,761 B** 原文见 `covers/bodies/videos_topic_featured_page_size12.json`；`data.items=12`、`data.topics=9`、`data.source=fallback`（B 站工作流不可用时的现役回退数据，但视频与封面均为真实外链）。
- **封面 URL 字段名 = `cover`**（`data.items[0].cover`，字符串；同项还有 `author_avatar` 也是 hdslb 外链，但本页只渲染 `cover`）。
- 采集方式：先在「为你推荐」模式加载，再点「🧭 按知识点浏览」Tab，逐张卡片滚入视口触发 `loading="lazy"` 的真实下载；同时用 `page.on('response')` 记录 `i*.hdslb.com` 图片响应。
- **字节说明**：浏览器响应与「按 UI 里 `img src` 直取（不带 Referer，等价 `referrerpolicy="no-referrer"`）」两次拿到的 12 张图字节数一一对应（同一批图），最终文件以直取结果落盘（`index.json.source = direct-fetch`）；均为 `image/jpeg` 原始字节，未做转码。

| # | 封面 URL | 文件 | Content-Type | 字节 |
|---|---|---|---|---|
| 01 | `https://i0.hdslb.com/bfs/archive/8c963f3eef8a75aef37807da987b2b6805863821.jpg` | `covers/files/cover-01.jpg` | image/jpeg | 153,727 |
| 02 | `https://i1.hdslb.com/bfs/archive/6a51c78459df3bc46fec46cb0e3e02614a638203.jpg` | `covers/files/cover-02.jpg` | image/jpeg | 53,724 |
| 03 | `https://i2.hdslb.com/bfs/archive/ed529f7b93b9ae10a6b74a290ef4172cdc0d831d.jpg` | `covers/files/cover-03.jpg` | image/jpeg | 167,758 |
| 04 | `https://i2.hdslb.com/bfs/archive/9d6a0ccd726015f9a041976d666f326e1a674c7a.jpg` | `covers/files/cover-04.jpg` | image/jpeg | 52,632 |
| 05 | `https://i1.hdslb.com/bfs/archive/2b0bd72359e4e129f0ad3452fb37b6befc08e064.jpg` | `covers/files/cover-05.jpg` | image/jpeg | 115,766 |
| 06 | `https://i0.hdslb.com/bfs/archive/18b76d52d710409fd07f67ed23724b9ddb1ee610.jpg` | `covers/files/cover-06.jpg` | image/jpeg | 109,482 |
| 07 | `https://i0.hdslb.com/bfs/archive/3ac18b67e54fbc5ea494c549c017b0f6071e5cba.jpg` | `covers/files/cover-07.jpg` | image/jpeg | 54,973 |
| 08 | `https://i1.hdslb.com/bfs/archive/6ddd567869101aa4e26b4b7b5ecebd7106c7f873.jpg` | `covers/files/cover-08.jpg` | image/jpeg | 108,626 |
| 09 | `https://i1.hdslb.com/bfs/archive/04411f1e97103f42e59560595cb1bafdf609b34d.jpg` | `covers/files/cover-09.jpg` | image/jpeg | 87,727 |
| 10 | `https://i1.hdslb.com/bfs/archive/e7066e485ae05ec44290949828bfbffe2494dcaf.jpg` | `covers/files/cover-10.jpg` | image/jpeg | 71,992 |
| 11 | `https://i2.hdslb.com/bfs/archive/2922ece15ec663a6418f6b9776b9dba546233038.jpg` | `covers/files/cover-11.jpg` | image/jpeg | 102,897 |
| 12 | `https://i1.hdslb.com/bfs/archive/cf173bfcc37df1fd73a75214d92b549031364a87.jpg` | `covers/files/cover-12.jpg` | image/jpeg | 161,206 |

- 合计 **1,240,510 B**（12 张）；`covers/index.json` 即 `url → 文件` 映射（`file` 字段相对 `covers/`，另附 `path` 为相对证据根路径）。DOM 12 张卡片的 `img src` 全部命中文件（`meta.json.dom_urls_missing_file = []`）。
- 离线包修复用法：把 `covers/files/*` 收进离线静态资源，用 `covers/index.json` 的 url→file 映射替换 `videos.items[].cover`（例如离线构建时改写为本地路径），即可断网显示。

---

## D. 追加：重新基线化端点（同一登录会话内采到）

> 结构：`baseline/index.json` 的 key = `METHOD path?query`，value = `{url,status,ct,file,bytes,page,trigger}`（与 run-03 `api/index.json` 同构）；响应原文在 `baseline/bodies/*.json`。

| # | 端点 | HTTP | 字节 | 触发 | 关键计数 |
|---|---|---|---|---|---|
| 1 | `GET /api/student/error-records?limit=1` | 200 | 8,349 | /dialog 首屏自动请求（当前态） | items=20 / total=26（端点忽略 limit，仍返回默认页长 20 → 现役怪癖） |
| 2 | `GET /api/student/assignments?status=todo&size=1` | 200 | 369 | /dialog 首屏待办角标（当前态） | items=1 / total=1 |
| 3 | `GET /api/student/classroom-coursewares` | 200 | 565 | 点击「🎬 双师课堂」Tab 刷新老师课件（当前进度） | items=1 / total=1；progress_pct=100.0 |
| 4 | `GET /api/student/error-records/filter?page=1&size=50` | 200 | 9,676 | 进入 /errors 自动请求（当前错题列表） | items=26 / total=26 |
| 5 | `GET /api/student/assignments?status=all&page=1&size=50` | 200 | 717 | 进入 /classroom 默认「课堂任务」Tab（当前态） | items=2 / total=2 |
| 6 | `GET /api/classroom/sessions?limit=5` | 200 | 765 | 点击「🎬 双师课堂」Tab → 最近课堂 | 最近课堂列表（老师课件会话已过滤，见响应原文） |
| 7 | `POST /api/student/classroom-coursewares/6baf153d-f2e7-440e-a703-cc08a8ae06e4/open` | 200 | 187 | 双师课堂 → 点击老师课件卡 → POST open 建课堂会话 | session_id=5304e914-edb1-47d2-b0db-7cbb804bcd86 |
| 8 | `GET /api/classroom/sessions/5304e914-edb1-47d2-b0db-7cbb804bcd86` | 200 | 31,559 | 进入 /dual/5304e914-edb1-47d2-b0db-7cbb804bcd86 播放页 → GET 课件会话详情（当前进度/页码） | slides=5、progress.slide_index=4、status=ready |

- **错题 total = 26**（本轮实测 26；较 lead 消息里的 25 又多 1 条，现役数据仍在被并行任务使用，本报告记录的是 03:10 的当前态）。
- **课件进度 = 100.0%**（`progress_pct` 字段；卡片原话：`👩‍🏫 张老师 | 已学完 | 函数的单调性：从图像到导数 | 🏫 高一(3)班 · 数学 | 5 页 | 10-27 04:05 | 我的进度 100% | 练习正确率 — | 继续学习 →`）。
- **页码 = 第 5 / 5 页**（播放页 `.dcx-pagechip` = `5 / 5`；续播落点；`session.progress.slide_index=4`、`page_check={"0": "ok", "1": "ok", "2": "ok"}`）。
- 打开课件链路：点击「继续学习」→ `POST /api/student/classroom-coursewares/6baf153d-…/open`（187 B，`session_id=5304e914-…`）→ `/dual/5304e914-…` → 会话详情 **31,559 B**。
- 只读操作：未翻页、未改进度，页码即打开时现役续播位置（截图 `shots/46-baseline-dual-player.png`）。

---

## E. 失败项 / 如实说明

1. **无硬失败**：三项目标均超额达成；追加基线化 7 个必采端点全部拿到（另加 1 个最近课堂列表）。
2. **11 条空会话**（「新对话」，`items=[]`、112 B）如实收录，不算失败；离线包若需 30 条全会话，空会话只需按空 `items` 回放即可。
3. **列表 total=112 > 30**：本次只点开 UI 首页渲染的 30 条（任务背景为 ~30 条），未滚动触发「加载更多」（`hasMore=true`）；如需其余 82 条可再跑脚本并滚侧栏。
4. **`error-records?limit=1` 返回 items=20**（不是 1）：该端点忽略 `limit`，按默认页长 20 返回，现役怪癖如实记录。
5. **封面字节来源**：最终文件为 UI `img src` 直取（不带 Referer）；同批 12 张在浏览器响应路径也出现过、字节数一一对应，未发现图源差异或破图。
6. **videos `source=fallback`**：B 站推荐工作流不可用时现役回退数据；视频项与封面 URL 仍为真实外链，不影响本次封面补齐目标。
7. 未采（任务范围外）：其它 8 个知识点分类 chip 的封面；`/dialog` 更早消息向上翻页；错题 `page>1`。

### 运行日志里的非业务报错（13 条，均不影响证据）

- 9 条：Vite 模块请求的 `Response body is unavailable for redirect responses`（`/src/api/*.js` 被重定向，非业务接口）。
- 4 条：`GET /api/files/{id}/raw?token=…` 的 PNG 图片响应被文本解码器拒绝（二进制），未落盘。

---

## F. 脱敏说明（token / cookie 不落盘）

- 证据树内**没有** `Authorization` / `Cookie` / `access_token` / `Bearer` / 预签名 `X-Amz-Signature`：脚本只保存响应 body（不含请求头），全树扫描无命中（仅 `scripts/README.md` 出现「Authorization」说明文字）。
- 采集中确实出现 `GET /api/files/{id}/raw?token=…` 的签名 URL 图片响应：因是二进制被跳过，**未写入证据**；临时运行日志 `.work/r03b/run-log.json`（证据树之外）里的 token 值已替换为 `REDACTED`。
- 登录用的随机演示码只在 `.work` 运行日志中留痕（一次性），未写入 `evidence/live/run-03b/`。

## G. 文件清单与复跑

```text
evidence/live/run-03b/
├─ conversations/index.json            # 30 会话：title/group/messages_url/file/bytes/screenshot
│  ├─ list.json                        # /api/agent/conversations?limit=30 响应元信息
│  └─ bodies/conv-<id8>.json           # 30 份 messages 响应原文（+1 份列表原文）
├─ errors/index.json                   # 7 条错题：3 端点 URL/文件/字节/截图
│  ├─ list.json                        # /api/student/error-records/filter?page=1&size=50 元信息
│  └─ bodies/e01-<id8>_{detail,butler_error-detail,butler_error-diagnosis}.json
├─ covers/index.json                   # 12 张封面 url → {file,ct,bytes,source}
├─ covers/files/cover-01…12.jpg       # 原始字节（image/jpeg）
├─ covers/videos.json / meta.json      # videos 响应元信息、字段名、DOM 卡片核对
├─ covers/bodies/videos_*.json         # /api/student/videos 响应原文 + topics
├─ baseline/index.json                 # 8 个基线化端点（同 run-03 api/index 结构）
├─ baseline/bodies/*.json              # 8 份响应原文
├─ baseline/context.json               # 课件进度/页码/卡面原话
├─ shots/*.png                         # 46 张（会话逐条、错题列表+7 详情、资源列表、基线化播放页）
└─ scripts/r03b_capture.py + build_report.py + README.md
```

```powershell
# 复跑（需现役 5176/8000 在线；短信 60s 频控由脚本内 login 重试处理，未做绕过）
cd D:\zxsy-math-arena-showcase
python evidence\live\run-03b\scripts\r03b_capture.py            # 全阶段 conv/errors/covers/baseline
python evidence\live\run-03b\scripts\r03b_capture.py conv       # 只补会话
python evidence\live\run-03b\scripts\r03b_capture.py errors     # 只补错题详情
python evidence\live\run-03b\scripts\r03b_capture.py covers     # 只补封面
python evidence\live\run-03b\scripts\r03b_capture.py baseline   # 只补基线化
python evidence\live\run-03b\scripts\build_report.py           # 重新生成本报告
```

> 本次运行：login 03:08（演示码一次性，不落证据）→ 采集 173.4 s，共记 `324` 个 /api 响应；`shots/` 46 张。

