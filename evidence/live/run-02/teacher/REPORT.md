# run-02 教师端实测采证报告（样板二前半：备课中心 → 编辑 → 导出 → 发布）

> 采证对象：**现役真实系统**（前端 `http://127.0.0.1:5176`，后端 8000 / 教师 8100 / PPT 8200 / Presenton 8201 / 科研 8300 已由主控启动）。
> 本报告只记录实测可见事实与网络事实；**没有修改现役仓库、showcase 产品代码、数据库、.env，也没有重启任何服务**。
> 采集时间：2026-11-22 02:05–02:30（+08:00）；浏览器 Chromium headless，viewport 1672×941，DPR=1。

## 0. 采证结论摘要

| 问题 | 结论 |
|---|---|
| 教师端可登录、可落地 | ✅ 成立（短信验证码演示码方式，落地 `/teacher-v3/prep`） |
| 左侧导航 6 个一级入口可达 | ✅ 6/6 可达，页面均渲染真实业务数据或空态 |
| 备课工作台可进入（既有「椭圆的定义」会话） | ✅ 成立（`/teacher-v3/prep/w/f5c84551-…/classroom`） |
| **真实编辑（改标题/改参数）** | ❌ **不成立**：课件为空（幻灯片 0/0）、页标题节点 0 个、a/b 参数输入 0 个、教案正文 contenteditable 0 个 |
| **导出 PPTX / PDF / 教案 Markdown** | ❌ **不成立**：三张格式卡全部 `disabled`，无任何下载、无产物文件 |
| **发布到班级课堂** | ❌ **不成立**：`发布课堂` / `发布到班级课堂` 按钮全部 `disabled`，发布对话框从未打开 |
| 新建备课（任务书允许的替代入口） | ❌ 同样受阻：AI 只回文本并挂出「选一本教材开始」卡，点击该卡无任何界面/网络响应，未见结构化教学方案 |
| 学生端可消费性（教师侧可见事实） | ⚠️ 课堂只有既有种子课件「函数的单调性：从图像到导数」，**没有**本轮「椭圆的定义」发布对象 |

**发布链路终点 = 阻塞**。阻塞位置在发布上游：教学路径（blueprint）与课件/教案两个产物均未生成 → 编辑、导出、发布三个出口全部不可用。详见 §4。

---

## ① 版本 / 身份 / 入口表

| 项 | 实测值 | 证据 |
|---|---|---|
| 前端 URL | `http://127.0.0.1:5176` | — |
| 页面 title | `智学数研 · 数学智能助学平台（v4）` | `shots/80-login-page.png`、`api/run-06-clean.json` |
| 登录页 | `/login`；进入身份 `select#preferred-role` 三个选项：学生端 `student` / 教师端 `teacher` / 科研端 `researcher`；`短信验证码`、`密码登录` 两个页签；手机号 `input#auth-phone`（placeholder「请输入中国大陆手机号」）；验证码 `input#auth-otp`（placeholder「6 位验证码」）；「获取验证码」「安全登录」；勾选「在这台设备上保持登录」 | `shots/80-login-page.png`、`shots/81-login-demo-code.png` |
| 登录方式（实测成功） | teacher + `13800001002` → 点「获取验证码」→ 页面出现「演示环境验证码：******」+「58 秒后重试」→ 填入 6 位码 →「安全登录」 | `api/run-06-clean.json` → `code_send`（`POST /api/auth/challenges/sms` 200，body 含 `demo_code`、`retry_after:60`）；`api/run-01-identity-pages.json` |
| 登录接口 | `POST /api/auth/challenges/sms` 200 → `POST /api/auth/login/sms` 200（响应 `access_token` 已脱敏）→ `GET /api/auth/me` 200 | `api/bodies/002_POST_auth_login_sms.txt`、`api/bodies/009_POST_auth_login_sms.txt` 等；`api/SUMMARY.json` |
| 登录频控（实测） | 同一手机号 60s 内二次发码 → 前端出现「验证码发送过于频繁」，`POST /api/auth/challenges/sms` 429，`retry_after` 9s/60s | 脚本日志 `[login] rate-limited, wait 9s`；`api/run-01-identity-pages.json` / `api/SUMMARY.json` |
| 落地路由 | `/teacher-v3/prep`（备课中心）；页面标题「备课中心」，副标题「多轮对话 · 教材学情 · 教案课件一体生成」 | `shots/82-prep-home-clean.png`、`shots/00-login-landed.png` |
| 可见姓名/角色 | 右上 chip：「张」+「**张老师**」+「**高中数学 · 教师**」；账号 `138****1002`（`/api/auth/me`） | `shots/82-prep-home-clean.png`、`api/run-06-clean.json` → `shell.chip` |
| 左侧导航（品牌区） | `∫` +「**教师工作台**」+「智学数研 · AI 备课教学」 | `shots/82-prep-home-clean.png` |
| 左侧导航 · 分组「每日教学」 | ① **备课中心** `/teacher-v3/prep`（active）② **课堂** `/teacher-v3/classroom` | `api/run-06-clean.json` → `shell.groups/nav` |
| 左侧导航 · 分组「资源与测评」 | ③ **题库与组卷** `/teacher-v3/bank` ④ **作业与批改** `/teacher-v3/assign` ⑤ **学情洞察** `/teacher-v3/insights` ⑥ **资源中心** `/teacher-v3/resources` | 同上 |
| 左侧导航角标 | 6 个一级项**均无数字角标**（`badge: []`）；仅工作台内顶栏「对话 N」有计数徽标（旧会话 10 / 新会话 2）；顶栏「任务」仅在 running/queued>0 时显示脉冲数字（实测 0 个任务，无角标） | `api/run-06-clean.json`、`shots/11-ws-ppt.png` |
| 顶部栏 | 页面标题 + 副标题；标签「AI 助教已就绪」；按钮「任务」；教师 chip「张老师 / 高中数学 · 教师」 | `api/run-06-clean.json` → `shell.topbar/tags/task_bell` |
| 各一级页顶部副标题 | 备课中心「多轮对话 · 教材学情 · 教案课件一体生成」；课堂「双师课堂 · 实时互动 · 班级」；题库「分类树 · 专题夹 · 拍照/自编入库」；作业「四步发布 · 学前/课后 · 批改终审」；学情「热力图 · 错因 · 诊断」；资源「资源 · 数学识别 · 构造配方库」 | 各页 `shots/82-classroom.png` … `shots/86-resources.png` |
| ⚠️ 外框副标题不一致 | 进入**工作台**（`/teacher-v3/prep/w/*`）后，平台顶栏副标题回落到默认值「**高二年级 · 2026 秋季学期**」，而同页课程元信息是「高一(3)班 · 数学 · 45分钟」 | `shots/20-ws-classroom-detail.png`、`shots/22-ws-ppt-detail.png`（可复刻时需保留该细节） |

---

## ② 逐页盘点表（23 项页面/视图）

> 约定：✔=可用；◐=可打开但有明确限制/空态；✖=关键业务不可用。截图均在 `shots/`。

