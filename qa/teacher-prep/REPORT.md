# 教师端 · 备课中心 / PPT / 教案 / 发布 / 导出 —— 实现与验收报告

- 项目：`D:\zxsy-math-arena-showcase`（Vue3 + Vite，PROTOTYPE_ONLY，全本地、无外网依赖）
- 实现代理：teacher-prep（子代理）
- 视觉基准：`docs/product/teacher-prep-center/golden/PPT-GOLDEN.png`、`LESSONPLAN-GOLDEN.png`（1672×941）
- 实拍基准：`evidence/live/run-01/inventory/teacher-01-prep-home.png`、`teacher-13/14/15/16/23/24-*.png`
- 验证时间：2026-11-21 03:02（最终全链路 E2E）、03:03（产物校验）、03:02（最终 build）
- 最终结论：`run_e2e.py` **69/69 PASS**；`verify_artifacts.py` **38/38 PASS**；`pnpm exec vite build --outDir dist-teacher-prep` **成功**（4.26s，退出码 0）。

## 1. 交付范围（仅新增/修改下列文件）

| 文件 | 说明 |
|---|---|
| `src/data/prepPublish.js` | 编辑状态命名空间 `store.ext.teacherPrep`、参数派生（c/e/顶点/子集数）、发布快照写入、AI 改页、导出数据组装 |
| `src/ends/teacher/PrepCenter.vue` | 备课中心首页：三课时卡片、NL 备课输入（真实建会话）、新建备课对话框、最近会话、快捷入口 |
| `src/ends/teacher/PrepHistory.vue` | 备课历史：3+ 条会话（状态/更新时间/继续编辑）+ 版本管理（发布快照按课时分组） |
| `src/ends/teacher/PrepWorkbench.vue` | `/teacher/prep/w/:sessionId/:tab?` 工作台：顶栏 / 三 Tab（classroom｜ppt｜plan，`design` 为 classroom 别名）/ PPT 三栏 / 底部 AI 与翻页缩放 / 预览演示 / 发布 / 导出 / 会话级重置 |
| `src/components/teacher/prep/SlidesSidebar.vue` | 左列缩略图（序号+标题+一句说明，点选、上下移动） |
| `src/components/teacher/prep/SlideCanvas.vue` | 16:9 画布，按 `slide.layout` 渲染标题/导语/公式/要点/图形；标题为真实输入框 |
| `src/components/teacher/prep/EllipseFigure.vue` | 椭圆 SVG：a、b 驱动，焦点/坐标轴/辅助线/标注同源 |
| `src/components/teacher/prep/ParabolaFigure.vue` | 二次函数 SVG：a、h、k 驱动顶点/对称轴 |
| `src/components/teacher/prep/VennFigure.vue` | 集合关系 SVG：n 驱动子集数标注 |
| `src/components/teacher/prep/PropertyPanel.vue` | 右列智能属性：参数输入→c/e 实时计算、显示开关、样式、AI 快捷操作 |
| `src/components/teacher/prep/DesignPane.vue` | 课堂设计 Tab：目标（可编辑）/ 重难点 / 教学路径 45 分钟 / 例题 / 发布状态 |
| `src/components/teacher/prep/PlanPane.vue` | 教案 Tab（对齐 LESSONPLAN-GOLDEN）：左大纲 / 中教案纸（标题+分节可编辑）/ 右智能辅助 |
| `src/components/teacher/prep/PublishCoursewareDialog.vue` | 发布课堂：班级选择→准备态→发布中→成功/失败态 |
| `qa/teacher-prep/run_e2e.py` | Playwright 1672×941 DPR1 全链路（69 项断言 + 真实下载 + 截图 + records 落盘） |
| `qa/teacher-prep/verify_artifacts.py` | python-pptx / python-docx / pypdf 打开导出文件校验（38 项断言） |
| `qa/teacher-prep/artifacts/*`、`qa/teacher-prep/*.png`、`records.json`、`manifest.json` | 证据与产物 |

未修改任何禁止文件（`src/router.js`、`src/shells/**`、`src/state/demo.js`、`src/styles/*.css`、`src/lib/**`、`src/data/courseware.js`、`src/App.vue`、其它子代理文件）；状态一律写入 `store.ext.teacherPrep` 与契约指定的 `store.teacher.publish.records`。

