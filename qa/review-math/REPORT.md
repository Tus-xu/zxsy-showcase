# 数学与内容独立评审报告（review-math）

- 评审角色：独立数学与内容评审（与实现者分离；**未修改任何产品代码**）
- 评审时间：2026-11-21 03:15–03:45（+08:00）
- 工作目录：`D:\zxsy-math-arena-showcase`
- 产出位置：仅 `qa/review-math/`（本报告 + `tmp/` 复核脚本、快照、日志）
- 依据：
  - 数学基准（封存）：`evidence/solutions/sealed/math-baseline.md` / `.json`（A=D/2√2；B={B,D}；C=61/25=2.44）
  - 两名独立解题者：`evidence/solutions/blind/solver-1|2/solutions.md`（SHA-256 已核对）
  - 三题手册：`D:\zxsy-math-arena\docs\superpowers\plans\2026-11-21-guided-solving-cases.md`
  - 方案 §5 内容终审：`D:\zxsy-math-arena\docs\superpowers\plans\2026-11-21-offline-showcase.md`
  - 真实平台实拍与缺陷：`evidence/live/run-01/student/guide/{A,B,C}/{defects.md,transcript.md,99-final.png}`、`G1-SUMMARY.md`、`evidence/curation.csv`

## 0. 结论摘要

| 维度 | 结果 |
|---|---|
| 评审对象 | 6 项：`guidance.js`、`practice.js`、`courseware.js`、`research.js`、`submissions.js`、`GuideView.vue` 判分交叉检查 |
| 检查点 | **45 项：PASS 27 / FAIL 12 / RISK 6**（另有 7 条补充 RISK 见 §5） |
| 高严重度 FAIL | 4 项：变式判分把错答判对（F1）、B 文本步“不垂直”被判对（F2）、A 收束步泄底（F3）、三份答卷图片缺字（F4） |
| 结论 | **需返工（小范围修复后可发布）**。数学基准与三题结论本身全部正确；问题集中在“判分实现误判 / A 收束泄底 / 答卷素材缺字 / 若干文案与容差”。 |

> **R2 复验状态（2026-11-21 04:25）：主控已修复 P0/P1；§8 逐条复验。7 项已消除、3 项部分消除、1 项部分且引入 1 处回归；剩余 FAIL 4 项，判定“仍需返工”。原始 §2–§7 保留为首轮记录。**

> 版本说明（评审快照）：
> - `guidance.js` SHA-256 `E254FFED…FDF3C`（3:30 前未再变）；`GuideView.vue` 2:36；`practice.js` `9B166B3D…29AB3`；`courseware.js` `AF5E50E8…BD3E7`；`submissions.js` `A57E2B8B…14E23`。
> - `research.js` 评审快照 SHA-256 `B5838441…9474`（3:19；22:59 备份 `temp/research.bak.js`）；3:33 有实现性改动（新增 `p-abstract` 块 id，正文数学未变），3:36 哈希 `AD8ECE26…A8DB`，行号以 3:36 状态为准。
> - 评审期间 `ResearchRead.vue` / `ResearchWrite.vue` 由 3:35 起从占位页变成完整实现（81 KB/84 KB），故科研端“页面渲染效果”不在本次数学评审的已验证范围内，仅按数据与实现代码判断（见 R7/R8）。

---

## 1. 独立复核（不抄基准，另行计算）

三题原图与双盲解哈希均核对一致：`q1/q2/q3.png` 与 `solver-1|2/q1..q3.png` 的 SHA-256 等于封存值；`solver-1/solutions.md`=`CBE9FFFF…1DC1`，`solver-2/solutions.md`=`FECC286D…860A`，与 `math-baseline.json` 记录一致。

### A · 双曲线离心率
- 2b=√7·2a ⇒ b/a=√7；c²=a²+b² ⇒ e²=1+(b/a)²=1+7=8 ⇒ e=2√2=√8，选 D。
- 选项反解检验：e²−1 分别为 1、3、6、7，仅 D 得 √7。
- 变式：e=2 ⇒ b/a=√3（A-v1）；b/a=2 ⇒ e=√5≈2.23607（A-v2）。均自洽。

### B · 正三棱柱线面关系（坐标法，独立复算）
取 D=(0,0,0)、B=(−1,0,0)、C=(1,0,0)、A=(0,√3,0)、A₁=(0,√3,h)、B₁=(−1,0,h)、C₁=(1,0,h)，对 h=1、2.7、10 三点复算：
- AD·A₁C = 3 ≠ 0（A 假）；AD 与 A₁B₁ 不平行（C 假）。
- BC·AD = BC·AA₁ = 0 且两线相交于 A ⇒ BC⊥平面 AA₁D（B 真）。
- CC₁∥AA₁⊂平面 AA₁D，C∉平面 ⇒ CC₁∥平面（D 真）。
- 结论 {B,D}；只选 B 或只选 D 为部分正确，与基准一致。
- 变式复核：B-v1（D 为 BC 的三等分点）BC·AD = −2/3 ≠ 0 ⇒ “BC⊥平面 AA₁D”不成立；B-v2 CC₁⊥AD 成立；练习 B-v1 答案 A、C、D；练习 B-v2 答案 C（异面且不垂直）。

### C · 有放回取三次的期望
- 枚举全部 125 个有序结果：X=1:5、X=2:60、X=3:60 ⇒ E(X)=(5+120+180)/125=305/125=61/25=2.44。
- 指示变量：5(1−(4/5)³)=5·61/125=61/25；尾和：1+24/25+12/25=61/25。
- 典型错答复现：3（无放回）、61/125（漏乘 5）、183/125=3(1−(4/5)³)、69/25=2.76（P(X=2) 用 C(5,2)·2³=80 未扣三次全同）。
- 变式：C-v1 无放回 X≡3、E=3；C-v2 有放回四次 E=5(1−(4/5)⁴)=369/125=2.952（枚举 4 次亦得 5/140/360/120 → 369/125）。

### research.js 数学复核
- √(x²)=|x|；x=−2 反例（左=2、右=−2）成立；约分 (x²−1)/(x−1)=x+1（x≠1，x=1 无定义）成立；配方恒等式 x²+2bx=(x+b)²−b² 对一切实数成立（b=2 的 5 组抽样左右值全部相等）。
- Céa 引理条件与结论正确：a 连续（M）、V-椭圆（α>0）、V_h⊂V，‖u−u_h‖_V ≤ (M/α)inf‖u−v_h‖_V；证明中 Galerkin 正交性 + 连续性/椭圆性两步正确，M/α 常数来源可核对。
- fem-num 表 1/表 2 的 e_h、e_h/h、e_h/h² 三列自洽（e_h/h≈0.446–0.448；e_h/h²≈0.1997–0.2048）。

