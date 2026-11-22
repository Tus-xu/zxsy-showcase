# 科研端（researcher）现役系统实测采证报告 — run-02

- 采证对象：现役系统前端 `http://127.0.0.1:5176`（同源 `/api/*` 经前端代理到后端网关），科研服务 rv8300 仅经网关间接调用。
- 采证方式：Playwright headless Chromium，viewport **1672×941 / DPR=1**，全部通过真实 UI 操作（登录、点击、滚轮/拖选、文件选择框、编辑器键入）。**未直接调用任何内部 API、未改数据库/环境、未重启服务、未改产品代码。**
- 账号：researcher / 13800001003 / 林知远（演示验证码由登录页显示）。
- 时间：2026-11-22 02:04–02:36（Asia/Shanghai）。
- 证据目录：`shots/`（86 张截图）、`artifacts/`（23 个文件，含真实编译产出 PDF）、`api/steps.json` + `api/bodies/`（707 条 API 记录）、`api/endpoints.json`、各探针脚本在 `scripts/`。
- 说明：Authorization / Cookie / token / password / 验证码字段已脱敏为 `<redacted>`；请求/响应体各截取前 4 KB。`/api/*` 请求均发到 5176 同源（浏览器不直接请求 8000/8300）。

---

## ① 版本 / 身份 / 入口表

| 项 | 实测值 | 证据 |
|---|---|---|
| 产品版本 | 前端包 `zhixue-shuyan-v4@4.0.0`；登录页 `document.title` = **「智学数研 · 数学智能助学平台（v4）」** | `shots/12-login-page.png`；`frontend/package.json` |
| 登录 URL / 方式 | `/login`；短信验证码登录（页面显示本次演示 6 位验证码）+ 密码登录两页签；身份下拉 `#preferred-role` 选项 = 学生端 / 教师端 / 科研端；手机号 `#auth-phone`；「获取验证码」→ 页面显示演示验证码 → placeholder「6 位验证码」→「安全登录」 | `shots/00-login-otp.png`、`shots/12-login-page.png`；`api/steps.json` run=p01/p05（`POST /api/auth/challenges/sms` 200，响应含 `demo_code`，随即页面展示） |
| 登录后落地路由 | `http://127.0.0.1:5176/research-workspace`，title = **「科研端 · 启动页」** | `shots/01-landing-after-login.png`、`api/page-01-landing.json` |
| 可见姓名 / 身份 | 顶栏「科研身份 · 研究者」；用户胶囊「林 林知远 ⌄」；个人中心「当前身份 **科研端 · 研究者**」「手机号 138\*\*\*\*1003」「浙江大学数学科学学院」「账号 ID 58227ad6-2b09-49fd-bf2a-86fe4697da0f」「加入时间 2026/10/27」 | `api/page-01-landing.json`、`api/page-13-account.json`、`shots/13-account-full.png` |
| 顶部导航（启动页） | **启动页 / 工作台 / 个人中心 / 林 林知远 ⌄**（4 项；前 3 项为按钮） | `shots/12-landing-full.png` |
| 顶部导航（工作台内） | **阅读 / 写作**（分段控件）+ 项目胶囊「未命名项目」+「已同步 今天 HH:MM」+「历史」+ 通知图标 + 用户胶囊「林 林知远」；**不再出现启动页/工作台/个人中心** | `shots/02-workspace-full.png`、`shots/17-read-ready.png` |
| 个人中心路由 | `/research-workspace/account`，title = **「科研端 · 个人中心」** | `api/page-13-account.json` |
| 工作台入口真实行为 | 启动页点「工作台」→ 进入 `/research-workspace/workspace`，Shell 载入项目后 **router.replace 到最近项目的上次工作区**（本次为 `/research-workspace/e49b27e2-…/read`）；**不存在独立仪表盘** | `api/steps-p02.json` step=enter-workspace；`p04b` 中 URL 先 `/workspace` 后落地 `/read`；`p05` 新建项目后同理 |
| 三种开始方式真实落点 | 读论文 → `…/<最近项目>/read`；写论文 → `…/<最近项目>/write`；问 Agent → **`…/<最近项目>/read`（与读论文落点一致，截图像素级相同）** | `shots/12-start-read.png`、`shots/12-start-write.png`、`shots/12-start-agent.png`（read 与 agent 的 SHA-256 相同）；`api/p05-results.json.start_modes` |

---

## ② 逐页盘点表

### 页面 A：登录页 `/login`（title「智学数研 · 数学智能助学平台（v4）」）

| 可见区域与控件（逐条） | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 品牌区「π 智学数研」+ 副标题「一个账号，连接学习、教学与科研」 | 静态 | `12-login-page.png` | 可用 |
| 登录方式页签「短信验证码」（选中）/「密码登录」 | 短信验证码路径实测 | 同上 | 可用 |
| 「进入身份」下拉：学生端 / 教师端 / 科研端 | 选 researcher | 同上 | 可用 |
| 手机号输入（placeholder 请输入中国大陆手机号） | 13800001003 | `00-login-otp.png` | 可用 |
| 「获取验证码」按钮 → 页面出现本次演示验证码文本（6 位） | 真实下发（`POST /api/auth/challenges/sms` 200） | `00-login-otp.png` | 可用 |
| 验证码输入（placeholder「6 位验证码」） | 填页面显示的验证码 | 同上 | 可用 |
| 「安全登录」按钮；「在这台设备上保持登录」勾选；协议文案 | 登录成功落 `/research-workspace` | 同上 | 可用 |
| 底部链接「忘记密码？· 取消账号注销」「第一次使用？注册新账号」 | 仅记录入口 | 同上 | 未测 |
| 备注 | 反复登录约 5–6 次/10 分钟后，`/api/auth/challenges/sms` 返回 **429 Too Many Requests**（console 原文见 ⑥-B6）；等待约 90s 后恢复 | `14-login-retry-*.png` 无（未截到失败态，控制台有记录） | 环境限流 |

### 页面 B：启动页 `/research-workspace`（title「科研端 · 启动页」）