## 2. 复现命令

```powershell
cd D:\zxsy-math-arena-showcase
pnpm exec vite --port 5203 --strictPort        # 本代理独占端口
$env:PYTHONIOENCODING='utf-8'
python qa\teacher-prep\run_e2e.py             # 69/69 PASS，截图 + artifacts + records.json + manifest.json
python qa\teacher-prep\verify_artifacts.py    # 38/38 PASS（打开真实导出文件校验）
pnpm exec vite build --outDir dist-teacher-prep   # 构建成功
```

## 3. 参数联动实测（椭圆 a/b → c/e → 图形/公式/标注三处同源）

| 状态 | 右栏 c | 右栏 e | 图形标注 | 公式区 |
|---|---|---|---|---|
| 默认 a=5, b=3 | **4.0** | **0.8** | `|PF₁|+|PF₂| = 2a = 10 > |F₁F₂| = 2c = 8`；焦点 F₁(−4,0)、F₂(4,0) | `x²/25 + y²/9 = 1`；`c = √(5²−3²) = 4`；`e = c/a = 4/5 ≈ 0.8` |
| 改为 a=6, b=4（实测） | **4.5** | **0.745** | `|PF₁|+|PF₂| = 2a = 12 > 2c = 8.94`；焦点 F₁(−4.472,0)、F₂(4.472,0)；长轴 12 · 短轴 8 · 焦距 8.94 | `x²/36 + y²/16 = 1`；`c = √(6²−4²) = 4.472`；`e = c/a = 4.472/6 ≈ 0.745` |
| 非法参数（a≤b） | 显示 `—` + 红框「需满足 a > b > 0」 | 同左 | 画布显示「参数无效」占位，不伪造图形 | — |

其他课时对应属性：
- 二次函数：a=3、h=1、k=−4 → 顶点式 `y = 3(x − 1)² − 4`、顶点 (1,−4)、对称轴 x=1、开口向上、最小值 −4（图形/公式/标注同步）。
- 集合：n=4 → 子集数 `2⁴ = 16`、真子集数 `15`（图形与标注同步）。

## 4. 发布契约与实测记录（`store.teacher.publish.records` 追加，不覆盖历史）

记录形状（与 lead 派单一致）：

```json
{
  "id": "pub-<ts>", "deckId": "deck-ellipse", "deckTitle": "椭圆及其标准方程",
  "className": "高二 (1) 班", "version": 1, "publishedAt": 1795200972323,
  "editor": "张老师",
  "slides": ["……发布瞬间当前编辑后 slides 的深拷贝……"],
  "meta": { "sessionId": "prep-ellipse", "textbook": "人教A版 · 选择性必修第二册",
            "grade": "高二 (1) 班", "className": "高二 (1) 班", "duration": "45 分钟",
            "subtitle": "第一课时", "versionLabel": "v1", "publishedAtText": "2026-11-21 02:56" }
}
```

实测（`qa/teacher-prep/records.json`）：

| 步骤 | 发布前 records | 发布后 | 学生端可见性语义 |
|---|---|---|---|
| 首次发布 | 0 条（断言「发布前学生端无该课件记录」） | 追加 v1，6 页快照，第 3 页标题「椭圆的定义（终审版）」 | 成功态可见「已发布到 高二 (1) 班 · 版本 v1」 |
| 再改标题后发布 | 1 条 | 追加 v2，第 3 页标题「椭圆的定义（v2 发布版）」 | 成功态可见「已发布到 高二 (1) 班 · 版本 v2」 |
| 旧快照完整性 | — | v1 记录第 3 页仍为「终审版」，未被 v2 编辑污染 | 旧版本保留在 records 历史 |

另同步写入 `store.teacher.prep.sessions[sessionId] = { published:true, publishedVersion, publishedAt, publishedClass, deckId }`，供教师端课堂/学情页面只读复用。

## 5. 导出产物（真实下载 → Python 打开校验，38/38 PASS）