### LaTeX 可编译性
- 用页面实际使用的 `src/components/research/latexEngine.js`（`normalizeFiles+compileProject`）编译 4 个写作工程：`p-fem` 0 error/2 warning（`\cite{Cea1971}` 未在 refs.bib，属设计中的“引用补全”演示）；`p-condition`、`p-writing`、新建模板 0 error 0 warning；对 p-fem 应用 `qed-close` 补丁后出现预期的 `\qedhere` 未定义错误；执行修复路径后可通过。
- 3 个 formula 块的 `tex` 用 KaTeX 严格模式渲染成功；全量 508 个行内数学段（guidance/practice/courseware/submissions）KaTeX 全部可渲染、0 语法错误（`tmp/logs/katex-check.log`）。

---

## 2. 逐项判定（45 个检查点）

### 2.1 `src/data/guidance.js`（对象判定：FAIL）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| G1 | 三题题面/选项/OCR/最终结论与封存基准一致（A=D/2√2，B=B、D，C=61/25） | PASS | 数据逐字核对；`qa/acceptance/03-A-final.png`、`06-B-final.png`、`08-C-final.png` |
| G2 | A 两步推导、A-v1/A-v2 变式数学正确 | PASS | 独立复算（§1-A） |
| G3 | A 结论卡（①2b=√7·2a ②c²=a²+b² ③e²=8 ④e=2√2 选 D）与基准一致 | PASS | `guidance.js:143-150` |
| G4 | A 收束步不泄底 | **FAIL** | `guidance.js:101` 回复已算出 e=2√2；`:113` 的 ask 又写“e=√8=2√2，对应哪个选项？”；`qa/acceptance/03-A-final.png` 可见学生在点 D 之前答案已完整出现 |
| G5 | A 步骤等价表达可判（含本步提示给出的写法） | **FAIL** | `guidance.js:44` 不接受“2b=√7·2a”（中点乘号；而 `:68` 的提示原文就是 `2b=\sqrt7\cdot2a`）与“2b=2√7a”；`:78` 不接受交换律写法 c²=b²+a²（`tmp/logs/guidance-test.log`） |
| G6 | B 多选完整性与部分正确（任意顺序组合 B、D；只选 B/D=部分正确；全选=错） | PASS | `guidance.js:275-302`；`qa/acceptance/07-B-partial.png` 显示“B 已经保留，再检查 D…”；`qa/student-practice/practice-04-partial-B.png` |
| G7 | B 文本步否定式判分不误判 | **FAIL** | `guidance.js:212`、`:233` 正则仅为 `(垂直|⊥)`；“不垂直”“AD 与 BC 不垂直”“这条线不垂直于底面”均被判 correct（`tmp/logs/guidance-test.log`） |
| G8 | B s3 单选遇到真实成立的 D 项时反馈措辞 | RISK | `guidance.js:264`“D 项可能也成立”→D 实为确凿成立，应说“也成立，但不是由线面垂直判定直接得到，下一步专门检查 D” |
| G9 | C 指示变量/补事件/线性性逻辑正确 | PASS | 独立枚举与尾和复核（§1-C）；结论卡 `guidance.js:451-460` |
| G10 | C 判分覆盖（正确等价、典型错答、未收录） | **FAIL** | `guidance.js:413`：正确输入“1−64/125”被 partial 规则命中，回复却说“64/125 是一次都没出现的概率…要取补事件”，等于把正确表述当错误；`:425-447` 典型错答分支缺 69/25（基准列出） |
| G11 | 三题变式（A-v1、A-v2、B-v1、B-v2、C-v1、C-v2）题面/答案/解析数学正确 | PASS | 独立复算（§1 各题）；`1.732` 作为 √3 近似可接受 |

### 2.2 `src/data/practice.js`（对象判定：FAIL）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| P1 | 9 题（三道原题+6 道变式）题面/答案正确 | PASS | 独立复算：A-orig D；A-v1 √3 倍；A-v2 √5；B-orig B、D；B-v1 A、C、D；B-v2 C；C-orig 61/25；C-v1 3；C-v2 369/125 |
| P2 | 选择/多选判分与部分正确语义（只选 B → partial；全选/错选 → wrong） | PASS | `judgePracticeItem` 选择分支逻辑正确；`tmp/logs/practice-test.log` |
| P3 | 填空等价与数值容差 | **FAIL** | `practice.js:69-75` 容差 0.02：C-orig 输入 2.43/2.45 被判 correct（精确答案 2.44）；A-v2 输入 2.22/2.26 判 correct（√5≈2.236）；C-v2 2.97、C-v1 3.01 亦被接受；基准明确“2.4 不接受”，此实现对错误值放行 |
| P4 | 解析文字数学正确 | **FAIL** | `practice.js:362` B-v2 解④：“由 z 分量得 λ=0，与 x 分量 0=λ 矛盾”——λ=0 时 x 分量 0=0 并不矛盾（真正矛盾在 y 分量 −√3=−λ√3 ⇒ λ=1，或 AD=λA₁C=0 与 AD≠0）；`practice.js:470-471` C-v2 错因称 64/625 是 (4/5)⁴ 的中间量，实际 (4/5)⁴=256/625 |
| P5 | 错因反馈覆盖（A：C/A/B；C：3、61/125、183/125、69/25、64/125） | PASS | `practice.js:242-255,390-413`；未收录输入有通用解析与完整解答 |
| P6 | 记录/统计/组卷字段自洽（firstCorrect、partial 半分） | PASS | `groupStats` 以 correct+0.5·partial 计分，字段与页面一致 |

### 2.3 `src/data/courseware.js`（对象判定：FAIL，轻微）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| C1 | 椭圆 a=5,b=3 ⇒ c=4、e=4/5、长轴 10/短轴 6/焦距 8 | PASS | `courseware.js:66-69`；独立复算 |
| C2 | 二次函数 2x²+8x+5=2(x+2)²−3，顶点 (−2,−3)，最小值 −3；“2×4 要减掉”说明正确 | PASS | `courseware.js:113-116,286`；展开复算 |
| C3 | 集合：含 n 元集合 2ⁿ 个子集、2ⁿ−1 个真子集；∅⊆A；∅ 与 {∅} 区分 | PASS | `courseware.js:176-183` |
| C4 | 蓝图集合例题“讲评提示”的 ∅ 表述 | **FAIL** | `courseware.js:310`：“空集计入子集数，但不是真子集（自身不是真子集）”——对 {a,b,c} 而言 ∅ 确是真子集（∅≠{a,b,c}）；只有集合自身不是真子集。DesignPane 会展示该 note（`DesignPane.vue:76`） |
| C5 | 三课时教学目标/流程/时长/页数一致 | RISK | 时长均合计 45 分钟、课件页数 6/5/5 与教案一致；但椭圆教案目标写“掌握标准方程的两种形式”（`:203`），课件与流程只有焦点在 x 轴的一种形式（`:57-61`、`:206`） |
| C6 | 参数联动页改参后图形/公式/标注一致（方案 §5“实际支持改参的页面还要实拖并复核新值”） | **FAIL** | 静态文案与派生量矛盾：`courseware.js:67-68,114-115,222` 写死 a=5,b=3、2x²+8x+5、顶点(−2,−3)；`SlideCanvas.vue:177-198` 主公式/导语仍用静态文本，只有副公式用 derived；`prepPublish.js:510-519` 改参不改文案。`qa/teacher-prep/16-quadratic-ppt.png` 同时显示“以 y=2x²+8x+5 为例…顶点(−2,−3)”与“当前参数 y=3(x−1)²−4，顶点(1,−4)” |
| C7 | 三课例题答案正确（椭圆 10/8→x²/25+y²/9=1；二次配方；集合 8/7） | PASS | `courseware.js:261-265,283-289,305-311`；复算 |

