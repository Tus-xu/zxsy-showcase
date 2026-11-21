# G2-3 科研端三场景（阅读问答 / 公式条件 / 写作编译）· run-01

- 采集：runtime-collector · 2026-11-21 02:50–03:25（+08:00）
- 账号：科研演示手机号 13800001003（林知远，researcher 已批准）；正常 UI 登录
- 项目：`e49b27e2-b05f-45c3-ac99-dd0792d9ab80`（本轮 UI「新建项目」创建，未命名）
- 浏览器：Chromium 153.0.8010.12，1672×941、DPR 1

## 0. 自撰演示材料（3 份 PDF，非外部论文）

| 文件 | 页数 | size | SHA-256 |
|---|---|---|---|
| `research-01-cea-lemma.pdf`（Céa 引理与变分形式） | 4 | 6658 | `716AF7AF30B5578CD36166F5C15205088071855DC1713D95174CC651817AC2EF` |
| `research-02-formula-conditions.pdf`（√(x²)=x / 约分 / 配方 三公式条件） | 4 | 5854 | `DF56ED785C72A21B96A82252CF19F3A5C4EFD66C7E36B2CDB09CCBD2277FD728` |
| `research-03-writing-example.pdf`（写作示例与 LaTeX 摘录） | 2 | 5043 | `F3A9D32CF5A92E5E31A4E8C5DD502E722A389E5765569E7B0461257FBE1B2222` |

生成方式：reportlab + STSong-Light（脚本 `.work/scripts/g2_research_pdfs.py`）；PDF 内明确标注「本文为展示项目自撰的演示讲义（非外部论文、非教材原文）」。

## 1. 导入（成功）

| # | 操作 | 结果 | 截图 |
|---|---|---|---|
| 1 | `/research-workspace` → ＋新建项目 | 真实创建项目并进入 READ | `g2-3-01-landing.png`、`g2-3-02-project-read.png` |
| 2 | READ 左栏「文献列表」右上 `＋`（aria-label=导入 PDF）→ 文件选择器 | 逐份导入 3 份 PDF；每份导入后 `文献列表` 从 0→3，AI 项目概览自动生成（基于 3 篇材料） | `g2-3-10-import-1/2/3-picked.png`、`g2-3-11-import-*.png`、`g2-3-12-after-imports.png` |

最终状态：`3 文献 0 草稿 0 笔记 0 数据`；左栏三份文献均可展开/打开；中栏出现 PDF 标签页与页码 `1 / 4`、缩放 `160%`。

## 2. 阅读问答 / 笔记（受阻）

| # | 操作 | 结果 | 截图 |
|---|---|---|---|
| 3 | 打开 `research-01-cea-lemma.pdf` | 阅读器页框出现（4 页、缩放 160%），但**画布区域全白、没有任何页面内容**；`.textLayer` 内 span 数 = 0（脚本 `g2-3-20`、`g2-3-21` 时采集） | `g2-3-20-pdf-open.png`、`g2-3-21-selected.png` |
| 4 | 尝试在 PDF 上选中段落（真实 mouseup 选区 + 程序化 Range 选区） | 文本层为空，无法产生选区；`评判/解释/找证据/笔记` 工具条不出现（`selection.ok=false, spans=0`） | `g2-3-21-selected.png`、`g2-3-23-agent-final.png` |
| 5 | 尝试直接点 Agent 面板「评判选中内容」 | 提示需要先选中内容；没有可派生的 selection | `g2-3-23-agent-final.png` |
| 6 | 尝试新增笔记 | 依赖选中文本（「阅读时选中文字即可添加」），无法进行 | `g2-3-24-note-open.png`、`g2-3-25-note-saved.png` |

**终点**：导入与项目结构成功，但 **READ 工作区 PDF 渲染失败（画布空白 + 文本层为空）→ 选段提问、证据定位、笔记三大场景全部不可用**。刷新后仍空白（`g2-3-26-after-reload.png`）。

## 3. 写作与编译（受阻）

| # | 操作 | 结果 | 截图 |
|---|---|---|---|
| 7 | `/research-workspace/<id>/write` | 工作区渲染：文件树、论文结构（提示「创建 main.tex 并使用 \section…」）、编辑区占位「选择文件开始编辑」、编译日志 0 错误 0 警告 0 信息 | `g2-3-30-write-initial.png` |
| 8 | 点「新建文件」（aria-label=新建文件）→ 命名 main.tex | `main.tex` 出现在文件树与工具栏入口 | `g2-3-50-new-file.png`、`g2-3-51-after-name.png` |
| 9 | 点击 CodeMirror 编辑区（`.cm-content`）输入 LaTeX | 点击超时（元素存在但不可交互/不可见），未能写入正文 | `g2-3-31-editor-failed.png`、`g2-3-52-typed-doc-failed.png` |
| 10 | 点「重新编译」 | 返回「编译失败」；无文件内容可编译，编译日志仅 0 错误 0 警告（错误详情不可见） | `g2-3-53-after-compile.png` |

**终点**：写作区能加载但没有可编辑文件时编辑器不可交互；未完成「编辑→保存→编译→PDF」及「可恢复编译错误→修正」链路。属**本轮受阻**，不是确证产品缺陷（可能由项目无初始文件/hidden 状态导致，需主人复验）。

## 缺陷

### G2-3-D1 PDF 阅读器画布空白、文本层为空，选段/证据/笔记不可用
- 锚点：`g2-3-20-pdf-open.png`、`g2-3-21-selected.png`、`g2-3-26-after-reload.png`
- 现象：页框/页码/缩放正常，但画布区全白；`.textLayer` span=0；无法选中任何文字。
- 影响：科研端最核心的「读论文—选区提问—回到证据页」链路不可用。

### G2-3-D2 写作区未选文件时编辑器不可交互、编译错误详情不可见
- 锚点：`g2-3-30-write-initial.png`、`g2-3-31-editor-failed.png`、`g2-3-53-after-compile.png`
- 现象：`.cm-content` 存在但点击超时；main.tex 创建后仍无法输入；编译失败但日志 0 错误。
- 影响：写作与编译场景本轮无法完成取证。

### G2-3-D3 项目名未命名/项目概览信息与导入后的项目状态不同步（轻）
- 锚点：`g2-3-12-after-imports.png`、`g2-3-20-pdf-open.png`
- 现象：项目名一直显示「未命名项目」；AI 概览已基于 3 篇材料生成，但名称/描述仍空。