| 文件 | 生成来源 | 校验结果 |
|---|---|---|
| `artifacts/ellipse-课件.pptx` | 当前编辑后的 6 页 slides | 6 页；54 个文本形状 / 76 个可编辑形状 / 无图片伪装页；含「椭圆的定义（终审版）」（改标题后导出确实变化） |
| `artifacts/ellipse-课件.pdf` | `deckToPdfDoc` → pdf-lib + 内嵌 CJK 子集字体 | 2 页；可提取 1289 字；含编辑后标题 |
| `artifacts/ellipse-教案.docx` | 当前编辑后的 plan（标题已改） | 53 段；含「《椭圆及其标准方程》第一课时 · 教案（终审版）」、教学目标/教学过程/板书设计 |
| `artifacts/ellipse-教案.md` | `planToMarkdown` | 61 行；含编辑后教案标题与 `## 一、教学目标` |
| `artifacts/quadratic-课件.pptx` | 二次函数 5 页 | 5 页；含「配方法的三步（修改版）」；42 文本形状 |
| `artifacts/set-课件.pptx` | 集合 5 页 | 5 页；含「子集个数与空集（修改版）」；42 文本形状 |

导出按钮只放实际实现格式：PPT 页 `导出 PPTX` / `导出 PDF`，教案页 `导出 DOCX` / `导出 Markdown`；每个按钮触发真实浏览器下载并显示成功/失败反馈（失败会显示错误 toast，不写假成功）。

## 6. 端到端断言（run_e2e.py，69/69 PASS）

覆盖：备课中心三课时 → 椭圆工作台 PPT 默认 3/6（Golden）→ a/b 改动三处同步 → 标题真实编辑并写入 `store.ext.teacherPrep` → 已保存时间 → AI 改页真实添加要点 → AI 未识别指令显示可恢复错误态 → 缩略图上下移动/加页/删页/缩放 → PPTX/PDF 真实下载 → 发布 v1 → records 字段/深拷贝/版本 → 再编辑发布 v2 且旧快照不污染 → 教案 Tab 结构与 DOCX/MD 导出 → 二次函数参数联动 + 导出 → 集合子集数联动 + 导出 → 历史页 3+ 条/版本管理 v1·v2 → 新建备课生成独立会话（「新一轮备课」）→ `design` 别名映射 classroom → 预览演示 → 同步到教案真实写入 plan 覆盖 → 浏览器控制台 0 error。

## 7. 截图证据（`qa/teacher-prep/`，1672×941 DPR1）

`01-prep-center` · `02-workbench-classroom` · `03-ppt-before-params` · `04-ppt-after-params` · `05-ppt-title-edited` · `06-ppt-ai-edit` · `07-ppt-export-pptx` · `08-ppt-export-pdf` · `09-publish-ready` · `10-publish-success-v1` · `11-publish-success-v2` · `12-workbench-after-publish` · `13-plan-tab` · `14-plan-export-docx` · `15-plan-export-md` · `16-quadratic-ppt` · `17-set-ppt` · `18-prep-history` · `19-new-prep-dialog` · `20-new-prep-workbench` · `21-preview-demo` · `22-sync-to-plan`。

## 8. 已知限制 / 未完成项

1. **发布失败态**：代码具备 try/catch 失败分支（红色失败卡片 + 重试，失败不写 records），但正常数据下无法自然触发，本机浏览器验收只截到「准备态/发布中/成功态」；未伪造失败。
2. **dev 模式字体请求**：导出 PDF 需读取本地 CJK 字体，dev 下产生 1 次本机 `fetch(/src/assets/fonts/offline-cjk.ttf)`（`records.json.networkAttempts=1`，非外网）；`exportPdf.js` 已支持单文件构建时 data URI 内联，断网 release 验收由主控在单文件构建阶段复核。
3. **Shell 叠加**：Golden PPT 是独立态顶栏；本项目按任务约束不得改 `src/shells/**`，工作台保留平台左侧导航与 56px 顶栏，其内部完整实现 Golden 的「智学备课」顶栏（与现役 teacher-13 实拍一致：平台 topbar 下再嵌备课内部头）。
4. **学生端联动**：发布记录已按契约写入并由 student-classroom 的 `visiblePublishedRecords()` 读取；学生端「课堂/双师」打开同一页的跨端镜头由学生端代理验收，本报告只证明教师侧发布记录/快照/版本正确。
5. 现役环境本轮 AI 生成失败（红框错误态）未在展示版复刻；展示版「AI 改页」为本地确定性编辑，未识别指令明确提示可执行动作，不假装成功。
