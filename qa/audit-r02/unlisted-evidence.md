# 未列证据清单（离线版出现、但 run-01/run-02 证据中找不到对应）

> 口径：把 `evidence/live/run-01/**` 与 `evidence/live/run-02/**` 中**全部可读文本**（`*.md` transcript/summary/defects、
> `*.json` 的 `text`/`buttons`/`links` 字段、`*.txt` 日志）与**关键截图**通读后，凡在证据里**找不到任何对应元素**的离线内容，
> 逐条登记于此。**不臆测"现役大概也有"**；找不到即"未列"，并在 INVENTORY.csv 记为 `展示版额外添加` 或 `暂未实测`。
>
> 已检索的证据文本：
> - run-01：`G2-SUMMARY.md`、`student/guide/G1-SUMMARY.md`、`student/guide/{A,B,C}/transcript.md`+`defects.md`、
>   `student/dual/transcript.md`、`research/transcript.md`、`teacher/publish/transcript.md`+`defects.md`、
>   `teacher/assign/transcript.md`+`defects.md`、`student/smoke/ai-smoke*.{md,txt}`、`inventory/login-*.json`
> - run-02：`_lead-probe/{probe,student-01-home,teacher-01-home,research-01-home}.json`、
>   `teacher/shots/{01-prep-home,01-top-task-panel,02-nav-bank,02-nav-assign,02-nav-classroom,02-nav-insights,02-nav-resources,03-prep-home-detail,04-entry-*,05-prep-history,06-deep-prep-templates,07-deep-quiz,08-deep-grading,09-deep-classes,10-deep-today}.json`、
>   `research/api/page-01-landing.json`/`page-02-workspace.json`/`agent-*.json`、以及 student/teacher/research 截图若干

---

## A. 完全找不到对应（INVENTORY 记为「展示版额外添加」）

### A1 全局 / 登录（6 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 1 | 全域离线能力自检（拦截 fetch/XHR、`window.__MATHSIS_NET_LOG__`、"0 网络请求"） | `src/main.js:10-31` | run-01/run-02 都是在线现役系统，无此类自检与 net log |
| 2 | 本地持久化命名空间 `mathesis-showcase-v1` | `src/lib/storage.js:2` | 现役状态在服务端；run-02 无 localStorage 命名空间证据 |
| 3 | ErrorBoundary 兜底页「页面加载出现异常／演示数据保存在本机…」 | `src/components/ErrorBoundary.vue:6-12` | 现役无该兜底文案（run-01 页面白屏时亦未见） |
| 4 | 三个「演示身份」卡（学生·林一川／教师·张老师／科研·Xu Chao） | `src/ends/Login.vue:29-54` | 现役登录是手机号+验证码+「进入身份」下拉，无身份卡（`probe.json` 全文） |
| 5 | 登录页「演示环境 · 全部数据保存在本机」+「主持人工具」入口 | `src/ends/Login.vue:55-58` | 现役登录页无主持人/本机数据类入口（`s01b-login-code.png`、`probe.json`） |
| 6 | 登录页「3 道真实高考题／3 端现役壳层／0 网络请求」 | `src/ends/Login.vue:14-18` | 现役 hero 是「一个账号，连接学习、教学与科研」+ 三条能力 bullet，无数字组 |

### A2 学生·首页（8 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 7 | 「早上好，林一川 👋」问候 | `src/ends/student/StudentHome.vue:5` | 现役为「夜深了，小林 👋」（时段化），全文中无"早上好" |
| 8 | 「距高考还有 198 天 · 连续学习第 7 天」 | `StudentHome.vue:6` | 现役首页无高考倒计时；连击为 13 |
| 9 | 「本周独立解题率 68% ↑ 6%」卡 | `StudentHome.vue:8-12` | 现役首页无该卡；独立解题率只出现在「我的」页"诚实提示 100%" |
| 10 | 「本次演示的三道题」三题陈列卡（缩略图/摘要/进入引导） | `StudentHome.vue:38-61` | 现役首页无任何题卡；题只在会话上传后出现 |
| 11 | 三题卡状态「已完成·可重做／进行中·继续／未开始」 | `StudentHome.vue:108-119` | 同上；现役无题卡状态概念 |
| 12 | 「今日推荐」三条（含"错题复习 2 道待掌握""课堂 1 份新课"） | `StudentHome.vue:64-78` | 现役首页无「今日推荐」区块（有「最近学习」与学情脉搏，但内容不同） |
| 13 | 首页上传大卡（「选择题目图片」按钮 + 支持格式 + 三条 tag） | `StudentHome.vue:16-36` | 现役入口是四入口卡「📷 拍一道不会的题」；上传动作发生在对话输入框「拍照识题」 |
| 14 | 首页「最近学习」自造三条（题1 双曲线离心率／错题复习 正三棱柱／知识库提问 导数符号） | `StudentHome.vue:79-86` | 现役「最近学习」为 3 条真实会话（错题本录入·极值点判断等），标题全不同 |

