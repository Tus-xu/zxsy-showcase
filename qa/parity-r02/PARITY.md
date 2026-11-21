# Mathesis 逐屏并排对照报告（run-02 返工）

> **角色**：逐屏并排对照员（独立于实现者） · **采集时间**：2026-11-22T02:56:20+08:00

> **视口**：1672×941 / DPR=1 / headless / 渲染稳定 ≥2.5s / 鼠标归位

> **现役**：http://127.0.0.1:5176 · **离线**：`file:///.../app/dist-offline/index.html`（offline=True）

> **证据**：`metrics.json`、`shots/live-*`、`shots/off-*`、`shots/side-*`；脚本 `run_parity.py` 可复跑。


## 1. 结论摘要

| 判定 | 数量 | 页面 |
|---|---:|---|
| 一致 | 6 | student/library、student/classroom、teacher/classes、teacher/bank、teacher/assign、researcher/account |
| 差异 | 11 | student/dialog、student/practice、student/errors、student/resources、student/me、teacher/prep、teacher/today、teacher/insights、teacher/resources、teacher/grading、researcher/landing |
| 不一致 | 1 | researcher/workspace |
| **合计** | **18** | |

**一句话**：18 页中布局骨架全部同构（主区域布局盒最大偏移 0px，≤4px 阈值），文本差异集中在「真实数据随时间漂移」（备课历史、学情数字、会话列表、科研项目）与「离线媒体资源缺失」；唯一结构/内容级不一致是科研 `/research-workspace/workspace`——两侧都按 `list[0]` 自动打开项目，但离线 fixture（02:21:54 采证）缺少现役 02:25:50 才创建的最新空项目，于是离线打开了带 4 篇 PDF 的旧项目、现役打开 0 文献新项目。


## 2. 逐页表格