### 2.4 `src/data/research.js`（对象判定：FAIL，数学核心 PASS，文字级 1 处 FAIL）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| R1 | 三份自撰讲义的数学表述（√(x²)/约分/配方）正确、反例与条件准确 | PASS | `research.js:674-750`；独立复算 |
| R2 | Céa 引理陈述/证明/条件（连续 M、α>0、V_h⊂V、M/α 与 h 无关）正确 | PASS | `research.js:151-238`；标准结论核对 + 证明逐步复算 |
| R3 | 公式检查三案例结论/反例/数值核验正确 | PASS | `research.js:1076-1147`；sqrt/cancel/complete-square 均复算通过 |
| R4 | fem-num 表注列号与表头一致 | **FAIL** | 表 1/表 2 表头均只有 3 列（h、e_h、e_h/h 或 e_h/h²），但 `research.js:489`、`:514` 两处写“第四列”；阅读页直接展示 note（`ResearchRead.vue:237`） |
| R5 | 论文章节/页码/块引用可逐条定位（含 fem-cea-4-3） | PASS | `fem-cea-4-3` 经 findBlock 序号回退解析为第 4 页 (2.2) 式；qa/seedNotes 页码与块一致 |
| R6 | LaTeX 示例可编译、公式可渲染 | PASS | §1“LaTeX 可编译性”；`tmp/logs/latex-engine.log` |
| R7 | 摘要/真实 LaTeX 依赖说明的准确性 | RISK | “所有命题都在有限维子空间上讨论”（`:135`）不准确（Lax–Milgram 在无限维 V 上）；写作讲义称删 `\qedhere` 即可修复（`:950,969`），但 `proof` 环境本身也依赖 amsthm，真实 XeLaTeX 下删除该命令后仍会报错（离线引擎把 proof 当基础环境，故演示内可通过） |
| R8 | 数据层与页面层两套 LaTeX 引擎一致性 | RISK | `research.js:1634-2126` 仍保留一套数据层实现，其正则被写成 `\\\begin`/`\\\frac` 等（JS 中 `\b`、`\f` 被解释为控制符），实测 `validateLatexProject(p-fem)` 报 8 个假错误、`parseLatexProject` 章节为空；当前页面已改用 `latexEngine.js`（`ResearchWrite.vue:492-500`），该数据层引擎是死代码，但保留会误导后续维护 |

### 2.5 `src/data/submissions.js`（对象判定：FAIL）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| S1 | 三份答卷内容与三条基准一致（A 完整正确；C 卷（sub-B）误算 E=3；B 卷（sub-C）选 A、B 漏 D） | PASS | 三张答卷图片逐行核对（`sub-A/B/C.png`） |
| S2 | rubric 合计=满分；sub-A 5/5、sub-C 2/5 与细则可复算 | PASS | 2+2+1=5；sub-C：B 项 2 分 + 排除 A/C 0 分 + D 0 分 =2 |
| S3 | 系统建议分与评分细则自洽 | **FAIL** | `submissions.js:43-49`：sub-B 细则为 1+2+2；答卷原文“X 表示三次中取出的球的个数”、结论 E(X)=3 ⇒ 三条细则均未达成，按细则应 0（最多 1）；`systemScore: 2` 与 `systemComment` 无法由细则推出；`主持人手册.md:66` 还把“建议 2 分”写进演示脚本；`qa/teacher-grading/REPORT.md:33` 据此验收通过 |
| S4 | 答卷图片数学可读性 | **FAIL** | `scripts/make_submission_images.py` 用 SimKai 渲染 `²`、`₁`，字体无字形：sub-A 显示“c□=a□+b□”“e□=c□/a□=1+(b/a)□”；sub-C 显示“A□C”“AA□D”“A□B□”。`qa/acceptance/15-student-homework-review.png`（主线镜头 4 学生回看）肉眼可见；`release/素材/sub-A|C.png` 哈希与源码资产相同，缺陷随包 |
| S5 | 题面/题号/班级/提交时间字段一致 | PASS | sub-A 第 3 题、sub-B 第 14 题、sub-C 第 9 题与基准一致 |
| S6 | id/caseId 命名与跨端映射 | RISK | `sub-B` 的 caseId 是 C 题、`sub-C` 的 caseId 是 B 题（按“第 2/3 份答卷”命名）；`classroom.js:252-254` 按 id 映射题名，当前显示不错，但极易在后续引用中错位 |

### 2.6 交叉检查：`src/ends/student/GuideView.vue` 判分实现（对象判定：FAIL）

| # | 检查点 | 判定 | 证据 |
|---|---|---|---|
| X1 | 选择题按选项集合精确判分（A s4 单选；B s3 单选；B s4 多选） | PASS | `submitChoice` 用排序后集合严格相等（`GuideView.vue:398-427`）；只选 B/只选 D 命中 partial，全选命中 wrong |
| X2 | 变式填空判分不把错答判对 | **FAIL** | `GuideView.vue:475-477` 使用 `norm===an ∥ norm.includes(an) ∥ an.includes(norm)` 双向子串匹配：B-v1 答“成立”被判对（答案“不成立”）；B-v2 答“不成立”被判对；A-v1 答“3”“1.7”、C-v2 答“125”“369”“2.9”均被判对（`tmp/logs/guidance-test.log`） |
| X3 | 变式单选判分（A-v2） | PASS | `GuideView.vue:471-473` 单选题按 key 精确比较 |
| X4 | A 题选项 C 与 C 题输入“C”是否串台/误判 | PASS | 三题按路由 caseId 隔离，输入/选项互不复用；A s4 选 C 命中 A 的错误规则并给出“C 项√7 是 b/a 不是 e”的正确诊断；C 题为填空，无字母选项混淆路径 |
| X5 | 未匹配输入保留草稿、不伪造成功；未匹配组合有明确失败反馈 | PASS | `GuideView.vue:378-382`（保留表述并索要中间量）、`:419-425`（组合错误提示并清空选择） |
| X6 | 判分记录/错题本联动 | PASS | wrong 分支同时累加 wrongCount 并写 `addErrorRecord(caseId, input, stepId)`；不把 correct 写入错题 |
| X7 | 平台实测缺陷在展示版的修正情况 | RISK | 8 条实拍缺陷中 7 条已被展示版逻辑覆盖（详见 §4），但 A 收束引入新的泄底（G4），B-D1 采用“有意改写”而非复刻平台结构化面板，需在来源台账写明“未复刻该面板” |

---

## 3. FAIL 清单与最小修正建议（按严重度）