### A3 学生·壳层 / 引导（10 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 15 | 顶部「🔥 7 连击」 | `src/shells/StudentShell.vue:16-19` | 现役为「🔥 13 连击」（顶栏均有） |
| 16 | 学生端账号名「林一川」/头像「林」 | `src/shells/StudentShell.vue:21-32` | 现役为「小／小林」（`student-01-home.json`、截图） |
| 17 | `/student/guide/:caseId` 独立引导路由 | `src/router.js:47`、`src/ends/student/GuideView.vue:1-179` | 现役引导发生在 `/dialog` 会话内，无独立引导路由/URL |
| 18 | 引导页题目上下文条（←返回首页／题号／chip／步骤圆点） | `GuideView.vue:4-19` | 现役对话页无步骤圆点、无题号头（`A/0*.png` 均为聊天气泡流） |
| 19 | 引导页左栏题图预览 + meta 行 | `GuideView.vue:44-51` | 现役是会话内附件卡，不是左栏题图（`A/02-attachment-parsed.png`） |
| 20 | 「已上传 · 内容匹配」绿色状态标签 | `GuideView.vue:47` | 现役附件卡为「✅ 已就绪」+ mimo_vision（`G1-SUMMARY.md:24`） |
| 21 | 「SHA-256 前 8 位」 | `GuideView.vue:49` | 现役 UI 无哈希；哈希仅见于证据文档 |
| 22 | 「平台识别结果／识别内容已与封存基准核对」OCR 卡 | `GuideView.vue:63-67` | 现役是 AI 消息复述题面（`A/03-ocr-reply.png`），无"封存基准"话术 |
| 23 | 结论卡（✅已完成本题 + 结论/推导/要点 + 四个动作按钮） | `GuideView.vue:75-97` | run-01 A 收束轮为散落的 AI 回复（A-D2 表述错），无结论卡 |
| 24 | 变式卡（举一反三/判分/换一个变式） | `GuideView.vue:99-131` | run-01 三题引导链路均未出现变式 |

> 另：`DynamicFigures.vue:1-220`（动态数学）见 A7 #62；`src/router.js:113` 的 404 兜底无现役证据（现役 catchall 见 run-01 `student-dl-11-catchall.png` 但离线行为未比对 → CSV 记 `暂未实测` 的仅 hash 路由一条）。

