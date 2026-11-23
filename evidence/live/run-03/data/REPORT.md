# run-03 · 学生端列表类数据补采报告（Mathesis 现役系统 · 真机）

- 采证对象：现役前端 `http://127.0.0.1:5176`（Vite dev，同源 `/api` → API `8000`）
- 采证时间：2026-11-23 01:18–01:40（+08:00），分 3 段完成（见 ① 环境事故）
- 浏览器：Playwright headless Chromium，viewport **1672×941**、DPR=**1**
- 账号：学生演示账号 **13800001001**；登录全程走 `/login` 正常 UI（`#preferred-role`=student → `#auth-phone` → 「获取验证码」→ **页面 `.demo-note` 显示的随机 6 位演示码** → 「安全登录」→ `/dialog`）
- 证据根：`evidence/live/run-03/data/`（`shots/` 59 张、`api/index.json`、`api/bodies/` 77 份响应原文、`scripts/`）
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
3. **01:34 由本组按 `.work/env-bringup.md` 记录的命令重启 API 8000**（`.venv\Scripts\python.exe run_server.py`，cwd=`services\api`，未改任何代码/配置），01:34:16 `/api/health` 恢复，随后完成题库参数与课件逐页补采。
4. 另：短信验证码槽位（同号码 60s 一条）与并行代理 `r03-guide` 共用手机号，期间出现多次 `AUTH_RATE_LIMITED retry_after=29..60`，采集脚本按 `retry_after` 等待后重试成功（未做任何绕过）。

---

## ② 逐页操作与请求清单

> 说明：下表由 `api/index.json` + `api/bodies/` 自动生成（`scripts/build_report.py`）。**响应条数**取 JSON 里 `items/total/…` 或顶层数组长度；`（×N）` 表示同一 URL 在本次采集的多个页面/轮次被重复请求（`index.json` 的 `seenIn` 字段保留了每次的页面与触发操作）。「原文文件」是 `api/bodies/` 下的完整响应原文。


> 本轮共采 **77** 个接口（其中 **GET 71** 个），`shots/` 共 **59** 张截图，`api/bodies/` 共 **77** 份响应原文。

### 登录页 /login（2 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 登录：获取验证码 / 安全登录 | `POST /api/auth/challenges/sms`（×11） | 200 | — | code=0；键=challenge_id,expires_in,retry_after,account_exists,demo_code | `POST_api_auth_challenges_sms.txt` |
| 登录：获取验证码 / 安全登录 | `POST /api/auth/login/sms`（×5） | 200 | — | code=0；键=access_token,expires_in,onboarding_required,user,identity_status | `POST_api_auth_login_sms.txt` |

### 登录后落地 /dialog（15 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 登录后落地 /dialog 首屏自动请求 | `GET /api/agent/conversations?limit=30`（×15） | 200 | 106 | code=0；items=30；total=106；item[0]键=id,title,activeRole,summary,messageCount,pinned | `GET_api_agent_conversations_limit_30.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/notifications?limit=30`（×64） | 200 | 0 | code=0；items=0 | `GET_api_notifications_limit_30.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/notifications/unread-count`（×64） | 200 | — | code=0；count=0 | `GET_api_notifications_unread-count.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/tasks?limit=30`（×64） | 200 | 0 | code=0；items=0 | `GET_api_tasks_limit_30.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/auth/me`（×26） | 200 | — | code=0；status=active | `GET_api_auth_me.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/growth/panel`（×15） | 200 | — | code=0；键=golden_window,today_actions,week_brief,encouragement,gaokao_countdown | `GET_api_student_growth_panel.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/assignments?status=todo&size=1`（×15） | 200 | 1 | code=0；items=1；total=1；item[0]键=assignment_id,title,type,deadline,status,progress | `GET_api_student_assignments_status_todo_size_1.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/agent/features`（×5） | 200 | — | code=0；键=features,capabilities | `GET_api_agent_features.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/mastery/summary`（×7） | 200 | — | code=0；键=radar,top_weak,hint_dependency,delta_vs_7d,updated_at | `GET_api_student_mastery_summary.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/error-records/due-queue`（×6） | 200 | 24 | code=0；items=24；total=24；item[0]键=record_id,seq,question_preview,kp_code,kp_name,created_at | `GET_api_student_error-records_due-queue.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/error-records/review-plan`（×5） | 200 | — | code=0；键=due_today,due_items,upcoming,total_active | `GET_api_student_error-records_review-plan.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/report/weak-points`（×7） | 200 | 4 | code=0；items=4；item[0]键=kp_code,kp_name,mastery,level,ai_reason,primary_action | `GET_api_student_report_weak-points.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/classroom-coursewares`（×19） | 200 | 1 | code=0；items=1；total=1；item[0]键=courseware_id,title,deck_id,deck_revision,class_id,class_name | `GET_api_student_classroom-coursewares.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/error-records?limit=1`（×15） | 200 | 24 | code=0；items=20；total=24；item[0]键=record_id,question_text,answer_text,error_type,kp_code,kp_name | `GET_api_student_error-records_limit_1.txt` |
| 登录后落地 /dialog 首屏自动请求 | `GET /api/student/growth/overview`（×21） | 200 | — | code=0；键=composite_score,score_delta_week,last_week_score,target_score,independent_rate,streak_days,error_total,error_due_count | `GET_api_student_growth_overview.txt` |