| # | 页面 | 路由（实测） | 控件逐条（可见文字，按界面顺序） | 业务状态 / 数字 / 空态原文 | 截图 | 可用 |
|---|---|---|---|---|---|---|
| A1 | 登录页 | `/login` | 页签「短信验证码 / 密码登录」；「进入身份」学生端/教师端/科研端；「手机号」输入；「获取验证码」；「演示环境验证码：******」；「58 秒后重试」；「在这台设备上保持登录」；「安全登录」；「忘记密码？」「取消账号注销」「注册新账号」 | 演示码随机 6 位；频控文案「验证码发送过于频繁」 | `80-login-page.png`、`81-login-demo-code.png` | ✔ |
| A2 | 备课中心首页 | `/teacher-v3/prep` | 页标题「备课中心 / AI 助力，让备课更高效」；右上「教学资源库」「最近使用 高一(3)班 · 数学」；NL 输入框（placeholder 见 §③）；发送按钮；4 张入口卡；「最近备课 N」+「查看全部 ›」；列表行「继续备课」「···」；右下 Dock「数学绘图 / 伴随资源 / AI 助教」 | 登录时最近备课 1 条；新建后 2 条：旧「椭圆的定义…」最近修改 2026-11-21 03:04，新「椭圆的定义…」2026-11-22 02:18；状态徽标均为「**教学设计进行中**」 | `82-prep-home-clean.png`、`01-prep-home.png`、`03-prep-home-detail.png` | ✔（入口表面可用，实际产物见下） |
| A3 | 入口卡「从教材开始」 | 留在 `/teacher-v3/prep`（不跳转） | 卡片副文「选择教材版本与章节，AI 生成备课方案」 | 点击后：NL 输入框被预填「**从教材开始：请帮我定位要备课的教材章节**」并获得焦点（`focus=pc-home__nl-input\|TEXTAREA`）；无导航、无接口写操作 | `04-entry-from_textbook.png`、`api/run-01-identity-pages.json` → `entry_results` | ◐ 仅预填 |
| A4 | 入口卡「从已有教案开始」→ 教案模板库 | `/teacher-v3/prep-templates` | 「← 返回」「教案模板库」「⬆ 上传教案提炼模板」；页签「全部模板 / 我的模板 / 优质课蓝本 / 内置标准 / 资源库引用」；筛选「全部 / 新授课 / 习题课 / 复习课 / 讲评课」；「排序：最近使用 ▾」；`📁 你已提炼 0 份个人模板 · 累计使用 0 次` | 空态原文：「**这一分类下暂无模板。**」 | `04-entry-from_plan.png`、`06-deep-prep-templates.png` | ◐ 页面可达但库为空 |
| A5 | 入口卡「从已有PPT开始」 | 留在 `/teacher-v3/prep` | 卡片副文「上传课件，AI 分析并生成教学设计」 | 点击后 NL 输入框预填「**从已有PPT开始：我已有一份 PPT 课件，请帮我基于课件生成教学设计**」，焦点在输入框；无导航 | `04-entry-from_ppt.png` | ◐ 仅预填 |
| A6 | 入口卡「备课历史」 | `/teacher-v3/prep/history` | 卡片副文「回顾与继续最近的备课」 | 跳转成功（见 A7） | `04-entry-history.png` | ✔ |
| A7 | 备课历史页 | `/teacher-v3/prep/history` | 「备课历史」「汇总你的全部备课记录，随时回到任意一次备课。」；会话行（标题/班级/时长/时间/状态徽标）；「版本管理 选择一个备课，查看它的历史版本。」 | 行原文：`椭圆第一课时：椭圆的定义（含 2a>\|F1F2\| 条件）、标准方程的推导、焦点三角形例题与课堂小结` + `高一(3)班 · 数学 · 45分钟 · 2026-11-21 03:04` + 徽标「**教学设计进行中**」 | `05-prep-history.png`、`50-prep-history.png`、`87-prep-history-clean.png` | ✔ |
| A8 | 工作台 · 课堂设计（旧会话） | `/teacher-v3/prep/w/f5c84551-18a7-454d-b49c-8f115e816299/classroom` | 工作台顶栏：课程标题 +「· 高一(3)班 · 数学 · 45分钟」；Tab「课堂设计 / PPT / 教案」；工具「对话 10 / 资料(disabled) / 历史」；备课对话区「还有 8 条更早的消息 / 查看全部对话」；错误条「本轮生成没有完成，未写入任何内容。 重试」；空态卡「这节课还没有教学流程」；按钮「告诉 AI 我的备课想法」；「教材与资料 0 ›」；底部输入条 | 会话 id `f5c84551-18a7-454d-b49c-8f115e816299`，`revision=11`、`last_event_seq=50`、`status=active`、`blueprint_id=null`；对话 10 条（含 02:26 / 02:49 两轮「AI 服务暂时不可用，本次生成没有完成」错误卡）；最后 AI 回复 03:04 | `20-ws-classroom-detail.png`、`10-ws-open-classroom.png`、`29-ws-chat-detail.png` | ◐ 可打开、无教学流程 |
| A9 | 工作台 · PPT | `…/ppt` | 左缩略栏空态「课件尚未生成：确认教学路径后会自动生成。」；工具条「添加页 / T 文本 / Σ 公式 / 数学图形 / 图片 / 备注(即将支持) / **发布课堂**」；画布空态「课件尚未生成 / 确认教学路径后，会按它生成课件与教案，内容逐页由 AI 充实。/ 尚未生成教学路径，请先在「课堂设计」中与 AI 确认教学路径。」；底栏「幻灯片 0 / 0」「− 100% ＋」；右栏「智能属性 · 图形属性 / 页面信息」「本页暂无可参数化数学图形。带参数化图形的页面（如「椭圆的定义」）可在此调整 a/b、显隐与样式。」；「AI 快捷操作」3 卡 | 7 个工具按钮全部 `disabled=true`；缩略图 0 个；页标题节点 0 个；参数输入 0 个；`发布课堂` disabled。**无编辑对象 → 无保存行为**：顶栏不渲染「已保存 HH:MM」控件（仅 `deckStore.deckId` 存在时渲染），全程 0 次 PATCH；「预览演示」入口同样不渲染（无 deck） | `22-ws-ppt-detail.png`、`11-ws-ppt.png`、`23-publish-tool-blocked.png` | ✖ |
| A10 | 工作台 · 教案 | `…/plan` | 左大纲「教学目标 / 教学重难点 / 教学过程 / 板书设计 / 作业布置 / 教学反思」「收起侧栏」；正文工具条「正文 / 16 / B I U / 1 2 3」；空态「教案尚未生成 / 确认教学路径后，会按它生成课件与教案。/ 尚未生成教学路径，请先在「课堂设计」中与 AI 确认教学路径。」；右侧「智能辅助」「当前定位 教学目标」「AI 助手建议：精简语言 / 改成探究式提问 / 强化教材依据 / 补充板书要点」；顶栏「同步到课件」「导出」 | contenteditable 0 个；正文文档为空；「导出」打开对话框后三卡皆 disabled（见 §5） | `26-ws-plan-detail.png`、`12-ws-plan.png` | ✖ |
| A11 | 工作台 · 教材与资料 | `…/materials` | 左列「教材与资料」计数 `教材解析 0 / 相关图片 0 / 思维导图 0 / 例题素材 0 / 拓展资料 0 / 我的资料 个人上传`；「+ 上传资料」；右列「资料 / 教材来源 — —」「定位原文 / 加入备课依据」「拓展资料 暂无拓展资料」「相关图片 本节切片暂无插图」「我的资料 暂无个人资料，可点击下方上传」；空态「本次备课还没有定位教材章节；定位后这里会显示教材原文。」 | 全部计数 0；「资料」顶栏按钮 `disabled=true` | `30-ws-materials-detail.png`、`14-ws-materials.png` | ◐ 空数据 |
| A12 | 工作台 · 本次备课 | `…/overview` | 「返回备课首页」「本次备课」头卡（标题/元信息/徽标/最后修改）；信息条；「备课完成情况」5 磁贴；「版本管理」；「导出备课成果」3 张卡；「发布到班级课堂」行；「一致性检查」 | 5 磁贴全部未完成：`教材等你确认`、`教学设计等你确认`、`PPT 待生成 尚未生成课件`、`教案待生成 尚未生成教案`、`数学内容待检查 尚未生成课件`；版本区「**该备课暂无历史版本。**」；导出三卡都显示「**尚未生成，无法导出**」（disabled）；发布按钮 disabled，title「**先完成课件生成**」；一致性「**无法核对** 课件或教案尚未生成，暂无法核对。」 | `27-ws-overview-detail.png`、`15-ws-overview.png`、`28-overview-blocked.png` | ◐ 只读可视；出口全部不可用 |
| A13 | 工作台 · 对话 | `…/chat` | 左「返回备课中心 / 进行中 / 会话标题 / 高一(3)班·数学·45分钟 / 页签 对话交流·教学设计·生成PPT·生成教案」；中消息流（用户/AI/错误卡/时间戳）；右「教材依据 / 相关资料 / 完成教材定位后，这里展示教材依据（封面 / 章节结构 / 相关资源）。」；「上传文件 / 引用教材 / 数学图形」 | 10 条真实消息；错误卡原文「**本轮没有完成**」「**AI 服务暂时不可用，本次生成没有完成。**」；「已选教材 / 当前没有可选的授权教材」 | `29-ws-chat-detail.png`、`16-ws-chat.png` | ✔（可读） |
| A14 | 课堂 | `/teacher-v3/classroom` | 页签「双师课堂 / 实时互动 / 班级」；班级胶囊「高一(3)班 · 数学 · 5 人」；「刷新」；课件卡；「查看学情」 | 唯一已发布课件：`函数的单调性：从图像到导数` / `已发布` / `高一(3)班 · 数学 · 5 页 · 发布于 04:05` / `1/5 已打开` / `80% 已参与平均进度` / `— 已作答正确率` / `04:05 更新` / `1 人已进入`。API：`deck_id=demo-deck-monotonicity-v4`、`deck_revision=4`、`degraded=true`、`published_at=2026-10-26T20:05:09Z`（本地 2026-10-27 04:05） | `40-classroom.png`、`41-classroom-refreshed.png`、`02-nav-classroom.png` | ✔（只有种子课件） |
| A15 | 题库与组卷 | `/teacher-v3/bank` | 页签「题库 / 组卷」；「分类树 模块 ▸ 章 ▸ 知识点 ✎ 编辑」「全部知识点 0」；「我的专题夹 跨知识点引用 ＋ 新建」；筛选「全部题型 / 全部难度 / 全部来源」；「＋ 自编录入」「＋ 拍照入库」 | `0 / 0 题`；空态「**题库为空**」「**题库为空，上传教材自动切片入库，或手动录入题目。**」；专题夹空态「还没有专题夹。新建一个，把分散在各知识点的题按「专题」引用收集（如：圆锥曲线压轴、易错题集）。」 | `49-bank.png`、`02-nav-bank.png` | ✖（库为空） |
| A16 | 作业与批改（默认子页 = **发布作业四步流程**，不是批改工作台；进入即停在「1. 选班」，类型默认「🎓 学前作业」，作业列表默认「全部班级」） | `/teacher-v3/assign` | 顶部「批改工作台 →」「学情洞察 →」；「发布作业」四步「1. 选班 / 2. 组卷 / 3. 确认发布 / 4. 完成」；班级下拉「高一(3)班 · 数学（5 人）」；类型下拉「🎓 学前作业 / 📝 课后习题 / ✏️ 课堂练习」；「截止 / 知识点 / 题量 / 题型配比（选择/填空/解答）」；「② 生成题集」；「作业列表」+「全部班级 / 刷新」 | 提示原文：「**当前 8000 题库没有可出题知识点——直接去「题库与组卷」选 786 道校本题，发布后学生课堂任务立即可见。**」（与组卷页 0/0 题矛盾）；「② 生成题集」`disabled`；作业列表 2 份已发布：`🎓 学前作业 课前预习 · 函数的图象与性质`（创建 2026-10-27 04:01、截止 2026-10-31 04:01）、`📝 课后习题 课后作业 · 导数与函数单调性`（创建 2026-10-27 04:01、截止 2026-10-29 04:01），各有「批改进度 →」 | `42-assign.png`、`02-nav-assign.png` | ◐ 发布链路不可用 |
| A17 | 组卷中心 | `/teacher-v3/quiz`（由「去组卷并发布 →」进入） | 「题库选题 · 图片题照常入卷」「分类树 按知识点定位 全部知识点 0」；「＋ 扫描入库」；「试卷预览 A4 · 0 题」；「清空 / 导出 PDF / 发布为作业」；卷头「＿＿＿＿中学 2026 学年第一学期 数学单元练习卷 班级＿＿＿ 姓名＿＿＿ 学号＿＿＿ 成绩＿＿＿」；「从左侧题库点「＋」选题，试卷实时排版」 | `全部知识点 · 0 / 0 题`；空态「**题库为空**」「**题库为空，可「扫描入库」添加题目，或先去题库录入。**」；`导出 PDF`、`发布为作业`、`清空` 全 `disabled` | `43-quiz.png`、`44-quiz-attempts.png`、`07-deep-quiz.png` | ✖ |
| A18 | 批改工作台 | `/teacher-v3/grading` | 班级「高一(3)班 · 数学」；作业「课后作业 · 导数与函数单调性」；题号「第 1 题…第 5 题」+ 过滤「全部 / 待批 / 需复核 / 自动批 / 已批」；「作答队列 默认匿名 · 批完自动跳下一份」；题目与参考答案 B；「学生作答原图」（空）、「文本作答（原文）：B」；「规则自动判分 建议 1 分」「✦ 生成 AI 建议」；「教师终审给分（必填）/ 未设满分」「评语（将展示给学生）」「✓ 确认批改（写入终分）」；「← 上一份 / 下一份待批 →」 | UI：「**已批 1 / 1 · 待批 0**」「第 1 份作答」「建议 1 分」「自动批」；API `grading/queue` 返回 **5 条** `status:unprocessed`（匿名作答 #001–#005），与界面 1/1 口径不一致（见 §7 D-10） | `45-grading.png`、`08-deep-grading.png` | ✔（只读；本轮未写分） |
| A19 | 学情洞察 | `/teacher-v3/insights` | 班级「高一(3)班 · 数学」；「⟳ 同步到备课画像」；指标卡；「知识点薄弱热力」；「可行动洞察 确定性聚合 · 附证据」；「每生学情 5 名在班学生 · 薄弱 KP 取掌握度最低 3 项」+ 表格 | 班级平均掌握度 **61%**（「来自已确认批改的 BKT 掌握度」）；待批积压 **0**（「全部已批完」）；近 14 天提交 **0 份**；高频错因「**—** 暂无错题聚集」；热力空态「**窗口内还没有已判作答；发布作业并等学生提交后出现。**」；洞察「提交趋势 较上份作业，最近作业提交量下降（1 → 0）」；每生表：小林 在班 1 0 61%（薄弱：导数的概念与运算 0%、导数的运算法则与复合求导 5%、集合与常用逻辑用语 20%），小陈/小周/小许/小唐 在班 0 0 — — | `46-insights.png`、`02-nav-insights.png` | ✔ |
| A20 | 资源中心 | `/teacher-v3/resources` | 「📺 资源中心 / 与高中数学教学相关的 B 站备课视频，点封面直接去 B 站看」；分类「⭐ 备课精选 / 📘 教材解读 / 🎬 专题微课 / ✏️ 解题方法 / 🔥 高考备考 / 🏆 竞赛拓展」；「↻ 刷新」；视频卡（时长、播放量、标题、UP 主） | 实测 12 条视频（例：`1:02:20 / ▶ 998.8 万 / “基本不等式”学懵了？保姆级教程在此！ / @一数`；`311:28 / ▶ 778.9 万 / 高中数学圆锥曲线基础与考点合集…`）；刷新后列表稳定 | `47-resources.png`、`48-resources-refresh.png`、`02-nav-resources.png` | ✔ |
| A21 | 班级管理（深链，非一级导航） | `/teacher-v3/classes` | 「🏫 班级管理 / 建班 · 邀请码 · 成员确认」「＋ 建班」「我的班级 1 个」；班级卡「高一(3)班 · 数学 / 高一 · 5 名学生 / 邀请码 FJA2JH」；「重置邀请码」「当前邀请码」；成员列表+「移出班级」 | 成员 5 人：小唐/小许/小周/小陈/小林，均「已确认 · 加入于 2026-10-27 · ✓ 在班」；另有「张老师 教师 已确认」行 | `09-deep-classes.png` | ✔ |
| A22 | 「每日教学」深链 | `/teacher-v3/today` → 实测 **302/替换到 `/teacher-v3/prep`**（落地后 URL 与内容均同备课中心） | 同 A2 | 路由不存在独立内容（顶部副标题实际显示「备课中心」副标题；截图与 A2 相同） | `10-deep-today.png` | ◐ 重定向 |
| A23 | 新建会话工作台（本轮通过 NL 真实新建） | `/teacher-v3/prep/w/393d2558-b8e9-4380-aaa5-5a62e0c2940e/classroom`（及 `/ppt`、`/plan`、`/overview`） | 同 A8–A12 结构；对话区 2 条消息；AI 回复 + 卡「**选一本教材开始**」 | `revision=3`；会话标题「椭圆的定义与标准方程 · 第1课时」；AI 原话「好的，椭圆第一课时“定义与标准方程”我接住了，接下来我会梳理这节课的备课思路；先请您定一下用哪本教材，我随后把教材选择卡发给您。」；等待 100s 后仍无「这节课的教学流程」、无确认卡、无课件/教案；点击「选一本教材开始」卡片 → **无弹层/无列表/无新接口** | `60-new-session-input.png`、`61-new-session-creating.png`、`64-new-session-after-wait.png`、`71-textbook-picker.png`、`65-new-ws-ppt.png`、`66-new-ws-plan.png`、`67-new-ws-overview.png` | ✖（同样阻塞） |

