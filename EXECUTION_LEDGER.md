# Mathesis 离线演示项目 · 执行账本

> 本文件是跨会话/跨子代理的执行账本。中断续跑先读本文件。
> 依据：`D:\zxsy-math-arena\docs\superpowers\plans\2026-11-21-offline-showcase.md`（主方案）、`2026-11-21-guided-solving-cases.md`（三题手册）。
> 模式：PROTOTYPE_ONLY。原系统只用于取证；所有展示改动落在本目录。

## 现场基线（2026-11-21）

| 项 | 值 |
|---|---|
| 原仓 | `D:\zxsy-math-arena`，分支 `main`，HEAD `fa4aed6` |
| 原仓未提交差异 | 仅 `docs/superpowers/`（本轮方案，untracked）；无其它脏改动 |
| 工具 | Node 22.23.2 / pnpm 9.0.0 / Docker 29.6.2 / Python 3.13.5；**uv 不在 PATH，使用各服务 .venv** |
| 服务端口 | 前端 5176 / API 8000 / 教师 8100 / PPT 8200 / Presenton 8201 / 科研 8300 |
| 演示登录 | SMS provider=demo，allowlist 号码见根 `.env`，验证码 `123456` |
| 模型 | 方舟 `https://ark.cn-beijing.volces.com/api/coding/v3`；`deepseek-v4.1-flash` 文本已验证；仓库根 .env 已指向方舟 `/api/plan/v3` |
| 三题原图 | `docs/superpowers/plans/题1.png`(A) / `题2.png`(B) / `题3.png`(C)，SHA-256 与手册一致 |

## 派单台账（2026-11-21 02:10–02:40）

| 编号 | 任务 | 代理 | 输入范围 | 允许写 | 状态 | 产出 | 审查人 | 结论 |
|---|---|---|---|---|---|---|---|---|
| T01 | 独立盲解三题 #1 | solver-1 | 仅三张图（干净上下文） | evidence/solutions/blind/solver-1 | 已回 | solutions.md（SHA CBE9…） | lead | A=D、B=BD、C=61/25 ✅ |
| T02 | 独立盲解三题 #2 | solver-2 | 仅三张图（干净上下文） | evidence/solutions/blind/solver-2 | 已回 | solutions.md（SHA FECC…） | lead | 同上，2/2 一致 ✅ |
| T03 | 启动现役系统 + 三端真实入口 + 三题实传 | runtime-collector | 原仓只读 + 本项目 | .work、inventory、evidence/live/run-01 | 进行中（A 主线+求助分支、B 主线已采；C 待采） | routes.csv 24KB、entry-summary.md、100+ 截图、逐轮图 | lead | 待回 |
| T04 | 学生练习/错题/知识库/资源（+ MeView） | student-practice | 本项目 | PracticeView/ErrorsView/LibraryView/ResourcesView/MeView、data/practice.js、data/library.js、qa/student-practice | 已回 | 5 页 + 29 截图 + REPORT | lead + 独立验收 | 33/33 自测、20/20 数学复算 ✅（P1 practice 白屏已由该代理修复） |
| T05 | 学生课堂/双师课堂 | student-classroom | 本项目 | ClassroomView/DualView、data/classroom.js、qa/student-classroom | 已回 | 3 Tab + 沉浸双师 + 18 截图 + REPORT | lead + 独立验收 | 48/48 自测、发布/批改/进度跨端契约实测 ✅ |
| T06 | 教师备课中心/PPT/教案/发布/导出 | teacher-prep | 本项目 | PrepCenter/PrepHistory/PrepWorkbench、components/teacher/prep、qa/teacher-prep | 已回 | 三课时 + 22 截图 + 6 产物 + REPORT | lead + 独立验收 | E2E 69/69、产物 38/38、参数联动 c=4/e=0.8 ✅ |
| T07 | 教师批改/课堂监测/学情/题库/资源 | teacher-grading | 本项目 | GradingView/TeacherClassroom/TeacherInsights/TeacherBank/TeacherAssign/TeacherResources、qa/teacher-grading | 已回 | 6 页 + 18 截图 + REPORT | lead + 独立验收 | 86/86 断言、build PASS ✅ |
| T08 | 科研端三场景（阅读溯源/公式检查/写作编译） | research-end → research-ui | 本项目 | data/research.js（99KB 数据已完成）、pages | 进行中（research-ui 接管页面） | 数据层 + 黄金图区域分析 | lead + 独立验收 | data 语法 P0 已由 lead 修复；页面实现进行中 |
| T09 | 数学与内容独立评审 | review-math | 只读 | qa/review-math | 进行中 | REPORT.md | lead | 待回 |
| T10 | 视觉独立评审 | review-visual | 只读 | qa/review-visual | 进行中 | REPORT.md | lead | 待回 |
| T11 | G2 跨端全场景真实取证 | runtime-collector | 原仓只读 | evidence/live/run-01/{teacher,research,student} | 进行中（科研 read/笔记、作业发布实拍已回） | G2-SUMMARY.md | lead | 待回 |

