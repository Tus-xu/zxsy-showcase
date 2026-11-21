# Mathesis 离线演示 · 独立视觉评审报告

## 0. 评审包与复验状态（以本节为准）

**收口结论（2026-11-21 04:54 包复验）：B1 / B2 / M1 已消除；M2–M5 已作为 ACCEPTED-DEVIATION 登记（`evidence/curation-g2.csv` CUR-016~019 + `主持人手册.md §7`）；无 BLOCKER、无 MAJOR，剩余 5 项 MINOR（打磨级）。VERDICT = 可交付。**

| 包 | 构建时间 | 大小 | SHA-256 | 用途 |
|---|---|---|---|---|
| 主评审包 | 2026-11-21 03:55:35 | 6,372,280 B | `93B921E84BB907C2D83EE1CDB501E8B45F7BA92EEA2006E98FD67DB6B9BEE0F5` | 三端 24 个页面/状态全部整页截图与对照（`shots/S* T* R* 00-*`） |
| 中间复验包 | 2026-11-21 04:33:05 | 6,372,940 B | `8CF6F56875113EF65718174133A8DBCE9D5CB82C61368E3E589F6C4F977636BB` | 复验 B1/B2/M1/M3/M4 均仍存在（引导页测量、科研 READ 已实现） |
| **收口包（准）** | **2026-11-21 04:54:33** | **6,376,184 B** | **`A188CA2149A72076B9DECABC3FAD6D0D7580B9FDFC813355AA3D821EDA66A0F5`** | **收口复验（`recheck_final.py`、`recheck_minor.py`）：B1/B2/M1 消除、无回归，见 §10** |

- 收口包与准发行包 `release/开始演示.html` 逐字节相同；复验截图：`final2-*.png`、`crop-final2-paper.png`。
- 页面覆盖：学生端 9 页/状态、教师端 12 页/状态、科研端 3 页、登录 + 主持人工具，全部完成截图；**无 NOT-CHECKED 页面**。
- 中间包与主评审包的差异集中在科研 READ/WRITE 与手册/验收矩阵文本；收口包差异为引导页布局、结论标题、主持人浮标与导出物公式，其余页面截图一致。
- 评审方式：Playwright + Chromium 153.0.8010.12，`file://` 离线打开，viewport **1672×941 / DPR 1**、`zh-CN`、`Asia/Shanghai`、鼠标归位、失焦后截图；每次运行清空 localStorage 后按角色登录。
- 对照基线：
  - 实拍：`evidence/live/run-01/inventory/`（student-01..18、teacher-01..24、researcher-01..10、login-*）与 `evidence/live/run-01/student/guide/{A,B,C}/`
  - Golden 原图：`PPT-GOLDEN.png`、`LESSONPLAN-GOLDEN.png`、`READ-GOLDEN.png`、`WRITE-GOLDEN.png`（1672×941）
  - 方案 §5 视觉验收条款（`docs/superpowers/plans/2026-11-21-offline-showcase.md` L140-145）
- 截图与脚本：本目录 `shots/`（逐页 `S*/T*/R*`、补充交互态、并排图 `cmp-*`、局部放大 `crop-*`）；可复跑脚本 `capture.py`、`capture2.py`、`capture3.py`、`measure_shell.py`、`measure_cols.py`、`make_compare.py`，机读度量 `metrics.json`。
- 评审人：review-visual（与实现者分离，只评审、未修改产品代码）。

## 1. 结论摘要

