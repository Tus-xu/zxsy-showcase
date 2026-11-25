# 学生端对话示例 · 本轮实施计划

2026-11-24 · 分支 `codex/student-chat-showcase` · 基线 `fc785f5`

依据：`D:/zxsy-math-arena/docs/superpowers/plans/2026-11-24-student-chat-showcase-design.md`（总方案）
与 `2026-11-24-guided-solving-full-journey.md`（导学全链路细化，替代总方案第 5 节）。

## 1. 结论：改动落在「离线回放层的会话供应 + 一张新卡」

现役链路已经具备所有需要的挂载点，不需要新增一级入口、不需要第二套聊天界面：

| 现役机制 | 事实 | 本轮怎么用 |
| --- | --- | --- |
| `POST /api/agent/chat` 被 `replay.js` 拦截 | `pickChatTurn` 按附件 / `conversation_id` 游标选采证 SSE | 换成「示例会话 ID → 状态机」的第二条路由 |
| 选项卡点击 = 把选项原文当消息发送 | `MessageBubble.onChoiceClick` → `socraticChoice` → `DialogView.onSocraticChoice` → `chat.doSend` | 选项文案即作答文本，状态机按节点比对归一化文本 |
| 历史 = `GET /conversations/{id}/messages` | `fromHistory` 把 `envelope.blocks` 还原成 text/cards/figures/citations | 示例会话的历史由状态机累积的轮次生成，天然可刷新恢复 |
| 卡片 = `msg.cards[].type` 分发 | `MessageBubble` 逐条 `v-if` 链 | 只**新增**一条 `showcase_stage` 分支，不改任何既有分支 |
| 附件 = `attachment.localUrl` 优先 | `AttachmentThumb` 先读 `localUrl`，失败才退 `filesApi.contentUrl` | 历史附件填本地 data URI，直接消掉「原图已丢失」 |

判据：本轮**不新增路由、不新增顶层导航、不改 `useChat` / `DialogView` 的发送契约**。

## 2. 文件边界（防子代理撞车）

唯一 Owner：主代理。共享文件只由 Owner 串行编辑。

### 新增（可并行，互不重叠）

| 文件 | 职责 | 归属 |
| --- | --- | --- |
| `app/src/offline/showcase/plot.js` | 函数曲线 → SVG data URI（极值点、切线、区间阴影、图例） | 子代理 A |
| `app/src/offline/showcase/assets.js` | 题图 / 直线图 / 割线图 / S3 三帧图，全部本地 data URI | 子代理 A |
| `app/src/components/chat/ShowcaseStageCard.vue` | 导学阶段卡（阶段条 + 题干连线 + 选项 + 依据 + 出处） | 子代理 B |
| `app/src/offline/showcase/knowledge.js` | 四段自编讲义摘录（稳定 ID） | Owner |
| `app/src/offline/showcase/catalog.js` | 7 条会话元数据（ID / 标题 / 置顶 / 顺序） | Owner |
| `app/src/offline/showcase/engine.js` | 导学状态机（纯函数） | Owner |
| `app/src/offline/showcase/session.js` | 状态读写（`store.showcase`）与轮次累积 | Owner |
| `app/src/offline/showcase/transcripts.js` | S1–S6 + 组合会话预置轮次 | Owner |

### 修改（仅 Owner）

| 文件 | 改动 |
| --- | --- |
| `app/src/offline/state.js` | `EMPTY` 增加 `showcase: {}` |
| `app/src/offline/handlers/agent.js` | 列表合并示例会话；历史服务示例会话；**历史附件带 data URI** |
| `app/src/offline/replay.js` | `/api/agent/chat` 增加示例会话分发（在采证回放之前判断） |
| `app/src/components/chat/MessageBubble.vue` | 新增 `showcase_stage` 分支 + 事件转发（既有分支零改动） |

### 测试

| 文件 | 覆盖 |
| --- | --- |
| `app/src/offline/showcase/engine.test.js` | 主讲 A 路径、B 路径、换路保留事实、澄清、极限支线、幂等、刷新恢复 |
| `app/src/offline/showcase/transcripts.test.js` | 文案结构不变量 + 数学校对（导数、极值、差的因式分解） |
| `app/src/offline/showcase/plot.test.js` | SVG 生成纯函数（点落在曲线上、无外网引用） |
| `app/src/offline/handlers/agent.test.js` | 历史附件不再为空、示例会话出现在列表、历史含 `showcase_stage` 卡 |