| 可见区域与控件（逐条） | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 顶栏：π 智学数研 +「科研端」pill + 启动页/工作台/个人中心 + 用户胶囊 | 固定导航 | `12-landing-full.png` | 可用 |
| Hero：`RESEARCH WORKSPACE`「阅读、写作与验证，在同一个项目里发生。」+ 两段说明 | 静态文案 | 同上 | 可用 |
| 主 CTA「进入科研工作台 →」+「＋ 新建项目」+ 信任行「真实文献 · 真实 LaTeX 编译 · 证据可回溯」 | CTA 均真实可用 | 同上 | 可用 |
| `PROJECT MEMORY / 最近项目` 卡：项目名「未命名项目」、说明「从一篇论文、一个公式或一段论证开始。」、`— 文献 / — 草稿 / — 笔记`、`下一步 继续阅读与摘录`（写作后变为「继续写作与编译」）、「继续 →」 | **计数显示破折号「—」**（后端 `counts:null`，前端不计算）；下一步随 localStorage 上次工作区变化 | `12-landing-full.png`、`12-landing-after-full.png` | 计数不可用（占位） |
| `FROM HERE / 今天推进哪项研究？` 三种开始方式：`01 📖 读论文`（导入 PDF，边读边记；选中段落或公式，直接问 Research Agent。「继续阅读 →」）、`02 ✍️ 写论文`（LaTeX 编辑器、真实编译、PDF 预览。「继续写作 →」）、`03 ✦ 问 Agent`（公式检查、引用核查、翻译润色。「打开 Research Agent →」） | 均有真实落点（见①） | `12-start-read.png`、`12-start-write.png`、`12-start-agent.png` | 可用 |
| 链路图「读 → 摘 → 证 → 写 → 核 / 一条链路，一个项目上下文」 | 静态 | `12-landing-full.png` | 可用 |
| `RECENT PROJECTS / 最近项目`：卡片列表（项目名「未命名项目」、相对时间「刚刚 / 23 小时前 / 1 天前」、描述「暂无项目描述」、`— 文献 — 草稿 — 笔记`、每卡「阅读」「写作」两个按钮）+「＋ 新建项目」 | 真实项目列表（初始 2 个项目，新建后 3 个；项目名均未命名，描述均空） | `12-landing-full.png`、`12-landing-after-full.png` | 列表/按钮可用；**计数/描述为空** |
| 用户菜单「林 林知远 ⌄」（点开内容未盘点） | 入口可见 | 同上 | 未测 |

### 页面 C：工作台入口 `/research-workspace/workspace`

| 可见区域 | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 无独立页面 UI；进入后 Shell 读取项目列表并替换路由到最近项目上次工作区（读/写） | 本次落 `/research-workspace/e49b27e2-b05f-45c3-ac99-dd0792d9ab80/read` | `02-workspace-full.png`（进入瞬间为文献加载中空态） | 可用（但**不是仪表盘**） |

### 页面 D：阅读工作台 `/research-workspace/<projectId>/read`（title「科研工作台 · 阅读」）

| 可见区域与控件（逐条） | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 顶栏：阅读/写作分段、项目胶囊「未命名项目」、已同步+时间、历史、通知、用户 | 固定 | `17-read-ready.png` | 可用 |
| 左栏：项目卡「未命名项目 / 暂无描述」；`AI 项目概览` 折叠卡（LLM 生成摘要 + `4 文献 / 1 草稿 / 2 笔记 / 0 数据`，为 02:34 最终态；02:13 导入后为 `4/1/1/0`）；导航「文献 / 笔记 / 项目 / 设置」；`文献列表`（4 篇 PDF：research-paper-1、research-03-writing-example、research-02-formula-conditions、research-01-cea-lemma）；`最近笔记`（2 条，可点） | 文献列表**非空**（初始 3 篇，本轮导入 1 篇 → 4 篇；均为自撰演示 PDF，`parse_status: parsed`） | `17-read-ready.png`、`05-read-entry-fail-full.png` | 列表/导入可用；笔记可点但定位无效（⑥-B3） |
| 中栏：文档标签页（每篇 PDF 一个 tab，可关闭）+「＋」导入 | 4 个 tab，可切换 | `17-read-ready.png` | 切换可用 |
| PDF 工具条（从左到右）：文本选择工具、上一页、页码输入 `/N`、下一页、缩小、缩放百分比、放大、选择工具、抓手工具、适页、适宽、复制选中文字、全文搜索、全屏 | 翻页/缩放/适宽/适页状态真实变化（155%→160%→950×1343） | `06-read-zoom-width.png`、`16-read-cid-blank.png` | 控件可用（但见 PDF 渲染阻塞） |
| 页面画布：`<canvas class="rw-pdf__canvas">` + `<div class="textLayer rw-pdf__text">` + `<div class="rw-pdf__marks">` | **3 篇项目原有 PDF：canvas 全白（非白像素 0/109,704 采样）、文本层 0 span、无任何报错/toast**；**导入的 research-paper-1.pdf：正常渲染（非白像素比 0.0245、文本层 16 span/368 字符）** | `16-read-cid-blank.png`、`16-read-embedded.png`、`08-read-imported-paper.png`、`05-read-entry-fail-full.png` | **部分可用（按字体条件）** |
| 右栏 Research Agent：π 头 + `Research Agent 科研助手`（在线）+ 副标「基于文献、公式与项目笔记」+「新对话」+「⋯」；上下文 chips（`当前选定` + 文献 chip + `main.tex` chip + `项目知识库 · 4 篇`）；空态 π「今天想推进什么？」+ 4 个深链能力 + 「更多能力 翻译与改写」；底部 composer（placeholder「直接告诉我你想完成什么：解释推导、找证据、写入笔记、生成引用…」+ 工具 引用当前选区/提及/引用项目文献 + 圆形发送按钮） | 真实可问；问答见⑤ | `17-read-ready.png`、`15-read-agent-empty.png` | 可用 |
| 选区浮动工具条（首次选中文字后出现在选区上方）：`评判 / 解释 / 找证据 / 笔记 / 引用` + 高亮图标 | 首次可用；后续选区不再出现（⑥-B4） | `16-selection-bar.png`、`08-read-note-created.png` | 部分可用 |

### 页面 E：写作工作台 `/research-workspace/<projectId>/write`（title「科研工作台 · 写作」）

