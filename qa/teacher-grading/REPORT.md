# 教师端 · 批改 / 课堂监测 / 学情 / 题库 / 资源 · 验收报告

> 子代理：teacher-grading　｜　目录：`D:\zxsy-math-arena-showcase`　｜　运行：`pnpm exec vite --port 5204`（独占 5204）
> 模式：PROTOTYPE_ONLY，纯前端本地数据；断网可用，无外部请求（验收脚本断言）。

## 1. 交付文件（仅这些文件被创建/修改）

| 文件 | 说明 |
|---|---|
| `src/ends/teacher/GradingView.vue` | 批改工作台 `/teacher/grading`（三列：作答队列 / 题面+评分细则+答卷原图 / 系统建议与教师终审） |
| `src/components/teacher/grading/GradingQueue.vue` | 左列提交队列（全部/待批/已确认筛选，学生、题号、状态、建议分/终评） |
| `src/components/teacher/grading/GradingSubmission.vue` | 中列题面、选项、评分细则、答卷原图（点击放大）、参考答案与讲评要点 |
| `src/components/teacher/grading/GradingReview.vue` | 右列系统建议（失败可恢复错误态）、终审改分、评语、确认/更新终评、跨端同步说明 |
| `src/ends/teacher/TeacherAssign.vue` | 作业发布四步（选题→选班级→设置→发布）+ 已发布回看 |
| `src/ends/teacher/TeacherClassroom.vue` | 课堂监测（读发布快照 + 学生进度回流，空态明确） |
| `src/ends/teacher/TeacherInsights.vue` | 学情洞察（错答热力图 / 错因构成 / 证据明细 / 三份提交对照） |
| `src/ends/teacher/TeacherBank.vue` | 题库与组卷（三题入库、勾选组卷、A4 本地预览/打印） |
| `src/ends/teacher/TeacherResources.vue` | 资源中心（本地资源卡片 + 教材切片缺源登记） |
| `qa/teacher-grading/acceptance.py` | Playwright 全链路验收脚本（1672×941 DPR1，截图 + 契约断言 + 网络/console 断言） |
| `qa/teacher-grading/*.png` | 验收截图证据（见第 5 节） |

**未修改**：`src/router.js`、`src/shells/**`、`src/state/demo.js`、`src/styles/*.css`、`src/lib/**`、`src/data/submissions.js`、`src/data/courseware.js`、`src/App.vue`、其他子代理文件（含 `src/data/research.js` 等）。共享数据只读引用；写状态仅落在 `store.teacher.grading.grades` 与 `store.ext.teacherGrading`。

## 2. 跨端契约（实测断言）

### 2.1 批改结果（学生会读取）
确认后写入 `store.teacher.grading.grades[submissionId]`，形状严格为：
```json
{ "score": 2.5, "comment": "…", "confirmed": true, "gradedAt": "2026-11-20T18:56:16.112Z" }
```
- 未确认前不建立该键；队列仍显示“待批”，学生端不显示分数。
- 本轮验收实测：sub-B 改分 2→2.5 + 评语 + 确认；刷新后队列“已确认”、终评 2.5 回显；另开学生页（同一浏览器上下文）读到同一对象，`{score, comment, confirmed, gradedAt}` 四字段完整。
- sub-A 完整正确：系统建议 5/5，教师确认 5/5；sub-B 思路对但算错：系统建议 2/5，界面明确“存在缺陷 / 结论错误”，教师终审 2.5；sub-C 漏条件：系统建议 2/5，教师终审 2。三份均已确认（`3 / 3`）。
- 系统建议缺失时显示可恢复错误（“请直接人工终审给分，不会阻塞批改”），不伪造建议分。

### 2.2 作业发布
`store.ext.teacherGrading.assignments` 每条字段实测精确为 `{ id, title, className, questionIds, dueAt, publishedAt }`：
```json
{ "id": "assign-1795200977230", "title": "第 3、9、14 题 · 课后针对性练习",
  "className": "高二 (1) 班", "questionIds": ["A","B","C"],
  "dueAt": "2026-11-22T14:00:00.000Z", "publishedAt": "2026-11-20T18:56:17.230Z" }
```
刷新后“已发布作业”列表仍在，可展开回看题目。

### 2.3 课堂监测（只读）
- 发布快照：`store.teacher.publish.records`，形状 `{ id, deckId, deckTitle, className, version, publishedAt(ms), editor, slides[], meta{sessionId,...} }`（同时容错 `snapshot/at` 旧字段）。
- 学生进度：`store.student.classroom.progress[deckId] = { page, total, pct, updatedAt, openedAt, recordId, title, status }`；opened 为事件数组。
- 实测：空态显示“暂无已发布课件”“暂无学生打开”；注入真实进度后卡片显示“学生已打开 / 第 4 / 6 页 / 67% / 最近更新”，未打开课件显示“未打开 / 暂无学生打开”，统计“学生已打开 1 / 2、平均进度 67%”。教师端不写入学生端进度。

### 2.4 学情洞察（可追溯，无随机数）
- 证据 = 提交缺陷（submissions.js 的 `defect` 字段）+ 学生端错答（`store.student.errors`）；每条证据可点回来源。
- 实测：2 条提交缺陷 + 2 条学生错答 = 4 条证据；热力图：题14×概念理解=2（sub-B 缺陷 + 学生错答 s4）、题9×条件遗漏=1（sub-C 漏条件）、题9×概念理解=1（学生错答 s3）、题3=0；平均分 `3.2 / 15` 由三份已确认终评计算；点击单元格按“题×错因”过滤证据，过滤后 2 条。
- 错因归类规则在界面内可展开核对（按引导解题步骤映射），不做无依据归因。