| 项 | 结果 |
|---|---|
| STATUS | **PASS（收口包 04:54 复验后：0 BLOCKER / 0 MAJOR，可交付）** |
| 收口包复验（04:54） | **B1/B2/M1 已消除**：引导页 `scrollHeight=941=视口`、聊天区内部滚动、结论卡 y=524 bottom=911 在视口内、标题无裸 `$`；嘉宾页主持人浮标数=0（仅 AI 管家），`Ctrl+Shift+H` 与登录页入口可打开主持人面板；无 console error、无 KaTeX error、网络请求 0 |
| 已覆盖率 | 三端 24 个页面/状态 + 登录 + 主持人工具，41 张整页截图 + 7 张并排对照 + 局部放大 + 收口包 10 张复验截图 |
| 壳层几何 | **通过**：学生顶栏 60 / 侧栏 240、教师顶栏 56 / 导航 216、科研 Header 62，与 run-01 实拍逐项一致（≤2px） |
| 渲染健康度 | 无 console error、无 KaTeX error、无破图、无越界元素；文字裁切仅出现在带 `overflow:hidden` 的有意省略（教师工作台缩略说明） |
| BLOCKER（修复前 → 现在） | 2 → **0**（B1 引导页溢出、B2 结论标题裸 LaTeX 均已修复并复验） |
| MAJOR（修复前 → 现在） | 5 → **0**（M1 双浮标重叠已修复；M2–M5 经 `evidence/curation-g2.csv` CUR-016~019 与 `主持人手册.md §7` 登记为 ACCEPTED-DEVIATION） |
| MINOR | **5**（打磨级，不阻塞交付：错题抽屉无遮罩、资源卡标题字体混用、设置页浅色色块无可见底色、科研 READ 右栏 607 vs Golden 567、教师课堂 0 发布与 17% 进度并存） |
| ACCEPTED-DEVIATION | **14 项**（原 10 项 + M2–M5 对应的 CUR-016~019） |

总体判断（收口）：三端壳层、页面骨架、配色体系、按钮层级与留白密度达到“可向嘉宾展示”的水平；主讲主线（学生 A/B/C 引导）现在一屏内完成、输入区固定、结论卡与公式完整可见；教师端 Golden 对齐度与科研端三栏实现完整。**剩余 5 项 MINOR 为打磨建议，不构成交付阻塞。**

## 2. BLOCKER（必须修复后复验）

### B1 学生引导页整体布局溢出：输入区与结论卡被推出视口（方案 §5“缺控件/溢出”）——**收口包 04:54 已修复 ✅**
- 收口复验：`.layout:has(.guide)` 锁定 100vh；A 题完成态 `scrollHeight=941=视口`、`.guide__chat` 内部滚动、结论卡 y=524/bottom=911 完整在视口内；B 题多选态输入区 y=757/bottom=941 固定可见（证据 `shots/final2-guide-A-final.png`、`final2-guide-B-multi.png`）。
- 现象：`/student/guide/A|B|C` 的对话区随消息增长把整页撑高（`.layout` 只有 `min-height:100vh`，`.guide{height:100%}` 因此退化为内容高度），聊天区 `.guide__chat` 不再内部滚动，输入区与结论卡被排到视口之外；用户每轮都要滚动整页才能看到输入框。代码注释“固定输入区：不随对话滚动离开视口”（`GuideView.vue` L134）与行为不符。
- 实测（最终包 04:33 复验，1672×941）：
  - 四轮后仍为 `scrollHeight=2050`、`.guide__final` y=885（视口高 941）、`.guide__chat` 未产生内部滚动（`overflowY=auto` 但 `scrollHeight≤clientHeight`）。
  - A 题答到“e²=8”后：`scrollHeight=1481`，`.guide__composer-wrap` 顶部 y=986（视口高 941，**输入区不可见**）。
  - A 题答完“2√2”后：`scrollHeight=1689`，输入区 y=1051。
  - A 题完成：`scrollHeight=2050`，结论卡 y=885（**结论卡被视口下缘截断**）；B 题多选态 `scrollHeight=1600`，完成态 1941。
  - 对照：上传初始态截图 `S02/S03` 正常（输入区 y≈761 可见）。
- 复现：登录学生 → 首页“题1” → 上传 `题1.png` → 依次输入 `2b=√7·2a，所以 b/a=√7`、`c²=a²+b²`、`8`、`2√2` → 单选 D 提交；全程不滚动整页。
- 期望：引导页锁定一屏高度（`.layout`/`.main` 固定为 `100vh - topbar`，或 `.main:has(.guide){height:calc(100vh - var(--topbar-h))}`），聊天区内部滚动、输入区固定在底部，结论卡至少完整可见或仅在聊天区内滚动。
- 证据：`shots/S05-guide-A-final.png`、`shots/S05c-guide-A-final-scrolled.png`、`shots/S06-guide-B-multi.png`、`shots/S07-guide-B-final.png`、`shots/diag-A-after-a3.png`；度量见 `diag_guideA.py` 输出。