| 可见区域与控件（逐条） | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 顶栏：阅读/写作分段 + 项目胶囊 + 已同步 + 历史 + 通知 + 用户 | 固定 | `11-write-initial-full.png` | 可用 |
| 编译控制条：`XeLaTeX ⌄`（点开提示「XeLaTeX（当前唯一支持）/ 入口文件 main.tex」）、`自动编译 ⌄`（点开提示「自动编译即将开放。当前请保存后在右侧点击「重新编译」。」）、主按钮「⟳ 重新编译」、状态「未编译 / 编译中… / 编译成功 HH:MM / 编译失败」、`⋯`（更多编译选项弹层：「入口文件 main.tex / 编译引擎 XeLaTeX（两遍 + BibTeX）/ 产物 main.pdf（预览栏实时渲染）/ 更多编译选项将在后续版本开放」） | 编译状态真实 | `11-write-compiling.png`、`15-write-failed.png` | 可用 |
| 左栏：项目卡「未命名项目 / 学术论文项目 · 进行中」；`文件树 / 论文结构` 页签；`＋新建文件`、`刷新`；文件树（可新建/重命名/删除，空态「此项目还没有草稿文件。」）；`论文结构` 空态「尚未解析到结构。创建 main.tex 并使用 \\section{} / \\subsection{} 后，这里会实时生成论文结构。」 | 真实文件系统；新建 main.tex 后树显示 main.tex | `11-write-file-created.png` | 可用 |
| 中栏编辑器：格式条 `B / I / {} / π / ⌐ / 行号`；CodeMirror 编辑器（空态占位「在此撰写 LaTeX…（例如 \\section{引言}）」，实际行为为内容为 1 行占位符）；文件 tab / 保存态「已保存」 | 点击、键入、光标、行号均真实 | `11-write-typed.png`、`15-write-entry.png` | 可用 |
| 右栏 PDF 预览：`适应宽度 / 上一页 / 页码 / /N / 下一页 / 缩小 / 100% / 放大 / 适应页面 / 在新标签打开`；空态「暂无编译产物 — 点击顶栏「重新编译」后将在此显示真实 PDF 预览。」 | 编译成功后真实渲染（595×841，非白像素比 0.0069） | `11-write-compiled.png`、`11-write-compiled-full.png` | 可用；**无「下载 PDF」按钮**（只有「在新标签打开」） |
| 底部编译日志：页签「编译日志 n / 错误 n / 警告 n / 信息 n / 清空日志」+ 行「Compiling main.tex (XeLaTeX)...」「Output written on main.pdf (1 pages, 0.0 MB).」「✅ 编译完成，用时 23.2 秒。」；失败时「Missing $ inserted. main.tex:11」「❌ 编译失败。xelatex 退出码 1（1 个错误）」 | 真实日志 | `11-write-compiled.png`、`15-write-failed.png`、`11-write-error-log.png` | 可用 |
| 右栏 Agent（写作模式）：副标「基于草稿、编译日志与项目文献」；空态能力：`解释编译错误 / 改进建议 / 找相关证据 / 检查公式` + 更多能力 `语言润色 / 翻译成英文`；结果卡动作含「定位到第 11 行」「加入笔记」 | 真实可触发 | `15-write-agent-empty.png`、`15-write-agent-error.png` | 可用 |

### 页面 F：个人中心 `/research-workspace/account`（title「科研端 · 个人中心」）

| 可见区域与字段（逐条） | 业务状态 | 截图 | 可用性 |
|---|---|---|---|
| 身份头卡：「林 / 林知远 / 科研端 · 研究者 / 📱 138\*\*\*\*1003 / 🏛 浙江大学数学科学学院 / 📅 2026/10 加入」+「进入科研工作台」「退出登录」 | 真实账号 | `13-account-full.png` | 部分可用 |
| 页签：`个人资料 / 账号安全 / 科研概览` | 三页签均真实存在并可切换 | `13-account-full.png`、`15-account-账号安全.png`、`15-account-科研概览.png` | 可用 |
| 个人资料：「账号信息 / 来自统一身份认证」：昵称 林知远、手机号 138\*\*\*\*1003、当前身份 科研端 · 研究者、账号 ID 58227ad6-2b09-49fd-bf2a-86fe4697da0f、加入时间 2026/10/27、账号状态 正常；说明「修改手机号、注销账号等全局设置请前往 账号与安全。」 | 与后端 `/auth/me` 一致 | `13-account-full.png` | 可用 |
| 「身份与机构 / 已批准的身份才能切换」：科研端 · 研究者 / 浙江大学数学科学学院（当前）；学生端 / 未绑定机构 +「切换」；文案「科研端与讲台、学生端共享同一账号；切换身份会进入对应端口。」 | 切换入口未实测 | 同上 | 入口可见 |
| 「快捷入口 / 常用动作」：进入科研工作台（继续最近项目）、科研启动页（最近项目与三个起点）、账号安全（密码与登录设备）、全局账号设置（手机号 / 注销） | 入口 | 同上 | 入口可见 |
| 账号安全页：「修改密码」表单（新密码 / 确认新密码 / 至少 15 个字符 / 设置新密码）；「登录设备」列表（未知设备、当前/7 分钟前/…/11月21日/10月27日，每行「退出该设备」、「退出全部设备」）；「更多账号设置 → 前往账号与安全 →」 | 设备列表真实（按最近活跃排序），未提交表单 | `15-account-账号安全.png` | 表单/列表可见 |
| 科研概览页：`3 项目 / 0 文献 / 0 草稿 / 0 笔记` +「最近项目」3 张卡（未命名项目、暂无描述、时间、阅读/写作）；页脚「统计只展示真实项目数据；没有数据的项目显示为 —。」 | **统计与项目内容不一致**（项目实际 4 文献/1 草稿/1 笔记） | `15-account-科研概览.png` | 统计口径异常（⑥-B9） |

### 页面 G：新建项目落点

| 项 | 实测 | 截图 |
|---|---|---|
| 创建方式 | 启动页「＋ 新建项目」→ `POST /api/research-vnext/projects` **201**，请求体 `{"name":"未命名项目","description":"","client_request_id":"…"}`，响应 `project.id = d770457a-c91f-4d61-8853-de00e7a7f300` | `12-new-project.png`、`api/steps-p05.json` id=142 |
| 落点 | `/research-workspace/d770457a-…/read`（阅读工作台；标题「科研工作台 · 阅读」） | 同上 |
| 默认内容 | 阅读：`0 文献 / 0 草稿 / 0 笔记 / 0 数据`，「AI 项目概览」=「暂无项目数据。导入文献后将自动生成概览。」，文献列表「还没有文献，点击右上「＋」导入 PDF」，PDF 区「选择一篇文献开始阅读」，最近笔记空态 | `12-new-project.png` |
| 默认文件 | **0 个文件**：写作侧文件树仅项目根「未命名项目」，正文「选择文件开始编辑」，编辑器空态「左侧文件树中选择 .tex 文件…」，编译日志空态，预览空态 | `12-new-project-write.png` |
| 结论 | 新建可用；**没有默认 main.tex / 模板文件，也没有 AI 概览** | — |

---

## ③ 阅读链路时间线 + 终点结论

时间线（02:04–02:35）：

1. 02:04:51 登录 → 02:05:03 启动页 → 02:05:08 点「工作台」→ `/research-workspace/e49b27e2-…/read`（标题「科研工作台 · 阅读」）。
2. 02:05:39 文献列表加载出 **3 篇 PDF**（research-03-writing-example.pdf /2 页、research-02-formula-conditions.pdf /4 页、research-01-cea-lemma.pdf /4 页，均 `parse_status: parsed`），默认选中 research-03，页码 `/ 2`、缩放 `155%`。→ 截图 `05-read-entry-fail-full.png`。
3. 02:07:14 → 02:07:39 → 02:12:02 → 02:12:47（保持 45 秒）连续四次取样：`canvas.rw-pdf__canvas` 尺寸 924×1306，**非白像素比 0.0000（漂白）**；`.textLayer.rw-pdf__text` **span 数 0、文本长度 0**；无 toast、无「文献暂时无法显示」空态。→ `16-read-cid-blank.png`、`06-read-initial.png`、`08-read-wait-*.png`。
4. 翻页（下一页→页码 2）、放大/适宽（924×1306→950×1343，160%）、切换第 2 篇（页码 `/ 4`）均只改变工具条/画布尺寸，**画布仍全白、文本层仍 0 span**。→ `06-read-next-page.png`、`06-read-zoom-width.png`、`06-read-doc2.png`。
5. 02:12:54 全文搜索「Céa」→ 搜索条 `0/0`，`.rw-pdf__mark` 0 条。→ `08-read-search-cea.png`。
6. **根因取证**（打开同上第 3 篇时浏览器 console 原文）：
   - `log | Warning: loadFont - translateFont failed: "UnknownErrorException: Ensure that the `cMapUrl` and `cMapPacked` API parameters are provided.".`
   - `log | Warning: Error during font loading: Ensure that the `cMapUrl` and `cMapPacked` API parameters are provided.`
   → 阅读侧 pdf.js **未配置 cMapUrl/cMapPacked**，对使用 CID 字体（STSong-Light，未内嵌）的 3 篇 PDF，字体加载失败 → 画布白、文本层空。`api/p07-results.json#/cid/console_since_mark`。