**页面盘点数：23 项**（一级导航 6 项全部实测；备课中心域 13 项：首页、3 张入口卡、备课历史、教案模板库、工作台 6 视图、新建会话工作台；页内深链 4 项：组卷中心、批改工作台、班级管理、每日教学工作台入口）。另有顶部「任务」面板实测（`01-top-task-panel.png`）。

---

## ③ 样板二时间线（我点了什么 → 界面反馈原文 → 是否成功 → 证据）

> 全部通过真实 UI 完成；disabled 控件也用真实 `click` 尝试（Playwright 超时即"不可点"证据，不是绕过）。

| # | 我点了什么 | 界面反馈原文 | 是否成功 | 证据 |
|---|---|---|---|---|
| 1 | 打开 `/login`；`#preferred-role`=teacher；填 `13800001002`；点「获取验证码」 | 页面显示「演示环境验证码：432767」「58 秒后重试」；响应 `POST /api/auth/challenges/sms` 200 | ✅ | `80-login-page.png`、`81-login-demo-code.png`、`api/run-06-clean.json` |
| 2 | 填验证码 →「安全登录」 | 落地 `/teacher-v3/prep`；右上「张老师 / 高中数学 · 教师」；标题「备课中心」 | ✅ | `82-prep-home-clean.png` |
| 3 | 首页→点入口卡「从教材开始」 | NL 框出现「从教材开始：请帮我定位要备课的教材章节」；无跳转 | ◐ 仅预填 | `04-entry-from_textbook.png` |
| 4 | 回首页→点「从已有教案开始」 | 跳 `/teacher-v3/prep-templates`；「这一分类下暂无模板。」；「你已提炼 0 份个人模板 · 累计使用 0 次」 | ◐ 页面可达、库空 | `04-entry-from_plan.png`、`06-deep-prep-templates.png` |
| 5 | 回首页→点「从已有PPT开始」 | NL 框预填「从已有PPT开始：我已有一份 PPT 课件，请帮我基于课件生成教学设计」 | ◐ 仅预填 | `04-entry-from_ppt.png` |
| 6 | 回首页→点「备课历史」 | 跳 `/teacher-v3/prep/history`；唯一会话「椭圆第一课时…」+「教学设计进行中」 | ✅ | `04-entry-history.png`、`05-prep-history.png` |
| 7 | 在首页最近备课区点会话行「椭圆的定义」（旧会话） | 进入 `/teacher-v3/prep/w/f5c84551-18a7-454d-b49c-8f115e816299/classroom`；顶栏课程标题+元信息；Tab 课堂设计/PPT/教案 | ✅ | `10-ws-open-classroom.png`、`20-ws-classroom-detail.png` |
| 8 | 点 Tab「PPT」 | 左栏「课件尚未生成：确认教学路径后会自动生成。」；「幻灯片 0 / 0」；7 个工具按钮全部禁用 | ✖ 无课件 | `22-ws-ppt-detail.png` |
| 9 | 点工具条「发布课堂」（真实 click） | 按钮 DOM：`<button disabled … data-testid="pc-deck-publish" title="发布到班级课堂：…">；click 超时 2.5s，「element is not enabled」；未出现任何 dialog | ✖ 阻塞 | `23-publish-tool-blocked.png`、`api/run-02b-edit-export-publish.json` → `attempts.publish_deck_tool` |
| 10 | 点顶栏「导出」（PPT Tab 可见） | 弹出「导出」对话框：3 张卡「课件 PPTX / 教案 PDF / 教案 Markdown」，副文与「预计文件名」；每张卡只有一颗「开始导出」按钮且全部 `disabled`，title 分别是「尚未生成课件，无法导出」（PPTX）/「尚未生成教案，无法导出」（两份教案） | ✖ 阻塞 | `24-export-dialog.png`、`25-export-cards-blocked.png`、`api/run-02b-…json` → `states.export_dialog` |
| 11 | 逐卡点「开始导出」（3 次真实 click） | 3 次均 click 超时（disabled）；无网络请求、无下载、无文件 | ✖ | `25-export-cards-blocked.png`、`attempts.export_cards` |
| 12 | 尝试「编辑标题」：双击 PPT 画布空白处 | `.pc-slide__title` 节点数 = 0；双击后 `.pc-slide__title-edit` 输入框数 = 0（空课件无编辑对象） | ✖ | `attempts.edit_slide_title`、`22-ws-ppt-detail.png` |
| 13 | 尝试「改参数」：属性面板找 a/b | 「长半轴 a」「短半轴 b」输入框数量均 = 0；面板原文「本页暂无可参数化数学图形。带参数化图形的页面（如「椭圆的定义」）可在此调整 a/b、显隐与样式。」 | ✖ | `attempts.edit_params`、`22-ws-ppt-detail.png` |
| 14 | 点 Tab「教案」 | 「教案尚未生成」；contenteditable = 0；正文区无内容；「导出」仍 disabled 可用入口（打开后三卡全 disabled） | ✖ | `26-ws-plan-detail.png` |
| 15 | 进入「本次备课」视图（`…/overview`，深链） | 5 磁贴全未完成；「该备课暂无历史版本。」；3 张导出卡都写「尚未生成，无法导出」；「发布到班级课堂」按钮 `disabled title="先完成课件生成"`；「一致性检查 无法核对」 | ✖ | `27-ws-overview-detail.png`、`28-overview-blocked.png` |
| 16 | 点概览页 3 张「尚未生成，无法导出」+「发布到班级课堂」（4 次真实 click） | 全部 click 超时（disabled）；无 dialog（`[data-testid=publish-dialog]` 计数 0） | ✖ | `28-overview-blocked.png`、`attempts.overview_export/overview_publish` |
| 17 | 回「课堂设计」点错误条「重试」 | 点击成功；界面新增原话「**动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）**」；网络：`POST /api/teacher-v3/prep/conversations/{id}/actions` → **409**，`code=40900, error_key=conflict` | ✖ 阻塞（重试不可执行） | `21-retry-result.png`、`api/bodies/043_POST_…_actions.txt`（响应体） |
| 18 | 新建分支：首页 NL 输入「椭圆第一课时：椭圆的定义与标准方程（R02 新建实测）」→ 点发送 | 创建中卡片「正在创建备课会话… / 已受理你的备课请求，正在进入工作台。/ 已用时 2 秒」；`POST /api/teacher-v3/prep/conversations` → **202**；进入新工作台 `/prep/w/393d2558-…/classroom` | ✅ 创建成功 | `60-new-session-input.png`、`61-new-session-creating.png`、`62-new-session-workspace.png`、`api/bodies/036_POST_teacher-v3_prep_conversations.txt` |
| 19 | 等待 AI 回复（20s×5，总 ~100s） | 2 条消息：用户请求 + AI「好的，椭圆第一课时“定义与标准方程”我接住了…先请您定一下用哪本教材，我随后把教材选择卡发给您。」；卡「选一本教材开始」；仍无「这节课的教学流程」、无确认按钮（确认/生成按钮 0 个） | ✖ 未产出可确认方案 | `63-new-session-wait-30s.png`、`64-new-session-after-wait.png` |
| 20 | 点 AI 卡片「选一本教材开始」 | 界面无任何变化（无弹层、无选项、无接口业务请求；仅有页面自身静态资源请求）；「教材与资料 0」保持 | ✖ 卡不可操作 | `71-textbook-picker.png`、`72-textbook-picker-closed.png`、`api/run-05-textbook-picker.json` |
| 21 | 新会话 PPT / 教案 / 本次备课 | 同旧会话：`课件尚未生成`、`教案尚未生成`、导出/发布 disabled、0 课件 0 教案 | ✖ | `65-new-ws-ppt.png`、`66-new-ws-plan.png`、`67-new-ws-overview.png` |
| 22 | 课堂→「刷新」 | 列表仍只有 `函数的单调性：从图像到导数`（已发布/5 页/发布于 04:05/1/5/80%/1 人已进入），无「椭圆的定义」对象 | ✖（无新发布对象） | `40-classroom.png`、`41-classroom-refreshed.png` |
| 23 | 作业与批改→「去组卷并发布 →」 | 跳 `/teacher-v3/quiz`；`全部知识点 · 0 / 0 题`；「题库为空，可「扫描入库」添加题目，或先去题库录入。」；「导出 PDF」「发布为作业」disabled | ✖ | `42-assign.png`、`43-quiz.png`、`44-quiz-attempts.png` |
| 24 | 批改工作台（深链） | 「已批 1 / 1 · 待批 0」；可打开第 1 题作答；未做写分动作 | ✅ 只读可用 | `45-grading.png` |
| 25 | 学情洞察 / 资源中心 / 班级管理 | 61% / 0 / 0 份 / —；12 条 B 站视频；1 个班 5 人 + 邀请码 FJA2JH | ✅ | `46-insights.png`、`47-resources.png`、`09-deep-classes.png` |

---

## ④ 发布链路终点结论

### 4.1 结论

**发布失败（阻塞）**，而且不是"点了发布后失败"，而是**发布入口从未可用**：

- `/teacher-v3/prep/w/{session}/ppt` 工具条 `发布课堂`：`disabled=true`（`data-testid="pc-deck-publish"`）。
- `/teacher-v3/prep/w/{session}/overview` 的「发布到班级课堂」：`disabled=true`，`title="先完成课件生成"`（`data-testid="ov-publish"`）。
- 两次真实点击均超时（不可点），页面未出现 `[data-testid=publish-dialog]`，因此：
  - **可选班级列表**：未实测（发布对话框未打开）。页外可见班级目录只有 `高一(3)班 · 数学（5 人）`（班级管理/作业页/课堂页一致）。
  - **发布过程态**（"已提交，正在准备课堂…"）：未实测。
  - **成功态文案**（「已发布 · {标题}」+「…的学生现在可以在「课堂」看到这份课件。」）：**未出现**。
  - **版本号**：未产生；只有既有种子课件 API 内的 `deck_revision=4`（不属于本轮）。

### 4.2 最后可证状态（阻断点逐层）

| 层 | 事实 | 证据 |
|---|---|---|
| ① 教学蓝图 blueprint | 旧会话 `blueprint_id=null`；`GET …/blueprint/revisions` → `{"blueprint_id":null,"items":[]}`；overview「教学设计等你确认」；课堂设计「这节课还没有教学流程」 | `api/bodies/085_GET_…_blu.txt`、`27-ws-overview-detail.png`、`20-ws-classroom-detail.png` |
| ② 课件 deck | `slides 0/0`；`课件尚未生成`；缩略图 0；工具条 7 项全 disabled；无 `/decks` GET/POST 请求 | `22-ws-ppt-detail.png`、`api/run-02b-…json` |
| ③ 教案 lesson plan | `教案尚未生成`；正文 contenteditable 0；导出 disabled（「尚未生成教案」） | `26-ws-plan-detail.png`、`24-export-dialog.png` |
| ④ 导出出口 | 3 卡 disabled；无任何 `POST /decks/{id}/exports` 或 `POST /lesson-plans/{id}/exports` 请求 | `25-export-cards-blocked.png`、`api/SUMMARY.json` |
| ⑤ 发布出口 | 2 处发布按钮 disabled；无发布 dialog、无发布 API 请求 | `23-publish-tool-blocked.png`、`28-overview-blocked.png` |
| ⑥ 恢复入口 | 错误条「重试」→ 409：`动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）` | `21-retry-result.png`、`api/bodies/043_POST_…_act.txt` |
| ⑦ 新建分支 | 新会话 AI 停在"选教材"，卡片点击无响应；100s 内无教学方案/确认卡/产物 | `64-new-session-after-wait.png`、`71-textbook-picker.png` |

### 4.3 复现步骤（最短路径）

1. `/login` → 教师端 → 手机号 `13800001002` →「获取验证码」→ 页面演示码 →「安全登录」→ `/teacher-v3/prep`。
2. 点最近备课行「椭圆的定义」（旧会话）→ 工作台 `/prep/w/f5c84551-18a7-454d-b49c-8f115e816299/classroom`。
3. 点 Tab「PPT」→ 观察「课件尚未生成」，「幻灯片 0 / 0」，工具条全灰，`发布课堂` 灰。
4. 点「导出」→ 3 张格式卡均显示「尚未生成，无法导出」且「开始导出」灰。
5. 回「课堂设计」→ 点错误条「重试」→ 出现 `动作 'retry_run' 不可执行…`。
6. 或从首页 NL 新建会话 → AI 只回文本 +「选一本教材开始」卡 → 点卡无反应 → 100s 后仍无教学流程。

---

## ⑤ 导出产物清单

### 5.1 结论：**0 个产物，0 次真实导出**

- `artifacts/` 目录为空（0 files）。
- 没有触发任何导出作业接口（网络取证中 `POST …/exports`、`GET …/exports/{job}`、`…/tickets` 出现次数均为 0；仅 Vite 动态加载了 `exportApi.ts` 源码模块）。
- 原因：PPTX / 教案 PDF / 教案 Markdown 三张卡全部 disabled；overview 的 PPTX / PDF / 教案 三张卡也全部 disabled；组卷中心「导出 PDF」disabled。

### 5.2 界面给出的"预计文件名"（真实产品口径，供离线复刻）

| 卡 | 预计文件名（界面原文） | 真实产出 |
|---|---|---|
| 课件 PPTX | `椭圆第一课时：椭圆的定义（含 2aF1F2 条件）、标准方程的推导、焦点三角形例题与课堂小结.pptx` | ❌ 无 |
| 教案 PDF | `椭圆第一课时：椭圆的定义（含 2aF1F2 条件）、标准方程的推导、焦点三角形例题与课堂小结-教案.pdf` | ❌ 无 |
| 教案 Markdown | `…-教案.md` | ❌ 无 |
| 本次备课 · 导出 PPTX / 导出 PDF / 导出教案 | 三卡副文「尚未生成，无法导出」 | ❌ 无 |

> 注：界面预计文件名会**剥离 `>` 与 `|` 字符**（原题「2a>\|F1F2\|」显示为「2aF1F2」），复刻时需保留该净化规则；`Content-Disposition` 真实文件名本应覆盖预计名，但本轮从未走到该步。

### 5.3 "能否打开"实测

用 `python-pptx`、`python-docx`、`pypdf` 均已验证可导入（`pptx.api` / `docx.api` / `pypdf._reader`），但因**无任何导出文件**，不存在可打开对象；`artifacts/` 文件数 = 0。若后续链路修复，复刻时可直接用同一套脚本抽首页文本（校验 hl 的脚本已放在 `scripts/98_summary.py` 同目录环境可用）。

---

## ⑥ 学生端可消费性备注（只记录教师侧事实）

- **课堂页**（教师侧）：已发布课件列表 API 返回 `total=1`，唯一对象为**既有种子** `函数的单调性：从图像到导数`（`deck_id=demo-deck-monotonicity-v4`、`deck_revision=4`、`page_count=5`、`status=published`、`degraded=true`、`published_at=2026-10-26T20:05:09Z`≈本地 2026-10-27 04:05、`opened=1/total=5`、`avg_progress=80%`、`practice_accuracy=null`）。界面显示「1/5 已打开」「80% 已参与平均进度」「— 已作答正确率」「1 人已进入」，刷新后不变。
- **本轮对象**：旧会话「椭圆的定义」与新会话「椭圆的定义与标准方程」**均未出现在课堂列表**；没有任何 `椭圆的定义` 课件/课堂发布记录。
- **作业侧**：作业列表仅 2 份**既有种子**已发布作业（课前预习 · 函数的图象与性质；课后作业 · 导数与函数单调性），本轮未新增作业；组卷 0/0 题导致无法发布新作业。
- **批改侧**：批改工作台可打开既有提交，界面「已批 1 / 1 · 待批 0」（`grading/workspace.progress.total=1, confirmed=1, remaining=0`）。本轮为只读采证，**未点击「确认批改」写分**，避免副作用。
- 因此：**教师侧事实支持"本轮没有可被学生消费的新内容"**；学生端是否实际可见，需学生端采证员验证（本报告不越权下结论）。

---

## ⑦ 失败与阻塞清单（含界面原话 / 锚点）

| ID | 失败/阻塞 | 现象（界面原话 / 网络事实） | 锚点 |
|---|---|---|---|
| L2-D1 | **教材库为空 / 教材选择卡不可用** | 旧会话历史消息「已选教材 / **当前没有可选的授权教材**」；新会话 AI 要求选教材，卡「选一本教材开始」，点击后**无弹层、无选项、无接口业务请求**；首页「教材与资料 0」 | `29-ws-chat-detail.png`、`64-new-session-after-wait.png`、`71-textbook-picker.png` |
| L2-D2 | **教学蓝图未生成** | 旧会话 `blueprint_id=null`、`revisions items=[]`；类页面「这节课还没有教学流程」；overview 磁贴「教学设计等你确认」 | `20-ws-classroom-detail.png`、`27-ws-overview-detail.png`、`api/bodies/085_GET_…_blu.txt` |
| L2-D3 | **「重试」不可执行（409）** | 点击错误条「重试」→「**动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）**」；`POST …/actions` 409 / `code=40900` / `error_key=conflict`；控制台仅一条 `error: Failed to load resource: the server responded with a status of 409 (Conflict)` | `21-retry-result.png`、`api/bodies/043_POST_…_act.txt` |
| L2-D4 | **无课件 → PPT 全禁用** | 「课件尚未生成」「幻灯片 0 / 0」；`添加页/T 文本/Σ 公式/数学图形/图片/备注/发布课堂` 全部 disabled；「尚未生成教学路径，请先在「课堂设计」中与 AI 确认教学路径。」 | `22-ws-ppt-detail.png` |
| L2-D5 | **无教案 → 教案编辑器为空** | 「教案尚未生成」；正文 `contenteditable=0`；工具条存在但无对象 | `26-ws-plan-detail.png` |
| L2-D6 | **导出三格式全部 disabled** | 「导出」对话框 3 卡：「课件 PPTX」「教案 PDF」「教案 Markdown」；按钮「开始导出」disabled，title「尚未生成课件，无法导出」「尚未生成教案，无法导出」；无导出接口请求 | `24-export-dialog.png`、`25-export-cards-blocked.png` |
| L2-D7 | **概览页导出/发布 disabled** | 3 张卡「尚未生成，无法导出」；「发布到班级课堂」disabled `title="先完成课件生成"` | `27-ws-overview-detail.png`、`28-overview-blocked.png` |
| L2-D8 | **发布入口 disabled（2 处）** | PPT 工具条「发布课堂」disabled；概览「发布到班级课堂」disabled；真实点击均超时，无发布 dialog/班级列表/版本号 | `23-publish-tool-blocked.png`、`28-overview-blocked.png` |
| L2-D9 | **题库空 0/0，与作业页 786 题提示矛盾** | 题库/组卷：「题库为空」「0 / 0 题」；作业页却提示「当前 8000 题库没有可出题知识点——直接去「题库与组卷」选 **786 道**校本题」 | `49-bank.png`、`43-quiz.png`、`42-assign.png` |
| L2-D10 | **批改队列口径不一致** | UI「已批 1 / 1 · 待批 0」；`GET /api/teacher/grading/queue` 返回 5 条 `status:unprocessed`（匿名作答 #001–#005） | `45-grading.png`、`api/run-03-pages-detail.json` 的 grading/queue body |
| L2-D11 | **旧错误横幅常驻** | 03:04 的「本轮生成没有完成，未写入任何内容。」错误条在多次进入/切换 Tab 后仍常驻课堂设计；AI 已正常回复多轮后不消失 | `20-ws-classroom-detail.png` |
| L2-D12 | **新建会话无结构化提案** | 新会话等待 ~100s，仅 1 条文本回复 + 教材卡；无「确认/生成」按钮（`confirm_buttons=[]`）、无教学流程、无产物；未见 run-01 记录的「AI 提案 暂不支持的内容类型」原文（本轮更换为"无提案"形态） | `64-new-session-after-wait.png`、`api/run-04-new-session.json` → `structure` |
| L2-D13 | **概览「发布到班级课堂」区域竖排挤压（视觉缺陷）** | 右列宽度不足，发布区文字按单字竖排（截图可见），影响可读性 | `27-ws-overview-detail.png` |
| L2-D14 | **顶栏副标题与班级矛盾** | 工作台页平台副标题「高二年级 · 2026 秋季学期」，课程元信息「高一(3)班 · 数学 · 45分钟」 | `20-ws-classroom-detail.png`、`22-ws-ppt-detail.png` |
| L2-D15 | 登录频控（操作限制，非缺陷） | 同一手机号 60s 内二次发码：`POST /api/auth/challenges/sms` 429，「验证码发送过于频繁」；控制台对应当前仅一条 429 resource error | `api/SUMMARY.json`、脚本日志 |

---

## ⑧ 必须精确复刻的 UI 细节清单

### 8.1 外框与导航（平台层）

| 项 | 实测值 / 文案 |
|---|---|
| 平台左导航宽 | `--tv3-nav-w: 216px`，白底、右 1px `#e2e8f0` 发丝线；激活项浅蓝底 `#eef2ff` + 主色字 `#4f46e5` |
| 平台顶栏高 | `--tv3-topbar-h: 56px`，白底、下 1px 发丝线；标题 14px/600 + 副标题 12px `#64748b` |
| 品牌区 | 徽标 `∫`（30px 圆形渐变 nav→gold）+「教师工作台」+「智学数研 · AI 备课教学」（11px 灰） |
| 分组标签 | 「每日教学」「资源与测评」，11px 主色、letter-spacing 1px、padding 14px 20px 6px |
| 导航项 | 13.5px；图标 17px；6 项顺序与 href 见 §①；无角标 |
| 顶栏右组 | 「AI 助教已就绪」小胶囊（青绿系 `--tv3-gold-*`）；「任务」按钮；教师 chip 30px 圆形渐变头像 + 姓名 12.5px/600 +「高中数学 · 教师」10.5px 灰 |
| 悬浮 Dock | 右下角固定 3 卡：「数学绘图」「伴随资源」「AI 助教」，每卡 emoji 图标 + 标题 + 一句副文；所有页面常驻（含备课中心，G1 不变量） |