### A4 学生·练题 / 错题 / 知识库 / 资源中心 / 课堂 / 双师（12 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 25 | 练题页三 Tab「题1／题2／题3」分组 | `src/ends/student/PracticeView.vue:40-52` | 现役练题 tabs 为「今日推荐／自己选题／真题模考」（`s03-practice.png`） |
| 26 | 九题变式卡（原题/变式一/变式二 + 严格判分 + 错因 + 解析） | `PracticeView.vue:59-196` | 现役练题页无三题变式结构（qa/acceptance.csv:10 亦自认"无现役同款实测"） |
| 27 | 错题页「待掌握／已掌握」筛选 Tab | `src/ends/student/ErrorsView.vue:35-47` | 现役错题页为 FSRS 排序列表 + 三 KPI，无该 Tab（`s04-errors.png`） |
| 28 | 三份「演示种子 · 三题手册典型错答」初始化 | `ErrorsView.vue:202-237` | 现役 22 条错题均来自真实作答；无 seed 概念 |
| 29 | 知识库「切片／原文」双 Tab + 引用跳转 + 未命中文案 | `src/ends/student/LibraryView.vue:128-280` | 现役知识库页无取证文本（run-02 截错图，run-01 仅一屏）→ 无对应 |
| 30 | 资源中心「讲义」Tab（3 篇自撰讲义 + 阅读器 + 标记已读） | `src/ends/student/ResourcesView.vue:36-140` | 现役资源中心是 B 站视频卡墙（`s06-resources.png`），无讲义阅读器 |
| 31 | 资源中心「视频」Tab 6 条自造「平台视频索引条目」 | `ResourcesView.vue:350-410` | 现役视频卡有真实时长/播放量/UP 主/缩略图与匹配标签，与离线条目完全不同 |
| 32 | 视频未随包说明弹层 + 跳讲义替代 | `ResourcesView.vue:183-217` | 现役点卡为外链视频；离线替代路径无对应 |
| 33 | 学生课堂「预置发布版本」回退（preset-pub-ellipse-v1） | `src/data/classroom.js:35-70`、`src/ends/student/ClassroomView.vue:84-115`、`src/components/student/classroom/PublishedDeckCard.vue:13,57,88` | 现役课堂显示真实发布记录（函数的单调性／10-27 04:05），无 preset |
| 34 | 自主双师「3 个内置课题 + 1 个上传材料课堂」 | `src/data/classroom.js:175-218`、`src/components/student/classroom/SelfClassPanel.vue:24,58,126-133` | 现役为"输入知识点→生成 10 页"（`dual/transcript.md`），不是固定 3+1 |
| 35 | 学生课堂「最近课堂」列表 | `src/ends/student/ClassroomView.vue:123-140` | 现役课堂为任务中心（全部/待完成/已逾期/已完成），无"最近课堂" |
| 36 | 双师课堂缺省工具（离线仅目录/字幕/暂停/助教） | `src/ends/student/DualView.vue:1-138` | 反过来：现役有 12+ 工具而离线缺 → 记 `需要恢复`，此处仅登记"离线独有元素无对应"为零 |

### A5 教师·壳层 / 备课 / 题库 / 作业 / 批改 / 资源（14 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 37 | 后台任务面板两条任务（课件导出（椭圆）成功／作业批改建议生成·3 份 62%） | `src/shells/TeacherShell.vue:122-126` | 现役 `01-top-task-panel.json` 仅出现「后台任务」标题，无任务条目 |
| 38 | 教师账号菜单「进入备课中心／切换演示身份」 | `TeacherShell.vue:73-76` | 现役该处账号 chip 无可点菜单证据；"切换演示身份"非现役概念 |
| 39 | 备课中心「课时课件」三卡（椭圆／二次函数／集合，含 3 个 SVG 缩略图、页数、更新时间） | `src/ends/teacher/PrepCenter.vue:59-113` | 现役备课中心为"三起点卡 + 备课历史 1 条 + AI 备课助手"，无课时卡列表 |
| 40 | 备课中心「最近会话」列表 + 「快捷入口」侧栏 | `PrepCenter.vue:117-161` | 同上，现役无该两区块 |
| 41 | 备课中心内部实现说明「发布快照写入本机 store.teacher.publish.records」 | `PrepCenter.vue:158-160` | 现役界面不暴露 store 键名 |
| 42 | 「新建备课」对话框（课时主题 + 授课班级） | `PrepCenter.vue:165-212` | 现役通过底部输入框/起点卡创建会话，无该弹窗证据 |
| 43 | 备课中心副标题「· 离线演示收录 3 个课时（内容依据已复核教学蓝图）」 | `PrepCenter.vue:7` | 现役无该说法（顶栏副标题为"多轮对话 · 教材学情 · 教案课件一体生成"） |
| 44 | 题库页 3 道演示题 + 「题库 x/3 题」 | `src/ends/teacher/TeacherBank.vue:14,218-297` | 现役题库本轮 0/0 题、空态（`02-nav-bank.json`） |
| 45 | A4 试卷预览 + 「生成试卷」 | `TeacherBank.vue:166-196` | 现役题库空，未进入组卷 → 无对应 |
| 46 | 作业页内部键「store.ext.teacherGrading.assignments」三处文案 | `src/ends/teacher/TeacherAssign.vue:147,166,203` | 现役不暴露实现键名 |
| 47 | 批改页三份具名提交（林一川/周子墨/陈可欣）+ 5 分制满分 | `src/data/submissions.js:10-76` | 现役批改队列为匿名队列、按题聚焦、显示「/ 未设满分」（`08-deep-grading.json`） |
| 48 | 答卷原图（sub-A/B/C.png） | `src/components/teacher/grading/GradingSubmission.vue:47-79` | 现役该处"学生作答原图"为空（G2-2-D3），离线为脚本生成图 |
| 49 | 教师资源中心整页（本地课件/教案/题图/评分细则 + 教材切片缺源 + SHA 封存 + A4 缩略） | `src/ends/teacher/TeacherResources.vue:7-160` | 现役资源中心是 B 站备课视频卡墙（`02-nav-resources.json`），语义完全不同 |
| 50 | 「题图 SHA-256…（与三题手册封存一致）」「演示题库原图 · SHA-256 已封存」 | `TeacherResources.vue:189,258` | 现役 UI 无哈希/封存话术 |