7. 02:13:00 **通过页面「导入 PDF」+ 文件选择框导入真实 PDF `research-paper-1.pdf`**（6 页，内嵌 SimHei 子集）：toast「已导入「research-paper-1.pdf」。」，项目变 `4 文献`（`POST /papers` 201，自动解析）。→ `08-read-imported.png`。
8. 02:13:16 打开导入 PDF：画布**正常渲染**（924×1306，非白像素比 **0.0245**，页面上可见标题/摘要/正文），文本层 **16 span / 368 字符**，页码 `/6`、`160%`。→ `16-read-embedded.png`、`08-read-imported-paper.png`。
9. 02:13:18 在导入 PDF 上拖选文字：选区 `理椭圆型偏微分方程有限元方法的三个基础环节…`，浮动工具条出现「评判 解释 找证据 笔记 引用 + 高亮」。→ `16-selection-bar.png`。
10. 02:13:18–02:14:23 点「笔记」：`POST /notes` **201**（title=选区前 40 字，body=选区全文，paper_id/page/section 均真实），左栏「最近笔记」出现该条；p08 复测 toast 原文 **「已添加笔记」**。→ `08-read-note-created.png`。
11. 02:14:30 右栏 composer 输入问题并点发送 → `POST /projects/e49…/agent/chat` **201**；约 19 秒后出现真实 LLM 回复（原文见⑤）。→ `09-agent-chat-final.png`。
12. 02:30–02:31 复测：CID 字体 PDF（research-01）搜索「演示」= `0/0`；内嵌字体 PDF（research-paper-1）搜索「变分」= **`1/13`**（命中 13 处）却 `.rw-pdf__mark` = 0（无页内高亮）。→ `16-read-cid-search.png`、`16-read-embedded-search.png`。
13. 02:31:40 点击「最近笔记」条目：页码仍 1、`.rw-pdf__mark` 仍 0，**无可见定位高亮**。→ `16-note-locate.png`。
14. 02:33–02:35 Agent 能力：推导校验（`需要补充条件`，返回 2 条真实证据来源 p.1）、引用补全（`证据充分`，3 条候选引用）、结果卡「定位原文」点击后页码未变、`.rw-pdf__mark` 0 → `16-agent-derive.png`、`16-agent-citation.png`、`16-locate-back.png`。

**终点结论：阅读链路「部分受阻 / 按 PDF 字体条件分裂」**
- 可用：文献列表/导入 PDF（真实上传+解析）、打开与切换文档、页码与缩放、工具条、内嵌字体 PDF 的渲染/选文/笔记、Agent 问答（自由对话与预设能力）。
- 受阻（最后可证状态）：
  1. **项目内 3 篇 CID 字体 PDF 画布全白**：canvas 采样非白像素 0；文本层 span 0；搜索 0/0；无法选中；**界面无任何错误提示/重试空态**（不崩溃、不报错，静默空白）；console 有 cMapUrl 缺失警告。
  2. **搜索有计数无高亮**：内嵌字体 PDF 搜索条 `1/13`，页内 `.rw-pdf__mark` = 0。
  3. **定位原文不可证**：结果卡「定位原文」与「最近笔记」点击后页码不变、无 locate 高亮。
  4. **选区工具条首次可用、再次选区不再出现**：p08/p09 中后续 3 次「引用/高亮/找证据」点击均 6s 超时（选区字符串非空）。

---

## ④ 写作链路时间线 + 编译结果 + 是否导出真实 PDF

时间线（02:20–02:29）：

1. 02:20:21 进入 `/research-workspace/e49b27e2-…/write`（先点顶栏「写作」，等待 Shell 完成 `/workspace`→`/read` 重定向后再切换，成功进入；直接点太早会被重定向覆盖）。标题「科研工作台 · 写作」；编辑器 CodeMirror 存在（1 行占位文本），文件树为空（仅项目根）。
2. 02:20:28 页面「新建文件」→ 输入 `main.tex` 回车 → `POST /files` **201**，文件树出现 `main.tex`。→ `11-write-file-created.png`。
3. 02:20:33 点击 `.cm-content` 并键入 12 行 LaTeX（含 `\documentclass{article}`、`\usepackage{ctex}`、`\section{实测写作小节}`、`\begin{equation}…\end{equation}`）：编辑器 line 1→12，行号 gutter 13，光标在编辑器内（`anchorInEditor: true`，activeElement `cm-content`）。→ `11-write-typed.png`。
4. 02:20:40 自动保存：`PUT /files/main.tex` **200**（revision 3，请求体含完整 LaTeX），保存态显示「已保存」。
5. 02:20:40 点击「重新编译」→ `POST /compile` **201**，状态「编译中…」→ **02:21:03 编译成功 02:21**（耗时 23.2 s）。API：`status=success, pdf_artifact_id=06338bc6-…, pdf_available=true, page_count=1, pdf_size_bytes=22881, duration_ms=23203, error_count=0, warning_count=0, exit_code=0`，log_lines 含 `Output written (1 pages)`。UI 日志原文：「02:20:40 Compiling main.tex (XeLaTeX)... / 02:20:40 Output written on main.pdf (1 pages, 0.0 MB). / 02:21:03 ✅ 编译完成，用时 23.2 秒。」→ `11-write-compiled.png`、`11-write-compiled-full.png`。
6. 02:21:05 PDF 预览：真实渲染 canvas 595×841，非白像素比 **0.0069**，页 `/ 1`、`100%`。**真实 PDF 产物**：`GET /projects/e49…/compile-runs/16aa6754-…/pdf` 200，浏览器收到的 **22,881 字节 PDF** 已存 `artifacts/live-0049-…pdf` 与 `artifacts/compiled-main-success-23.2s.pdf`；离线核验：1 页，文本含「实测写作小节 / 变分形式与 Céa 引理：对任意 vh∈Vh，有 …」。
7. 02:27:32 故意注入错误（编辑器第 10 行插入未闭合 `\begin{equation}`）→ 重新编译 **02:27:43 编译失败**（10.8 s）。UI 日志原文：「02:27:32 Compiling main.tex (XeLaTeX)... / 02:27:32 Missing $ inserted. main.tex:11 / 02:27:43 ❌ 编译失败。xelatex 退出码 1（1 个错误）」。API：`status=failed, pdf_artifact_id=null, pdf_available=false, page_count=0, error_count=1, exit_code=1, error_code=EXPORT_COMPILE_FAILED, error_message=xelatex 退出码 1（1 个错误）`，并保留 `last_successful_pdf_artifact_id=e90b0426-…`；预览**不清空**（仍显示上一份成功 PDF，canvas 595×841，比值 0.0069）。→ `15-write-failed.png`、`15-write-failed-full.png`、`11-write-error-log.png`。
8. 02:28:18 写作侧 Agent「解释编译错误」真实回复（见⑤），含「main.tex · 第 11 行」「定位到第 11 行」「加入笔记」。
9. 02:28:26–02:28:49 Ctrl+Z 撤销错误行 → `PUT /files` 200 → 重新编译 **20.9 s 编译成功**；日志「✅ 编译完成，用时 20.9 秒。」；新 PDF 22,880 字节存 `artifacts/live-0055-…pdf` / `artifacts/compiled-main-recovered-20.9s.pdf`。→ `15-write-recovered.png`。