### 8.2 备课中心（`--pc-*` token，黄金图 1672×941 实测）

| 项 | 实测值 |
|---|---|
| 页面底 / 卡片 | `--pc-bg #f6f8fb`，`--pc-panel #ffffff`，`--pc-section-bg #f8fbfe`，`--pc-canvas #eef2f8` |
| 主色 | `--pc-primary #2563eb`（按钮/激活 Tab/链接），`--pc-primary-bright #2f71fe`（Logo/发送），`--pc-primary-soft #eff4ff` |
| 文本 | 正文 `#111827`，次级 `#1f2937`，次要 `#6b7280`，弱化 `#9ca3af`，发丝线 `#e5e9f2` |
| 圆角/阴影 | 卡片 12、面板 14、徽标 8、胶囊 999；浮层阴影 `0 8px 24px rgba(15,23,42,.08)` |
| 字号 | 页标题 20/700，区标题 15/600，正文 14，元信息 13，说明 12，行高 1.6 |
| 工作台顶栏 | 高 56px；左：课程标题+meta（超长省略号截断）+ 分隔点 + meta「高一(3)班 · 数学 · 45分钟」；中：胶囊分段 Tab「课堂设计 / PPT / 教案」（激活白底+主蓝字+2px 蓝下划线+浅蓝底）；右：PPT Tab 才有「已保存 HH:MM」绿勾（本轮无课件故不出现）、「预览演示」「同步到教案」「更多」「导出」（仅 ppt/plan）、「对话 N」「资料」「历史」 |
| 工作台左导航 | **不渲染第二套侧栏**（备课中心主页/工作台均无内部左导航；平台导航常驻） |
| 入口卡 | 4 张等宽卡（`gridTemplateColumns: repeat(4,minmax(0,1fr))`），左侧 40px 圆角图标底（indigo/emerald/rose/sky 四色），标题 14/600 + 副文 12 灰，右 chevron；卡序：从教材开始 / 从已有教案开始 / 从已有PPT开始 / 备课历史 |
| 最近备课行 | 彩色类型图标 + 标题（含「教学设计进行中」徽标）+ 元信息「班级 · 学科 · 45分钟」+ 知识点行 + 一句描述 + 状态徽标 + 「最近修改: YYYY-MM-DD HH:MM」+ 主按钮「继续备课」+「···」菜单（删除） |
| 备课历史页 | 左列表 + 右「版本管理」空态「选择一个备课，查看它的历史版本。」；行：标题 14/600 + 元信息 + 状态徽标 |
| 工作台 · 课堂设计 | 顶栏下两栏主面：左（对话流；「还有 N 条更早的消息」「查看全部对话」）；中「这节课的教学流程」空态卡：「这节课还没有教学流程 / 在下方告诉 AI 课题、课时与教材，它会先给出教学方案，确认后生成完整教学流程。」+ 按钮「告诉 AI 我的备课想法」；错误条「本轮生成没有完成，未写入任何内容。 重试」；底部 NL 条 + 麦克风/发送（发送 placeholder 系列）；右上「教材与资料 0 ›」 |
| 工作台 · PPT | 三栏：左缩略栏 251px（空态「课件尚未生成：确认教学路径后会自动生成。」）；中工具条（添加页 / T 文本 / Σ 公式 / 数学图形 / 图片 / 备注「即将支持」/ 发布课堂，第 7 项右对齐主蓝）+ 画布空态 + 底栏「‹ 幻灯片 0 / 0 ›」「− 100% ＋」；右 292px「智能属性」胶囊页签「图形属性 / 页面信息」+ 空态提示 +「AI 快捷操作」3 卡（生成推导动画 / 让本页更简洁 / 生成相似练习题） |
| 工作台 · 教案 | 左大纲（教学目标/教学重难点/教学过程/板书设计/作业布置/教学反思 + 收起侧栏）；中「正文 + 字号 16 + B I U + 1 2 3」工具条 + 空白正文 + 空态；右「智能辅助」+「当前定位」+ 4 条 AI 建议；顶栏「同步到课件」「导出」 |
| 工作台 · 本次备课 | 头卡（图标 + 「本次备课」+ 标题 + 元信息 + 状态徽标「教学设计进行中」+「最后修改: …」）；信息条；5 磁贴（含勾选圈/数字）；左版本管理列表 V1…+「当前版本」徽标；右「导出备课成果」+ 3 卡（标题/副行「N 页 · 真实大小」/「开始导出」按钮）+ 发布行 + 一致性卡（「无法核对」药丸） |
| 导出对话框 | 居中 520px；标题「导出」+ 关闭 ×；hint「导出为真实产物文件；课件导出会渲染全部页面并做视觉质检，约 40-60 秒。」；3 卡：标题/描述/「预计文件名：…」/「开始导出」；完成态按钮变「下载文件」、失败态「重试」 |
| 发布对话框（未打开，需按代码/文案复刻） | 标题「发布到班级课堂」，副文「{deckTitle} · 学生将在「课堂 · 老师课堂」跟 AI 主讲逐页学习」；字段「选择班级」「课件标题」、勾选「包含随堂练习」；按钮「取消」「发布到班级」；成功态「已发布 · {标题}」+「{班级} 的学生现在可以在「课堂」看到这份课件。」+「留在本页」「查看课堂」；底部注「发布是快照：重发会创建新课件，不会覆盖学生已学进度。」 |
| 禁用态 tooltip 原文 | 「尚未生成课件，无法导出」「尚未生成教案，无法导出」「先完成课件生成」「即将支持」 |
| 空态/错误原文 | 「课件尚未生成」「课件尚未生成：确认教学路径后会自动生成。」「确认教学路径后，会按它生成课件与教案，内容逐页由 AI 充实。」「尚未生成教学路径，请先在「课堂设计」中与 AI 确认教学路径。」「教案尚未生成」「这节课还没有教学流程」「本轮生成没有完成，未写入任何内容。」「动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）」「该备课暂无历史版本。」「本次备课尚未全部完成，可继续在课堂设计 / PPT / 教案中完善。」「无法核对」「课件或教案尚未生成，暂无法核对。」 |
| 视觉缺陷（需复刻或修复，视离线目标） | ① overview 右列「发布到班级课堂」被挤为单字竖排（`27-ws-overview-detail.png`）；② 工作台页平台副标题回落「高二年级 · 2026 秋季学期」与「高一(3)班」不一致；③ 预计文件名净化 `>`/`|` 导致「2aF1F2」；④ 错误横幅常驻不消失 |