| 角色 | 页面 | 判定 | 布局盒差异 | 文本差异摘要 | 差异区域 | 截图 |
|---|---|---|---|---|---|---|
| student | `/dialog` | **差异** | ≤0px | 157 行 vs 158 行；02:52 / 新对话 / 02:50 / 新对话 / 02:42 / 新对话 / 02:42 / 新对话 / 02:42 / 新对话 / 02:40 / 新对话 / 02:40  → （无）； → 分析用户上传的文件 / 11/21 / 分析用户上传的文件 / 11/21 / 分析用户上传的文件 / 11/21 / 分析用户上传的文件 / 11/21 / 说明如何帮助学习数学 | 左侧会话列表（今天组/30 天内组）；学情脉搏数字 | `shots/side-student-dialog.png` |
| student | `/practice` | **差异** | ≤0px | 46 行 vs 46 行；5 题导数的运算法则与复合求导 / 小林，「导数的运算法则与复合求导」当前掌握度 5%，是最薄弱环节，按 3:2:1 难度配比定向突破。 做完预计掌握度 5% → 19%。 → 5 题导数的概念与运算 / 小林，「导数的概念与运算」当前掌握度 4%，是最薄弱环节，按 3:2:1 难度配比定向突破。 做完预计掌握度 4% → 18%。；📚 当前知识点：导数的运算法则与复合求导 → 📚 当前知识点：导数的概念与运算 | 训练主卡（知识点/掌握度/预计提升） | `shots/side-student-practice.png` |
| student | `/errors` | **差异** | ≤0px | 201 行 vs 196 行；01 / 24 → 01 / 23；📚 全部 24 道 · 点击展开详情 → 📚 全部 23 道 · 点击展开详情 | 侧栏错题计数；错题列表条数与复习进度 | `shots/side-student-errors.png` |
| student | `/library` | **一致** | ≤0px | 仅数字/时间漂移（1 处） | — | `shots/side-student-library.png` |
| student | `/resources` | **差异** | ≤0px | 文本 87/87 行、13 处文案差异；离线破图 11 张（现役 0 张），pixel diff 36.4% | 资源卡封面图（离线 11 张全破图）；知识点文案 | `shots/side-student-resources.png` |
| student | `/classroom` | **一致** | ≤0px | 仅数字/时间漂移（1 处） | — | `shots/side-student-classroom.png` |
| student | `/me` | **差异** | ≤0px | 131 行 vs 131 行；专练「导数的运算法则与复合求导」 · 约 15 分钟 / 当前掌握度 5%，是你最薄弱的环节 → 专练「导数的概念与运算」 · 约 15 分钟 / 当前掌握度 4%，是你最薄弱的环节；挑战 1 道「导数的运算法则与复合求导」提高题 · 约 5 分钟 → 挑战 1 道「导数的概念与运算」提高题 · 约 5 分钟 | 今日行动/学情报告文案；综合分；侧栏计数 | `shots/side-student-me.png` |
| teacher | `/teacher-v3/prep` | **差异** | ≤0px | 63 行 vs 55 行；椭圆的定义 / 高一(3)班 · 数学 · 45分钟 / 知识点：椭圆的标准方程 / 围绕「椭圆的定义」展开备课 / 教学设计进行中 / 最近修改: 2026-11-22 02:1 → （无） | 最近备课列表（现役多 1 条，时间不同） | `shots/side-teacher-prep.png` |
| teacher | `/teacher-v3/today` | **差异** | ≤0px | 63 行 vs 55 行；椭圆的定义 / 高一(3)班 · 数学 · 45分钟 / 知识点：椭圆的标准方程 / 围绕「椭圆的定义」展开备课 / 教学设计进行中 / 最近修改: 2026-11-22 02:1 → （无） | 同 prep（路由重定向） | `shots/side-teacher-today.png` |
| teacher | `/teacher-v3/classes` | **一致** | ≤0px | 逐行一致（70 行） | — | `shots/side-teacher-classes.png` |
| teacher | `/teacher-v3/bank` | **一致** | ≤0px | 逐行一致（68 行） | — | `shots/side-teacher-bank.png` |
| teacher | `/teacher-v3/assign` | **一致** | ≤0px | 逐行一致（63 行） | — | `shots/side-teacher-assign.png` |
| teacher | `/teacher-v3/insights` | **差异** | ≤0px | 60 行 vs 60 行；圆锥曲线 / 2 人次错题聚集 → — / 暂无错题聚集；小林 在班 1 0 64% 导数的运算法则与复合求导 5%导数的概念与运算 16%集合与常用逻辑用语 20% → 小林 在班 1 0 61% 导数的概念与运算 0%导数的运算法则与复合求导 5%集合与常用逻辑用语 20% | 指标卡（平均掌握度/高频错因）；每生学情表 | `shots/side-teacher-insights.png` |
| teacher | `/teacher-v3/resources` | **差异** | ≤0px | 文本逐行一致（85 行）；离线破图 12 张（现役 0 张），pixel diff 35.7% | 资源卡封面图（离线 12 张全破图） | `shots/side-teacher-resources.png` |
| teacher | `/teacher-v3/grading` | **差异** | ≤0px | 114 行 vs 113 行；课前预习 · 函数的图象与性质 → （无） | 讲评要点列表（现役多一行「课前预习」） | `shots/side-teacher-grading.png` |
| researcher | `/research-workspace` | **差异** | ≤0px | 92 行 vs 83 行；29 分钟前 / 未命名项目 / 暂无项目描述 / — 文献 / — 草稿 / — 笔记 / 阅读 / 写作 / π → （无） | 最近项目卡（现役多 1 个新项目） | `shots/side-researcher-landing.png` |
| researcher | `/research-workspace/workspace` | **不一致** | ≤0px | 63 行 vs 175 行；暂无项目数据。导入文献后将自动生成概览。 / 0 → 本材料为离线演示而自撰，围绕椭圆型偏微分方程有限元方法的三个基础环节展开：变分形式、Galerkin 逼近与 Céa 引理，全部命题在有限维子空间上讨论，并给出 Céa 引理的完整；还没有文献，点击右上「＋」导入 PDF。 → PDF / research-paper-1.pdf / Mathesis 离线演示项目（自撰演示材料） · — / PDF / research-03-writing-examp | 文献列表/阅读器/Agent 对话（离线 4 PDF + 笔记 + 对话） | `shots/side-researcher-workspace.png` |
| researcher | `/research-workspace/account` | **一致** | ≤0px | 逐行一致（55 行） | — | `shots/side-researcher-account.png` |