> 行号以 2026-11-21 03:36–03:45 文件状态为准。复核脚本与日志：`qa/review-math/tmp/`（`test_guidance.mjs`、`test_practice.mjs`、`test_katex.mjs`、`test_latex_engine.mjs`、`verify_math.py`，日志在 `tmp/logs/`）。

### F1【高】变式填空判分：把相反/错误答案判对
- 文件:行号：`src/ends/student/GuideView.vue:475-477`（判分实现）；数据：`src/data/guidance.js:319-334`（B-v1/B-v2）、`:154-160`（A-v1）、`:472-478`（C-v2）
- 错误内容：`norm.includes(an) || an.includes(norm)` 双向子串匹配。实测：B-v1 答“成立”→判对；B-v2 答“不成立”→判对；A-v1 答“3”或“1.7”→判对；C-v2 答“125”“369”“2.9”→判对。
- 为什么错：“不成立”包含“成立”，子串包含不等于等价；短输入只要被答案包含即通过。演示中嘉宾在“举一反三”里输入相反结论会被打钩，直接违背“不把错误答案判对”。
- 最小修正：fill 判分改为**归一化后精确相等** `ok = v.accepts.some(a => normalize(a) === norm)`；需要数值的近似的（A-v1 1.732）在 `accepts` 里列全；单一判定需数值时用受限白名单。同时给 `normalize` 增加 `·→*`、`⋅→*`（见 F8）。

### F2【高】B 文本步：否定表述被判为正确
- 文件:行号：`src/data/guidance.js:212`（s1）、`:233`（s2）
- 错误内容：accept 正则 `(垂直|⊥)`；输入“不垂直”“AD 与 BC 不垂直”“这条线不垂直于底面”命中 correct。
- 为什么错：典型误解“AD 与 BC 不垂直”正是本题要纠正的对象，却被确认“对”，属把错误答案判对。
- 最小修正：改 `(?<!不)(垂直|⊥)` 或在 accept 前插入 wrong 规则 `(不垂直|不是垂直|不⊥)`，命中后回复“正三角形中 D 为中点时 AD 既是中线也是高，所以是垂直；再检查一次‘不’字”。

### F3【高】A 收束步泄底
- 文件:行号：`src/data/guidance.js:101`（s3 正确回复）、`:113`（s4 的 ask）
- 错误内容：学生答 e²=8 后，回复直接给出“e>0，所以 e=√8=2√2”；下一步 ask 又写“最后一步：e=√8=2√2，对应哪个选项？”。学生实际只需点字母 D，全部推理已在题面/回复里给出。
- 为什么错：方案要求“引导不泄底、最后一步让学生自己收束”；`qa/acceptance/03-A-final.png` 显示答案在点选前已完整出现，嘉宾可直接看出。
- 最小修正：`:101` 回复改为“对，$e^2=8$。那么 $e$ 本身是多少？（注意 $e>0$）”；`:113` 改为“$e^2=8$ 且 $e>0$，求出 $e$，再对应选项。”——不要在 ask 中写 e=2√2。

### F4【高】三份答卷图片缺字（数学式子变成 □）
- 文件:行号：`scripts/make_submission_images.py:24-25`（sub-A 的 `c²=a²+b²`、`e²=c²/a²=1+(b/a)²`）、`:50-54`（sub-C 的 `AA₁D`、`A₁C`、`A₁B₁`）；产物：`src/assets/submissions/sub-A.png`、`sub-C.png`（`release/素材/` 同名同 hash 副本）
- 错误内容：PIL 用 `simkai.ttf` 渲染，该字体无 `² ³ ⁴ ₁ ₂ −` 等字形，渲染为方框；sub-A 显示“c□=a□+b□”“e□=c□/a□=1+(b/a)□”，sub-C 显示“A□C”“AA□D”。
- 为什么错：教师批改页与学生回看页（主演示镜头 4）展示的“答卷原件”数学式不可读，被批改的“完整正确”答卷变成错式；`qa/acceptance/15-student-homework-review.png` 已肉眼可见。
- 最小修正：生成脚本改为 ASCII 安全写法：`c^2=a^2+b^2`、`e^2=c^2/a^2=1+(b/a)^2`、`A1C`、`AA1D`、`A1B1`（或改用有字形的字体 + 手动画上下标），重新生成 3 张图并同步更新 `release/素材/`。

### F5【中】sub-B 系统建议分与评分细则不自洽
- 文件:行号：`src/data/submissions.js:43-50`；连带 `主持人手册.md:66`、`qa/teacher-grading/REPORT.md:33`
- 错误内容：sub-B（第 14 题）细则为 1 分“正确理解 X 为出现过的不同号码种数”+2 分“转化为指示变量/分布列”+2 分“E(X)=61/25”；答卷原文把 X 定义为“三次中取出的球的个数”、结论 E(X)=3，三条均未达成，细则复算应为 0（最多 1），但 `systemScore: 2`，评语称“思路有方向”；手册还把“系统建议 2 分”写进台词。
- 为什么错：方案 §5 要求“批改用评分细则重算”；2 分无法由任何细则组合合理推出（若 2 分对应“转化指示变量”满分，与答卷不符；给 1 分与“错误 X 定义”也不符），演示中教师会当场发现建议分与细则矛盾。
- 最小修正（二选一）：①把细则拆成“识别有放回/可能重复(1)+X 概念(1)+指示变量/分布(1)+最终计算(2)”并将 `systemScore` 改为 1，评语同步；②保留原细则，`systemScore` 改 0 或 1 并改写评语。同步修改主持手册台词。

### F6【中】改参后页面“静态示例”与派生图形/公式互相矛盾
- 文件:行号：`src/data/courseware.js:67-68`（椭圆 s5 lead/equation 写死 a=5,b=3,c=4,e=4/5）、`:114-115`（二次 s3 lead/equation 写死 2x²+8x+5→2(x+2)²−3）、`:222`（二次教案板书同样写死）；机制：`SlideCanvas.vue:177-198`（主公式/导语静态、副公式派生）、`prepPublish.js:510-519`（改参只写 params）
- 错误内容：改参后同页同时显示“以 2x²+8x+5 为例…顶点 (−2,−3)”和“当前参数 y=3(x−1)²−4，顶点 (1,−4)”；`qa/teacher-prep/16-quadratic-ppt.png` 已实拍该矛盾。椭圆 s5 同理（a=10,b=6 时仍显示“取 a=5、b=3…c=4”）。
- 为什么错：方案 §5“实际支持改参的页面还要实拖并复核新值”；演示页是参数联动页（s5/二次 s3），嘉宾改参即见矛盾。
- 最小修正：把“含参数数值”的文案从 courseware 数据改为参数中立（如 s5 lead“拖动 a、b，观察焦点、长短轴与离心率如何联动”；equation“c=√(a²−b²)，e=c/a”；二次 s3 改为“以 y=ax²+bx+c 为例…”或由 derived 动态生成），默认值只出现在图形/派生区；或在 `SlideCanvas` 对 figure 页用 derived 覆盖主文案。

