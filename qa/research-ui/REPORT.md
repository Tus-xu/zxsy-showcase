# 科研端页面实现验收报告（READ / WRITE / HOME）

日期：2026-11-21 · 子代理：research-ui · 项目：`D:\zxsy-math-arena-showcase`
验收分辨率：1672×941，DPR=1，Chromium（Playwright，headless）
本地服务：`pnpm dev --port 5206`（独占 5206；本次验收期间运行）

## 0. 结论

- **STATUS：DONE（页面可运行、主链全部实测通过）**
- 自动化验收：**53 / 53 通过**，浏览器 console 无 error / warning，页面 `fetch/XHR` 尝试 **0**。
- 生产构建：`pnpm exec vite build --outDir dist-research-ui` **通过**（exit 0，356 modules）。
- 真实 PDF：写作工作区导出 `qa/research-ui/artifacts/research-write-export.pdf`（26,007 B，pypdf 可读、文本可提取）。

## 1. 交付文件（本代理只写这些路径）

| 文件 | 说明 |
|---|---|
| `src/ends/research/ResearchHome.vue` | 启动页：三项目卡（含真实计数/文献标签/进入阅读/进入写作）、新建项目弹层（创建可编译起步工程并进入写作）、最近笔记（点击回原文页/段落）、顶部快捷入口 |
| `src/ends/research/ResearchRead.vue` | 阅读三栏：左（项目卡 + 切换项目 + AI 项目概览 + 文献/笔记/项目/设置导航 + 文献列表 + 最近笔记），中（文档 Tab + 工具条 + 分页纸面 + 段落点选浮动工具条），右（Research Agent：上下文 chips / 结构化回答卡 / 证据来源 / 能力 Accordion / Composer） |
| `src/ends/research/ResearchWrite.vue` | 写作工作区：左（项目条 + 图标轨 + 文件树/论文结构），中（编译条 + LaTeX 编辑器 + PDF 预览 + 编译日志），右（写作 Agent：编译错误解释 / 改进建议 / 引用补全 / 公式检查 / LaTeX 对照 / 润色 / 翻译） |
| `src/components/research/researchUi.js` | 页面状态命名空间 `store.ext.researchUi` 初始化与业务辅助、项目新建/解析、笔记、高亮、写作工程持久化 |
| `src/components/research/latexEngine.js` | 离线 LaTeX 引擎（页面侧等价实现）：诊断（花括号/环境/未定义命令/未定义引用/\input 存在性）、解析（标题/摘要/章节/公式/定理/证明/列表/参考文献）、大纲、`plainMath`、`buildPdfDoc` |
| `src/components/research/LatexEditor.vue` | 行号 + 语法着色（命令/注释/数学/括号）+ 滚动同步 + 定位行（日志点击跳转）+ 片段插入 |
| `qa/research-ui/**` | 自动化脚本、17 张关键状态截图、导出 PDF、`qa-result.json`、本报告 |

**未修改**：`src/router.js`、`src/shells/**`、`src/state/demo.js`、`src/styles/**`、`src/lib/**`、`src/data/research.js`（该文件由 research-end 修复，本代理只读引用）、其它代理文件。

## 2. 状态契约（`store.ext.researchUi`，持久化、可复位）

```
{
  customProjects: [{ id:'custom-<ts>', name, desc, memory, cover, papers:[], writeProjectId, custom:true }],
  read: {
    projectId, paperId, page, blockId,           // 选中项目 / 文献 / 页 / 段落
    zoom, section: 'docs'|'notes'|'project'|'settings',
    highlights: ['<paperId>:<page>:<blockId>'],  // 高亮（持久化）
    notes: [{ id, projectId, paperId, page, blockId, title, quote, body, createdAt, timeText, seeded:false }],
    ask: { qaId, paperId, page, blockId, blockTitle, at } | null,  // 最后一次结构化回答（刷新回显）
    capability, formulaId,                       // 展开的能力 / 公式检查三案例选中项
    chat: [{ role:'user'|'agent', text, hint? }]
  },
  write: {
    projectId,
    filesByProject: { [projectId]: { 'main.tex': {kind,content}, ... } },     // 编辑内容持久化
    activeFileByProject, openFilesByProject, savedAtByProject, dirtyByProject,
    compileByProject: { [projectId]: {
      status:'idle'|'success'|'error', version, at, duration,
      errors[], warnings[], infos[], log:[{time,level,text,file,line}],
      lastSuccess: { doc, version, at, pages, pdfName }   // 编译版本 + 预览/导出同源
    } },
    previewPageByProject, autoCompile,
    appliedPatchesByProject, notesByProject, chatByProject, lastExport,
    activeCapability, activePatch
  }
}
```