### B2 A/C 题结论标题直接显示原始 LaTeX（方案 §5“公式错误”）——**收口包 04:54 已修复 ✅**
- 收口复验：结论卡标题已接 `MathText`，渲染为 “A · 结论：e = 2√2，选 D”，`innerText` 与截图均无裸 `$`/控制符（证据 `shots/final2-guide-A-final-card.png`、`final2-guide-A-final.png`）。
- 现象：结论卡标题 `A · 结论：$e=2\sqrt{2}$，选 D` 原样显示 `$...$`；C 题标题（`src/data/guidance.js` L452 `C · 结论：$E(X)=\dfrac{61}{25}=2.44$`）同一模板路径（`GuideView.vue` L77 `<h3>{{ cs.final.title }}</h3>`，未走 `MathText`）。
- 复现：完成 A 题（步骤见 B1）→ 结论卡标题。
- 期望：标题改为 `MathText` 渲染或把标题拆成“纯文本标题 + 数学行”；修复后 A/C 两题标题均无 `$`。
- 证据：`shots/S05c-guide-A-final-scrolled.png`、`shots/crop-guide-final-title.png`（2 倍放大，可清晰看到 `$e=2\sqrt{2}$`）、`shots/final-build-guide.png`（04:33 包复验）。

## 3. MAJOR

### M1 右下角两个悬浮按钮重叠，并遮挡页面内容（全端可见）——**收口包 04:54 已修复 ✅**
- 收口复验：嘉宾界面（学生/教师/科研）`.ms-host-fab` 数量=0，仅 AI 管家单浮标（46px @1604,871）；主持人面板仅经登录页“主持人工具”入口或 `Ctrl+Shift+H` 打开（面板 title=主持人工具，Esc 关闭），见 `shots/final2-S01-home.png`、`final2-host-panel.png`。
- 现象：学生端同时存在“AI 管家”（46px，right 22/bottom 24）与“主持人工具”浮标（38px，right 14/bottom 14），两者重叠约 30×28px，形成双圆错位；主持人工具在教师/科研端常驻（实拍壳层没有该控件），并遮挡右下内容：双师课堂页盖住“本页讲稿”第 4 条文字，科研 READ 盖住 Agent 输入框右下角，工作台页盖住“智能辅助”输入区提示。
- 对照：`student-01-home` 实拍右下只有一个渐变 FAB；`HostConsole.vue` 文案自称“仅主持人使用，嘉宾界面不展示”，实现与文案不一致。
- 期望：主持人浮标默认隐藏或移出嘉宾视图（例如登录页/主持人快捷键入口）；AI 管家与主持人浮标不得重叠；修复后各页右下角无遮挡。
- 证据：`shots/crop-fab-overlap.png`、`shots/crop-dual-fab-overlap.png`、`shots/S23-dual.png`、`shots/R04-read-default.png`；04:33 包复验 `.ms-butler`(1604,871,46×46) 与 `.ms-host-fab`(1620,889,38×38) 重叠面积 **840px²**。

### M2 科研 READ 段落内联公式未排版（与 READ-GOLDEN 差距明显）
- 现象：阅读纸面正文与 Agent“关键信息”中的数学以内联纯文本呈现：`V_h⊂V`、`u_h∈V_h`、`a(·,·)`、`∥u-u_h∥_V ≤ (M/α) inf_{v_h∈V_h} ∥u-v_h∥_V` 中的下标/范数符号保持 Unicode 原样；同一页的 block 公式 (2.2) 却是 KaTeX 正常排版，形成同页两种公式字形。
- 对照：READ-GOLDEN 中 Céa 引理正文/定理均为数学排版（斜体、上下标、范数）。
- 影响：科研阅读是 Guest 会凑近看的页面，纯文本公式在 200% 放大对照下明显不达标（实现者 REPORT §5 已自认该差异，但未登记到 `evidence/curation.csv`）。
- 证据：`shots/R04-read-default.png`、`shots/R06-read-agent.png`、`shots/crop-read-inline-math.png`、`shots/cmp-research-read.png`。