### 8.3 登录页

| 项 | 实测值 |
|---|---|
| 布局 | 左品牌（π/智学数研/「一个账号，连接学习、教学与科研」/三端说明），右白卡「统一身份认证」；页签「短信验证码 / 密码登录」 |
| 身份 | 「进入身份」segmented：学生端 / 教师端 / 科研端（`select#preferred-role` 原生 select，三 option） |
| 短信表单 | 「手机号」`input#auth-phone[type=tel]` placeholder「请输入中国大陆手机号」；「获取验证码」（发码后变「58 秒后重试」倒计时）；「演示环境验证码：XXXXXX」（演示码 6 位，真实随机）；「6 位验证码」输入；「在这台设备上保持登录」勾选；「安全登录」主按钮；「忘记密码？ · 取消账号注销」「第一次使用？注册新账号」 |
| 文案 | 主标题「欢迎回来」；「登录后将进入所选身份对应的端口。」；底部「登录即表示你同意平台服务协议与隐私政策。」 |

### 8.4 数据/标签精确值（复刻用）

- 班级：`高一(3)班 · 数学`，`students=5`，`class_id=039bcfc5-eb65-41a0-8840-ae3e361544b2`；邀请码 `FJA2JH`。
- 学生：小唐、小许、小周、小陈、小林（+「张老师 教师」成员行）。
- 作业：`课前预习 · 函数的图象与性质`、`课后作业 · 导数与函数单调性`（均 published）。
- 种子课件：`函数的单调性：从图像到导数`，5 页，`deck_revision=4`，`degraded=true`，1/5 opened，80%，1 人已进入。
- 学情：平均掌握度 61%（0.6145），待批 0，近 14 天提交 0，高频错因 —；小林 61% / 薄弱 3 项如上。
- 旧备课会话：`f5c84551-18a7-454d-b49c-8f115e816299`，revision 11，last_event_seq 50，10 条消息，最后修改 2026-11-21 03:04。
- 新备课会话：`393d2558-b8e9-4380-aaa5-5a62e0c2940e`，revision 3，2 条消息，最后修改 2026-11-22 02:18。