### 知识库 /library（13 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 进入 /library（默认「我的资料」Tab） | `GET /api/v1/kb/documents?kb_name=default&limit=200`（×4） | 200 | 4 | code=0；items=4；total=4；item[0]键=id,title,status,progress,page_count,chunk_count | `GET_api_v1_kb_documents_kb_name_default_limit_200.txt` |
| 进入 /library（默认「我的资料」Tab） | `GET /api/v1/questions?limit=1`（×4） | 200 | 24 | code=0；items=1；total=24；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_1.txt` |
| 点击 Tab「我的题库」→ 首次加载题库 | `GET /api/v1/questions?limit=30&offset=0`（×7） | 200 | 24 | code=0；items=24；total=24；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0.txt` |
| 我的题库 → 题型下拉选「选择题」 | `GET /api/v1/questions?limit=30&offset=0&q_type=choice`（×2） | 200 | 7 | code=0；items=7；total=7；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_type_choice.txt` |
| 我的题库 → 题型=选择题 && 难度 下拉选「基础」 | `GET /api/v1/questions?limit=30&offset=0&q_type=choice&difficulty=easy`（×2） | 200 | 5 | code=0；items=5；total=5；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_type_choice_difficulty_easy.txt` |
| 我的题库 → 难度 下拉选「压轴」（题型仍=选择题） | `GET /api/v1/questions?limit=30&offset=0&q_type=choice&difficulty=hard`（×2） | 200 | 1 | code=0；items=1；total=1；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_type_choice_difficulty_hard.txt` |
| 我的题库 → 题型重置为「全部题型」（难度仍=压轴） | `GET /api/v1/questions?limit=30&offset=0&difficulty=hard`（×2） | 200 | 2 | code=0；items=2；total=2；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_difficulty_hard.txt` |
| 我的题库 → 搜索框输入「函数」（防抖后触发） | `GET /api/v1/questions?limit=30&offset=0&q=%E5%87%BD%E6%95%B0` | 200 | 14 | code=0；items=14；total=14；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_E5_87_BD_E6_95_B0.txt` |
| 我的题库 → 搜索框输入「导数」（防抖后触发） | `GET /api/v1/questions?limit=30&offset=0&q=%E5%AF%BC%E6%95%B0` | 200 | 6 | code=0；items=6；total=6；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_E5_AF_BC_E6_95_B0.txt` |
| 我的题库 → 点击第一张题卡（打开题目详情抽屉） | `GET /api/v1/questions/2d2021e7-3739-4a69-992a-50d60ae97ad7` | 200 | — | code=0；键=id,stem,q_type,options,answer,analysis,difficulty,source | `GET_api_v1_questions_2d2021e7-3739-4a69-992a-50d60ae97ad7.txt` |
| 我的题库 → 题型下拉选「填空题」 | `GET /api/v1/questions?limit=30&offset=0&q_type=blank` | 200 | 11 | code=0；items=11；total=11；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_type_blank.txt` |
| 我的题库 → 题型下拉选「解答题」 | `GET /api/v1/questions?limit=30&offset=0&q_type=solution` | 200 | 6 | code=0；items=6；total=6；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_q_type_solution.txt` |
| 我的题库 → 难度下拉选「进阶」(medium) | `GET /api/v1/questions?limit=30&offset=0&difficulty=medium` | 200 | 8 | code=0；items=8；total=8；item[0]键=id,stem,q_type,difficulty,source,kp_codes | `GET_api_v1_questions_limit_30_offset_0_difficulty_medium.txt` |

