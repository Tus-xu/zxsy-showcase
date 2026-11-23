# -*- coding: utf-8 -*-
"""组装 evidence/live/run-03/data/REPORT.md（prose + 自动生成表格）。"""
import io
import json
import os

DATA = r'D:\zxsy-math-arena-showcase\evidence\live\run-03\data'
WORK = r'D:\zxsy-math-arena-showcase\.work\r03-data'

HEAD = """# run-03 · 学生端列表类数据补采报告（Mathesis 现役系统 · 真机）

- 采证对象：现役前端 `http://127.0.0.1:5176`（Vite dev，同源 `/api` → API `8000`）
- 采证时间：2026-11-23 01:18–01:40（+08:00），分 3 段完成（见 ① 环境事故）
- 浏览器：Playwright headless Chromium，viewport **1672×941**、DPR=**1**
- 账号：学生演示账号 **13800001001**；登录全程走 `/login` 正常 UI（`#preferred-role`=student → `#auth-phone` → 「获取验证码」→ **页面 `.demo-note` 显示的随机 6 位演示码** → 「安全登录」→ `/dialog`）
- 证据根：`evidence/live/run-03/data/`（`shots/` 50 张、`api/index.json`、`api/bodies/` 74 份响应原文、`scripts/`）
- 采集纪律：**只通过 UI 操作触发请求**；未直调业务 API 造数据；未修改现役/离线任何代码；**未上传文件**（上传 10 次/小时频控，本任务不需要）

---

## ① 环境与入口

| 项 | 实测 |
|---|---|
| 前端入口 | `http://127.0.0.1:5176`（HTTP 200） |
| API | `http://127.0.0.1:8000/api/health` → `{"status":"ok","version":"1.0.0",...}` |
| 依赖容器 | zxsy-postgres(54329) / zxsy-teacher-postgres(54330) / zxsy-redis(6379) / zxsy-teacher-valkey(6380) / zxsy-minio(9000-9001) 全部 `Up (healthy)` |
| 登录后落地 | `http://127.0.0.1:5176/dialog`（首屏并发拉 15 个接口，见 ②） |
| 视口/缩放 | 1672×941，`device_scale_factor=1`，headless |
| 复跑脚本 | `scripts/r03_capture.py`（分阶段：`library/library2/library3/resources/errors/classroom/play/me`）、`scripts/build_report.py`、`scripts/run-retry.ps1` |

### 环境事故（影响采集完整性，如实记录）

1. **01:03 宿主 Docker Desktop 停摆**：5 个依赖容器退出 → API 8000 启动失败（`OSError: Connect call failed ('127.0.0.1', 54329)`，见 `.work/logs/r02-api-8000.err.log`）。主控 01:18 恢复容器与 API。
2. **01:29 API 8000 被外部终止**（`r03-api-8000.out.log` 末行 01:29:16 `embedding.ok`，无异常退出日志）→ 采集在 01:29–01:34 之间多次拿到 vite 代理 500。
3. **01:34 由本组按 `.work/env-bringup.md` 记录的命令重启 API 8000**（`.venv\\Scripts\\python.exe run_server.py`，cwd=`services\\api`，未改任何代码/配置），01:34:16 `/api/health` 恢复，随后完成题库参数与课件逐页补采。
4. 另：短信验证码槽位（同号码 60s 一条）与并行代理 `r03-guide` 共用手机号，期间出现多次 `AUTH_RATE_LIMITED retry_after=29..60`，采集脚本按 `retry_after` 等待后重试成功（未做任何绕过）。

---

## ② 逐页操作与请求清单

> 说明：下表由 `api/index.json` + `api/bodies/` 自动生成（`scripts/build_report.py`）。**响应条数**取 JSON 里 `items/total/…` 或顶层数组长度；`（×N）` 表示同一 URL 在本次采集的多个页面/轮次被重复请求（`index.json` 的 `seenIn` 字段保留了每次的页面与触发操作）。「原文文件」是 `api/bodies/` 下的完整响应原文。

"""