**终点结论：写作链路成立（可用）**
- 编辑器真实可交互（点击/输入/光标/行号/自动保存）；真实 XeLaTeX 编译可用（成功 23.2s / 失败 10.8s / 恢复 20.9s）；编译日志真实（错误带 `文件:行号`）；失败保留上次成功产物（预览不清空）。
- 真实 PDF 已产出并被浏览器实际获取（22,881 B / 22,880 B，1 页，文本与输入一致）。**UI 没有「下载 PDF」按钮**；对外路径为预览工具条的「在新标签打开 PDF」图标（未点击验证新标签行为）。
- 写作为空项目时无默认文件，需用户自己新建 `main.tex`（见②-G）。

---

## ⑤ Agent 能力逐条实测结论

入口（实测文字，逐条）：

- **阅读模式空态**（`15-read-agent-empty.png`）：`评判选中内容`（先选中一段推导或结论，检查是否成立）、`找相关证据`（在项目文献中寻找支持或反对的证据）、`LaTeX 对照`（正在对照文献与当前草稿……）、`检查公式`（检查当前公式的符号、条件与推导）、`更多能力 翻译与改写`。
- **阅读模式线程态（快捷能力行）**：`推导校验 / 引用补全 / LaTeX 对照 / 公式检查 / 翻译与改写`。
- **写作模式空态**（`15-write-agent-empty.png`）：`解释编译错误`（读取编译日志，定位并解释错误）、`改进建议`（分析草稿结构与论证，给出可执行建议）、`找相关证据`、`检查公式`、`更多能力 语言润色 / 翻译成英文`。
- **写作模式线程态**：`LaTeX 错误解释 / 改进建议 / 引用补全 / 公式检查 / 语言润色 / 翻译成英文`。
- **选区工具条**：`评判 / 解释 / 找证据 / 笔记 / 引用 / 高亮`。
- **结果卡动作**：`定位原文 / 查看证据 / 加入笔记 / 插入引用`（阅读）；`应用修复 / 加入笔记 / 重新编译`（翻译）；`定位到第 11 行 / 加入笔记`（编译错误解释）。