## 3. 重点核查 4 项

### 3.1 学生 `/dialog`（会话分组 / 输入框 / ✦ 按钮 / 欢迎语 / 四入口）

| 检查点 | 现役 | 离线 | 判定 |
|---|---|---|---|
| 输入框计数 | `0/4000` | `0/4000` | 一致 |
| 发送按钮（✦ 发送） | `发送` | `发送` | 一致 |
| 四个入口 | 📷 拍一道不会的题 / 📚 上传我的资料 / ✏️ 开始今日练题 / 🔴 复习到期错题 | 📷 拍一道不会的题 / 📚 上传我的资料 / ✏️ 开始今日练题 / 🔴 复习到期错题 | 一致 |
| 会话分组标签 | 置顶 / 今天 / 7 天内 | 置顶 / 今天 / 7 天内 / 30 天内 | 差异（数据漂移） |
| 欢迎语 | `今天想搞定什么数学题？` | `今天想搞定什么数学题？` | 一致 |

说明：分组逻辑（`ConversationSidebar.vue` 的 `置顶 / 今天 / 7 天内 / 30 天内 / 更早` 按 `updatedAt` 实时计算）两侧是同一份代码。本轮现役组=置顶 / 今天 / 7 天内，离线组=置顶 / 今天 / 7 天内 / 30 天内；离线多出：30 天内。根因是现役 `GET /api/agent/conversations?limit=30` 被今天自动化产生的 30 条「新对话」占满，更早的会话（10/28）被挤出窗口，因此现役看不到 `30 天内`；离线 fixture 是 02:21 采证的快照、仍保留旧会话，所以能看到 `30 天内`。这是**真实数据/测试污染漂移**，不是结构差异。

页面内**没有**「拍照识题」弹层组件：点击 `📷` 卡片实际触发系统文件选择器（现役/离线均如此，见交互态证据）；输入框 `0/4000`（交互打字后 21/4000 两侧一致）、`✦ 发送` 按钮、欢迎语与四入口均一致。

### 3.2 教师 `/teacher-v3/prep`（三个起点卡 / 备课历史条目与时间 / 右侧 AI 备课助手）

| 检查点 | 现役 | 离线 | 判定 |
|---|---|---|---|
| 入口卡 | 从教材开始 / 从已有教案开始 / 从已有PPT开始 / 备课历史（4 张） | 从教材开始 / 从已有教案开始 / 从已有PPT开始 / 备课历史（4 张） | 一致 |
| 备课历史条目数 | 最近备课 2 查看全部 ›（2 行） | 最近备课 1 查看全部 ›（1 行） | 差异（数据漂移） |
| 历史时间 | 最近修改: 2026-11-22 02:18 / 最近修改: 2026-11-21 03:04 | 最近修改: 2026-11-21 03:04 | 差异（时间漂移，非结构） |
| 右侧 AI 备课助手 | 存在（AI 备课助手） | 存在（AI 备课助手） | 一致 |

结论：**差异（数据漂移，非结构差异）**——现役在 2026-11-22 02:18 多出一条真实备课会话（另一轮自动化交互产生），离线 fixture 停在 2026-11-21 03:04 的 1 条；起点卡、历史卡、AI 备课助手胶囊结构完全一致。

### 3.3 教师 `/teacher-v3/grading`、`/teacher-v3/insights`（真实数字漂移 vs 结构差异）