### 资源中心 /resources（9 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 进入 /resources（默认「为你推荐」模式：装填分类 + POST 推荐流） | `POST /api/auth/token/refresh`（×10） | 200 | — | code=0；键=access_token,expires_in,active_role | `POST_api_auth_token_refresh.txt` |
| 进入 /resources（默认「为你推荐」模式：装填分类 + POST 推荐流） | `GET /api/student/videos?page_size=1` | 200 | 12 | code=0；items=12；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_page_size_1.txt` |
| 进入 /resources（默认「为你推荐」模式：装填分类 + POST 推荐流） | `POST /api/student/videos/recommend` | 200 | 11 | code=0；items=11；item[0]键=bvid,title,author,author_avatar,cover,duration | `POST_api_student_videos_recommend.txt` |
| 点击「🧭 按知识点浏览」Tab | `GET /api/student/videos?topic=featured&page_size=12`（×2） | 200 | 12 | code=0；items=12；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_topic_featured_page_size_12.txt` |
| 按知识点浏览 → 点击分类 chip「📈 函数与导数」 | `GET /api/student/videos?topic=function&page_size=12` | 200 | 11 | code=0；items=11；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_topic_function_page_size_12.txt` |
| 按知识点浏览 → 点击分类 chip「🌊 三角函数」 | `GET /api/student/videos?topic=trig&page_size=12` | 200 | 10 | code=0；items=10；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_topic_trig_page_size_12.txt` |
| 按知识点浏览 → 点击分类 chip「🔢 数列」 | `GET /api/student/videos?topic=sequence&page_size=12` | 200 | 12 | code=0；items=12；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_topic_sequence_page_size_12.txt` |
| 资源中心 → 搜索框输入「数列求和」并回车（keyword 检索） | `GET /api/student/videos?keyword=%E6%95%B0%E5%88%97%E6%B1%82%E5%92%8C&page_size=12` | 200 | 11 | code=0；items=11；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_keyword_E6_95_B0_E5_88_97_E6_B1_82_E5_92_8C_page_size_12.txt` |
| 资源中心 → 点击「↻ 刷新」 | `GET /api/student/videos?topic=custom&page_size=12` | 200 | 12 | code=0；items=12；topics=9；item[0]键=bvid,title,author,author_avatar,cover,duration | `GET_api_student_videos_topic_custom_page_size_12.txt` |