### 2.5 题库与组卷
- 题库初始为空；一键将三道指定题按原题入库（写入 `store.ext.teacherGrading.bank.items`，刷新保留 3/3）。
- 勾选 2 题 → 本地 A4 试卷预览（794×1123 卷面）：卷首/班级姓名学号/题号/选项/答题区/“演示自撰素材”来源标注；KaTeX 本地渲染；`window.print()` 打印 A4。刷新后题库与已选题目保留。

### 2.6 教材切片缺源
- 资源中心顶部固定提示（原文）：**“授权教材切片未挂载，本演示使用自撰素材”**，并列出真实缺源目录 `D:\知识库\AC切片`（及 `D:\教师端备课中心重构宪法`），说明“界面不引用、不转写、不伪造任何教材原文”；另有“教材切片 · 待挂载”缺源登记卡（按钮禁用，不伪造导入）。
- 资源全部为随包本地课件/教案/题图/评分细则，本地预览（课件逐页、教案章节、题图+参考答案+SHA-256）。

## 3. 运行与自测

```powershell
# 终端 1：开发服务（独占 5204）
pnpm exec vite --port 5204 --strictPort

# 终端 2：全链路验收（生成 qa/teacher-grading/*.png，退出码 0=全过）
python qa/teacher-grading/acceptance.py

# 构建（本子代理产物目录）
pnpm exec vite build --outDir dist-teacher-grading
```

验收脚本覆盖：批改 sub-B 改分→评语→确认→刷新保留 → 另开学生页读取；三份提交全覆盖；课堂监测空态与进度回流；学情热力图与错因数字一致性；题库入库/组卷/A4 预览/刷新；作业发布四步与契约字段；资源中心缺源提示与本地预览；全站无外部网络请求、无 console error、无页面 JS 异常。

## 4. 验收结果（最终）

| 项 | 结果 |
|---|---|
| Playwright 全链路 | **86 / 86 通过**（`acceptance.py`，退出码 0；日志 `qa/teacher-grading/acceptance-run.log`） |
| 截图自检（1672×941 DPR1） | 18 张状态截图，见第 5 节 |
| `pnpm exec vite build --outDir dist-teacher-grading` | **通过**（4.70s；69 个产物，5,325,102 bytes；日志 `qa/teacher-grading/build.log`）。仅 Rollup 提示单 chunk >500kB（离线单包预期，非错误） |
| 禁止文件未修改 | 是（见第 1 节） |
| 网络/console | 0 外部请求、0 console error、0 pageerror（脚本断言通过） |
| 过程中外部阻塞 | `src/data/research.js` 曾有 LaTeX 反斜杠转义错误，导致全站 build/dev 短暂失败；已由 research-end 修复，最终 build 与验收均在本修复后通过。本子代理未修改该文件。 |

## 5. 截图证据（`qa/teacher-grading/`）

| 截图 | 证明 |
|---|---|
| `01-grading-sub-b-draft.png` | sub-B 系统建议 2/5、缺陷“把期望误当抽取次数” |
| `02-grading-sub-b-filled.png` | 教师改分 2.5 + 写评语（未确认） |
| `03-grading-sub-b-after-reload.png` | 确认后刷新：队列“已确认”、终评 2.5 回显 |
| `04-grading-all-confirmed.png` | 三份提交全覆盖：5 / 2.5 / 2，均已确认 |
| `05-student-page-after-grading.png` | 另开学生页（同上下文 localStorage）读取批改结果 |
| `06-classroom-empty.png` | 空态：“暂无已发布课件”“暂无学生打开” |
| `07-classroom-progress.png` | 已发布课件 + 学生进度回流（第 4/6 页、67%） |
| `08-insights-filtered.png` | 热力图点击“题14×概念理解”过滤证据 |
| `09-insights.png` | 学情全貌：KPI 3/3、3.2/15、热力图 2/1/1、证据明细可追溯 |
| `10-bank-before.png` | 题库为空（0/3）可入库 |
| `11-bank-a4-preview.png` | A4 组卷预览（卷面/选项/来源标注/KaTeX） |
| `12-bank-after-reload.png` | 刷新后题库 3/3、已选 2 题保留 |
| `13-assign-step1.png` | 四步发布第 1 步（三题全选） |
| `14-assign-review.png` | 发布确认页（标题/班级/题量/数据写入） |
| `15-assign-published.png` | 发布成功（ID/时间/班级） |
| `16-assign-list-after-reload.png` | 刷新后已发布列表回看 + 展开题目 |
| `17-resources.png` | 教材切片缺源提示 + 本地资源卡片 |
| `18-resources-preview.png` | 本地课件预览（逐页真实内容） |

## 6. 已知限制 / 说明

1. 学生端“批改回看 UI”由 student-classroom / student-practice 子代理实现；本报告验证写入契约与另开页面读取 localStorage 的一致性（`05-student-page-after-grading.png`）。
2. 课堂监测的进度回流依赖学生端打开课件；本报告用“与学生端写入形状完全一致”的进度做可复现验收（脚本内注入），并同时验证了“暂无学生打开”空态。
3. 资源中心不含授权教材原文（缺源），这是方案要求而非缺陷；界面已固定标注缺源，不伪造教材原文。
4. 构建产物 `dist-teacher-grading/` 为教师端子代理的验证构建（整包），最终发布包由 lead 统一构建。