### A6 科研·壳层 / 启动 / 阅读 / 写作（11 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 51 | 项目胶囊下拉（项目名 + 项目列表切换） | `src/shells/ResearchShell.vue:20-37` | 现役顶部为「π 智学数研 科研端｜启动页/工作台/个人中心」+ 身份区，无项目胶囊 |
| 52 | 「阅读／写作」分段切换 | `ResearchShell.vue:38-41` | 现役通过启动页→工作台→项目内进入，无顶部分段 |
| 53 | 「已同步 · 今天 10:24」（写死时间） | `ResearchShell.vue:45,86` | 现役无同步状态文案 |
| 54 | 「历史」按钮 + 🔔 角标 3 | `ResearchShell.vue:46-47` | 现役该位是「科研身份 · 研究者」+「林 林知远 ⌄」 |
| 55 | 品牌副标题「让研究更高效，让思想走更远」 | `ResearchShell.vue:15-16` | 现役顶部仅品牌名「π 智学数研 科研端」 |
| 56 | 科研用户名「徐 / Xu Chao」 | `ResearchShell.vue:49-50` | 现役为「林 / 林知远」 |
| 57 | 启动页 hero 数字组（演示项目/随包讲义/公式核查案例/笔记） | `src/ends/research/ResearchHome.vue:12-17` | 现役 hero 无数字组 |
| 58 | 「进入阅读工作区 →」「进入写作工作区 →」按钮 | `ResearchHome.vue:21-22` | 现役按钮为「进入科研工作台 →」「＋新建项目」 |
| 59 | 「我的项目」三张项目卡（含 文献/草稿/笔记/数据 四统计） | `ResearchHome.vue:27-60` | 现役「最近项目」为 2 条「未命名项目」列表（含 23 小时前/暂无描述/—文献 —草稿 —笔记/阅读 写作） |
| 60 | 「最近笔记」区块 | `ResearchHome.vue:62-82` | 现役启动页无最近笔记区块 |
| 61 | 页脚「随包演示材料 · 断网可用…」 | `ResearchHome.vue:84-87` | 现役启动页无该页脚 |
| 62 | 阅读页选段工具条（高亮／添加笔记／引用／问 AI） | `src/ends/research/ResearchRead.vue:191-194` | 现役工具条为「评判/解释/找证据/笔记」且本轮因 PDF 渲染失败不可用 → 无对应实拍 |
| 63 | 阅读页 Research Agent 能力区（推导校验/引用补全/LaTeX 对照/公式检查/翻译改写） | `ResearchRead.vue:260-380` | 现役 Agent 面板仅见"评判选中内容"等，能力清单未取证 |
| 64 | 证据来源列表 + 定位原文 + 加入笔记 | `ResearchRead.vue:297-308` | 现役因文本层为空，选段/证据/笔记不可用 → 无对应 |
| 65 | 公式检查三案例（√(x²)=x / 约分 / 配方） | `src/data/research.js:1067 起`、`ResearchRead.vue:340-370` | 现役公式检查入口不可用（G2-3-D1）→ 无对应实拍 |
| 66 | 写作 Agent 能力卡 + 修订补丁 + 引用缺失 + 错误修复 | `src/ends/research/ResearchWrite.vue:244-430` | 现役写作区不可交互，未见这些卡片 |
| 67 | 写作工程模板（main.tex + refs.bib）与三项目写作文件 | `src/data/research.js:1286-1410` | 现役项目无初始文件（编辑器不可交互的成因）→ 无对应 |