## G0 结论（已完成）

- 现役系统：五服务全部实测启动（API 8000 / 教师 8100 / PPT 8200 / Presenton 8201 / 科研 8300 / 前端 5176），迁移到 head，健康检查通过。
- 三端入口：以 run-01 正常登录实测为准，见 `inventory/entry-summary.md` 与 `inventory/routes.csv`（学生 V4 学生壳 7 项导航；教师 V3 工作台 6 项；科研 RV17 Research Workspace 启动页 + 项目 read/write）。
- 数学基准：两名干净上下文解题者盲解，结论与三题手册 3/3 一致，已封存 `evidence/solutions/sealed/math-baseline.{md,json}`（2026-11-21 02:15）。
- 现役缺陷（已留证）：根 `.env` 方舟 `/api/plan/v3` 与 `/api/v3` 端点不可用 → 主控实测 `/api/coding/v3` 可用（文本+视觉），采集组已修复配置并验证 AI smoke；教师备课 AI 生成仍出现“AI 服务暂时不可用”失败态（teacher-13-prep-workspace.png）。

## 场景实现分工（写作用域，避免争用）

- 共享契约（lead 维护，实现方只读）：`src/router.js`、`src/shells/**`、`src/state/demo.js`、`src/styles/*.css`、`src/lib/**`、`src/data/courseware.js`、`src/data/submissions.js`。
- 学生练习组：PracticeView / ErrorsView / LibraryView / ResourcesView / MeView + data/practice.js + data/library.js + components/student/(练习相关)。
- 学生课堂组：ClassroomView / DualView + data/classroom.js + components/student/classroom/**。
- 教师备课组：PrepCenter / PrepHistory / PrepWorkbench + components/teacher/prep/**。
- 教师批改组：GradingView / TeacherAssign / TeacherClassroom / TeacherInsights / TeacherBank / TeacherResources + components/teacher/grading/**。
- 科研组：ResearchHome / ResearchRead / ResearchWrite + data/research.js + components/research/**。
- 端口分配：5201/5202/5203/5204/5205；各自 `pnpm exec vite build --outDir dist-<name>`，不写 release/。

## 验收与交付状态（2026-11-21 05:00 最终）

- **最终发行包**：`release\开始演示.html`，构建 2026-11-21 04:56，SHA-256 `A188CA2149A72076B9DECABC3FAD6D0D7580B9FDFC813355AA3D821EDA66A0F5`，6,376,184 B；随包 `素材\`（3 原题图 + 3 答卷 + SHA256 清单）、`产物\`（16 个真实导出 PPTX/DOCX/PDF/MD）、`主持人手册.md`、`验收矩阵.csv`、`README-启动说明.txt`。
- **主控离线验收**：`qa/acceptance_offline.py` → **37/37 PASS**（断网冷启动、文件选择器上传、三题正确/错答/求助、乱序/改名/重名异图、连点/返回重进、教师改页发布→学生同页、版本隔离、批改→学生回看、科研阅读/公式/写作编译、0 http(s) 请求、0 console error、PPTX/DOCX/PDF/科研 PDF 实际打开）。
- **最终修复复核**：`qa/final_check.py` → **10/10 PASS**（B1 引导页锁定一屏/聊天区内部滚动/结论卡在视口内；B2 结论标题无裸 LaTeX；M1 无双浮标；功能 M1 导出/发布/学生双看均含参数派生；PPTX/PDF 公式为 Unicode）。
- **独立评审**：
  - review-math：首轮 12 FAIL → 主控修复 → 复验 4 项残留 → 修复 → 本轮修复复核（变式严格判分、B 否定式、A 收束两段式、答卷字形、二次/椭圆参数同源、容差、C 补事件、来源标注）。
  - review-visual：2 BLOCKER（B1/B2）+ 5 MAJOR → 已修复 B1/B2/M1，M2–M5 登记 ACCEPTED-DEVIATION（CUR-016~019）；待最终包收口复验。
  - review-functional：166/166 断言 PASS、0 BLOCKER、1 MAJOR（导出未含参数派生）→ 已修复并加入验收；待最终包收口复验。
- **多分辨率**：1440×900 与 1920×1080 下学生首页/教师工作台/科研阅读均无横向溢出、无 pageerror（`qa/explore/res-*.png`）。
- **证据目录**：`evidence/README.md`；`evidence/showcase/` 收录发行包运行截图 123 张；`evidence/curation.csv` + `evidence/curation-g2.csv` 共 26 条修订记录。

- 发行包：`release\开始演示.html`（单文件，全资源内联；SHA-256 见最终验收记录），随包 `素材\`、`产物\`、`主持人手册.md`、`验收矩阵.csv`。
- 主控离线验收：`python qa/acceptance_offline.py` → **37/37 PASS**（断网冷启动、文件选择器上传、三题正确/错答/求助、乱序/改名/重名异图、连点/返回重进、教师改页发布→学生同页、版本隔离、批改→学生回看、科研阅读/公式/写作编译、0 网络请求、0 console error、PPTX/DOCX/PDF/科研 PDF 实际打开校验）。
- 独立评审：数学与内容评审（review-math）首轮 12 FAIL → 已按 P0/P1 修复并送复验；视觉评审（review-visual）、功能验收（review-functional）进行中。
- 验收矩阵：`qa/acceptance.csv`（25 行，按场景×样本填写真实尝试/展示结果/证据/产物/断网/裁决）。
- 证据目录：`evidence/README.md` 说明结构；`evidence/showcase/` 收录发行包运行截图 123 张。

## 最终裁决（2026-11-21 05:05）

| 独立评审 | 结果 |
|---|---|
| review-math（数学/内容） | 首轮 12 FAIL → 修复 → 复验 4 项残留 → 修复；数学基准 A=e=2√2/D、B={B,D}、C=61/25 全流程复核一致；变式/否定式/收束/字形/同源问题关闭 |
| review-visual（视觉） | 收口包 `A188CA21…`：**B1/B2/M1 已消除，0 BLOCKER / 0 MAJOR，VERDICT = 可交付**（M2–M5 登记 ACCEPTED-DEVIATION，CUR-016~019） |
| review-functional（功能/产物） | 收口包：**M1 已关闭，BLOCKER=0、MAJOR=0，38/38 收口断言、累计 204 项通过，VERDICT = 可交付**；断网 0 外呼、0 console error、0 pageerror |

**最终交付**：`release/开始演示.html`（04:56 构建，SHA-256 `A188CA2149A72076B9DECABC3FAD6D0D7580B9FDFC813355AA3D821EDA66A0F5`，6,376,184 B；复制到全新路径后冷启动 0 网络请求、0 页面错误、登录页正常）。

1. 视觉/功能独立评审尚在收口中；若报 BLOCKER 需返工后重打包。
2. 授权教材切片缺源、外部视频未随包：已在页面与手册如实标注（非阻塞）。
3. 平台实测缺陷均以策展改写/补制处理，原始证据保留；展示版不宣称原系统已修复。