- 复位入口：阅读页「设置 → 复位科研阅读状态」；写作页「设置（图标轨）→ 复位写作状态」；`resetAll()` 整场复位时 `ext` 一并清空。
- 刷新恢复：选中页/段落、笔记、高亮、Agent 回答、激活文件、未保存/已保存标记、编译状态与版本、预览页码、新建项目全部持久化。

## 3. 实测主链（QA 脚本逐项断言）

### READ
1. 启动页 → 项目卡「进入阅读」→ 三栏渲染、文献列表 2 篇、默认第 4 页。
2. 点选定理段落（`thm-cea`）→ 选中高亮 + 浮动工具条（高亮 / 添加笔记 / 引用 / 问 AI）。
3. 「问 AI」→ Research Agent 结构化回答卡：判断、状态药丸（基本成立（条件齐备））、关键信息、证据来源（第 4 页 · 定理 2.1 / 第 2 页 · 定义 1.1）。
4. 「定位原文」→ 跳回 `第 4 页` 并高亮 `thm-cea`。
5. 「加入笔记」→ 弹层保存 → 左侧最近笔记新增 → **刷新后仍在**（页 4、笔记、回答卡均恢复）。
6. 公式检查三案例（`sqrt-square` 需要补充条件 / `cancel-zero` 需要补充条件 / `complete-square` 已验证）：结构化结果卡含判断、依据、反例或数值核验表、置信状态药丸，并标注「离线演示审核结论，非模型实时生成」。
7. Composer 提问「Céa 引理的证明用了哪两步？」→ 命中离线审核问答并回跳证据页。
8. 全文声明「随包演示讲义（自撰，非外部论文）」在纸面页眉、页脚、证据来源行可见；引文全部来自随包页面，可点回。

### WRITE
9. 打开即自动完成一次编译：`✅ 编译成功`，PDF 预览纸面、编译日志（含 `Citation 'Cea1971' ... undefined` 故意警告）。
10. 「改进建议 → 在证明末尾加入证毕符号（qed-close）→ 应用修改」：补丁插入 `\qedhere` 并自动编译 → **❌ 编译失败 1 个错误**，错误卡标题「未定义的控制序列：\qedhere」、文件位置、建议修改 diff、错误行日志。
11. 点击日志错误行 → 编辑器切到 `sections/theory.tex:17` 并定位第 17 行（文件 Tab 变为 theory.tex）。
12. 「编译错误解释 → 应用修复（加入 amsthm）」→ 重新编译 **✅ 编译成功**，预览更新为新版本，版本号递增。
13. 「引用补全 → 应用修复」：`\cite{Cea1971}` → `\cite{demo-cea}` → 编译成功后卡变为「全部可解析」。
14. 「导出 PDF」→ 浏览器真实下载 `有限元误差分析-vN.pdf`（26,007 B，1 页；pypdf 可读、文本可提取，标题/摘要/正文可核对）。
15. 刷新 → 编辑内容（`\usepackage{amsthm}`）、编译状态、版本、预览、激活文件保留。
16. 写作「设置 → 复位写作状态」→ 回到数据层初始工程并重新编译成功。
17. 首页「新建项目 → 创建并进入写作」→ 新建空白项目写入 `refs.bib` + 最小 main.tex，自动编译成功，项目名回显；新建项目出现在首页项目卡。
18. 首页最近笔记显示用户笔记并可点击回原文。

## 4. 数据层适配（重要）