### A7 主持人 / 数据源 / 预置记录（其余 12 条）

| # | 离线内容 | file:line | 证据缺口说明 |
|---|---|---|---|
| 68 | 主持人工具面板（身份切换/三题检查点/全场景检查点/原图位置/复位/网络尝试次数） | `src/components/HostConsole.vue:1-69` | 现役无主持人工具（run-01/run-02 全程无该 UI） |
| 69 | FAB 显隐条件（`?host=1` 才显示） | `HostConsole.vue:70,89-92` | 现役无该浮标 |
| 70 | 快捷键 `Ctrl+Shift+H` / `Esc` | `HostConsole.vue:6,8,142-148` | 现役无 |
| 71 | 登录页「主持人工具」按钮 + `ms-open-host` 事件 | `src/ends/Login.vue:57,81-83` | 现役登录页无该入口 |
| 72 | 三题检查点直达 + 复位 | `HostConsole.vue:21-31` | 现役无该概念 |
| 73 | 全场景检查点 12 条路径 | `HostConsole.vue:34-41,95-108` | 现役无；且路径多为离线自造（`/student/dialog` 等） |
| 74 | 整场复位/分端复位 + localStorage 命名空间展示 | `HostConsole.vue:54-66`、`src/state/demo.js:99-120` | 现役无 |
| 75 | 主持人面板内开发机绝对路径 `D:\zxsy-math-arena\docs\superpowers\plans\题1..3.png` | `HostConsole.vue:44-52` | 现役无；且属本机路径泄漏 |
| 76 | 三题内容（标题/chip/OCR 文本/步骤/变式/结论卡文案） | `src/data/guidance.js:11-518` | 现役三题有真实对话（run-01 transcript），但离线正文为策展改写稿，逐句无对应 |
| 77 | 三组九题练习（原题+两个变式） | `src/data/practice.js:162-483` | 现役无该题库 |
| 78 | 三套演示课件 + 教案 + 蓝图 | `src/data/courseware.js:16-314` | 现役课件生成本轮阻塞（decks=0），无对应 |
| 79 | 备课会话/发布/导出/参数派生逻辑 | `src/data/prepPublish.js:27,203-450,747` | 现役无法发布，无对应 |
| 80 | 自主课题/AI 助教问答库/班级信息（`classInfo`） | `src/data/classroom.js:16-627` | 现役为生成式课堂 + 班级管理在教师端，无对应 |
| 81 | 三科研项目/五篇讲义/公式检查/写作工程 | `src/data/research.js:15-1410` | 现役项目为「未命名项目」，讲义为用户导入的 3 份自撰 PDF，无对应 |
| 82 | 预置发布记录 `preset-pub-ellipse-v1`（2026-11-20 20:10 / 张老师 / preset:true） | `src/data/classroom.js:35-70` | 现役无 preset 概念 |
| 83 | 预置发布说明「教师端还没有真实发布记录：这里用 deck-ellipse 生成预置发布 v1…」 | `src/ends/student/ClassroomView.vue:84-85,113-115` | 现役无 |
| 84 | 预置错题种子（seed:true × 3） | `src/ends/student/ErrorsView.vue:204-235` | 现役无 |
| 85 | 预置任务（2 条） | `src/shells/TeacherShell.vue:123-125` | 现役无 |
| 86 | 预置导出产物（`release/产物/*`、`qa/*/artifacts`）与 `downloadBlob` | `src/lib/exportPptx.js:1-149`、`exportPdf.js:1-125`、`exportDocx.js:1-86`、`download.js:1-16` | 现役导出未成功产出（G2-5 阻塞）→ 无现役产物可对照 |
| 87 | 导出/发布/批改状态写入 store（`lastExport`／`publish.records`／`grading.grades`） | `src/data/prepPublish.js:387-450,747`、`src/state/demo.js:27-41` | 现役写链路未回显（G2-2-D2）→ 无对应 |