### M3 科研端启动页导航与“个人中心”入口缺失
- 现象：run-01 科研端启动页壳层为「智学数研 科研端 + 启动页/工作台/个人中心」三段导航，且个人中心是现役页面（`researcher-03-account.png`）；最终包统一使用工作台 Header（项目胶囊 + 阅读/写作），启动页/工作台/个人中心导航全部缺失，`/research-workspace/account` 仅 redirect 到 `/research`，无账号页。
- 影响：现役入口未覆盖，且启动页壳层与实拍不一致（当前实现实际对齐的是 READ/WRITE-GOLDEN 的 Header，而不是实拍启动页）。
- 期望：恢复启动页顶部导航与个人中心页（可用本地演示数据），或至少在 `curation.csv` 以“策展改写”登记并说明入口处置。
- 证据：对比 `evidence/live/run-01/inventory/researcher-01-landing.png`、`researcher-03-account.png` 与 `shots/R01-research-home.png`。

### M4 学生「知识库」缺现役“我的题库”Tab
- 现象：run-01 知识库为「我的资料 / 我的题库」双 Tab（含 24 道题库）；最终包只有状态筛选「全部资料/未入库/已就绪」，全文无“我的题库”。
- 期望：补回“我的题库”Tab（可为演示数据），或在 curation 中登记为范围收窄。
- 证据：`shots/S15-library.png`、`shots/S16-library-ingested.png`、`shots/S17-library-answer.png`；对照 `student-04-library.png`。

### M5 教师工作台缺少实拍与 Golden 中的编辑工具条
- 现象：
  - PPT Tab：只有「＋添加页 / 删除本页 / 共 6 页·标题可直接点击修改」与导出/发布；实拍（`teacher-15-ws-ppt.png`）与 PPT-GOLDEN 的「添加页 / T 文本 / Σ 公式 / 数学图形 / 图片 / 备注」内容插入工具条缺失。
  - 教案 Tab：实拍与 LESSONPLAN-GOLDEN 的富文本工具条（撤销/重做、字号、B/I/U、对齐、列表、表格、图片、链接）缺失，只有“编辑本节 / 正文可直接编辑·自动保存”。
- 影响：属“保留区域控件缺失”。若按 CUR-004 的策展范围（只演示改标题/参数→保存→发布→导出）接受，需在 `curation.csv` 明确收窄范围并注明，否则按方案 §5 的“缺控件”判失败。
- 证据：`shots/T05-wb-ppt.png`、`shots/T06-wb-plan.png`、`shots/cmp-teacher-ppt.png`、`shots/cmp-teacher-plan.png`；对照实拍 `teacher-15-ws-ppt.png`、`teacher-16-ws-plan.png` 与两张 Golden。

## 4. MINOR

| # | 位置 | 现象 | 证据 |
|---|---|---|---|
| m1 | 引导传图态 | 页面 945px 溢出 4px，出现整页滚动条（B1 同源） | `S02/S03` |
| m2 | 学生错题 | 自动抽屉无遮罩，覆盖处列表文字被抽屉边缘硬切、层级弱；行内分式（61/125）把行高撑开、上下文字基线跳动 | `S13/S14` |
| m3 | 学生资源中心 | 卡片标题“…从轴长比到 e”中的 `e` 落入数学字体，与中文标题字重/字体不一致 | `S18` |
| m4 | 学生我的/个人设置 | “浅色（默认）”主题色块为空白白块（白底仅描边），与“暖色/深色”色块不一致，像缺图 | `S27` |
| m5 | 科研 READ/WRITE 栏宽 | READ 右栏实测 607px vs READ-GOLDEN 567px（Δ40；与 VISUAL-SPEC 36.3% 一致）；WRITE Agent 栏 314 vs Golden 306（Δ8） | `measure_cols.py` 输出、`cmp-research-*.png` |
| m6 | 教师课堂 | 顶部“已发布课件 0 条”与学生端 17% 进度/“已发布课件”回流明细同屏并存，虽有数据来源说明，但易被嘉宾读成数据矛盾 | `T10-teacher-classroom.png` |
| m7 | 学生练习/双师/我的/知识库/教师洞察/资源 | 页面级 `scrollHeight` 比视口多 38–107px（如练习 979、双师 996、我的 981、知识库 1048），底部元素贴边或需轻微滚动；属页面自然滚动，但同一套壳层里页面高度策略不统一 | `metrics.json` |
| m8 | 科研启动页 | 与 run-01 启动页相比为整页重设计（项目卡/最近笔记布局），未在 `evidence/curation.csv` 登记 | `R01` vs `researcher-01-landing.png` |
| m9 | 科研登录后品牌/账号 | 壳层品牌为“科研工作台”、账号 Xu Chao（对齐 Golden），实拍为“智学数研 科研端 / 林知远”；按方案 §5.2 应以实拍为准，需要么改回、要么登记 | `R01`、`READ-GOLDEN` |
| m10 | 全站 | 主持人工具浮标常驻与手册“嘉宾界面不展示”表述不一致（与 M1 同源，文案/实现二选一） | `X01-host-tool.png`、各页右下角 |