### F7【中】练习填空容差过松：错误数值被判对
- 文件:行号：`src/data/practice.js:69-75`
- 错误内容：`Math.abs(av - v) <= 0.02`。实测：C-orig 输入 2.43/2.45→correct（精确 2.44）；A-v2 输入 2.22/2.26→correct（√5≈2.236）；C-v2 输入 2.97→correct；C-v1 输入 3.01→correct。
- 为什么错：基准明确“近似值 2.4 不接受”；2.43 与 2.44 的 0.01 容差允许了真实错答；且 2.44 恰等于 61/25，无需容差。
- 最小修正：`<= 0.02` 改为精确比较（或 ≤1e-9）；所有需接受的近似写进 `accepts` 字面量（已列 2.236/2.24、2.952/2.95）。

### F8【中】A 题等价表达漏判（含提示自身给出的写法）
- 文件:行号：`src/data/guidance.js:44`（s1 accept）、`:68`（s1 hint）、`:78`（s2 accept）
- 错误内容：s1 不接受“2b=√7·2a”（提示原文写法，中点乘号）与“2b=2√7a”“2b=2a√7”；s2 不接受“c²=b²+a²”（交换律）。实测分别落入 partial/unmatched（`tmp/logs/guidance-test.log`）。
- 为什么错：学生照提示/自然写法回答会被判“还没到位”；方案要求接受题目允许的等价表达。
- 最小修正：`GuideView.normalize` 增加 `.replace(/[·⋅∙]/g,'*')`；s1 增加 `2b\s*=\s*2(√7|sqrt7)a`、`2b\s*=\s*2a(√7|sqrt7)` 备选；s2 增加交换律式 `b\^?2?\s*\+\s*a\^?2?\s*=\s*c\^?2?`。

### F9【中】C s3：正确输入“1−64/125”被误判为 partial 并给出错误解释
- 文件:行号：`src/data/guidance.js:413`
- 错误内容：partial 规则 `64\s*/\s*125` 先于其排除逻辑匹配“1-64/125”，回复“64/125 是一次都没出现的概率；题目要的是至少出现一次，用补事件”，把学生的正确补事件表达当成答了中间量。
- 为什么错：正确等价答案被误判为“部分正确/仍错”，且解释与输入相反。
- 最小修正：在 s3 accept 最前加正确规则 `^1\s*-\s*64\s*/\s*125$`（归一化后）或 `5\s*/\s*5\s*-\s*64/125`；将 partial 改为 `(?<!1-)64/125`。

### F10【低】练习 B-v2 解析④的“矛盾”指错分量
- 文件:行号：`src/data/practice.js:362`
- 错误内容：“由 z 分量 0=−λh 得 λ=0，与 x 分量 0=λ 矛盾”。λ=0 时 x 分量 0=0 不矛盾。
- 为什么错：解析的推理链不成立（结论 C 仍正确），会把“异面且不垂直”的证明讲错。
- 最小修正：改为“由 z 分量得 λ=0，于是 $\overrightarrow{AD}=\mathbf{0}$，与 $\overrightarrow{AD}\ne\mathbf{0}$ 矛盾；或直接由 y 分量 $-\sqrt3=-\lambda\sqrt3$ 得 λ=1，与 λ=0 矛盾”。

### F11【低】练习 C-v2 的 64/625 错因表述错误
- 文件:行号：`src/data/practice.js:470-471`
- 错误内容：“64/625 仍是‘一次都没出现’的中间量（(4/5)⁴ 的分母为 625）”。实际 (4/5)⁴=256/625，64/625 不是该中间量。
- 为什么错：错因解释本身算错，会误导学生；正确错因应是“64/625 是把 (4/5)⁴ 算错了”。
- 最小修正：改为“64/625 不是 (4/5)⁴：四次都没取到某号的概率是 (4/5)⁴=256/625；即使算对，也还要取补事件 1−256/625 再乘 5”。

### F12【低】research.js fem-num 表注“第四列”（表只有 3 列）
- 文件:行号：`src/data/research.js:489`、`:514`（3:36 版本行号）
- 错误内容：表 1 表头 `['h','误差 e_h','e_h / h']`、表 2 表头 `['h','误差 e_h','e_h / h^2']`，均只有 3 列；note 写“第四列 e_h/h 稳定在…”。
- 为什么错：阅读页直接把 note 显示给用户（`ResearchRead.vue:237`），列号与表格不符。
- 最小修正：“第四列”→“第三列”（`num-order` 的 keyPoints/note 已是“第三列”，保持统一）。

---

## 4. 平台实测缺陷 ↔ 展示版修正对照（单独列出）

| 实拍缺陷 | 展示版对应实现 | 是否修正 | 证据/说明 |
|---|---|---|---|
| A-D1 第二轮起丢题 | 确定性步骤机（无 AI 上下文依赖），步骤与题图常驻 | ✅ 已修正 | `guidanceFlow.js` + `GuideView.vue`；`qa/acceptance` A 主线 26/26 |
| A-D2 题设复述错（√7/2） | OCR/题面/结论卡均为正确表述 | ✅ 已修正 | `guidance.js:22,29-30,143-150` |
| A-D3 错答诊断失焦、跑错题 | A s1 wrong 分支聚焦“√7 是哪两条线之比、分子是什么” | ✅ 已修正 | `guidance.js:52-58`；`主持人手册.md:30` |
| B-D1 学生文字被当题面/面板无法推进 | 改为文本步 + 单/多选提交；不进入平台“圈点/填空”面板 | ⚠️ 有意改写（未复刻面板） | `G1-SUMMARY.md` 第 3 条曾提示“若还原引导流程需还原该面板”；本次采用策展补制是可接受决策，但来源台账需明写“未复刻结构化面板” |
| B-D2 只选 B 被判正确 | 多选提交 + `{B}`/`{D}` partial 分支保留已选并追问 D | ✅ 已修正 | `guidance.js:275-302`；`qa/acceptance/07-B-partial.png`；练习 partial 同样正确 |
| C-D1 丢题+串无关例 | 状态机全链（2、2、5→2 →64/125→61/125→61/25） | ✅ 已修正 | `guidance.js:356-448`；`qa/acceptance/08-C-final.png` |
| C-D2 收束轮未确认结论 | s4 正确后 finish，结论卡给 61/25=2.44 | ✅ 已修正 | `qa/acceptance/08-C-final.png` |
| C-D3 错答追问插入无关错题 | 错误回复只针对本题；错题记录另存 | ✅ 已修正 | `guidance.js:429-446` |
| **展示版新增（非平台缺陷）** | ① A 收束泄底（F3）；② 变式填空把错答判对（F1）；③ B 文本步否定式判对（F2）；④ 练习容差误判（F7）；⑤ 答卷图片缺字（F4）；⑥ sub-B 建议分与细则矛盾（F5）；⑦ 改参后图文矛盾（F6） | ❌ 新增问题 | 见 §3 对应条目；这些问题会让“已修正平台缺陷”的验收结论失效，必须先修 |

结论：8 条实拍缺陷中 7 条已由展示版逻辑覆盖，B-D1 为有意改写；但不能据此判“内容通过”，因为展示版自身引入了 F1–F7 的新问题。

