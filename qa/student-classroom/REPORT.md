# 学生端 · 课堂 / 双师课堂 · 验收报告

- 项目：`D:\zxsy-math-arena-showcase`（PROTOTYPE_ONLY 离线展示版）
- 范围：学生端「课堂」三 Tab（课堂任务 / 我的班级 / 双师课堂）与双师课堂播放页 `/student/dual/:sessionId`
- 运行：`pnpm dev --port 5202`（Vite 5.4.21，实际监听 `http://127.0.0.1:5202/`），Chromium headless，viewport **1672×941 DPR 1**
- 构建：`pnpm exec vite build --outDir dist-student-classroom` → **成功（exit 0）**
- QA 脚本：`qa/student-classroom/qa_student_classroom.py`（Python Playwright，可复跑）
- 机器可读结果：`qa/student-classroom/qa-result.json`

## 1. 结果

| 项 | 结果 |
|---|---|
| 功能自测（Playwright） | **48 / 48 PASS**（0 console error / pageerror，fetch+XHR 网络计数 0） |
| 生产构建 | **PASS**（exit 0，输出 `dist-student-classroom/`） |
| 截图证据 | 本目录 19 张，全部 1672×941 DPR 1 |
| 禁止文件 | 未修改（见 §5） |

## 2. 跨端契约验证结论（只读教师端写入，学生端按契约消费）

### 2.1 发布记录 → 学生可见（`store.teacher.publish.records`）

- 读取字段：`id, deckId, deckTitle, className, version, publishedAt, slides, meta, editor`；播放页**只渲染 `record.slides`（发布时深拷贝快照）**，不重新读取 `courseware.js`。
- 验证方法：QA 用 localStorage 注入两条记录（同一 `deckId='deck-ellipse'` 的 v1 与 v2，其中 **v2 的封面标题被“教师改过”**）以及一条 `className='高一 (3) 班'` 的他班记录，刷新后：
  - 本班（高二 (1) 班）两条版本都可见，**最新 v2 排在前面**，v1 标「历史版本」；
  - 打开 v2 后页面标题与课件封面显示 **“椭圆及其标准方程（张老师课堂修订版）”** → 证明按发布快照渲染，教师后续未发布修改不会混入；
  - 他班记录被过滤 → **班级隔离**成立；
  - `records` 为空时用 `deck-ellipse` 生成「预置发布 v1」回退（页面标注，**不写回 records**），教师真实发布后自动切换（截图 01/02 → 04/05 对比）。
- 发布快照来源：`teacher-prep` 子代理已确认字段形状与本实现一致（`slides` 为快照本体，无 `snapshot`/`at`）。

### 2.2 批改结果 → 学生回看（`store.teacher.grading.grades[submissionId]`）

- 只读 `grades['sub-A'] = { score, comment, confirmed, gradedAt }`（林一川 = `sub-A`；另两人不显示）。
- **未批改/未确认（键不存在或 `confirmed !== true`）→ 显示“待批改”，不显示分数、不编造评语**（截图 12）。
- 注入 `confirmed:true, score:5, comment:'推导完整…'` 后刷新：作业任务变「已批改 5/5」；回看弹窗显示得分 **5 / 5**、教师评语、批改时间（截图 13）；再次刷新仍一致 → **持久化成立**。
- 回看弹窗同时展示：答卷图片（`sub-A.png` 真实加载，`naturalWidth>0`）、题号 3、题面、“我的作答”、评分细则。

### 2.3 学生进度 → 教师课堂监测（`store.student.classroom.progress`）

- 每页翻页/进入都写 `progress[deckId] = { page, total, pct, updatedAt, openedAt, recordId, title, status }`，并把打开事件 push 到 `store.student.classroom.opened`（对象数组，含 recordId/deckId/deckTitle/className/version/source/at，上限 30）。
- 实测：翻到第 4 / 6 页 → `{page:4,total:6,pct:67,recordId:'pub-mock-v2'}`（`qa-result.json`），刷新后恢复同一页与同一字幕段。
- 已在开工时把该形状同步给 `teacher-grading` 子代理（其课堂监测按此只读）。

## 3. 功能链路（QA 覆盖）

| 链路 | 结果 | 截图 |
|---|---|---|
| 课堂默认「课堂任务」：课件任务（版本 / 页数 / 进度 / 状态）+ 作业任务（题号 / 待批改 / 提交时间）+ 过滤（全部/待完成/已完成） | PASS | 01 |
| 双师课堂 Tab：老师课堂列表（版本、页数、发布时间、我的进度）+ 自主双师入口 + 最近课堂 | PASS | 02 / 04 |
| 我的班级：班级信息、任课老师、成员、错题共享（标注“演示数据”） | PASS | 03 |
| 打开发布课件（URL = 发布记录 id）→ 逐页翻 3 页 → 第 4/6 页 | PASS | 05 / 06 |
| 讲解字幕逐段出现（自动播放 1.8s/段），暂停/继续/翻页/点讲稿跳段均为真实本地状态 | PASS | 07 / 11 |
| AI 助教：命中本页讲稿（打「命中本页讲稿」标签 + 讲稿出处）；跨页问题→“当前页讲稿未包含…第 N 页讲过”+ 可跳页；未命中→明确“当前页讲稿未包含”，不编造 | PASS | 08 / 09 |
| 刷新恢复：同一页（4/6）、同一字幕段、助教问答历史仍在 | PASS | 10 |
| 作业回看（待批改）→ mock 教师确认批改 → 得分/评语同步 → 刷新仍在 | PASS | 12 / 13 |
| 自主双师课堂：3 个课题（复用 courseware 三套课件）+ 1 个「我上传的材料」课堂 | PASS | 14 / 15 |
| 上传材料：真实文件选择 + SHA-256 内容匹配（题 2 原图，改名仍识别）；非演示材料**不伪造识别**，提示后可改用演示材料 | PASS | 15 / 16 |
| 兼容：主持人工具旧检查点 `/student/dual/dual-deck-0` 可打开 | PASS | 17 |