## 5. 与 Golden 的差异（已核对，非 FAIL）

| 页面 | Golden 基准 | 离线实现 | 裁决 |
|---|---|---|---|
| 教师工作台 PPT / 教案 | 全宽 1672（无教师左导航），内容区 100% 宽 | 保留教师 V3 左导航（216px）+ 壳层顶栏，工作台内容宽 1432；同一套 Golden 内容等比缩小 | **ACCEPTED-DEVIATION**：实拍 `teacher-15/16` 同样保留导航，按方案 §5.2“Golden 与实拍冲突以实拍为准”，另记与 Golden 的差异 |
| 教师工作台 PPT 幻灯片 | Golden 左列表 300 / 画布 974 / 右属性 340 | 左列表 248 / 画布约 660 / 右属性约 307 | 同上（宽度由实拍壳层决定） |
| 教师备课中心 | 无 Golden（实拍为准） | 三课时预置卡 + 最近会话 + 快捷入口，与实拍四入口卡＋空态结构不同 | **ACCEPTED-DEVIATION（CUR-004）** |
| 科研 READ | 英文论文 PDF 渲染、Agent 卡片、左 343/中 762/右 567 | 自撰中文讲义纸面、Agent 结构化卡；左 342/中 722/右 607 | 内容差异 **ACCEPTED-DEVIATION（CUR-007）**；右栏宽度差 MINOR（m5），内联公式差 **MAJOR（M2）** |
| 科研 WRITE | 编译控制条在 Header 中槽；左 306/中(590+462)/右 314 | 编译控制条下移为写作页顶部“编译配置”条；左右栏约 305/314 | 实现者 REPORT 已认列为壳层差异；**ACCEPTED-DEVIATION + 记录** |
| 科研启动页 | 无 Golden，实拍为准 | 使用工作台 Header + 项目卡启动页 | 见 M3（入口缺失）+ m8（重设计未登记） |
| 登录页 | 实拍为“选身份→手机号→页面显示验证码” | 一键选择演示身份 | **ACCEPTED-DEVIATION（CUR-008）** |
| 学生端全部页面 | 学生无统一 Golden，以 run-01 实拍为基准 | 首页/练习/错题/知识库/资源/课堂为演示版重设计，壳层与导航逐项对齐 | **ACCEPTED-DEVIATION**（依据方案 §4 三案贯通授权）；建议补登 curation |

## 6. 逐端逐页判定表

判定口径：**PASS**＝壳层/尺寸/密度/控件层级与实拍或 Golden 无实质差异；**差异**＝可解释的策展改写或小偏差；**FAIL**＝存在 BLOCKER/MAJOR。

### 6.1 学生端（实拍 run-01 student-01..18、guide/A-B-C）