---

## 5. 补充 RISK（不计入 §2 的 45 项）

1. **出处标注未经核实**：`guidance.js:18/185/345`、`TeacherAssign.vue:164`、`TeacherResources.vue:258` 将三题标为“2026 高考数学/高考原题”，但方案与 `evidence/` 只登记了题号与 SHA-256，没有任何试卷/年份证据；建议改为“演示题库原题（题n.png，SHA-256 已封存）”或先向用户核实后再写。
2. **A s3 的“8”正则过宽**：`guidance.js:101` `(^|[^0-9])8([^0-9]|$)` 会把“e=8”“8/25”等当 e²=8 接受；建议锚定到 e² 语境或只接受 `8`/`e²=8`。
3. **C 步骤典型错答覆盖缺口**：`guidance.js:386-397` 未为“(1/5)³”设专门诊断（方案 C 步骤提到该分支）；`:425-447` 缺 69/25。未收录有兜底，不阻塞，但建议补齐以贴合基准典型错答。
4. **B s4 未收录组合会清空选择**：`GuideView.vue:419-425` 对未收录组合（如 {B,C}）清空已选；建议保留合法已选项、只提示未收录项。
5. **research 公式检查的 NaN 展示**：`research.js:1101`（cancel-zero `computed: Number.NaN`）+ `ResearchRead.vue:364` 会渲染“左边 = NaN，右边 = 2”；建议改为“无定义”字符串。
6. **科研端页面处于评审期新实现**：3:35 才出现完整 `ResearchRead/Write.vue`，本次仅做了数据/引擎/公式层复核，页面级渲染与交互需由视觉/功能评审复验；`release/` 尚未重建。
7. **策展证据缺口**：`evidence/curation.csv` 的 CUR-001/002/003 最终证据指向 `qa/showcase/guide-A-final.png` 等，但 `qa/showcase/` 不存在；验收实际截图在 `qa/acceptance/`。需补产出或改引用，否则“来源覆盖 100%”不可证。
8. **说明**：`qa/student-practice/practice-04-partial-B.png` 已证明练习 B 的部分正确判分正确；`qa/teacher-prep/04-ppt-after-params.png` 的椭圆默认页（s3）改参三处同源正常，矛盾只出现在含静态示例数值的页面（椭圆 s5/二次 s3/s4）。

---

## 6. 需返工文件清单（按优先级）

| 优先级 | 文件 | 需要修的内容 |
|---|---|---|
| P0 | `src/ends/student/GuideView.vue` | 变式 fill 判分去掉双向子串匹配（F1）；normalize 增加 `·→*`（F8 附带） |
| P0 | `src/data/guidance.js` | B s1/s2 否定式（F2）；A s3 回复/s4 ask 泄底（F3）；A s1/s2 等价覆盖（F8）；C s3 partial 误判（F9）；可选：D 措辞（G8）、C 69/25（补充 RISK 3） |
| P0 | `scripts/make_submission_images.py` + `src/assets/submissions/sub-A.png`、`sub-C.png`（并同步 `release/素材/`） | 缺字 ²/₁ 改为 ASCII/有字形字体后重生成（F4） |
| P1 | `src/data/submissions.js`（连带 `主持人手册.md` 台词、`qa/teacher-grading/REPORT.md` 结论） | sub-B 建议分与 rubric 对齐（F5） |
| P1 | `src/data/courseware.js`（必要时 `SlideCanvas.vue`/`prepPublish.js`） | 参数联动页静态数值改为参数中立/派生（F6）；蓝图空集 note（F12）；椭圆目标“两种形式”与内容对齐（C5） |
| P1 | `src/data/practice.js` | 容差收严（F7）；B-v2 解析④（F10）；C-v2 64/625 错因（F11） |
| P2 | `src/data/research.js` | “第四列”→“第三列”（F12）；摘要措辞（R7）；`\qedhere` 修复说明补 amsthm/proof 依赖（R7）；删除或修复数据层重复 LaTeX 引擎（R8）；cancel-zero 的 NaN（补充 RISK 5） |
| P2 | 证据/流程 | `qa/showcase/*` 证据补齐或改引用（补充 RISK 7）；出处标注核实（补充 RISK 1）；`ResearchRead/Write` 页面实现完成后重跑科研端内容验收并重建 release |

## 7. 复核材料索引

- 快照：`qa/review-math/tmp/research.snapshot.js`（SHA-256 `B5838441…9474`）、`research.bak.js`（2:59 备份）
- 脚本：`tmp/extract.mjs`、`tmp/judge.mjs`（GuideView 判分逻辑等价副本）、`tmp/test_guidance.mjs`、`tmp/test_practice.mjs`、`tmp/test_katex.mjs`、`tmp/test_latex_engine.mjs`、`tmp/verify_math.py`
- 日志：`tmp/logs/guidance-test.log`（90 项：75 pass/15 fail）、`practice-test.log`（58 项：52/6）、`katex-check.log`（508 段/0 错）、`math-verify.log`（全部关键结论 PASS，含 69/25 复现）、`latex-engine.log`、`data-layer-engine-breakage.log`
- 截图证据：`qa/acceptance/03-A-final.png`（A 泄底）、`qa/acceptance/07-B-partial.png`（B 部分正确已修）、`qa/acceptance/08-C-final.png`（C 收束已修）、`qa/acceptance/15-student-homework-review.png`（答卷缺字）、`qa/teacher-prep/16-quadratic-ppt.png`（改参图文矛盾）、`qa/student-practice/practice-04-partial-B.png`（练习部分正确）

—— REVIEW-MATH-DONE ——

---

## 8. 复验轮次（R2）：主控 P0/P1 修复后的独立复验

- 复验时间：2026-11-21 04:08–04:25（+08:00）
- 复验方式：重新抽取当前数据 → 按新版 `variantMatches`/`stay` 逻辑更新判分副本 → 重跑判分与数学脚本 → 在**重新打包的 release** 上用 Playwright 实点复核参数页（未修改任何产品代码）。
- 复验时版本（稳定未再变）：
  - `guidance.js` `D1369E28…BD85`（3:55）、`GuideView.vue` `13DDF6EF…6240`（3:55）、`practice.js` `0B2D4F14…B92A`（3:48）、`courseware.js` `68C1F792…D0A7`（3:47）、`submissions.js` `857C3BBE…A4055`（3:42）、`research.js` `9793B357…E487`（3:48）、`SlideCanvas.vue` `F67AF400…892A`（3:47）；`prepPublish.js` 未变（2:55）。
  - `release/` 已重建（3:55:35，含新代码与新答卷图，`release/素材/sub-A|C.png` 与源码资产 hash 相同）；`qa/acceptance` 于 3:59–4:01 重跑，**37/37 PASS**，A 主线已改为 `8 → 2√2 → D` 两段式并留实拍。