- **grading**：判定 **差异**（data_drift）；布局盒 0px；数字集合差异 `[]`；文本差异：课前预习 · 函数的图象与性质 → （无）。结构一致；1 处内容行不同（列表/数字/时间等真实数据漂移）
- **insights**：判定 **差异**（data_drift）；布局盒 0px；数字集合差异 `['0%', '16%', '2', '61%', '64%']`；文本差异：圆锥曲线 / 2 人次错题聚集 → — / 暂无错题聚集；小林 在班 1 0 64% 导数的运算法则与复合求导 5%导数的概念与运算 16%集合与常用逻辑用语 20% → 小林 在班 1 0 61% 导数的概念与运算 0%导数的运算法则与复合求导 5%集合与常用逻辑用语 20%。结构一致；3 处内容行不同（列表/数字/时间等真实数据漂移）

标注口径：**时间漂移**=同一批数据因采集时刻不同导致的时间戳/相对时间变化；**数字漂移**=同一指标因后续真实操作（批改/提交/掌握度更新）产生的数值变化；**结构差异**=区域/字段/条目结构不同。本轮 `insights`：班级平均掌握度 **64% → 61%**、高频错因 **圆锥曲线 2 人次 → 暂无错题聚集**、小林平均掌握度 64%→61%、薄弱点「导数的概念与运算」0%→16% —— 属于**数字漂移**，卡片/表格/列结构完全一致。`grading`：数字集合一致，唯一文本差异是现役多出一行「课前预习 · 函数的图象与性质」（真实队列/任务数据漂移，pixel diff 0.0%，不是结构差异）。

### 3.4 科研 `/research-workspace/workspace` 差异根因（必答）

**现象**：同一路由、同一科研账号：现役落到 `http://127.0.0.1:5176/research-workspace/d770457a-c91f-4d61-8853-de00e7a7f300/read`，工作区为 0 文献的「未命名项目」空工作台；离线落到 `file:///D:/zxsy-math-arena-showcase/app/dist-offline/index.html#/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read`，自动打开 4 篇 PDF、1 条最近笔记与既有 Agent 对话。

**根因（代码路径 + 数据源）**：

1. `ResearchWorkspaceShell.vue::bootstrap()` 在 URL 没有 `:projectId` 时，会 `project.loadList()` 并**自动选中 `list[0]`（最新项目；若有 `ma_research_last_project` 则优先它）后 `router.replace(/research-workspace/<id>/read)`**。所以**两侧都不是「空工作台 vs 自动打开」的差异**——两侧都自动打开了各自数据源里的最新项目。

2. **数据源时效差**：离线项目列表来自 `app/src/offline/fixtures/researcher/GET___api__research-vnext__projects.json`，该组 fixture 的采证时间是 **2026-11-22 03:03:00**（fixtures/researcher/index.json `ts`）；现役实时列表有 3 个项目（`d770457a-c91f-4d61-8853-de00e7a7f300`, `e49b27e2-b05f-45c3-ac99-dd0792d9ab80`, `338a4eb7-0990-45c1-96e1-7a474a0c942f`），离线只有 2 个（`e49b27e2-b05f-45c3-ac99-dd0792d9ab80`, `338a4eb7-0990-45c1-96e1-7a474a0c942f`），**离线缺少现役最新项目 `d770457a-c91f-4d61-8853-de00e7a7f300`**。
3. **命中差异的关键 4 分钟**：现役 `list[0]` 是 `d770457a-c91f-4d61-8853-de00e7a7f300`（`created_at=2026-11-21T18:25:50.684660Z`，本地 2026-11-22 02:25:50），比离线 fixture 采证时间（2026-11-22 03:03:00）晚约 4 分钟；该项目 `papers=[]`、0 文献，所以现役工作区为空。离线 `list[0]` 是 `e49b27e2…`（fixture 旧项目，papers=4 + 1 笔记 + 既有 Agent 对话），所以离线一打开就渲染出 4 篇 PDF。
4. **不是路由差异、不是 localStorage 残留、不是三栏布局差异**：两侧 URL 都被 `bootstrap()` 重写为 `/<projectId>/read`，主区域布局盒（顶栏 / 侧栏 300px / 中栏 / Agent 420px）逐项偏差 0px；`ma_offline_demo_v1` 只存 session/published/uploads/conversations/grading，不存科研项目；科研项目完全由离线回放层返回旧 fixture。两侧 `rw.panel.v3`（栏宽/收起态）也一致（readSidebar=300 / readAgent=420）。