1. **双反斜杠归一化**：接手时 `src/data/research.js` 的 String.raw 模板内 LaTeX 为双反斜杠（`\\documentclass`），页面侧 `normalizeTex()`（`\\`→`\`）用于还原。research-end 于 03:36 左右把数据归一化为单反斜杠后，实测数据中双反斜杠计数为 0，`normalizeTex` 变为幂等空操作；如未来数据回退，仍能正确还原。
2. **页面侧 LaTeX 引擎**：数据层原 `validateLatexProject / parseLatexProject / plainMath` 的部分正则存在转义缺陷（如 `/\\\begin/` 中 `\b` 被解析为词边界、`/\\\section/` 中 `\s` 被解析为空白、`/\\\frac/` 中 `\f` 被解析为换页符），会让写作工程永远编译失败或预览为空。为不改只读数据文件，页面在 `latexEngine.js` 提供等价且修正后的实现，写作主链（诊断/解析/分页/PDF 文档）全部走该实现；数据层仍负责内容、`writingProjects.patches/assets`、问答与阅读数据。
3. **PDF 安全字形**：导出前调用数据层 `pdfSafeText()`（剔除离线 CJK 子集缺少的字形），并把 `é` 映射为 `e`（子集字体无该字形，否则 PDF 缺字）；因此 PDF 中 “Céa” 显示为 “Cea”，“⊂/≤/‖/−” 等按数据层规则替换为可渲染文本。
4. **自定义项目与壳层**：`ResearchShell` 的项目下拉只列数据层的 3 个内置项目（壳层只读），页面在左栏项目卡提供「⇄ 切换项目」覆盖新建项目；新建项目在阅读页展示空白态并给出下一步。

## 5. 与 Golden / 实拍的对照

- 栏宽采用 Golden 实测比例：READ `20.5% / 1fr / 36.3%`（≈343/721/607 @1672），WRITE `18.3% / 1fr / 18.8%`（左栏 306、Agent 314；中栏内部 56%/44% = 编辑器 590 / 预览 462）。与 `VISUAL-SPEC` §1.4–1.5 的栏宽要求一致（READ 左栏沿用 Golden 实测 343px，比 SPEC 文本 323 更贴近原图）。
- 复用 `--rw-*` tokens 与 `rw-*` 类；页面级样式全部 `<style scoped>`；无新增依赖、无网络请求。
- 已知视觉差异：① 壳层由前序代理固定（顶栏已含「阅读/写作」切换与项目胶囊），故 Golden 中「Header 中槽的编译控制条」在本实现中下移为写作页顶部编译条；② 阅读区段落内联数学按数据层纯文本呈现（数据 block 为纯 Unicode 文本），公式 block 用 KaTeX 渲染；③ 预览分页为估算（本样张 2 页），真实 PDF 按排版生成（本样张 1 页），两者指向同一 `lastSuccess` 版本。
- 实拍对照：`evidence/live/run-01/research/ui/` 的 g2-3-20/21/23/24/25/26 显示真实工作台 READ 的 PDF 区为空白（已知系统缺陷/中断），本实现按验收要求补制了可点选的纸面与可回跳证据；Agent 面板头、上下文 chips、能力入口布局对齐实拍与 Golden。

## 6. 验收命令与证据

```powershell
# 1) 启动（本代理期间常驻）
pnpm dev --port 5206

# 2) 自动化主链（53 项断言 + 截图 + PDF）
C:\python13\python.exe qa\research-ui\qa_research_ui.py

# 3) 构建
pnpm exec vite build --outDir dist-research-ui
```

| 证据 | 路径 |
|---|---|
| 自动化结果（53/53） | `qa/research-ui/qa-result.json` |
| 截图 17 张（1672×941 DPR1） | `qa/research-ui/01-home.png` … `17-home-final.png`（命名见 §3 顺序） |
| 导出 PDF | `qa/research-ui/artifacts/research-write-export.pdf` |
| PDF 校验 | `qa/research-ui/artifacts/pdf-check.txt`（pages=1，size=26007，文本含标题/摘要/正文） |
| 构建产物 | `dist-research-ui/` |

关键截图索引：`01-home`（启动页）、`03-read-selected`（选中段落）、`04-read-agent-answer`（结构化回答）、`05-read-located`（定位原文）、`06/07`（笔记弹层/保存）、`08-read-after-reload`（刷新仍在）、`09-read-formula-check`（公式检查）、`11-write-success`（初始编译成功）、`12-write-error`（可恢复错误 + 日志 + diff）、`13-write-recovered`（修正成功）、`14-write-citation`（引用补全）、`15-write-after-reload`（持久化）、`16-new-project-write`（新建项目）、`17-home-final`（项目卡与笔记）。

## 7. 未完成 / 限制（不阻塞验收）

1. 写作工作区未实现 Golden 编辑器工具条中的「查找替换全部 / 自动换行开关」，也没有富文本编辑器的完整撤销栈（textarea 原生 undo/redo 可用）；已实现行号、语法着色、保存标记、插入片段、文件查找与日志定位。
2. 阅读纸面为数据驱动的分页排版（非 PDF 渲染）；未实现套索/多选/跨页选中，选中粒度为段落。
3. 写作预览分页为高度估算，与导出 PDF 的物理页数可能不同（本样张 2 vs 1），但预览与下载均引用同一编译版本。
4. 新建项目只落在 `store.ext.researchUi.customProjects`（本机持久化）；壳层项目下拉不感知（壳层只读），需从阅读页项目卡切换。
5. 离线演示不包含真实模型调用；Agent 回答均为数据层审核结论/规则结论，界面已明确标注。