---

## 附录 A · 网络取证索引

- 总后端 API 调用：**435 次**（排除 Vite 静态源码 `/src/`），状态分布：200×432、202×1、409×1、429×1；无 5xx（详见 `api/SUMMARY.json`）。
- 控制台/页面异常：全部脚本 `pageerror=0`、`requestfailed=0`；console error 仅 2 条——重试动作 409 与登录发码 429（见 `api/run-02b-edit-export-publish.json` / `api/run-03-pages-detail.json` 的 `console`）。
- 关键接口与结果：

| 接口 | 实测 |
|---|---|
| `POST /api/auth/challenges/sms` | 200（body 含 `demo_code`、`retry_after:60`）；频控时 429 |
| `POST /api/auth/login/sms` | 200（`access_token` 已脱敏；`nickname=张老师`，`active_role=teacher`） |
| `GET /api/auth/me` | 200（`roles` 含 student/teacher 均 approved） |
| `GET /api/teacher-v3/prep/sessions` | 200（1 → 新建后 2 条；均 `教学设计进行中`） |
| `GET /api/teacher-v3/prep/conversations/{sid}` | 200（`artifact.context/blueprint/lesson_plan/teaching_deck` **全为 null**；`available_actions` 仅 `cancel_session`） |
| `GET …/blueprint/revisions` | 200 `{"blueprint_id":null,"items":[]}` |
| `POST …/actions`（retry_run） | **409** `{"code":40900,"message":"动作 'retry_run' 不可执行：消息无上下文快照，无法重跑（请重新发送消息）","error_key":"conflict"}` |
| `POST /api/teacher-v3/prep/conversations` | **202**（新建会话，`status=draft→processing`，artifact 全 null） |
| `GET /api/teacher/classroom-coursewares` | 200，`total=1`（仅种子课件） |
| `GET /api/teacher/assignments` | 200，2 份 published |
| `GET /api/teacher/grading/workspace` / `queue` | 200；workspace `progress.total=1, confirmed=1, remaining=0`；queue 5 条 unprocessed |
| `GET /api/teacher/classes/{id}/learning-overview` | 200，`avg_mastery=0.6145`、`pending_review_count=0`、`submission_trend` 14 天全 0、`kp_heat=[]`、`error_clusters=[]` |
| `GET /api/teacher-v3/quiz/questions` | 200，`total=0`（题库存取接口返回空） |
| `GET /api/teacher-v3/classes` | 200，1 个班 5 人 |
| `GET /api/teacher-v3/resources` / `teacher/videos` | 200（12 条 B 站视频） |
| 导出/发布相关 | **0 次**（`/exports`、`/tickets`、`assignments/publish`、`classroom/sessions` 均未触发） |