---

## B. 本轮现役不可用/未采集，导致"找不到对应"（INVENTORY 记「暂未实测」，非展示版自造）

| # | 离线内容 | file:line | 现役缺口原因（已有线索） |
|---|---|---|---|
| B1 | hash 路由（`#/`） | `src/router.js:117` | 现役 URL 形态未知（run-02 为 `http://127.0.0.1:5176/dialog`，无 #） |
| B2 | 学生账号菜单（进入个人中心／切换演示身份） | `src/shells/StudentShell.vue:28-31` | 现役账号 chip 可点，菜单内容未采集 |
| B3 | 「AI 管家」待办面板（2 待办/2 错题/课堂 1） | `StudentShell.vue:64-74` | 现役右下确有 ✦ 浮标（`s03-practice.png`），点开内容未采集 |
| B4 | 引导页作答控件（单选/多选/填空/判分） | `src/ends/student/GuideView.vue:135-167` | 现役 B 题为圈点/填空结构化面板，控件清单未采集（`B/05-turn-02.png`） |
| B5 | 练题页统计条（正确/部分/提交次数） | `src/ends/student/PracticeView.vue:20-35` | 现役练题页统计口径未采集 |
| B6 | 知识库页文案/三 Tab/资料卡/入库 | `src/ends/student/LibraryView.vue:5-8,37-95` | run-02 `s05-library.png` 截成错题页；run-01 仅一屏 |
| B7 | 知识库三份自撰材料内容 | `src/data/library.js:1-325` | 现役知识库材料清单未采集 |
| B8 | 视频未随包弹层 | `src/ends/student/ResourcesView.vue:183-217` | 现役点开视频行为未采集 |
| B9 | 作业回看弹层字段（得分/评分细则/评语） | `src/components/student/classroom/HomeworkReviewDialog.vue:1-120` | 现役为"总分 30"制（run-01 assign transcript），字段未逐项采集 |
| B10 | 我的页主题/字号设置 | `src/ends/student/MeView.vue:246-303,548-554` | 现役「个人设置」页内容未采集（`s12-me-profile.png` 未读文本） |
| B11 | 备课中心自然语言输入条位置/交互（顶部大输入条 + 班级下拉 + chips） | `src/ends/teacher/PrepCenter.vue:16-56` | 现役有底部输入框（`publish/transcript.md:15`），位置/交互未采集 |
| B12 | 教师工作台三 Tab 内按钮/属性面板/教案 Tab/发布成功态 | `src/ends/teacher/PrepWorkbench.vue:22-110`、`src/components/teacher/prep/*` | 现役工具 disabled（G2-1-D3/G2-5-D1），发布链阻塞 decks=0 |
| B13 | A4 试卷预览/生成试卷 | `src/ends/teacher/TeacherBank.vue:166-196` | 现役题库 0/0 题，未进入组卷（`02-nav-bank.json`） |
| B14 | 批改工作台字段口径（匿名队列/按题聚焦/未设满分/AI 建议） | `src/ends/teacher/GradingView.vue:1-59`、`src/components/teacher/grading/*` | 现役有 JSON 文本，但字段与交互细节需复点 |
| B15 | 教师课堂监测字段（双师/实时互动/班级三 Tab 内容） | `src/ends/teacher/TeacherClassroom.vue:8,46-135` | 现役只有一屏 JSON 文本，Tab 内细节未采集 |
| B16 | 教师学情洞察区块顺序/指标/同步到备课画像 | `src/ends/teacher/TeacherInsights.vue:7-195` | 现役只有一屏 JSON 文本 |
| B17 | 科研新建项目弹窗字段与落点 | `src/ends/research/ResearchHome.vue:90-101` | 现役 ＋新建项目→进入 READ（`research/transcript.md:22`），弹窗内容未采集 |
| B18 | 科研阅读中栏工具栏（页签/页码/缩放/复制） | `src/ends/research/ResearchRead.vue:133-165` | 现役 PDF 渲染失败，工具栏仅截图可见 |
| B19 | 三份答卷评分细则字段 | `src/data/submissions.js:10-76` | 现役评分细则/量规未采集（现役显示"未设量规"） |
| B20 | 学生班级「高二 (1) 班」vs 现役「高一(3)班」 | `src/data/classroom.js:17` | 现役学生端截图未显示班级；教师/学情侧为高一(3)班·5 人 |
| B21 | 预置建议分（5/1/2 + 评语） | `src/data/submissions.js:28-29,50-52,72-73` | 现役有"规则自动判分 建议 1 分／AI 建议"，具体机制未采集 |
| B22 | 发布成功态（vN 快照/历史版本） | `src/components/teacher/prep/PublishCoursewareDialog.vue:80-101` | 现役发布链阻塞，无成功态实拍 |
| B23 | 题号标签「题1/题2/题3」（数字已由原图核验：3/9/14） | `src/data/guidance.js:14-20,193-200,365-372` | 现役 UI 是否显示题号未采集（附件行仅文件名） |
| B24 | 双师课堂自建课题 vs 现役生成式课堂的口径 | `src/data/classroom.js:175-218` | 现役为异步生成（备课中→完成），离线为内置课题；补测后决定保留方式 |