TAIL = """

---

## ③ 参数覆盖矩阵

### 3.1 我的题库 `GET /api/v1/questions`（缺陷主战场）

| 参数 | 覆盖取值 | 触发操作 | 响应 | 证据 |
|---|---|---|---|---|
| `limit` | **1** | 进入 /library 时顶部「题库」统计探针（`loadQuestionTotal`） | `items=1, total=24` | `GET_api_v1_questions_limit_1.txt` |
| `limit` | **30** | 切到「我的题库」Tab（页面常量 `Q_LIMIT=30`） | `items=24, total=24` | `GET_api_v1_questions_limit_30_offset_0.txt` |
| `offset` | **0** | 同上 | — | 同上 |
| `offset` | **30+** | ❌ **不可达**：题库总数 24 < 单页 30，页面「加载更多」按钮条件是 `questions.length < qTotal` → 不渲染该按钮（实测 `hasLoadMore=false`，页脚「已显示 8 / 8」，见 `shots/59-library3-difficulty-medium.png`） | — | `shots/52-library-questions-tab.png` |
| `q_type` | `choice` | 题型下拉「选择题」 | 见 files | `…q_type=choice.txt` |
| `q_type` | `blank` / `solution` | 题型下拉「填空题」「解答题」 | 见 files | `…q_type=blank / …q_type=solution` |
| `difficulty` | `easy` / `medium` / `hard` | 难度下拉「基础」「进阶」「压轴」 | 见 files | `…difficulty=easy/medium/hard` |
| `q_type`+`difficulty` | `choice`+`easy`、`choice`+`hard` | 两个下拉联动 | 见 files | `…q_type=choice&difficulty=easy / =hard` |
| `q` | **函数**、**导数** | 搜索框输入（防抖 280ms 后请求） | `q=%E5%87%BD%E6%95%B0`、`q=%E5%AF%BC%E6%95%B0` | `…q_…txt` + `shots/55/56` |
| 详情 | `/api/v1/questions/{id}` | 点第一张题卡（题目详情抽屉） | 见 file | `GET_api_v1_questions_2d2021e7-....txt` |
| 资料 | `/api/v1/kb/documents?kb_name=default&limit=200` | 「我的资料」Tab 首屏 | `items=…` | `GET_api_v1_kb_documents_…txt` |

**结论**：题库的 `limit`（1/30）、`q_type`（三种）、`difficulty`（三档）、`q`（两个关键词）、组合筛选与详情都已真机采到；**`offset>0` 在当前数据量下 UI 无法触发**（这是数据量导致的不可达，不是漏采）。

### 3.2 资源中心 `GET /api/student/videos`

| 参数 | 覆盖取值 | 触发 | 响应要点 |
|---|---|---|---|
| `page_size=1` | 1 | 进入 /resources 首屏取分类 chips | `items=1`（仅用于取 `topics`，9 个分类） |
| `page_size=12` + `topic` | `featured` / `function` / `trig` / `sequence` / `custom` | 切「🧭 按知识点浏览」+ 逐个分类 chip；`custom` 为关键词检索后刷新 | 每类 `items=11~12`，`topics=9` |
| `keyword` | `数列求和` | 搜索框回车 | `keyword=%E6%95%B0%E5%88%97%E6%B1%82%E5%92%8C&page_size=12` |
| `POST /student/videos/recommend` | `max_results=8` | 首屏「🎯 为你推荐」 | 推荐流 8 条 + `kp_name` |

> **注意**：资源中心**没有分页控件**，`page_size` 固定 12，无 `offset/page` 参数可采。视频列表页不带 `limit=1` 兜底（旧离线包的「1 张卡」问题在这一页不成立）。

### 3.3 错题 `GET /api/student/error-records/filter`

| 参数 | 覆盖取值 | 触发 |
|---|---|---|
| `page=1&size=50` | 基础参数（每次筛选都带） | 进入 /errors 及每次切筛选 |
| `error_type` | `concept`（概念不清）、`calculation`（计算失误） | 按错因 Tab → 点维度值 |
| `kp_code` | `JH-02`（圆锥曲线）、`DR-02`（导数的运算法则与复合求导） | 按知识点 Tab → 点维度值 |
| `date_from` | `2026-11-15`（近 7 天）、`2026-10-23`（近 30 天） | 按时间 Tab → 近 7 天 / 近 30 天 |
| `stability` | `stable`（稳定区）、`decaying`（衰减中） | 按遗忘风险 Tab → 点维度值 |
| 其它列表接口 | `memory-heatmap`、`due-queue`（24 条）、`error-records/{id}/detail`、`butler/error-diagnosis/{id}`、`butler/error-detail/{id}`、`error-records?limit=1`、`review-plan` | 进入 /errors 自动浮窗 / 关浮窗后点列表项 |

> **现役怪癖（与修复直接相关）**：`GET /api/student/error-records?limit=1` **并不只返回 1 条**——实测 `items=20, total=24`，即该端点忽略 `limit`、固定按默认页长 20 返回；而题库 `limit=1` 确实返回 1 条。离线回放若按 URL 精确匹配，这两条必须分别落库，不能互相兜底。

### 3.4 作业 `GET /api/student/assignments`

| 参数 | 覆盖取值 | 触发 |
|---|---|---|
| `status=all&page=1&size=50` | 课堂任务列表（页面循环翻页拉全，本次 total=1 只发 1 次） | 进入 /classroom「课堂任务」 |
| `status=todo&size=1` | 首屏「待完成」角标探针 | 登录后 /dialog 首屏 |
| `/student/assignments/{id}` | 作业详情（5 题） | 「已完成」→「↻ 查看作答」（`/tasks/:id`） |
| `/student/assignments/{id}/result` | **教师批改结果**：`status=graded, total_score=30.0`，5 个小项分别 `score=10/0/10/10/0`，`teacher_feedback` 均为 `null` | 同上 |

### 3.5 课堂 `GET /api/classroom/sessions` 与班级

| 参数 | 覆盖取值 | 触发 |
|---|---|---|
| `limit=5` | 「最近课堂」 | 切「🎬 双师课堂」Tab |
| `limit=50` | 播放页「课堂回顾」历史 | 打开课件进入播放页 |
| `/classroom/sessions/{sid}` | 课件会话详情（`slides=5, outlines=5, status=ready, source_type=teacher_deck`） | 打开课件 |
| `PATCH /classroom/sessions/{sid}/progress` | `{slide_index:N}`（翻页后 800ms 防抖上报），另含 `page_check` | 每次翻页 |
| `/classes/mine` | 我的班级 | 课堂任务 / 我的班级 |
| `/classes/{id}/members`、`/feed`、`/hot-errors?days=30&limit=5` | 班级成员 / 动态 / 热门错题 | 「🏫 我的班级」Tab |
| `/student/classroom-coursewares`、`POST /student/classroom-coursewares/{id}/open` | 老师课件列表 / 打开课件建会话 | 双师课堂 Tab / 点卡片 |
| `/classroom/tts`（POST） | 「播放讲解」逐句 TTS | 播放页点「▶ 播放讲解」 |

### 3.6 我的 `/me` 四 Tab

| Tab | 接口 |
|---|---|
| 📈 学情报告 | `butler/weekly-report`、`student/report/highlights`、`student/mastery/today-actions`、`student/mastery/trend?days=30`、`student/report/mastery-trend-forecast?days=14`、`student/report/error-distribution`、`student/report/honesty`、`student/mastery/summary`、`student/report/weak-points` |
| 🧠 掌握地图 | `student/knowledge-graph/tree`（56KB，全量考点树）、`…/pie`、`…/nodes/MATH-001/deps`、`…/recommend`、`…/errors` |
| 📝 体验反馈 | `GET /api/api/trial/metrics` → **404**（前端 base 已含 `/api`，实际拼成 `/api/api/...`；现役这一行是坏的） |
| ⚙️ 个人设置 | `student/growth/overview`、`auth/me`（无新增业务接口） |

---

## ④ 课堂课件播放时间线（《函数的单调性：从图像到导数》，5 页）

**入口**：`/classroom` →「🎬 双师课堂」Tab →「🎓 老师课堂」卡片
卡片原话：`👩‍🏫 张老师 | 学习中 | 函数的单调性：从图像到导数 | 🏫 高一(3)班 · 数学 | 5 页 | 10-27 04:05 | 我的进度 80% | 练习正确率 — | 继续学习 →`

| 时刻 | 操作 | 关键请求 | 结果 |
|---|---|---|---|
| T0 | 点课件卡 | `POST /api/student/classroom-coursewares/6baf153d-…/open` → `{session_id: 5304e914-…, …}`；随后 `GET /api/classroom/sessions/5304e914-…`（**31,559 B**）；`GET /api/classroom/sessions?limit=50` | 进入 `/dual/5304e914-…`，`status=ready`，`slides=5`、`outlines=5` |
| T0+ | 播放页渲染 | — | **落在第 4 / 5 页**（续播：`progress` 记录 80%）；`.dcx-pagechip` 原话 `4 / 5`，`.dcx-ctl-page` 原话 `第 4 / 5 页` |
| T1 | 「上一页 ⟨」×4 | — | 回到 `1 / 5` |
| T2 | 「下一页 ⟩」 | `PATCH /api/classroom/sessions/5304e914-…/progress` `{"slide_index":1}` | `shots/44-player-page-1.png` |
| T3 | 「下一页 ⟩」 | 同上 `{"slide_index":2}` | `shots/45-player-page-2.png` |
| T4 | 「下一页 ⟩」 | 同上 `{"slide_index":3}` | `shots/46-player-page-3.png` |
| T5 | 「下一页 ⟩」 | 同上 `{"slide_index":4}` | `shots/47-player-page-4.png` |
| T6 | 「下一页 ⟩」 | 同上 `{"slide_index":5}`（末页按钮变 disabled） | `shots/48-player-page-5.png` |
| T7 | 点「▶ 播放讲解」 | `POST /api/classroom/tts`（流式音频通道） | `shots/49-player-播放讲解.png` |
| T8 | 点「⏹ 停止讲解」 | — | `shots/50-player-停止讲解.png` |

> 注：`POST /api/classroom/tts` 是音频流响应（页面切走时响应体未读完），按去重规则未落入 `api/index.json`（index 只收录能完整读到原文的响应）；请求确实发生，见 `.work/r03-data/run 日志`（`net POST /api/classroom/tts -> 200`）。

**5 页标题（来自 `session.outlines`，逐页对应截图）**：
1. 函数的单调性：从图像到导数 → `shots/44-player-page-1.png`
2. 先看图像：增减趋势 → `shots/45-player-page-2.png`
3. 再看切线：导数的符号 → `shots/46-player-page-3.png`
4. 例题：f(x)=x³-3x → `shots/47-player-page-4.png`
5. 当堂检测 → `shots/48-player-page-5.png`

**播放控件原话（`page.evaluate` 抓 DOM，按顺序摘录）**：
`🏠 学生端`（title=返回学生端）、`📋 课堂任务`（title=查看老师布置的课堂任务）、`▶`（title=开始讲解（逐句朗读））、`⏹`（title=停止讲解）、`⛶ 全屏课堂`、`⚙`（title=讲解设置）、`🗂 课堂回顾`、`🕸 知识图谱`、页码 chips `1 / 2 / 3 / 4 / 5` + 页标题（title 同页标题）、`🏋️ 随堂练习`（title=跳到本课随堂练习）、`提问`、`⟨`（title=上一页）、`▶`（title=播放讲解）、`⟪`（title=上一句）、`⟫`（title=下一句）、`⟩`（title=下一页）、`第 X / 5 页`、`✅ 记住了`、`🔁 要重听`、`✨ 本页生成新课堂`（title=以本页主题更深入地讲一节课）、`白板推导`、`公式工具`、`课堂笔记`、`✏️`（title=打开板书（跟老师一样在幻灯片上圈画））、`🎯 随堂小测`、`🤔 没听懂`、`📌 本课小结`、`基础/进阶/挑战`、A/B/C/D 选项、`下一题`

**能否播放**：✅ 五页均可打开、可翻页、可截图；播放讲解按钮真实发出 `POST /api/classroom/tts`（音频流未逐句核听，见 ⑤）。

---

## ⑤ 仍未拿到的数据（如实列出）

1. **题库 `offset>0` 组合**：题库总数 24 < 页长 30，UI 不渲染「加载更多」→ 无法通过 UI 触发 `offset=30`。若离线回放需要该组合，得先让现役题库 >30 题，或临时改页长（本轮不允许改代码）。
2. **资源中心分页参数**：页面无分页控件，`page_size` 固定 12、无 `offset/page`；`page_size` 其它取值（如 1 已采、24/50 等）无法触发。
3. **错题 `filter` 的 `page>1`**：页面固定 `page=1&size=50`，无翻页控件；`size` 其它取值同样不可达。
4. **作业 `page>1`**：本次学生只有 1 条作业（`total=1`），循环翻页只发了 `page=1`。
5. **学生「我的提交」独立页不存在**：「查看作答」= `/tasks/:id`（`AssignmentView`），批改反馈由 `GET /student/assignments/{id}/result` 带回（`status=graded`、`total_score=30.0`、5 项 score、`teacher_feedback` 全为 `null`）。**查看反馈可达，但教师逐题评语为空**（现役数据就是这样，未伪造）。
6. **`GET /api/api/trial/metrics` 恒 404**：前端拼接出双 `/api` 前缀 → 「体验反馈」Tab 无数据可采；这是现役缺陷，已按原样记录（`api/bodies/GET_api_api_trial_metrics.txt`）。
7. **班级动态为空**：`GET /api/classes/{id}/feed` 返回 55 B（`items: []`）；`notifications/tasks` 也是空数组。均为现役真实空数据。
8. **TTS 音频内容未核验**：`POST /api/classroom/tts` 只记录了请求与 200 状态（音频流响应体未读完，未入 index），未验证逐句朗读音频是否真的可播。
9. **未采**（本任务范围外）：`/dialog` 对话链路、`/practice` 练题、`/exam` 模考、教师端页面。

---

## 附录 A · 可复跑

```powershell
# 1) 前置：现役 5176 前端 + 8000 API 在线（健康检查 /api/health = ok）
# 2) 采集（分阶段，可单独重跑；每轮会自动合并进 api/index.json，不覆盖已有成果）
python evidence\\live\\run-03\\data\\scripts\\r03_capture.py library2 play
#    其它阶段：library / library3 / resources / errors / classroom / me
# 3) 汇总表格
python evidence\\live\\run-03\\data\\scripts\\build_report.py
```

- 脚本内已处理：短信频控（按响应体 `retry_after` 等待重试）、页面崩溃（`page.on('crash')` 记录）、响应去重（同一 `METHOD path?query` 只落一份原文 + `seenIn`）。
- `run-retry.ps1` 为带重试的包装（宿主可能清理长时间无交互进程）。

## 附录 B · 文件清单

- `api/index.json`：`{ "<METHOD> <path>?<query>": {url,status,ct,file,bytes,page,trigger,seenIn} }`
- `api/bodies/*.txt`：逐响应原文（UTF-8，未做任何改写）
- `shots/*.png`：50 张（每页/关键态一张；课件 5 页逐页一张 + 播放/停止讲解各一张）
- `scripts/`：`r03_capture.py`、`build_report.py`、`run-retry.ps1`
"""


def main():
    tables = io.open(os.path.join(WORK, 'report_tables.md'), encoding='utf-8').read()
    idx = json.load(io.open(os.path.join(DATA, 'api', 'index.json'), encoding='utf-8'))
    n = len(idx)
    n_get = sum(1 for k in idx if k.startswith('GET '))
    shots = len([f for f in os.listdir(os.path.join(DATA, 'shots')) if f.endswith('.png')])
    bodies = len([f for f in os.listdir(os.path.join(DATA, 'api', 'bodies'))])
    head = HEAD.replace('`shots/` 50 张', f'`shots/` {shots} 张').replace('`api/bodies/` 74 份', f'`api/bodies/` {bodies} 份')
    head += f'\n> 本轮共采 **{n}** 个接口（其中 **GET {n_get}** 个），`shots/` 共 **{shots}** 张截图，`api/bodies/` 共 **{bodies}** 份响应原文。\n\n'
    out = head + tables.strip() + TAIL
    p = os.path.join(DATA, 'REPORT.md')
    with io.open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print('REPORT.md written:', p, len(out), 'chars |', n, 'interfaces |', shots, 'shots |', bodies, 'bodies')


if __name__ == '__main__':
    main()