## 4. 内容与数学核查

- 椭圆课件参数联动：`a=5, b=3 ⇒ c=√(25−9)=4, e=4/5`，与 `evidence/solutions/sealed/math-baseline.json` 一致。
- 学生上传材料课堂按材料原题复核：正三棱柱 `ABC-A₁B₁C₁`、`D` 为 `BC` 中点，选项 **B、D 正确**；A 项 `AD·A₁C=3≠0`（不垂直，与 `sub-C` 教师的“数量积为 3”一致），C 项方向向量不成比例（不平行）。
- AI 助教回答均来自 `src/data/classroom.js` 的 `qaBank`（人工撰写、与课件讲稿一致）+ 页面内容摘要；无模型调用、无网络请求（`window.__MATHSIS_NET_LOG__ === 0`）。

## 5. 文件边界（禁止文件确认）

改动（全部在授权范围）：
- `src/ends/student/ClassroomView.vue`、`src/ends/student/DualView.vue`
- `src/data/classroom.js`（新增）
- `src/components/student/classroom/`（新增）：`progress.js`、`DeckSlide.vue`、`SlideFigure.vue`、`PublishedDeckCard.vue`、`HomeworkTask.vue`、`HomeworkReviewDialog.vue`、`SelfClassPanel.vue`、`MyClassPanel.vue`、`AssistantPanel.vue`
- `qa/student-classroom/`（脚本 + 截图 + 本报告 + `qa-result.json`）

**未修改**：`src/router.js`、`src/shells/**`、`src/styles/**`（含 `app.css`/`student.css`）、`src/lib/**`、`src/state/demo.js`、`src/data/{guidance,courseware,submissions}.js`、`src/App.vue`、其他子代理文件。`dist-student-classroom/` 为本次构建产物。

## 6. 已知限制 / FAILURES

1. **课堂页视觉为演示版密度**：`课堂任务` Tab 两行任务后下方留白（与 run-01 真实截图一致的产品结构），非缺陷但视觉密度低于教师端 Golden。
2. **预置回退是页面内快照**（`preset-pub-ellipse-v1`），不写入 `teacher.publish.records`；教师端真实发布后自动切换。若在教师发布**其他班级**课件后且本班无记录，会显示「本班暂无」空态（班级隔离的正确表现，不是失败）。
3. **进度按 `deckId` 聚合**：同一 deck 的发布课堂与自主课题共享一条进度（契约规定 `progress[deckId]`）；不同老师版本共用进度，版本历史仅影响播放快照。
4. **上传材料仅内置 1 份演示材料**（题 2 原图哈希），其他材料走“未收录”提示；未实现 OCR/解析（方案允许，展示边界内）。
5. `dist-student-classroom/` 为 QA 构建产物，非最终发布包；断网单文件发行由发布阶段统一处理。
6. 视觉评审尚未由独立评审人复验（本报告为构建者自测），按 AGENTS.md 需独立视觉/功能评审。

## 7. 复跑

```powershell
cd D:\zxsy-math-arena-showcase
pnpm dev --port 5202                 # 终端 A
$env:PYTHONIOENCODING='utf-8'
python qa/student-classroom/qa_student_classroom.py   # 终端 B，48 项检查 + 截图
pnpm exec vite build --outDir dist-student-classroom
```

## 8. 截图索引（`qa/student-classroom/`，1672×941 DPR 1）

`01-classroom-tasks-preset` 课堂任务（预置回退 + 待批改作业）· `02-classroom-dual-preset` 双师课堂 Tab（预置 v1 + 自主入口）· `03-classroom-myclass` 我的班级 · `04-classroom-dual-published` 真实发布记录（v2 最新 + v1 历史）· `05-dual-published-v2` 打开发布课件（教师改过标题）· `06-dual-page4` 翻到第 4/6 页（标准方程 + 图形）· `07-dual-subtitle-playing` 字幕逐段出现 · `08-assistant-hit` 助教命中本页讲稿 · `09-assistant-miss` 助教未命中明确说明 · `10-dual-refresh-restored` 刷新恢复同页同段 · `11-dual-paused` 暂停讲解 · `12-homework-pending` 作业待批改回看 · `13-homework-graded` 教师确认批改后学生看到 5/5 与评语 · `14-self-class` 自主双师课堂 · `15-material-class`/`15b-material-slide2` 上传材料课堂（含材料原图） · `16-material-reject` 非演示材料不伪造识别 · `17-dual-alias-checkpoint` 旧检查点兼容。