### 错题 /errors（13 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | `GET /api/student/error-records/memory-heatmap` | 200 | — | code=0；cells=28 | `GET_api_student_error-records_memory-heatmap.txt` |
| 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | `GET /api/student/error-records/filter?page=1&size=50`（×6） | 200 | 24 | code=0；items=24；total=24；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50.txt` |
| 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | `GET /api/student/error-records/46e56349-c46e-4305-a002-348d9b1c288c/detail` | 200 | — | code=0；键=record_id,question_text,image,file_id,answer_text,error_type,kp_code,kp_name | `GET_api_student_error-records_46e56349-c46e-4305-a002-348d9b1c288c_detail.txt` |
| 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | `GET /api/butler/error-detail/46e56349-c46e-4305-a002-348d9b1c288c` | 200 | — | code=0；键=record_id,kp_code,kp_name,error_type,subtype,subtype_zh,question_text,student_answer | `GET_api_butler_error-detail_46e56349-c46e-4305-a002-348d9b1c288c.txt` |
| 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | `GET /api/butler/error-diagnosis/46e56349-c46e-4305-a002-348d9b1c288c` | 200 | — | code=0；键=record_id,error_type,subtype,subtype_zh,kp_code,kp_name,diagnosis | `GET_api_butler_error-diagnosis_46e56349-c46e-4305-a002-348d9b1c288c.txt` |
| 错题页 → Tab「按错因」下点击维度值「概念不清」 | `GET /api/student/error-records/filter?page=1&size=50&error_type=concept` | 200 | 4 | code=0；items=4；total=4；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_error_type_concept.txt` |
| 错题页 → Tab「按错因」下点击维度值「计算失误」 | `GET /api/student/error-records/filter?page=1&size=50&error_type=calculation` | 200 | 6 | code=0；items=6；total=6；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_error_type_calculation.txt` |
| 错题页 → Tab「按知识点」下点击维度值「圆锥曲线」 | `GET /api/student/error-records/filter?page=1&size=50&kp_code=JH-02` | 200 | 2 | code=0；items=2；total=2；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_kp_code_JH-02.txt` |
| 错题页 → Tab「按知识点」下点击维度值「导数的运算法则与复合求导」 | `GET /api/student/error-records/filter?page=1&size=50&kp_code=DR-02` | 200 | 4 | code=0；items=4；total=4；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_kp_code_DR-02.txt` |
| 错题页 → Tab「按时间」下点击维度值「近 7 天」 | `GET /api/student/error-records/filter?page=1&size=50&date_from=2026-11-15` | 200 | 2 | code=0；items=2；total=2；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_date_from_2026-11-15.txt` |
| 错题页 → Tab「按时间」下点击维度值「近 30 天」 | `GET /api/student/error-records/filter?page=1&size=50&date_from=2026-10-23` | 200 | 17 | code=0；items=17；total=17；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_date_from_2026-10-23.txt` |
| 错题页 → Tab「按遗忘风险」下点击维度值「稳定区」 | `GET /api/student/error-records/filter?page=1&size=50&stability=stable` | 200 | 2 | code=0；items=2；total=2；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_stability_stable.txt` |
| 错题页 → Tab「按遗忘风险」下点击维度值「衰减中」 | `GET /api/student/error-records/filter?page=1&size=50&stability=decaying` | 200 | 5 | code=0；items=5；total=5；item[0]键=record_id,question_preview,error_type,kp_code,kp_name,created_at | `GET_api_student_error-records_filter_page_1_size_50_stability_decaying.txt` |