| 页面/状态 | 截图 | 判定 | 说明 |
|---|---|---|---|
| 首页（对话学习） | `S01-home` | PASS* | 壳层顶栏/侧栏像素级一致（60/240）；页面内容为演示版重设计（三题入口+上传卡），对照实拍 `/dialog` 属 ACCEPTED-DEVIATION；右下双浮标重叠（M1） |
| 引导 A 上传态 | `S02` | PASS（附 m1） | 卡片居中、按钮/提示层级正常；页面 4px 溢出 |
| 引导 A 识别/逐轮 | `S03`、`S04b`、`S04c` | **FAIL** | 布局溢出 B1；KaTeX 公式、识别卡、步骤点渲染正常 |
| 引导 A 完成态 | `S05`、`S05c` | **FAIL** | B1 + B2（原始 LaTeX） |
| 引导 A 变式 | `S05b` | PASS | 变式卡、单选/填空按钮、判分结果正常 |
| 引导 B 多选/完成 | `S06`、`S07` | **FAIL** | B1：多选态输入区不可见、完成态结论卡在折叠线下 |
| 引导 C 识别态 | `S08` | PASS | 与 A 同布局；完成态标题同 B2 |
| 练习（举一反三） | `S10`、`S11`、`S12` | PASS（附 m7） | 三组 Tab、统计卡、判分/错因/完整解析/关键点均正常；页面 38px 溢出 |
| 错题（自动弹层/列表） | `S13`、`S14` | PASS（附 m2） | 复刻 CUR-010 自动弹层 + Esc/关闭；无遮罩、行内分式行高跳动 |
| 知识库 | `S15`、`S16`、`S17` | **FAIL** | 三栏阅读/引用/定位流程正常，但缺“我的题库”Tab（M4） |
| 资源中心 | `S18`、`S19` | PASS（附 m3） | 讲义卡/阅读器/视频“未含文件”说明清晰；标题字体混用 |
| 课堂三 Tab | `S20`、`S21`、`S22` | PASS | 课堂任务/我的班级/双师课堂结构与实拍同构，进度/任务/班级数据自洽 |
| 双师课堂（沉浸） | `S23` | PASS（附 M1） | 三栏讲解/字幕/助教布局完整；右下浮标遮挡“本页讲稿”文字 |
| 我的四 Tab | `S24`、`S25`、`S26`、`S27` | PASS（附 m4/m7） | 报告/掌握地图/体验反馈/个人设置完整，无假数字；浅色色块空白 |

### 6.2 教师端（实拍 teacher-01..24、PPT/LESSONPLAN Golden）

| 页面/状态 | 截图 | 判定 | 说明 |
|---|---|---|---|
| 备课中心 | `T01` | PASS（差异） | 三课时预置（CUR-004）；壳层 56/216 与实拍一致 |
| 新建备课弹层 | `T02` | PASS | 弹层遮罩/焦点/按钮层级正常 |
| 备课历史 | `T03` | PASS | 三会话 + 版本管理空态 |
| 工作台 · 课堂设计 | `T04` | PASS | 目标/路径/例题/课时信息/产物/发布结构完整 |
| 工作台 · PPT | `T05` | **差异** | 版式对齐 PPT-GOLDEN 的结构（左列表/画布/智能属性/AI 输入/缩放条），但宽度受实拍壳层影响缩小、内容插入工具条缺失（M5） |
| 工作台 · 教案 | `T06` | **差异** | 对齐 LESSONPLAN-GOLDEN 的教案大纲/纸面/智能辅助；富文本工具条缺失（M5） |
| 课堂 | `T10` | PASS（附 m6） | 已发布/进度回流/打开事件；0 发布与 17% 进度并存易误读 |
| 题库与组卷 | `T11` | PASS | 分类树/题库/组卷三栏；入库计数与 3 题待入库关系可理解 |
| 作业与批改（发布） | `T12` | PASS | 四步发布、已选 3 题、空态已发布列表 |
| 批改工作台 | `T13` | PASS | 队列/原图/评分细则/系统建议/终审给分/跨端同步完整 |
| 学情洞察 | `T14` | PASS | 热力图/错因构成/证据明细/提交对照，无假分数 |
| 资源中心 | `T15` | PASS | 10 项资源 + 缺源登记（CUR-005）黄条，口径清晰 |
| 发布弹层 | `T07` | PASS | 版本 v1/班级选择/快照说明 |

### 6.3 科研端（实拍 researcher-01..10、READ/WRITE Golden）