- 请求体/响应体（前 4KB）已落盘 `api/bodies/`（664 个文件）；`Authorization` / `Cookie` / `Set-Cookie` 一律 `***MASKED***`，响应里的 `access_token` 字段也按规则脱敏；`text/event-stream` 与二进制只保留元数据（不落 body）。
- 注意：`body_file` 命名是「脚本内序号+方法+路径」，不同脚本的同序号同名文件可能互相覆盖；逐脚本完整数据以 `api/run-0X-*.json` 为准，总索引见 `api/steps.json`。

## 附录 B · 脚本清单（`scripts/`）

| 脚本 | 作用 |
|---|---|
| `r02lib.py` | 采证库：步骤/截图/UI 快照/网络抓取与脱敏、稳健登录、下载保存 |
| `00_login.py` | 真实 UI 登录一次（保存 storage_state） |
| `01_identity_pages.py` | 登录/身份/外框导航/六页盘点/入口卡可用性/页内深链 |
| `02a_workspace_open.py` | 打开既有「椭圆的定义」会话 + 六视图结构与状态 |
| `02b_edit_export_publish.py` | 真实编辑（标题/参数）、导出、发布尝试与阻塞取证 |
| `03_pages_detail.py` | 课堂/作业/组卷/批改/学情/资源/题库/历史细节 |
| `04_new_session.py` | 通过 NL 真实新建备课会话并观察 AI/产物 |
| `05_textbook_picker.py` | 新会话「选一本教材开始」卡片真实点击核实 |
| `06_clean_shots.py` | 干净版登录/身份/六页截图（无任务面板遮挡） |
| `98_summary.py` | 后端 API 汇总与产物目录核验 |
| `99_merge.py` | 合并分脚本证据为 `api/steps.json` 总索引 |

## 附录 C · 证据文件

- 截图：`shots/*.png`（78 张）+ 同名 `.json`（每页 UI 文本/按钮/输入/链接/标题快照）
- 网络：`api/steps.json`（总索引，2.7MB）、`api/run-0X-*.json`（分脚本，含每步 net 序号关联）、`api/bodies/`（请求/响应体前 4KB，已脱敏）、`api/SUMMARY.json`、`api/login-log.json`、`api/session.json`、`api/session-new.json`
- 产物：`artifacts/`（**空**，0 文件）
- 脚本：`scripts/`

### 限制与诚实声明

1. 只做教师端；未登录学生端，因此"学生能否看到"只给教师侧事实（§6）。
2. 未做任何写操作（未点「确认批改」写分、未手工建题、未改配置、未调管理接口）。
3. 任务书允许的"新建"分支已实测一次（新会话），同样阻塞；未反复重试或伪造后续状态。
4. 本轮**未复现** run-01 的「AI 提案 暂不支持的内容类型」原文；run-02 的实测形态是"AI 只回文本 + 教材卡，无结构化提案"。两者都导致同一终点：教学路径无法确认 → 无课件/教案 → 导出/发布不可用。