## 3. 状态机节点表

主阶段（页面只显示这四个）：`读题 → 选方法 → 分步推导 → 订正`。
前置小课与极限支线是推导中的暂停，主进度不回退。

| 节点 ID | 主阶段 | 内容 | 出口 |
| --- | --- | --- | --- |
| `g0_locate` | 读题 | 圈题眼：三项题型选择 | 选「判断局部极值」→ `r_read`；自由输入「导数」→ 先确认题型 |
| `r_read` | 读题 | 三行题干连线 + 「题目看懂了 / 局部是什么意思」 | 看懂 → `m_method`；问局部 → `r_read_local` |
| `r_read_local` | 读题 | 「只和足够靠近的点比较」+ 追问是否全局最低 | 回到 `r_read` 确认 |
| `m_method` | 选方法 | 两法双卡 + 「帮我选」 | → `a1_candidates` / `b1_standard` |
| `a1_candidates` | 分步推导 | `g'(x)=6(x+1)(x-2)`，两因子零点 | 对 → `a2_diagnose` |
| `a2_diagnose` | 分步推导 | `g'(0)=-12` 说明什么（四类分流） | 正确 → `a3_signs`；混淆 → `d1_lesson`；澄清过 → `a2_clarify` |
| `d1_lesson` | 分步推导 | 小课「先分清高度和斜率」 | → `d2_check` |
| `d2_check` | 分步推导 | `r(x)=5-2x` 位置与走向 | 对 → `d3_resume`；错 → `d2_check`（带提示，可看解析） |
| `d3_resume` | 分步推导 | 「回到看导数符号」承接条 | → `a3_signs` |
| `a3_signs` | 分步推导 | 三区间符号 `+,-,+` 与三点验算 | → `a3_classify` |
| `a3_classify` | 分步推导 | `-1` 左正右负属哪类 | → `a3_classify2` |
| `a3_classify2` | 分步推导 | `2` 左负右正属哪类 | → `a4_correct` |
| `b1_standard` | 分步推导 | 差值符号的定义判据 | → `b2_minus1` |
| `b2_minus1` | 分步推导 | `g(x)-g(-1)=(x+1)²(2x-7)` 符号 | → `b3_two` |
| `b3_two` | 分步推导 | `g(x)-g(2)=(x-2)²(2x+5)` 符号 | → `b4_correct` |
| `a4_correct` / `b4_correct` | 订正 | 选出局部极小横坐标 | 对 → `fix_return` |
| `fix_return` | 订正 | 「返回题卡订正」→ 重选 C | 选 C → `done` |
| `limit_*` | 支线 | 极限关系图 / `y=x²` 差商 / `4+h` 检验 | 回原节点 |

换路规则：`facts` 只装数学意义相同且**已独立证实**的结论。
公共事实 `candidates=-1,2` 两路共享；导数符号与差值符号各自独立，互不冒充。

## 4. Git 提交切分

1. `fix(offline): 历史用户消息附件携带本地快照，刷新后可复现题图`
2. `feat(showcase): 离线图形与题图生成器（纯函数 + 单测）`
3. `feat(showcase): 示例会话目录、预置轮次与自编讲义`
4. `feat(showcase): 引导式解题状态机与刷新恢复（TDD）`
5. `feat(chat): 导学阶段卡组件与渲染接入`
6. `feat(offline): 示例会话接入会话列表 / 历史 / chat 分发`
7. `chore(release): 重新打包离线发行包 + 验收证据`

每次只 `git add` 明确文件；不推送、不合并、不重置 main。

## 5. 验收映射

| 用例 | 覆盖实现 |
| --- | --- |
| V01 | 第 1 项（附件）+ S1 预置轮次 |
| V02 | S2 预置问答 + S3 三帧 `MathFigure`（plot.js 生成） |
| V03 | `quiz_set` 三题（复用 `QuizSetCard`）+ S6 错题本地记录 |
| V04 | 组合会话状态机 C1–C7 + V1 首答 A → 订正 C |
| V05 | A / B 双路径 + 换路 + 刷新恢复（状态机单测先行） |
| V06 | 无关文本落回当前节点、旧按钮幂等、键盘可达 |
| V07 | 既有采证会话零改动（列表只 append，不改既有项） |
| V08 | `package_release.py` + `audit_release.py` 断网审计 |

阻塞项：缺截图、题图/出处打不开、数学错误、分支误判、假按钮、刷新丢失、布局遮挡、其他角色回归。