| 页面/状态 | 截图 | 判定 | 说明 |
|---|---|---|---|
| 启动页 | `R01` | **差异/MAJOR** | 项目卡启动页完整；但缺“启动页/工作台/个人中心”导航与个人中心（M3）；重设计未登记（m8） |
| 阅读工作区（默认/选中/问 AI） | `R04`、`R05`、`R06` | **差异/MAJOR** | 三栏、页眉页脚、选区工具条、Agent 结构化卡、证据回跳均对齐 Golden 结构；内联公式纯文本（M2）；右栏 40px（m5） |
| 写作工作区（编译成功态） | `R07`、`R07-full` | PASS（附 m5） | 文件树/LaTeX 编辑器/PDF 预览/编译日志/写作 Agent/导出完整；与 WRITE-GOLDEN 的 Header 编译条位置差异已由实现者说明并为壳层约束 |
| 登录（科研身份） | `00-login`、`X01` | PASS（差异） | 身份选择页（CUR-008）；主持人面板功能完整 |

## 7. ACCEPTED-DEVIATION 清单

| # | 偏离 | 依据 |
|---|---|---|
| A1 | 登录改为“选择演示身份”一键进入 | CUR-008（策展改写，离线无短信） |
| A2 | 引导页整页布局为展示版重设计（题图表+对话+固定输入区） | CUR-001/002/003 + 本评审任务书示例；但 B1/B2 属实现缺陷，不因改写豁免 |
| A3 | 教师备课三课时预置内容/工作台/发布/导出 | CUR-004（策展补制，AI 生成失败态的真实缺陷已登记） |
| A4 | 教材切片缺源，注明“演示自撰素材” | CUR-005（缺源登记） |
| A5 | 学生“我的”四 Tab 本地数据补制 | CUR-006（策展补制） |
| A6 | 科研三项目/自撰讲义/公式检查/写作示例 | CUR-007（策展补制） |
| A7 | 学生错题页自动打开首题弹层、显式关闭 + Esc | CUR-010（原样实录 + 可用性修订） |
| A8 | 学生首页/练习/知识库/资源/课堂为演示版重设计 | 方案 §4“三案贯通”授权；**未在 curation.csv 登记**，建议补登（CUR-012 起） |
| A9 | 科研启动页重写为项目卡启动页 | 同上；**未登记** |
| A10 | 教师工作台保留现役左导航（不按 Golden 全宽） | 方案 §5.2：Golden 与实拍冲突时以实拍为准，另记差异 |

## 8. 建议返工清单（历史清单；收口包 04:54 已修复 B1/B2/M1，M2–M5 已登记接受，仅剩 §10 的 5 项 MINOR 打磨建议）

> 下列 1–5 项为提出时（03:55/04:33 包）的返工建议，现状态见 §0、§1、§10：**1–3 已修复并复验通过；4 已由 curation 登记；5 已由 CUR-016 登记为接受偏差。**

1. **B1**：锁死引导页一屏高度，聊天区 `overflow-y:auto` 内部滚动、输入区/结论卡固定或内部滚动（改 `student.css` 的 `.layout/.main/.guide` 高度约束即可，不需要动内容）。
2. **B2**：`GuideView.vue` L77 结论标题改走 `MathText`（或拆 title/titleMath 字段），修完 A、C 两题复核。
3. **M1**：主持人浮标默认隐藏/移出嘉宾视图；AI 管家与主持人浮标至少错开 56px；双师页与科研 READ 输入框右下留出安全区。
4. **M3/M4/M5**：补科研启动页导航与个人中心入口、学生知识库“我的题库”Tab；教师工作台如维持收窄范围，请在 `evidence/curation.csv` 登记 M5 的控件收窄。
5. **M2**：阅读纸面与 Agent 关键信息中的内联数学统一走 `MathText`（数据 block 已含 LaTeX 源的可直接渲染；纯 Unicode 段落可补 `tex` 字段），这是与 READ-GOLDEN 视觉差距最大的一项。
6. **MINOR**：修 m1/m2/m4/m5/m6/m7（1–2 小时级），在报告中保留对照截图。
7. 完成后再拍一轮同条件截图（建议用本目录脚本 `capture.py` + `capture3.py` 原样复跑），对照本报告的 BLOCKER/MAJOR 清单复验。