5. 离线二层的副作用：离线 PDF 是 ReportLab 生成的合成 PDF（`/BaseFont /Helvetica /Encoding /WinAnsiEncoding`），中文字形未嵌入，阅读器文本层显示方块/乱码（`metrics.json.workspace_diag.off.body_full` 中可见 U+0001 控制字符）——这是离线素材质量问题，与现役无关（现役该项目无文献，无法对照）。

**修复建议（只给建议，未改代码）**：

- 在打包脚本里对 `researcher` fixture 做**时效校验**：发布时对比现役 `GET /api/research-vnext/projects` 的 id 集合；不一致就重新采集，禁止携带过期项目。

- 为「空账号」提供干净 fixture（projects 返回空数组），并在离线启动页呈现「还没有科研项目」空态；若确实要演示旧项目，应显式标注「离线演示快照 · 采集于 2026-11-22 02:21」而不是冒充当前账号。

- 若产品期望 `/research-workspace/workspace` 永远展示空工作台，应改为「无 projectId 时不自动打开项目」；当前自动打开是产品定义（启动页「进入科研工作台」依赖它），不建议为此改代码，改数据更稳。

- 重新生成/替换离线 PDF 素材，嵌入中文子集字体（或直接改用现役可读 PDF 切片文本回放），消除方块乱码。

### 3.5 交互态对照（每端至少 1 组，同一操作 → 同一状态）

| 组 | 现役状态 | 离线状态 | 同态 | 并排证据 |
|---|---|---|---|---|
| 学生：`/dialog` 输入条打字 + 点击「📷 拍一道不会的题」 | `count=21/4000`，value=`已知函数 f(x)=x³-3x，求单调区间`，send_disabled=False，file_chooser=True | `count=21/4000`，value=`已知函数 f(x)=x³-3x，求单调区间`，send_disabled=False，file_chooser=True | 是 | `shots/side-inter-student-compose.png` |
| 教师：`/teacher-v3/prep` 点「从教材开始」 | NL 预填=`从教材开始：请帮我定位要备课的教材章节`，focus=True | NL 预填=`从教材开始：请帮我定位要备课的教材章节`，focus=True | 是 | `shots/side-inter-teacher-textbook.png` |
| 科研：启动页点「进入科研工作台」 | 路由=`/research-workspace/d770457a-c91f-4d61-8853-de00e7a7f300/read`；首屏=`π / 智学数研 / 科研端 / 阅读 / 写作 / 未命名项目` | 路由=`/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read`；首屏=`π / 智学数研 / 科研端 / 阅读 / 写作 / 未命名项目` | 路由同构（内容不同，见 3.4） | `shots/side-inter-researcher-enter.png` |

说明：学生组的「📷 拍一道不会的题」在现役/离线都只唤起系统文件选择器（`file_chooser_opened=true`），**没有页面内弹层**——需求里期待的是「弹层」，实际产品行为是文件选择器；若验收要求可见弹层，需要产品侧补组件。打字后的计数（21/4000）与发送态两侧完全一致，可作为同态证据。


## 4. 发现的问题清单（按严重度）

1. **P0 · 科研 workspace 离线 fixture 比现役落后约 4 分钟，自动打开的是旧项目（内容不一致）** — 同一账号同一路由：现役自动打开最新空项目 d770（0 文献），离线自动打开 fixture 里的旧项目 e49b（4 篇 PDF + 对话）；根因是离线 projects fixture 采证于 02:21:54，而现役最新项目创建于 02:25:50，离线列表缺该 id。  
   复现：科研登录 → 打开 `/research-workspace/workspace`（或启动页点「进入科研工作台」）→ 两侧对比 URL 中 projectId 与文献数  
   证据：`shots/side-researcher-workspace.png`；`metrics.json.workspace_diag.live_network.projects` 与 `off_projects_response`