| 能力 | 触发方式 | 真实回复（摘录） | 结论 | 证据 |
|---|---|---|---|---|
| 检查公式（formula_check） | 点「检查公式」 | 「公式检查 / 需要补充条件 / 当前上下文还缺少可校验的公式。请在论文中选中要检查的公式，或在输入框里写出待验证的等式。关键信息：1. 缺少可校验的公式…」+「加入笔记」 | 可用（结构化结果卡，动作真实） | `07-agent-quick-检查公式.png`、`api/agent-07-quick-检查公式.json` |
| 翻译与改写（translate） | 点「翻译与改写」 | 「翻译与改写 / 证据充分 / 已完成翻译（英文；218 字符 → 739 字符）。建议修改：-中文原文 / +The three fundamental components of the finite element method…」+ 动作「应用修复 / 加入笔记 / 重新编译」 | 可用（真实翻译 + diff） | `09-agent-preset-translate.png`、`api/p03-results.json.preset_translate` |
| 推导校验（derive） | 点「推导校验」 | 「推导校验 / 需要补充条件 / 所选内容仅为摘要与阅读说明…缺少变分问题的定义…证据来源：PDF Mathesis 离线演示项目…research-paper-1.pdf p.1；research-01-cea-lemma.pdf p.1」+「定位原文 / 查看证据 / 加入笔记」 | 可用（结构化数学核查，但只做“条件不足”式结论） | `16-agent-derive.png`、`api/p08-results.json.derive` |
| 引用补全（citation） | 点「引用补全」 | 「引用补全 / 证据充分 / 在项目文献中找到 3 条与「…」相关的候选引用」+ 3 条 PDF 证据（含 §摘要、p.1）+「定位原文 / 加入笔记 / 查看证据 / 插入引用」 | 可用 | `16-agent-citation.png`、`api/p08-results.json.citation` |
| 解释编译错误（compile error） | 写作侧点「解释编译错误」 | 「LaTeX 错误解释 / 存在冲突 / 数学模式定界符缺失 / 第 11 行出现了只能在数学模式下使用的符号或命令…可能原因…检查第 11 行需要数学排版的内容并用 $…$ 包裹，同时确认前文所有 { 与数学环境都已成对闭合。文件位置：main.tex · 第 11 行 / 定位到第 11 行 / 加入笔记」 | 可用（基于真实失败日志） | `15-write-agent-error.png`、`api/p06-results.json.agent_error_reply` |
| 自由对话（POST /projects/{id}/agent/chat） | composer 输入问题 → 发送 | 真实 LLM 回复（约 19s）：「## 结论：仍然无法作答 / 这与上一轮的判断一致：本会话**没有这篇文献**。会话摘要显示 `artifact_count = 0`（附件数为 0）…需要你补充的最小信息…」；问「这篇论文第 1 页讲了什么」同样回答「无法作答」，尽管右栏上下文 chips 显示「当前选定 + 4 篇」 | **通道可用、内容受限**（不读项目文献，会明确拒绝编造） | `09-agent-chat-final.png`、`api/p03-results.json.chat`、`api/steps-p03.json` id=49 |
| 找相关证据 / 找证据（evidence） | 空态按钮 / 选区工具条 | 未单独触发成功：选区工具条第二次不再出现（`find_evidence` 点击超时）；但引用补全/推导校验结果里已返回真实「证据来源」列表 | 入口存在；能力间接可证 | `api/p09-results.json.verb-evidence`（点击超时） |
| 评判选中内容（judge） | 选区工具条「评判」 | 点击成功，Agent 面板进入结果态（后续回复未抓取完整文本，因同会话工具条失效） | 入口可用，结果未取全 | `api/steps-p09.json` step=verb-judge |
| LaTeX 对照 / 改进建议 / 语言润色 / 翻译成英文 / 插入引用 | 空态/线程态按钮 | 入口真实存在；本轮未逐一点击（时间/工具条限制） | 仅记录入口，不宣称可用性 | `15-read-agent-empty.png`、`15-write-agent-empty.png` |
| 笔记（选区→笔记） | 选区工具条「笔记」 | toast「已添加笔记」；`POST /notes` 201（title=选区前 40 字、body=全文、paper_id/page/section） | 可用 | `08-read-note-created.png`、`api/p03-results.json`、`api/steps-p03.json` id=48 |
| 引用（选区→引用） | 选区工具条「引用」 | 设计为复制引用到剪贴板（`doCite`：`navigator.clipboard.writeText(cite)` + toast）；headless 未捕获 toast，composer 无插入 | 部分可证（非“插入草稿”） | `16-selection-quote.png`、`api/p07-results.json.selection_quote` |
| 高亮（选区→高亮） | 工具条高亮图标 | 未成功（工具条未再出现） | 未测成 | `api/p09-results.json.highlight` |
| 定位原文（结果卡） | 点「定位原文」 | 页码未变（p.1）、`.rw-pdf__mark` = 0 → 无可见定位高亮 | 受阻（无可证定位效果） | `16-locate-back.png`、`api/p08-results.json.locate` |
| 最近笔记点击回原文 | 左栏「最近笔记」条目 | 页码未变、无 locate 高亮 | 受阻 | `16-note-locate.png` |

---

## ⑥ 失败与阻塞清单（含控制台/网络错误原文）

### B1【P0】CID 字体 PDF 阅读区全白、文本层空、无法选中/搜索（阅读侧核心受阻）
- 现象：项目内 3 篇自撰 PDF（`research-03-writing-example.pdf`、`research-02-formula-conditions.pdf`、`research-01-cea-lemma.pdf`）打开后：canvas 924×1306 全白（采样 109,704 点，非白 0）；`.textLayer.rw-pdf__text` span=0；搜索 0/0；拖选无选区；**无错误提示/无重试空态**；页码与缩放控件仍响应（看起来“正常”）。
- 最后可证状态：`16-read-cid-blank.png`、`05-read-entry-fail-full.png`、`api/pdf-08-wait-45.json`（`canvases[0].nonWhiteRatio=0`、`textLayers[0].spans=0`）。
- Console 原文（`api/p07-results.json#/cid/console_since_mark`）：
  - `Warning: loadFont - translateFont failed: "UnknownErrorException: Ensure that the cMapUrl and cMapPacked API parameters are provided.".`
  - `Warning: Error during font loading: Ensure that the cMapUrl and cMapPacked API parameters are provided.`
- 对照：同一阅读器打开内嵌 SimHei 的 `research-paper-1.pdf` 正常（canvas 非白像素比 0.0245、textLayer 16 span、可拖选/笔记）。→ **失败与 PDF 字体（未内嵌 CID，需 CMap）强相关**；写侧预览配置了 cMapUrl，所以编译 PDF 正常（0.0069）。
- 状态：**阻塞（不可绕过；未改代码）**。

### B2【P1】全文搜索有计数、无页内高亮
- 现象：内嵌字体 PDF 搜「变分」→ 搜索条 `1/13`（13 处命中），`.rw-pdf__mark` = 0；CID PDF 搜「演示」→ `0/0`。
- 最后可证状态：`16-read-embedded-search.png`、`16-read-cid-search.png`、`api/p07-results.json.embedded.search`。

### B3【P1】“定位原文”无可见效果
- 现象：结果卡「定位原文」点击后页码仍 1、`.rw-pdf__mark` = 0（无 `.rw-pdf__mark--locate`）；左栏「最近笔记」条目点击后同样无变化。
- 最后可证状态：`16-locate-back.png`、`16-note-locate.png`、`api/p08-results.json.locate`、`api/p07-results.json.note_locate`。
- 对照文案：笔记区文案承诺「点击条目可回到原文位置」，实测未兑现。

### B4【P1】选区浮动工具条在首次使用后不再出现（不稳定）
- 现象：首次选中文字 → 工具条出现（`16-selection-bar.png`），点「笔记」成功；同一会话再次选中文字（`window.getSelection()` 非空）后，工具条不出现 → 后续「引用/高亮/找证据」3 次点击 6s 超时（`api/p09-results.json`、`api/p08-results.json`）。
- 状态：**受阻（不稳定）**。

### B5【P1】Agent 自由对话“没有这篇文献”
- 现象：右栏 chips 显示「当前选定 + 项目知识库 · 4 篇」，composer 发送「这篇论文第 1 页讲了什么？」→ 19s 后回复「结论：仍然无法作答 / 本会话没有这篇文献：附件数为 0…artifact_count = 0…」，明确拒绝编造。
- 原文位置：`api/p03-results.json.chat.reply_delta`、`api/steps-p03.json` id=49（`POST …/agent/chat` 201）。
- 状态：**通道可用、知识接入受限**（不可宣称 Agent 能读项目 PDF）。

### B6【环境】短信验证码登录被限流 429
- 现象：短时间 5–6 次登录后，console：`Failed to load resource: the server responded with a status of 429 (Too Many Requests)`（`api/auth/challenges/sms`），登录页停留；等待约 90s 后恢复。
- 状态：**环境限流**（通过等待与保存 storage_state 会话复用规避；非产品缺陷结论）。

### B7【P2】阅读页对无 `main.tex` 的项目请求 404（控制台噪声）
- 现象：console：`Failed to load resource: the server responded with a status of 404 (Not Found)`，定位 `…/projects/e49…/files/main.tex`；响应 `{"error":{"code":"<redacted>","message":"文件不存在: main.tex"}}`。
- 状态：**非致命噪声**（阅读/笔记/概览仍可用）。

### B8【P1】新建项目无默认文件/无 AI 概览
- 现象：新建项目 → 落 `/read`，`0 文献`；写作侧文件树仅项目根，正文「选择文件开始编辑」「此项目还没有草稿文件。」；「AI 项目概览」=「暂无项目数据。导入文献后将自动生成概览。」
- 截图：`12-new-project.png`、`12-new-project-write.png`。

### B9【P2】个人中心「科研概览」统计口径异常
- 现象：同一账号下 3 个项目，其中一个项目实际 `4 文献 / 1 草稿 / 1 笔记`，但「科研概览」显示 `3 项目 / 0 文献 / 0 草稿 / 0 笔记`。
- 截图：`15-account-科研概览.png`。

### B10【P2】控制台警告（非错误）
- 366 条 warning，主要来自 Agent 回复公式的 KaTeX：`LaTeX-incompatible input and strict mode is set to 'warn': Unicode text character "来" used in math mode [unicodeTextInMathMode]`（大量中文字符被当作数学模式文本）；另有 `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`。
- 全量：`api/steps.json.console_warnings`。

---

## ⑦ 必须精确复刻的 UI 细节 与 必须放弃的内容

### 7.1 必须精确复刻（现役实测成立、离线版可直接按此实现）

**全局外壳**
- 顶栏（工作台内外两种形态）：
  - 启动页/个人中心：`π 智学数研` + 「科研端」pill；右侧导航 `启动页 / 工作台 / 个人中心 / 林 林知远 ⌄`。
  - 工作台内：左侧 `阅读 | 写作` 胶囊分段控件（选中项白底主蓝字、未选中浅底），中间项目胶囊 `未命名项目 ⌄`，右侧 `✓ 已同步 今天 HH:MM`（绿点）、`🕘 历史`、`🔔 通知`、`林 林知远` 胶囊。
- 三栏布局（1672×941 基准）：左栏约 300–315px、右栏 Agent 约 410–460px、中栏自适应；栏间有可拖拽分隔条（`role=separator`）。
- 品牌元素：π 符号（登录页/Agent/空态）；「智学数研」；research 身份 pill「科研端」。
- 右栏 Research Agent 共用：头 `Research Agent 科研助手 + 在线(绿点)`；副标「基于文献、公式与项目笔记」（读）/「基于草稿、编译日志与项目文献」（写）；`新对话`、`⋯`；上下文 chips（`当前选定`、文献 chip、`项目知识库 · N 篇`；写作侧为 `main.tex`、`当前 Section`、`相关论文`）；空态 π「今天想推进什么？」+ 能力卡片（标题+一行说明+「→」）；线程态底部「快捷能力」行；composer placeholder（读/写不同）与三个工具按钮 + 蓝色圆形发送。

**启动页**
- Hero 文案逐字：「RESEARCH WORKSPACE」「阅读、写作与验证，在同一个项目里发生。」；「把文献、笔记、公式和草稿放进一个 Research Project。读到哪里、论证到哪一步、下一步该做什么，都不再散落在多个工具里。」
- CTA：「进入科研工作台 →」「＋ 新建项目」；信任行「真实文献 · 真实 LaTeX 编译 · 证据可回溯」。
- `PROJECT MEMORY` 卡（项目名、`— 文献 / — 草稿 / — 笔记` 破折号、`下一步 继续阅读与摘录` / `继续写作与编译`、「继续 →」）。
- `FROM HERE / 今天推进哪项研究？` 三卡：编号 `01/02/03` + emoji 📖/✍️/✦ + 标题（读论文/写论文/问 Agent）+ 说明 + 「继续阅读 →」「继续写作 →」「打开 Research Agent →」。
- 链路「读 → 摘 → 证 → 写 → 核」+「一条链路，一个项目上下文」。
- `RECENT PROJECTS` 卡：π 图标、相对时间、项目名、`暂无项目描述`、`— 文献 — 草稿 — 笔记`、底部「阅读」「写作」两个按钮；右上「＋ 新建项目」。

**阅读工作台**
- 左栏：项目卡（名称/「暂无描述」/折叠「AI 项目概览」+ LLM 摘要 + 4 个统计数字 `文献/草稿/笔记/数据`）；导航 4 项（文献/笔记/项目/设置，图标+文字）；`文献列表` 折叠 + `＋`/🔍 图标 + 每行 `PDF` 红徽标 + 文件名 + 作者/年份 `· —`；`最近笔记` + 「更多 ›」+ 空态文案「还没有笔记。阅读时选中文字即可添加，点击条目可回到原文位置。」
- 中栏：文档 tab 条（`PDF` 徽标 + 文件名 + × 关闭；选中 tab 主蓝底线）+「＋」；PDF 工具条图标顺序见②-D；页码输入 + `/N`，缩放百分比，页面白纸 + 阴影 + 深色底。
- 选区工具条：圆形白底浮条，按钮 `评判（主蓝实心）/ 解释 / 找证据 / 笔记 / 引用` + 圆形高亮图标。
- 空态（无文献）：「选择一篇文献开始阅读 / 左侧文献列表中的 PDF 将在此渲染，支持翻页、缩放、选文与全文搜索。」

**写作工作台**
- 左栏项目卡：`学术论文项目 · 进行中`；`文件树 / 论文结构` 两个页签；`＋新建文件`、刷新；树根显示项目名；空态「此项目还没有草稿文件。」；论文结构空态文案（含 `\section{} / \subsection{}` 说明）。
- 编辑区：格式条 `B I {} π ⌐ 行号`；CodeMirror 行号/语法高亮/自动保存；保存态「已保存」；空态「选择文件开始编辑 / 左侧文件树中选择 .tex 文件；编辑器支持行号、语法高亮、自动保存与论文结构定位。」
- 编译条：`XeLaTeX ⌄`、`自动编译 ⌄`、`⟳ 重新编译`、状态文本、`⋯`；**依次出现的真实状态**：`未编译` → `编译中…` → `编译成功 HH:MM` / `编译失败`（颜色：成功绿、失败红、进行中蓝、未编译中性）。
- 编译日志：页签 `编译日志 n / 错误 n / 警告 n / 信息 n / 清空日志`；行格式 `HH:MM:SS 文本`；成功行「Output written on main.pdf (1 pages, 0.0 MB).」「✅ 编译完成，用时 X.X 秒。」；失败行 `错误描述. main.tex:行号` +「❌ 编译失败。xelatex 退出码 1（N 个错误）」；空态「尚无编译记录。点击顶栏「重新编译」生成 PDF。」
- PDF 预览工具条：`适应宽度 / 上一页 / [页码] / N / 下一页 / 缩小 / 100% / 放大 / 适应页面 / 在新标签打开`；空态「暂无编译产物 / 点击顶栏「重新编译」后将在此显示真实 PDF 预览。」；失败态「请检查编译日志后重新编译；编译失败时会继续显示上一次成功的产物。」
- 诚实降级文案（必须逐字保留）：`自动编译` 弹层「自动编译即将开放。当前请保存后在右侧点击「重新编译」。」；`⋯` 弹层「更多编译选项将在后续版本开放。」；引擎弹层「XeLaTeX（当前唯一支持）/ 入口文件 main.tex」。

**个人中心**
- 页签顺序 `个人资料 / 账号安全 / 科研概览`；身份头卡字段；账号信息 6 行（昵称/手机号/当前身份/账号 ID/加入时间/账号状态）；身份与机构两行（科研端·研究者·浙江大学数学科学学院·当前；学生端·未绑定机构·切换）；快捷入口 4 行；账号安全表单与设备列表；科研概览统计与最近项目卡；页脚免责声明原文。

**数据真实性**
- 项目名默认「未命名项目」、描述「暂无项目描述」；文献列表显示 `PDF` 徽标 + 文件名 + 作者/年份缺失显示「· —」；时间戳「已同步 今天 HH:MM」「最近项目 相对时间」；AI 概览注明生成来源（真实项目为 `llm:project-memory`）；`parse_status`、页码、总页数、文件大小/时长等均来自真实后端字段。

### 7.2 必须放弃（现役根本不成立，离线版不得编造）

1. **“所有 PDF 都能在阅读器里显示/选中”**：CID 字体（未内嵌、无 CMap）PDF 画布全白、文本层空、无任何错误提示；离线版不得伪造可渲染或伪造已修好的能力（本项目内 3 篇就是这种）。
2. **“全文搜索会在页面上高亮命中”**：搜索条有 `1/13`，页内 `.rw-pdf__mark` 为 0；离线版不得画假高亮。
3. **“点‘定位原文/最近笔记’会跳转并高亮原文”**：现役页码不变、无 locate 高亮。
4. **“选区工具条可反复使用”**：首次后不再出现（p08/p09 复测失败）；离线版不得演示“连续多动作”链路。
5. **“Agent 能读项目里的 PDF/给出原文出处”**：自由对话明确回答 `artifact_count = 0`、`本会话没有这篇文献`；离线版不得让 Agent 声称读过文献或伪造引文（唯一可复刻的是“拒绝作答 + 要求补充材料”的诚实行为，以及预设能力返回的“证据来源 p.1”卡片）。
6. **“工作台是独立仪表盘/项目总览页”**：点击「工作台」直接进入最近项目的上次工作区（读/写），无 dashboard。
7. **“最近项目卡有真实文献/草稿/笔记计数”**：卡上固定「— 文献 — 草稿 — 笔记」（后端 counts=null）。
8. **“问 Agent 是独立页面/独立入口”**：落点与「读论文」完全一致（截图像素级相同）。
9. **“新建项目自带 main.tex/模板/AI 概览”**：默认 0 文件、0 文献、概览「暂无项目数据」。
10. **“个人中心科研概览统计可信”**：3 项目 / 0 文献 / 0 草稿 / 0 笔记 与实际项目内容（4/1/1）矛盾。
11. **“写作预览有下载 PDF 按钮”**：只有「在新标签打开」图标；真实 PDF 是编译产物经预览请求获得（22,881 B），不得在 UI 里虚构「下载 PDF」按钮。
12. **“自动编译可用”**：UI 明说「自动编译即将开放」；不得做成可切换的自动编译。
13. **“多引擎可选”**：仅 XeLaTeX（后端钉死），不得给假选项。
14. **“通知/历史/用户菜单/身份切换/退出登录 有完整内容”**：本轮仅记录入口，未实测内容；离线版不得凭空编造其内部清单。

---

## 附：网络取证索引（`api/steps.json`）

- 规模：**11 个 run，707 条 API 记录**；每条含 method/url/status/请求头（脱敏）/请求体前 4KB/响应头/响应体前 4KB；二进制 PDF 另存 `artifacts/`。
- 端点摘要：`api/endpoints.json`。关键链路（均为浏览器真实发起）：
  - 登录：`POST /api/auth/challenges/sms` 200（响应含 `demo_code`）、`POST /api/auth/login/sms` 200、`GET /api/auth/me` 200、`POST /api/auth/token/refresh` 200。
  - 项目：`GET /projects` 200（items，`counts:null`）；`POST /projects` 201（新建 d770457a…）；`GET /projects/{id}` 200；`GET /overview` 200（`stats:{papers:4,drafts:1,notes:1,data:0}`，`source:"llm:project-memory"`）。
  - 文献：`GET /projects/{id}/papers` 200（3 篇→4 篇，含 `page_count`/`parse_status:"parsed"`）；`POST /projects/{id}/papers` 201（导入）；`GET /assets/{id}/content` 200 `application/pdf`（二进制）；`GET /papers/{id}/text?page=N` 200（blocks/bbox/section）。
  - 笔记：`POST /projects/{id}/notes` 201（2 次，title/body/paper_id/page/section）；`GET /notes/recent` 200。
  - 文件/编译：`POST /files` 201（main.tex）；`PUT /files/main.tex` 200（revision 3/5）；`GET /outline` 404（无 main.tex 的项目）/200；`POST /compile` 201（success/failed）；`GET /compile-runs/{id}/pdf` 200 `application/pdf`（22,881 B / 22,880 B）；`GET /compile-runs/latest` 200。
  - Agent：`POST /agent/tasks` 202（preset=formula_check/translate/derive/citation 等）；`GET /agent/tasks/{id}` 200（结构化结果）；`POST /agent/chat` 201（真实 LLM 回复，约 19s）；`GET /agent/chat` 200（历史线程恢复）。
- 失败/异常记录：`GET /files/main.tex` 404（读模式，控制台噪声）；`POST /compile` 422（空项目无草稿：「项目没有草稿文件，无法编译」）；`GET /outline` 404（新建项目）；`POST /auth/challenges/sms` 429（限流）。

## 附：截图索引（`shots/`，86 张，按页面）

- 登录：`00-login-otp.png`、`12-login-page.png`、`14-session-landing.png`
- 启动页：`01-landing-after-login.png`、`12-landing-full.png`、`12-landing-viewport.png`、`12-landing-after-full.png`
- 工作台/阅读：`02-workspace-full.png`、`05-read-entry-fail-full.png`、`06-read-*.png`、`08-read-wait-*.png`、`16-read-cid-blank.png`、`16-read-cid-search.png`、`16-read-embedded.png`、`16-read-embedded-search.png`、`08-read-imported.png`、`08-read-imported-paper.png`、`16-read-initial.png`、`17-read-ready.png`、`16-selection-bar.png`、`16-selection-quote.png`、`16-note-locate.png`、`16-locate-back.png`
- Agent：`07-agent-*.png`、`09-agent-*.png`、`15-read-agent-empty.png`、`16-agent-derive.png`、`16-agent-citation.png`、`17-agent-evidence.png`
- 写作：`10-write-*.png`、`11-write-*.png`、`15-write-entry.png`、`15-write-*.png`（failed/recovered/agent）、`15-write-agent-empty.png`
- 新建项目：`12-new-project.png`、`12-new-project-full.png`、`12-new-project-write.png`
- 个人中心：`13-account-full.png`、`13-account-viewport.png`、`15-account-账号安全.png`、`15-account-科研概览.png`
- 三种开始方式：`12-start-read.png`、`12-start-write.png`、`12-start-agent.png`

## 附：产物索引（`artifacts/`）

- `compiled-main-success-23.2s.pdf`（22,881 B，1 页，真实 XeLaTeX 产出；文本「实测写作小节…」）
- `compiled-main-recovered-20.9s.pdf`（22,880 B，撤销错误后重编译产出）
- `imported-research-paper-1-6pages.pdf`（63,024 B，本轮通过 UI 导入的 PDF）
- `live-0049-…pdf` / `live-0055-…pdf` / `live-0041-…pdf` 等（浏览器在真实预览/阅读请求中收到的原始 PDF 字节，未重新发起请求）
- `dom-01-landing.html`、`dom-02-workspace.html`、`dom-05-read-entry-fail.html`（页面 DOM 快照，含内联样式与真实节点）