## 9. 复验命令

```powershell
cd D:\zxsy-math-arena-showcase
$env:PYTHONIOENCODING='utf-8'
C:\python13\python.exe qa\review-visual\capture.py     # 41 页整页截图 + metrics.json
C:\python13\python.exe qa\review-visual\capture2.py    # 引导结论/发布弹层/练习交互
C:\python13\python.exe qa\review-visual\capture3.py    # 最终包 A 题主线、科研 READ/WRITE 交互态
C:\python13\python.exe qa\review-visual\measure_shell.py
C:\python13\python.exe qa\review-visual\measure_cols.py
C:\python13\python.exe qa\review-visual\make_compare.py
```

> 说明：`capture2.py` 的 A 题输入需按最终数据多答一步“2√2”（`src/data/guidance.js` s3 已改为正确的 `2√2` 判定 + `stay` 追问），旧包内该步可直接进单选；复跑时如页面数据版本变化，以 `capture3.py` 为准。

## 10. 收口复验（2026-11-21 04:54:33 包，SHA-256 `A188CA21…E0F5`，6,376,184 B）

复验脚本：`recheck_final.py`（B1/B2/M1 + 关键页无回归）、`recheck_minor.py`（剩余 MINOR）；截图：`shots/final2-*.png`。

| 项 | 复验结果 | 判定 |
|---|---|---|
| B1 引导页溢出 | A 题完成态 `scrollHeight=941 = innerH`、`chatInnerScroll=true`、结论卡 y=524/bottom=911（视口内）；B 题多选态输入区 y=757/bottom=941 固定可见；上传/逐轮/完成全链无需整页滚动 | **已消除 ✅** |
| B2 结论标题 LaTeX | 标题渲染为 “A · 结论：e = 2√2，选 D”（KaTeX），`hasRawDollar=false`；element 截图核对无 `$`/控制符 | **已消除 ✅** |
| M1 双浮标 | 嘉宾页 `.ms-host-fab`=0、`.ms-butler`=1（46px @1604,871 唯一浮标）；登录页“主持人工具”入口=1；`Ctrl+Shift+H` 打开面板（title=主持人工具），Esc 关闭；教师/科研页同样无浮标 | **已消除 ✅** |
| M2 科研内联公式 | 保持 Unicode 纯文本（`paper.innerText` 含 `V_h`），已由 `evidence/curation-g2.csv` CUR-016 + `主持人手册.md §7` 登记为 ACCEPTED-DEVIATION | 登记接受 |
| M3 科研导航/个人中心 | 启动页/工作台/个人中心未恢复；顶栏收敛为用户菜单，已登记 CUR-017 | 登记接受 |
| M4 知识库题库 Tab | 仍无“我的题库”，题库入口由首页三题卡承担；已登记 CUR-018 | 登记接受 |
| M5 工作台编辑工具条 | 仅保留有真实行为的编辑动作；已登记 CUR-019 | 登记接受 |
| 回归检查 | 教师工作台 PPT、科研 READ（paper/katex=1/katexError=0）截图无回归；全流程 console error/pageerror=0、网络尝试=0 | **PASS** |
| 页面高度 | 学生练习/双师/我的/知识库 `scrollHeight` 均为 941（原 979/996/981/1048 的页面级溢出一并修复） | **改善 ✅** |
| 剩余 MINOR | 5 项：错题抽屉无遮罩（`.mask/.overlay` 计数 0）、资源卡标题字体混用、设置页“浅色”色块无可见底色、科研 READ 右栏起点 1066 vs READ-GOLDEN 1105（Δ39，合 SPEC 36.3%）、教师课堂“0 已发布”与 17% 进度并存（有来源说明） | 打磨级，不阻塞 |

**收口 VERDICT：可交付（PASS）。BLOCKER = 0，MAJOR = 0，MINOR = 5，ACCEPTED-DEVIATION = 14。** 建议交付前只做两件低风险小事：为错题抽屉补一层遮罩；把“浅色”主题色块改成可见底色（可选）。