---

## C. 证据索引自身缺陷（影响"未列"判定，须一并修正）

| # | 缺陷 | 位置 | 影响 |
|---|---|---|---|
| C1 | **文件命名与内容不符**：`s05-library.png` 实际截到「错题」页（22 条错题 + 三 KPI + FSRS 排序） | `evidence/live/run-02/student/shots/s05-library.png` | 学生「知识库」在 run-02 **无有效证据**；本审计只能把知识库相关项记为 `暂未实测` |
| C2 | **引用失效**：`qa/acceptance.csv` 第 25 行引用 `evidence/live/run-01/inventory/routes.csv`（"76 行"），该文件**不存在** | `qa/acceptance.csv:25` → `evidence/live/run-01/inventory/` | 三端壳层/路由"原样实录"的引用链断裂 |
| C3 | run-02 仍在大规模采集中：`student/`、`research/` 下多为空目录；`evidence/live/run-02/student/_p01.log.txt` 为 0 字节 | `evidence/live/run-02/student/`、`.../research/` | 大量学生/科研项只能记 `暂未实测` |
| C4 | run-01 内部存在**两套学生身份**：`G1-SUMMARY.md:4`（13800001001 小林）与 `student/dual/transcript.md:4`（13800001004 小陈，高一(3)班） | `evidence/live/run-01/` | "学生姓名/班级"口径需按账号分别确认，离线单身份（林一川/高二(1)班）与两者都不一致 |
| C5 | run-02 `10-deep-today.json` 的 URL 为 `/teacher-v3/prep`（"每日教学"未单独成页） | `evidence/live/run-02/teacher/shots/10-deep-today.json` | 与离线 `router.js:64`（today→prep）一致；但离线导航未显示"每日教学"分组入口，需人工确认现役是否仅分组标题 |
| C6 | run-02 截图未附 DOM 文本（student/research 部分只有 PNG），文本判定只能依赖 `_lead-probe`/`teacher/shots`/`research/api` 的 JSON | `evidence/live/run-02/` | 学生四页（练题/错题/资源/课堂/我的）的逐条控件只能靠截图人工阅读，粒度有限 |
| C7 | `evidence/live/run-02/research/shots/00-login-otp.png` 与 `01-landing-viewport.png` 同字节（123905），疑同图复用 | `evidence/live/run-02/research/shots/` | 登录验证码/科研启动页各有一份证据缺口 |

---

## D. 汇总

| 组 | 条数 | 结论 |
|---|---|---|
| A. 完全找不到对应（展示版额外添加） | 87 条登记（对应 INVENTORY 中 79 个"展示版额外添加"项，部分项按元素拆条） | 撤下/内部保留，见 AUDIT.md §3、§4 |
| B. 现役不可用/未采集（暂未实测） | 24 条 | 先补测再定，见 AUDIT.md §5 |
| C. 证据索引缺陷 | 7 条 | 修正证据索引后再复审（尤其 C1/C2） |

> 本清单一律给出 `file:line`；凡离线内容与现役"概念相近但字段/数字不同"者，均放在 B 组而非 A 组，避免把"未取证"误判为"自造"。