2. **P1 · 资源中心封面图未离线化，离线整页破图** — 文本几乎一致（教师页逐行一致，学生页仅知识点文案漂移），但 2 页（student/resources、teacher/resources）离线所有缩略图 `naturalWidth=0`；这是最容易被文本对比漏掉的视觉回归。  
   复现：登录对应角色 → `/resources` 或 `/teacher-v3/resources` → 断网（offline=True）打开离线包  
   证据：`shots/side-student-resources.png`, `shots/side-teacher-resources.png`；`metrics.json` 中 `imgs.broken` 与 `pixel.ratio`

3. **P1 · 学生 /dialog 左侧分组不一致：现役缺「30 天内」组** — 现役组=置顶 / 今天 / 7 天内，离线组=置顶 / 今天 / 7 天内 / 30 天内。根因不是分组代码（同一组件、同一判定），而是现役 `conversations?limit=30` 被今天自动化产生的新对话占满，10/28 的旧会话被挤出窗口；离线 fixture 仍保留旧会话。这是测试数据污染导致的真实漂移，但会让「分组核查」看起来不一致。  
   复现：学生登录 → `/dialog` → 看左侧会话列表底部分组；对照 `metrics.json.pages[student/dialog].key_checks`  
   证据：`shots/side-student-dialog.png`；`shots/side-inter-student-compose.png`；`metrics.json` key_checks.groups

4. **P2 · 真实数据漂移（可接受，但需在验收中标注口径）** — 11 页判定受真实数据影响：student/dialog、student/practice、student/errors、student/library、student/classroom、student/me、teacher/prep、teacher/today、teacher/insights、teacher/grading、researcher/landing；其中 prep 2→1 条备课历史、insights 掌握度 64%→61% 且高频错因有/无、grading 多一行「课前预习」、dialog 今天组多出新对话且 30 天内组被挤掉、practice/me/landing 的薄弱点与项目卡内容漂移。（含 4 个「一致」页仅因侧栏错题数 24→23 产生数字漂移）  
   复现：按报告逐页复跑；对照 `metrics.json` 各页 `text.diff` 与 `text.number_time_drift_only`  
   证据：各页 `shots/side-*.png` + `metrics.json.pages[].text`

5. **P2 · 离线 PDF 文本层中文乱码（方块/控制字符）** — 科研 workspace 离线 PDF 正文不可读，影响离线演示可信度；现役该项目无文献，无法同屏对照，但属离线素材质量缺陷。  
   复现：离线科研登录 → 进入工作台 → 查看 PDF 正文  
   证据：`shots/off-researcher-workspace.png`；fixture PDF 头 `/BaseFont /Helvetica /Encoding /WinAnsiEncoding`

6. **P3 · 教师 `/teacher-v3/today` 与 `/teacher-v3/prep` 为同一页面（路由别名）** — 8 个教师页面中 `/teacher-v3/today` 最终 URL 为 `/teacher-v3/prep`，视觉/文本相同；两侧一致（非离线缺陷），但「每日教学」入口看起来重复，建议产品侧确认是否是预期别名。  
   复现：访问 `/teacher-v3/today` 观察最终 URL（现役/离线都是 prep）  
   证据：`shots/side-teacher-today.png`；`metrics.json.pages[].final_url`


## 5. 建议

1. 发布门禁增加「逐屏对照」自动化：本脚本已可复跑；建议把 `metrics.json` 的 `verdict_counts` 纳入发布检查，`不一致 > 0` 阻断。

2. 离线包以「演示快照」为口径重新采集 fixtures（尤其科研项目），并在 UI 明示离线素材日期；外链图片/封面必须本地化（学生/教师资源中心所有 B 站封面在断网下破图）。

3. 数据漂移类差异（备课历史、学情数字、会话列表）不建议锁库；建议在对照报告的判定口径中固定为「结构一致 + 数据漂移」并保留归一化 diff，作为可接受项。

4. 修复离线 PDF 中文字体；同时补一条「媒体资源完整性」指标（`document.images` broken 计数），防止文本相似度 100% 但页面全破图的假一致。


---

采集脚本：`qa/parity-r02/run_parity.py` · 机器指标：`qa/parity-r02/metrics.json` · CSV：`qa/parity-r02/parity.csv`
