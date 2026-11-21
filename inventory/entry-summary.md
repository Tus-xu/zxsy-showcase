# 三端「当前实际使用页面」判定小结（run-01 · 2026-11-21）

采集基线：`D:\zxsy-math-arena`（原仓，只读），前端 5176 / API 8000 / 教师 8100 / PPT 8200 / Presenton 8201 / 科研 8300 全部实测启动；Chromium 153.0.8010.12，viewport 1672×941、DPR 1；三种角色各用全新浏览器上下文从 `http://127.0.0.1:5176` 正常登录（手机号 + 页面显示的演示验证码）。逐项明细与截图见同目录 `routes.csv` 与 `../../evidence/live/run-01/inventory/`。

## 一段话结论

**学生端**当前实际使用的是「V4 学生壳 + `/dialog` 对话学习为首页」这一套：左侧导航只有 首页(`/dialog`)、练题(`/practice`)、错题(`/errors`)、知识库(`/library`)、资源中心(`/resources`)、课堂(`/classroom`，页内三 Tab：课堂任务/我的班级/双师课堂)、我的(`/me`，四 Tab：学情报告/掌握地图/体验反馈/个人设置)，双师课堂是独立沉浸页 `/dual`；旧的 `/kb`、`/class`、`/tasks`、`/overview`、`/report`、`/graph`、`/profile`、`/exam`、`/resource` 全部只是 redirect 到新地址，属于旧书签兼容，不构成新菜单。**教师端**当前实际使用的是「教师工作台 V3 壳 + `/teacher-v3/prep` 备课中心为落地页」：一级导航只有 备课中心、课堂（每日教学）与 题库与组卷、作业与批改、学情洞察、资源中心（资源与测评）；真实备课链路是 首页 NL 输入 → 创建 TeachingSession → `/teacher-v3/prep/w/:sessionId/classroom|ppt|plan` 工作台，备课历史在 `/teacher-v3/prep/history`；课件编辑器不再是独立产品线——`/teacher-v3/slides` 只是兼容入口（无 session 回 `/teacher-v3/prep`，有 session 映射到 `/teacher-v3/prep/session/:id?focus=artifact`），`/teacher-v3/prep/session/:id` 与受 `VITE_PREP_SURFACE=immersive` 控制的 `/teacher-v3/prep-immersive` 是会话表面，`/teacher-v3/today` 只是旧地址 redirect；组卷中心 `/teacher-v3/quiz`、班级管理 `/teacher-v3/classes`、批改工作台 `/teacher-v3/grading` 保留路由但不在左侧一级导航。**科研端**当前实际使用的是「RV17 Research Workspace」：`/research-workspace` 是唯一启动页落地，顶栏 启动页/工作台/个人中心；工作台按项目落地为 `/research-workspace/:projectId/read`（三栏：项目与文献栏 + PDF 阅读 + 右侧 Research Agent）与 `/research-workspace/:projectId/write`（LaTeX 写作）；`/research-workspace/workspace` 只是「最近项目」聚合跳转；旧 `/research/*`、`/research-vnext/workbench`、`/research-vnext/welcome` 全部 redirect 到 `/research-workspace`，属旧书签兼容。

## 分端要点

### 学生端
- 当前主路径：`/dialog`（首页/对话学习，含 4 个快捷入口卡与新对话）、`/practice`（今日训练/自己选题/真题模考）、`/errors`（错题本 + 自动打开首题详情弹层）、`/library`（我的资料/我的题库）、`/resources`（B 站视频推荐）、`/classroom`（课堂任务/我的班级/双师课堂）、`/me`（学情报告/掌握地图/体验反馈/个人设置）、`/dual`（AI 双师课堂）。
- 兼容/重定向：`/kb`→`/library?tab=materials`、`/class`→`/classroom?tab=class`、`/tasks`→`/classroom?tab=tasks`、`/overview|/report`→`/me?tab=report`、`/graph`→`/me?tab=graph`、`/profile`→`/me?tab=profile`、`/exam`→`/practice?tab=exam`、`/resource`→`/resources`、未知路径→`/dialog`。
- 本轮待证：作业作答 `/tasks/:id`、模考作答 `/exam/:id`（列表可见入口，未进入）；双师课堂内 OCR 上传通道。
- 观察：进入 `/errors` 会自动打开首题详情弹层，弹层期间侧栏点击被遮挡，需点「✕ 关闭」；`/me?tab=trial` 的使用档案区显示「档案加载失败」。

### 教师端
- 当前主路径：`/teacher-v3/prep`（备课中心首页）→ NL 输入创建会话 → `/teacher-v3/prep/w/:sessionId/classroom|ppt|plan`；`/teacher-v3/prep/history`；`/teacher-v3/classroom`、`/teacher-v3/bank`、`/teacher-v3/assign`、`/teacher-v3/insights`、`/teacher-v3/resources`；`/teacher-v3/prep-templates`（从「从已有教案开始」进入）。
- 兼容/会话表面：`/teacher-v3/slides`（无 session → `/teacher-v3/prep`；有 session → `/teacher-v3/prep/session/:id?focus=artifact`）、`/teacher-v3/prep/session/:id`、`/teacher-v3/prep-immersive[/:id]`（开关 `VITE_PREP_SURFACE=immersive`）。
- 重定向：`/teacher-v3/today`→`/teacher-v3/prep`。
- 二级路由（不在左侧一级导航）：`/teacher-v3/quiz`、`/teacher-v3/classes`、`/teacher-v3/grading`。
- 本轮待证：备课历史行点击进入会话；「从已有PPT开始」入口卡点击后的真实去向；工作台 materials/overview/chat 三个无 Tab 按钮的视图在产品流程中的实际触发点。

### 科研端
- 当前主路径：`/research-workspace`（启动页）→ 工作台/新建项目/读论文/写论文/问 Agent → `/research-workspace/:projectId/read` 或 `/write`；`/research-workspace/account`（个人中心）；`/research-workspace/workspace`→最近项目 `read`。
- 兼容/重定向：`/research`、`/research/library`、`/research/import`、`/research/writing`、`/research/tasks`、`/research-vnext/workbench`、`/research-vnext/welcome` → `/research-workspace`。
- 本轮待证：项目内 文献/笔记/项目/设置 左栏逐项、顶栏 历史/通知；本轮项目未导入文献、未写草稿，READ/WRITE 内容为空态（功能存在、样本未备）。

## 登录与身份映射

| 角色 | 演示手机号 | 昵称 | 数据库角色绑定 | 登录后落地 |
|---|---|---|---|---|
| 学生 | 13800001001 | 小林 | student(approved) | `/dialog` |
| 教师 | 13800001002 | 张老师 | student+teacher(approved) | `/teacher-v3/prep` |
| 科研 | 13800001003 | 林知远 | student+researcher(approved) | `/research-workspace` |

- 正常登录入口为 `/login`：先选「进入身份」（学生端/教师端/科研端），再填手机号 →「获取验证码」→ 页面直接显示「演示环境验证码：NNNNNN」→ 输入后「安全登录」。
- 交接文档写的固定验证码 `123456` 只属于已废弃的 `/api/auth/sms-code`+`/api/auth/login` 旧端点；当前 UI 走 `/api/auth/challenges/sms` + `/api/auth/login/sms`，验证码在演示模式下由页面显示（每次随机 6 位）。登录凭据仅记录演示手机号与此机制，不含 token/密钥。
- 同一手机号有多角色绑定（如 01002、01003）时，登录页的「进入身份」决定 `active_role` 与落地端。