- 复验用例：`tmp/test_recheck.mjs`（75 项非风险检查 + 15 条 RISK 记录）、`tmp/test_practice.mjs`（58/58）、`tmp/test_katex.mjs`（516 段/0 错）、`tmp/test_latex_engine.mjs`、`tmp/verify_math.py`、`tmp/recheck_slides.py`（release 实点）；日志在 `tmp/logs/*-recheck.log`、`recheck-slides.log`，截图 `tmp/recheck-quadratic-ppt.png`、`tmp/recheck-ellipse-s5-params.png`。

### 8.1 逐条复验主控所列 1–11 项

| # | 主控声称 | 复验结论 | 证据 |
|---|---|---|---|
| 1 | 变式填空改严格等值 + 1e-9 | ✅ 已消除 | 旧误判点全部转为 wrong：B-v1“成立”、B-v2“不成立”、A-v1“3/1.7”、C-v2“125/369/2.9”；`test_recheck` 对应 VAR-* 全 PASS；release 内含 `1e-9` |
| 2 | B s1/s2 改 `(?<!不)垂直\|⊥` + 新增否定 wrong 分支 | ⚠️ **部分消除（残余 FAIL）** | “不垂直”“AD 与 BC 不垂直”“不垂直于底面”已判 wrong；但“不⊥”“不是垂直”“并非垂直”“不是垂直的”仍判 correct——`⊥` 分支绕过否定、“垂直”前一字不是“不”即通过（`guidance.js:224/230,251/259`） |
| 3 | A 收束泄底：8 只逗留、再答 e 才进选择 | ✅ 已消除 | 答 8 的回复仅“$e^2=1+7=8$。注意 e>0，开方后 e 本身是多少？”（stay）；s4 ask 仅“那么 e 对应哪个选项？”；release 实拍 `qa/acceptance/03-A-final.png` 为 8→2√2→D 两段 |
| 4 | 答卷图重生成、去缺字形 | ✅ 已消除 | `sub-A.png` 现为 c^2/a^2/b^2/e^2、(b/a)^2；`sub-C.png` 为 AA1D/A1C/A1B1，无 □；`qa/acceptance/15-student-homework-review.png` 实拍可读；release/素材 hash 同步 |
| 5 | sub-B 建议分改 1/5、评语与细则自洽 | ⚠️ **部分消除（残余 FAIL）** | UI 已显示“系统建议 1/5”（`qa/acceptance/14-teacher-grading-confirmed.png`）；但 `submissions.js:43-51` 的评分细则仍是 1+2+2（且无“有放回/重复意识”分项），评语“按评分细则只有‘意识到有放回/重复问题’这一层沾边”在细则里找不到对应条目，1 分仍不能由细则重算；`主持人手册.md:66` 仍写“系统建议 2 分”、`qa/teacher-grading/REPORT.md:33/93` 仍记 2/5 |
| 6 | 二次函数课件与派生图形矛盾：公式改用派生值、s3 去硬编码 | ⚠️ **部分消除 + 新回归** | 二次 s3 导语/要点已参数中立 ✅；但 `SlideCanvas.vue:181` 返回 `y = ${d.vertexForm}`，而 `prepPublish.js:169` 的 vertexForm 本身已含“y = ”，release 实点显示 **“y = y = 2(x + 2)² − 3”**（`tmp/recheck-quadratic-ppt.png`）；椭圆 s5 未改：改 a=10、b=6 后 lead/主公式仍“取 a=5、b=3…c=4，e=4/5”，标注却为焦点 ±8、轴长 20/12、e=0.8（`tmp/recheck-ellipse-s5-params.png`） |
| 7 | 练习容差 0.02 → 1e-9 | ✅ 已消除 | `tmp/test_practice.mjs` 58/58 PASS；2.43/2.45/2.22/2.26/2.97/3.01 全部不再判对；正确答案与解析未回归 |
| 8 | A 等价写法（中点乘、2√7a、交换律） | ✅ 已消除 | “2b=√7·2a”“2b=2√7a”“2b=√7×2a”“c²=b²+a²”“b²+a²=c²”均 correct（`test_recheck` A-EQ-*） |
| 9 | C s3 接受 1−64/125、partial 锚定 ^64/125$ | ✅ 已消除 | “1-64/125”“1−64/125”“1 - 64/125”均 correct；“64/125”→partial；主线 X=2→64/125→1−64/125→61/25 走通 |
| 10 | P2 文本（B-v2 矛盾、C-v2 64/625、research 比值列） | ✅ 已消除 | B-v2 解④改为“z 分量 λ=0；y 分量 λ=1，矛盾”；C-v2 错因改为 256/625 并指出 64/125 是三次值；research 两处表注改为“比值列”，无“第四列” |
| 11 | 三题 sourceLabel 去“2026 高考” | ⚠️ **部分消除** | `guidance.js:18/197/369` 已改“演示题库原题”；但 `TeacherResources.vue:258`“2026 高考原图”、`TeacherAssign.vue:164`“2026 高考原题”、`StudentHome.vue:42`“已按真实高考原图收录”仍在（出处仍无 evidence 支撑） |

### 8.2 复验后剩余 FAIL（4 项，均需修）

#### R2-F1【中】二次函数参数页公式出现“y = y = …”（本轮修复引入的回归）
- 文件:行号：`src/components/teacher/prep/SlideCanvas.vue:181`（`return \`y = ${d.vertexForm}\``）与 `src/data/prepPublish.js:169`（`vertexForm` 已含“y = ”前缀）
- 现象：教师端“二次函数与配方法”PPT 默认第 3 页（s3；s2/s4 同）公式卡显示 **“y = y = 2(x + 2)² − 3”**；`recheck_slides.py` 在 release 实点确认，截图 `qa/review-math/tmp/recheck-quadratic-ppt.png`。
- 为什么错：同一卡片重复“y =”，公式书写错误；打开二次函数备课即默认看到，属展示可见缺陷；“静态例题式”虽已移除，但替换文本拼装错误。
- 最小修正：`SlideCanvas.vue:181` 改为 `return d.vertexForm`（`vertexForm` 已含“y =”），其余不动。

#### R2-F2【中】椭圆 s5 改参后“静态示例”与派生图形/标注仍矛盾（第 6 项修复未覆盖椭圆）
- 文件:行号：`src/data/courseware.js:67-68`（s5 lead/equation 写死 a=5、b=3 ⇒ c=4、e=4/5）、`:71`（该页 note 明确要求“现场拖动参数”）；`SlideCanvas.vue:177-185` 仅对 parabola/set 覆盖主公式，椭圆仍用静态 `slide.equation`。
- 现象：在 release 中打开椭圆 s5，把 a 改 10、b 改 6 后：lead 仍“取 a=5、b=3，则 c=√(a²−b²)=…=4：焦点为 (±4,0)，长轴长 10、短轴长 6、焦距 8”；主公式仍“a=5, b=3 ⇒ c=4, e=c/a=4/5”；同页标注为 `|PF₁|+|PF₂| = 20 > |F₁F₂| = 16`、焦点 ±8、长轴 20/短轴 12、e=0.8，且右侧要点写着“参数联动必须在图形、公式、标注三处一致”。截图 `qa/review-math/tmp/recheck-ellipse-s5-params.png`。
- 为什么错：方案 §5 要求“实际支持改参的页面实拖并复核新值”；本题 s5 正是参数联动页，改参即见静态旧值与派生新值同屏矛盾（二次函数已按同一思路修好，椭圆漏改）。
- 最小修正（二选一）：①内容侧：把 `courseware.js:67-68` 改为参数中立，如 lead“拖动 a、b，观察焦点、长短轴与离心率如何联动（当前数值见右侧与下方标注）”、equation“c = √(a² − b²)，e = c/a ∈ (0,1)”；②实现侧：在 `SlideCanvas.equationText` 增加椭圆分支，figure 页返回 `d.numericEquation`/`d.cFormula`/`d.eFormula` 的派生文本，并让 lead 不含硬编码数值。