### 课堂 /classroom（12 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 进入 /classroom（默认「课堂任务」Tab：作业列表 + 老师课件 + 我的班级） | `GET /api/classes/mine`（×3） | 200 | 1 | code=0；items=1；total=1；item[0]键=id,name,grade,myRole,confirmed,isOwner | `GET_api_classes_mine.txt` |
| 进入 /classroom（默认「课堂任务」Tab：作业列表 + 老师课件 + 我的班级） | `GET /api/student/assignments?status=all&page=1&size=50`（×2） | 200 | 2 | code=0；items=2；total=2；item[0]键=assignment_id,title,type,deadline,status,progress | `GET_api_student_assignments_status_all_page_1_size_50.txt` |
| 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/hot-errors?days=30&limit=5` | 200 | 5 | code=0；items=5；item[0]键=kp_code,kp_name,error_count,member_count,top_error_type | `GET_api_classes_039bcfc5-eb65-41a0-8840-ae3e361544b2_hot-errors_days_30_limit_5.txt` |
| 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/members` | 200 | 6 | code=0；items=6；total=6；item[0]键=id,userId,memberRole,confirmed,joinVia,nicknameInClass | `GET_api_classes_039bcfc5-eb65-41a0-8840-ae3e361544b2_members.txt` |
| 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/feed` | 200 | 0 | code=0；items=0 | `GET_api_classes_039bcfc5-eb65-41a0-8840-ae3e361544b2_feed.txt` |
| 点击「🎬 双师课堂」Tab（老师课堂课件列表 + 最近课堂 /classroom/sessions） | `GET /api/classroom/sessions?limit=5`（×2） | 200 | 1 | code=0；items=1；total=1；item[0]键=session_id,course_id,title,mode,slide_count,status | `GET_api_classroom_sessions_limit_5.txt` |
| 双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>） | `POST /api/student/classroom-coursewares/6baf153d-f2e7-440e-a703-cc08a8ae06e4/open`（×2） | 200 | — | code=0；键=session_id,title | `POST_api_student_classroom-coursewares_6baf153d-f2e7-440e-a703-cc08a8ae06e4_open.txt` |
| 双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>） | `GET /api/classroom/sessions/5304e914-edb1-47d2-b0db-7cbb804bcd86`（×2） | 200 | — | code=0；slides=5；outlines=5；slide_count=5；status=ready | `GET_api_classroom_sessions_5304e914-edb1-47d2-b0db-7cbb804bcd86.txt` |
| 双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>） | `GET /api/classroom/sessions?limit=50`（×2） | 200 | 1 | code=0；items=1；total=1；item[0]键=session_id,course_id,title,mode,slide_count,status | `GET_api_classroom_sessions_limit_50.txt` |
| 播放页 → 点击「下一页」（翻到第 2 页，触发 slide_index 进度上报） | `PATCH /api/classroom/sessions/5304e914-edb1-47d2-b0db-7cbb804bcd86/progress`（×9） | 200 | — | code=0；键=progress | `PATCH_api_classroom_sessions_5304e914-edb1-47d2-b0db-7cbb804bcd86_progress.txt` |
| 课堂任务（已完成）→ 点击「↻ 查看作答」（/tasks/:id 作业作答页：详情 + 结果反馈） | `GET /api/student/assignments/a9107e51-d407-4299-8791-0d1b22cb3ca6` | 200 | 5 | code=0；items=5；status=published；item[0]键=item_no,q_type,interaction_type,question_text,options,kp_code | `GET_api_student_assignments_a9107e51-d407-4299-8791-0d1b22cb3ca6.txt` |
| 课堂任务（已完成）→ 点击「↻ 查看作答」（/tasks/:id 作业作答页：详情 + 结果反馈） | `GET /api/student/assignments/a9107e51-d407-4299-8791-0d1b22cb3ca6/result` | 200 | 5 | code=0；items=5；status=graded；total_score=30.0；item[0]键=submission_item_id,item_no,answer_text,file_id,attachments,status | `GET_api_student_assignments_a9107e51-d407-4299-8791-0d1b22cb3ca6_result.txt` |

### 我的 /me（13 个接口）

| 操作（触发） | 请求 | HTTP | 响应条数 | 关键字段 | 原文文件 |
|---|---|---|---|---|---|
| 进入 /me（默认「学情报告」Tab） | `GET /api/butler/weekly-report`（×2） | 200 | — | code=0；键=narrative,data | `GET_api_butler_weekly-report.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/report/highlights`（×2） | 200 | 2 | code=0；items=2；item[0]键=icon,title,desc | `GET_api_student_report_highlights.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/mastery/today-actions`（×2） | 200 | — | code=0；键=actions,notice,due_today,generated_at | `GET_api_student_mastery_today-actions.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/mastery/trend?days=30`（×2） | 200 | — | code=0；键=points | `GET_api_student_mastery_trend_days_30.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/report/mastery-trend-forecast?days=14`（×2） | 200 | — | code=0；键=history,forecast | `GET_api_student_report_mastery-trend-forecast_days_14.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/report/error-distribution`（×2） | 200 | 24 | code=0；items=8；total=24；item[0]键=type,type_zh,count,ratio,parent_type | `GET_api_student_report_error-distribution.txt` |
| 进入 /me（默认「学情报告」Tab） | `GET /api/student/report/honesty`（×2） | 200 | — | code=0；键=hint_count_week,independent_rate_now,independent_rate_prev,fluctuation,message,suggestion | `GET_api_student_report_honesty.txt` |
| 我的 → 切换 Tab「掌握地图」 | `GET /api/student/knowledge-graph/tree`（×2） | 200 | — | code=0；键=chapters | `GET_api_student_knowledge-graph_tree.txt` |
| 我的 → 切换 Tab「掌握地图」 | `GET /api/student/knowledge-graph/pie`（×2） | 200 | 407 | code=0；total=407 | `GET_api_student_knowledge-graph_pie.txt` |
| 我的 → 切换 Tab「掌握地图」 | `GET /api/student/knowledge-graph/nodes/MATH-001/recommend`（×2） | 200 | — | code=0；键=strategy,reason,action_label,route,minutes | `GET_api_student_knowledge-graph_nodes_MATH-001_recommend.txt` |
| 我的 → 切换 Tab「掌握地图」 | `GET /api/student/knowledge-graph/nodes/MATH-001/deps`（×2） | 200 | — | code=0；键=kp_code,chain,weakest_prereq | `GET_api_student_knowledge-graph_nodes_MATH-001_deps.txt` |
| 我的 → 切换 Tab「掌握地图」 | `GET /api/student/knowledge-graph/nodes/MATH-001/errors`（×2） | 200 | 0 | code=0；items=0；total=0 | `GET_api_student_knowledge-graph_nodes_MATH-001_errors.txt` |
| 我的 → 切换 Tab「体验反馈」 | `GET /api/api/trial/metrics` | 404 | — | 键=detail | `GET_api_api_trial_metrics.txt` |

### GET /api/... 去重清单（method + path + query）

| # | 请求 | 页面 | 触发操作 | HTTP |
|---|---|---|---|---|
| 1 | `GET /api/agent/conversations?limit=30` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 2 | `GET /api/agent/features` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 3 | `GET /api/auth/me` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 4 | `GET /api/notifications?limit=30` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 5 | `GET /api/notifications/unread-count` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 6 | `GET /api/student/assignments?status=todo&size=1` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 7 | `GET /api/student/classroom-coursewares` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 8 | `GET /api/student/error-records?limit=1` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 9 | `GET /api/student/error-records/due-queue` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 10 | `GET /api/student/error-records/review-plan` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 11 | `GET /api/student/growth/overview` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 12 | `GET /api/student/growth/panel` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 13 | `GET /api/student/mastery/summary` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 14 | `GET /api/student/report/weak-points` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 15 | `GET /api/tasks?limit=30` | dialog | 登录后落地 /dialog 首屏自动请求 | 200 |
| 16 | `GET /api/v1/kb/documents?kb_name=default&limit=200` | library | 进入 /library（默认「我的资料」Tab） | 200 |
| 17 | `GET /api/v1/questions?limit=1` | library | 进入 /library（默认「我的资料」Tab） | 200 |
| 18 | `GET /api/v1/questions?limit=30&offset=0` | library | 点击 Tab「我的题库」→ 首次加载题库 | 200 |
| 19 | `GET /api/v1/questions?limit=30&offset=0&q_type=choice` | library | 我的题库 → 题型下拉选「选择题」 | 200 |
| 20 | `GET /api/v1/questions?limit=30&offset=0&q_type=choice&difficulty=easy` | library | 我的题库 → 题型=选择题 && 难度 下拉选「基础」 | 200 |
| 21 | `GET /api/v1/questions?limit=30&offset=0&q_type=choice&difficulty=hard` | library | 我的题库 → 难度 下拉选「压轴」（题型仍=选择题） | 200 |
| 22 | `GET /api/v1/questions?limit=30&offset=0&difficulty=hard` | library | 我的题库 → 题型重置为「全部题型」（难度仍=压轴） | 200 |
| 23 | `GET /api/v1/questions?limit=30&offset=0&q=%E5%87%BD%E6%95%B0` | library | 我的题库 → 搜索框输入「函数」（防抖后触发） | 200 |
| 24 | `GET /api/v1/questions?limit=30&offset=0&q=%E5%AF%BC%E6%95%B0` | library | 我的题库 → 搜索框输入「导数」（防抖后触发） | 200 |
| 25 | `GET /api/v1/questions?limit=30&offset=0&q_type=blank` | library | 我的题库 → 题型下拉选「填空题」 | 200 |
| 26 | `GET /api/v1/questions?limit=30&offset=0&q_type=solution` | library | 我的题库 → 题型下拉选「解答题」 | 200 |
| 27 | `GET /api/v1/questions?limit=30&offset=0&difficulty=medium` | library | 我的题库 → 难度下拉选「进阶」(medium) | 200 |
| 28 | `GET /api/v1/questions/2d2021e7-3739-4a69-992a-50d60ae97ad7` | library | 我的题库 → 点击第一张题卡（打开题目详情抽屉） | 200 |
| 29 | `GET /api/student/videos?page_size=1` | resources | 进入 /resources（默认「为你推荐」模式：装填分类 + POST 推荐流） | 200 |
| 30 | `GET /api/student/videos?topic=featured&page_size=12` | resources | 点击「🧭 按知识点浏览」Tab | 200 |
| 31 | `GET /api/student/videos?topic=function&page_size=12` | resources | 按知识点浏览 → 点击分类 chip「📈 函数与导数」 | 200 |
| 32 | `GET /api/student/videos?topic=trig&page_size=12` | resources | 按知识点浏览 → 点击分类 chip「🌊 三角函数」 | 200 |
| 33 | `GET /api/student/videos?topic=sequence&page_size=12` | resources | 按知识点浏览 → 点击分类 chip「🔢 数列」 | 200 |
| 34 | `GET /api/student/videos?keyword=%E6%95%B0%E5%88%97%E6%B1%82%E5%92%8C&page_size=12` | resources | 资源中心 → 搜索框输入「数列求和」并回车（keyword 检索） | 200 |
| 35 | `GET /api/student/videos?topic=custom&page_size=12` | resources | 资源中心 → 点击「↻ 刷新」 | 200 |
| 36 | `GET /api/butler/error-detail/46e56349-c46e-4305-a002-348d9b1c288c` | errors | 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | 200 |
| 37 | `GET /api/butler/error-diagnosis/46e56349-c46e-4305-a002-348d9b1c288c` | errors | 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | 200 |
| 38 | `GET /api/student/error-records/46e56349-c46e-4305-a002-348d9b1c288c/detail` | errors | 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | 200 |
| 39 | `GET /api/student/error-records/filter?page=1&size=50` | errors | 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | 200 |
| 40 | `GET /api/student/error-records/filter?page=1&size=50&error_type=concept` | errors | 错题页 → Tab「按错因」下点击维度值「概念不清」 | 200 |
| 41 | `GET /api/student/error-records/filter?page=1&size=50&error_type=calculation` | errors | 错题页 → Tab「按错因」下点击维度值「计算失误」 | 200 |
| 42 | `GET /api/student/error-records/filter?page=1&size=50&kp_code=JH-02` | errors | 错题页 → Tab「按知识点」下点击维度值「圆锥曲线」 | 200 |
| 43 | `GET /api/student/error-records/filter?page=1&size=50&kp_code=DR-02` | errors | 错题页 → Tab「按知识点」下点击维度值「导数的运算法则与复合求导」 | 200 |
| 44 | `GET /api/student/error-records/filter?page=1&size=50&date_from=2026-11-15` | errors | 错题页 → Tab「按时间」下点击维度值「近 7 天」 | 200 |
| 45 | `GET /api/student/error-records/filter?page=1&size=50&date_from=2026-10-23` | errors | 错题页 → Tab「按时间」下点击维度值「近 30 天」 | 200 |
| 46 | `GET /api/student/error-records/filter?page=1&size=50&stability=stable` | errors | 错题页 → Tab「按遗忘风险」下点击维度值「稳定区」 | 200 |
| 47 | `GET /api/student/error-records/filter?page=1&size=50&stability=decaying` | errors | 错题页 → Tab「按遗忘风险」下点击维度值「衰减中」 | 200 |
| 48 | `GET /api/student/error-records/memory-heatmap` | errors | 进入 /errors（热力图 + 到期队列 + 筛选列表；自动弹出首题详情浮窗） | 200 |
| 49 | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/feed` | classroom | 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | 200 |
| 50 | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/hot-errors?days=30&limit=5` | classroom | 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | 200 |
| 51 | `GET /api/classes/039bcfc5-eb65-41a0-8840-ae3e361544b2/members` | classroom | 点击「🏫 我的班级」Tab（/classes/mine → 成员/动态/热门错题） | 200 |
| 52 | `GET /api/classes/mine` | classroom | 进入 /classroom（默认「课堂任务」Tab：作业列表 + 老师课件 + 我的班级） | 200 |
| 53 | `GET /api/classroom/sessions?limit=5` | classroom | 点击「🎬 双师课堂」Tab（老师课堂课件列表 + 最近课堂 /classroom/sessions） | 200 |
| 54 | `GET /api/classroom/sessions?limit=50` | classroom | 双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>） | 200 |
| 55 | `GET /api/classroom/sessions/5304e914-edb1-47d2-b0db-7cbb804bcd86` | classroom | 双师课堂 → 点击老师课件卡《函数的单调性：从图像到导数》（POST open 建课堂会话 → 跳 /dual/<sid>） | 200 |
| 56 | `GET /api/student/assignments?status=all&page=1&size=50` | classroom | 进入 /classroom（默认「课堂任务」Tab：作业列表 + 老师课件 + 我的班级） | 200 |
| 57 | `GET /api/student/assignments/a9107e51-d407-4299-8791-0d1b22cb3ca6` | classroom | 课堂任务（已完成）→ 点击「↻ 查看作答」（/tasks/:id 作业作答页：详情 + 结果反馈） | 200 |
| 58 | `GET /api/student/assignments/a9107e51-d407-4299-8791-0d1b22cb3ca6/result` | classroom | 课堂任务（已完成）→ 点击「↻ 查看作答」（/tasks/:id 作业作答页：详情 + 结果反馈） | 200 |
| 59 | `GET /api/api/trial/metrics` | me | 我的 → 切换 Tab「体验反馈」 | 404 |
| 60 | `GET /api/butler/weekly-report` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 61 | `GET /api/student/knowledge-graph/nodes/MATH-001/deps` | me | 我的 → 切换 Tab「掌握地图」 | 200 |
| 62 | `GET /api/student/knowledge-graph/nodes/MATH-001/errors` | me | 我的 → 切换 Tab「掌握地图」 | 200 |
| 63 | `GET /api/student/knowledge-graph/nodes/MATH-001/recommend` | me | 我的 → 切换 Tab「掌握地图」 | 200 |
| 64 | `GET /api/student/knowledge-graph/pie` | me | 我的 → 切换 Tab「掌握地图」 | 200 |
| 65 | `GET /api/student/knowledge-graph/tree` | me | 我的 → 切换 Tab「掌握地图」 | 200 |
| 66 | `GET /api/student/mastery/today-actions` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 67 | `GET /api/student/mastery/trend?days=30` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 68 | `GET /api/student/report/error-distribution` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 69 | `GET /api/student/report/highlights` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 70 | `GET /api/student/report/honesty` | me | 进入 /me（默认「学情报告」Tab） | 200 |
| 71 | `GET /api/student/report/mastery-trend-forecast?days=14` | me | 进入 /me（默认「学情报告」Tab） | 200 |

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
python evidence\live\run-03\data\scripts\r03_capture.py library2 play
#    其它阶段：library / library3 / resources / errors / classroom / me
# 3) 汇总表格
python evidence\live\run-03\data\scripts\build_report.py
```

- 脚本内已处理：短信频控（按响应体 `retry_after` 等待重试）、页面崩溃（`page.on('crash')` 记录）、响应去重（同一 `METHOD path?query` 只落一份原文 + `seenIn`）。
- `run-retry.ps1` 为带重试的包装（宿主可能清理长时间无交互进程）。

## 附录 B · 文件清单

- `api/index.json`：`{ "<METHOD> <path>?<query>": {url,status,ct,file,bytes,page,trigger,seenIn} }`
- `api/bodies/*.txt`：逐响应原文（UTF-8，未做任何改写）
- `shots/*.png`：50 张（每页/关键态一张；课件 5 页逐页一张 + 播放/停止讲解各一张）
- `scripts/`：`r03_capture.py`、`build_report.py`、`run-retry.ps1`