#### R2-F3【中低】B 文本步否定式仍有误判（第 2 项修复不完整）
- 文件:行号：`src/data/guidance.js:224/230`（s1）、`:251/259`（s2）
- 现象：`(?<!不)垂直|⊥` 中“仅对 `垂直` 生效的 lookbehind + 独立 `⊥`”导致：`不⊥`→correct；`不是垂直`/`并非垂直`/`不是垂直的`→correct（`⊥` 或“垂直”前一字符不是“不”即通过）。仅“不垂直/不垂直于底面”被正确判 wrong。
- 为什么错：否定表述被判为“对”，与 F2 要消除的风险同类；属自然语言常见写法（“不是垂直关系”）。
- 最小修正：把否定规则**放在 correct 之前**并放宽：`(不|非|没|无)\s*[^，。；,;]{0,4}(垂直|⊥)`（kind wrong），correct 正则可保留或简化为 `(垂直|⊥)`；这样“不/非/没/无 + 垂直/⊥”一律先判 wrong，避免 lookbehind 只挡“不”一个字。
- 附带：`guidance.js:231` 否定回复“所以 AD⊥BC，不是不垂直”为双重否定，建议改为“所以 $AD\perp BC$（是垂直，不是不垂直）”简化为“所以 $AD\perp BC$。”

#### R2-F4【低】sub-B 建议分 1/5 仍不能由评分细则重算
- 文件:行号：`src/data/submissions.js:43-51`
- 现象：建议分已从 2 改 1（UI 实拍 1/5 ✓），但细则仍是“正确理解 X(1)+指示变量/分布列(2)+正确计算(2)”，没有“意识到有放回/重复问题”这一分项；评语却称“按评分细则只有‘意识到有放回/重复’这一层沾边”，细则中无此条目；答卷把 X 写成“三次中取出的球的个数”、结论 E=3，按现行三条细则应 0 分。
- 为什么错：方案 §5 要求“批改用评分细则重算”；建议分与细则/评语三者仍不自洽（只是数值从 2 降到 1）。
- 最小修正：重排细则为可覆盖 1 分的四项（如“识别有放回/可能重复(1)+正确理解 X(1)+指示变量/分布列(1)+正确计算(2)”，合计 5），`systemScore:1` 即可由第一项重算；或承认按原细则 0 分并改评语。同步改 `主持人手册.md:66`（2 分→1 分）与 `qa/teacher-grading/REPORT.md` 的旧记录（标记为历史/更新为 1/5），否则演示台词与 UI 不一致。

### 8.3 残余 RISK（不阻塞，但建议随手修）

1. 变式严格匹配后**中文句末标点**导致误判：`不成立。`/`成立。`/`√3。` 均判错（`GuideView.vue:290-305` 未去尾标点）；建议 `variantMatches` 内先 `norm.replace(/[.。!！?？;；,，\s]+$/,'')`。
2. A-v1 四位近似 `1.7321` 被拒（accepts 只有 1.732）；可补 accepts 或对该类近似给 ≤5e-4 容差。
3. A s3 直接写 `e=2√2`/`2.828` 未收录（`guidance.js:103` 只认裸值）；可加 `e\s*=\s*`、`2\.828` 备选。
4. A s4“给个提示”仍直接给出 `e=2√2` 与“对照选项 D”（`guidance.js:151`），求助直达答案；终步可改为只提示“$e^2=8$，取正根后对照选项”。
5. C s4 仍无 69/25 专门分支（基准典型错答，`guidance.js:452-477`），仅通用兜底；建议补一条。
6. B s3 对 D 仍写“D 项可能也成立”（`guidance.js:288`），D 实为确凿成立；建议“D 也成立，但不是由这条判定直接得到，下一步专门检查 D”。
7. 科研公式检查 cancel-zero 的 `computed: Number.NaN`（`research.js:1101`）在阅读页会显示“左边 = NaN，右边 = 2”（`ResearchRead.vue:364`）；建议数据改为字符串“无定义”。
8. research.js 仍保留已损坏的数据层 LaTeX 引擎（`research.js:1634-2126`，`\\\begin` 等正则被 JS 解码错）与“所有命题都在有限维子空间上讨论”（`:135`）、`\qedhere` 删除即修复（`:969/990`）的措辞；页面已用 `latexEngine.js`，建议删死代码或修措辞。
9. 集合参数页公式显示 `子集数 = 2^3 = 8`（`SlideCanvas.vue:182` + `prepPublish.js:187`，caret 非上标），与 lead“2ⁿ”风格不一致；属观感问题。
10. 三题出处仍未彻底统一：`TeacherResources.vue:258`、`TeacherAssign.vue:164`、`StudentHome.vue:42` 仍称“2026 高考原题/原图”；evidence 无试卷/年份依据，建议统一改“演示题库原题（SHA-256 已封存）”。
11. `qa/showcase/` 策展证据仍不存在（`evidence/curation.csv` CUR-001/002/003 引用的 `guide-A/B/C-final.png` 未产出）；当前实际证据在 `qa/acceptance/`，需补产出或改引用。
12. 本轮验收脚本（37/37）未覆盖“错误输入不得判对”，建议把 `test_recheck.mjs` 的关键断言（变式相反答案、否定表述、容差边界）纳入发布前必跑。

### 8.4 复验结论

- P0/P1 所列 11 项：**7 项已消除**（1、3、4、7、8、9、10）、**2 项部分**（2、5）、**1 项部分且引入 1 处回归**（6）、**1 项部分**（11）。
- 数学结论复算不变：A=e=2√2/D、B={B,D}、C=61/25=2.44（`verify_math.py` 复跑仍全部 PASS；本轮回退只涉及判分/文案，不涉及数学结论）。
- **剩余 FAIL 4 项**（R2-F1 二次函数“y = y =”回归；R2-F2 椭圆 s5 改参矛盾；R2-F3 B 否定式残余；R2-F4 sub-B 建议分口径）；残余 RISK 12 类。
- **判定：仍需返工**（4 项小修；其中 R2-F1 属本次修复引入的可见公式错误，建议与 R2-F2 一起在下一轮修完再冻结）。修完 P0（R2-F1/R2-F2/R2-F3）与 P1（R2-F4 及文档同步）后可发布；产物与答卷图、A 收束与平台缺陷修正已通过独立复验。

—— REVIEW-MATH-RECHECK-DONE ——
