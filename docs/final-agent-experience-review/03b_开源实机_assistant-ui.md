# 03b 开源实机：assistant-ui 与 Generative UI

- 研究编号：R4（W1 研究波次）
- 采集日期：2026-11-25
- 研究对象：assistant-ui（`D:\zxsy-agent-visual-research\repos\assistant-ui`，commit `4797ce5`，2026-11-25 17:41；npm `@assistant-ui/react@0.15.38`）
- 研究方式：源码研究 + 官方在线页面/在线产品实机操作 + 本地 Vite+React 最小应用实机运行
- 证据根：`D:\zxsy-math-arena-showcase\docs\final-agent-experience-review\evidence\open-source-runtime\assistant-ui\`
- 本地实验工程：`D:\zxsy-agent-visual-research\apps\assistant-ui-local`（研究目录内，不进入演示项目依赖）
- 重要边界：原真实项目 `D:\zxsy-math-arena` 全程未启动、未调用、未写入；本地模型 `127.0.0.1:11535` 开工探测未运行，未自行启动 llama.cpp；本报告不把脚本模拟内容当作模型输出。

---

## 0. 结论摘要

1. **assistant-ui 的核心不是"聊天组件"，而是一套"消息部件（message parts）+ 运行时适配器（runtime adapter）+ 可注册渲染器"的契约。** 文本、推理、工具调用、来源、图片/文件、数据、Generative UI 是并列的消息部件；UI 只按部件类型分派渲染，同一条消息可以自然混合叙述、工具结果、交互组件与后续文字。
2. **工具调用与模型上下文的关联有两条成熟路径**：① 工具定义/渲染器注册（toolkit `render` + `execute`），工具结果作为 `tool-call` 部件回填消息并可用 `sendAutomaticallyWhen` 自动续跑；② 前端组件反向暴露给模型（`makeAssistantVisible` 的 click/edit 工具、`useInteractable` 的状态 schema 同步），让"界面操作"成为模型可调用的一等能力，而不是把每次点击都变成聊天气泡。
3. **Generative UI 采用"JSON 组件树 + 白名单注册表"**：`GenerativeUISpec` 只允许引用宿主白名单中的组件；未知组件默认抛错（可配 Fallback），递归深度上限 64；官方示例主路由用 `createWidgetToolkit` + `createSpecToolkit`（`render_spec` / `show_widget`），另有 `render_gui`（工具结果桥接到 `MessagePrimitive.GenerativeUI`）、`present`（独立展示面）与静态 `primitive` 路由，并在提示词里明确"不要把 JSON 贴进正文"，客户端还会过滤泄漏的 JSON 文本。
4. **流式渲染的关键细节**：文本部件内置平滑打字（`smooth` 默认 true，尊重 `prefers-reduced-motion`）；Markdown 按块记忆化，只重渲染变化块；`final` 标志控制"结尾未闭合语法"是否临时闭合；数学公式在解析前做 `\(...\)`、`\[...\]` 等分隔符归一化，并规避 `$5` 货币误判。
5. **自动滚动是一套显式状态机，而不是"始终滚到底"**：`followBottom / followPaused / intent` 三态；用户上滚、打开折叠、键盘滚动、触摸上滑都会暂停跟随；打开 disclosure 也会暂停；新 run/初始化/切换会话才主动滚底；历史消息前插时用消息锚点保持阅读位置。本地实测：内容从 1550px 增长到 2725px 时，用户停留的 scrollTop=0 未被拉回；点击"回到底部"后 scrollTop=1873、atBottom=true（`local-probe2.json`）。
6. **官方在线示例页当前不是可交互 demo**：`https://www.assistant-ui.com/examples/generative-ui` 是文档页，内嵌一张官方产品截图（fig.01）；页面没有聊天输入框（`probe-01.json`：textarea=0）。真正可交互的官方在线产品是 `/playground`（AI Builder）与全站 "Ask AI" 文档助手，本报告分别做了实机操作（截图 04、07/08、10）。
7. **Vue 已有一等支持**：仓库含 `packages/vue@0.0.8`、`examples/with-vue`，提供 `ThreadPrimitiveViewport/Messages`、`MessagePrimitiveParts`、`ActionBar/BranchPicker/Composer` 等 Vue 原语，以及 `ExternalStoreAdapter`（messages/isRunning/convertMessage/setMessages/onNew/onEdit/onReload/onCancel + threadList）。演示项目若要借鉴，建议借用其"部件协议 + 外部 store 适配器"思想，而不是移植 React 代码。

---

## 1. 研究环境与对象

| 项 | 值 | 证据/路径 |
|---|---|---|
| 仓库 | assistant-ui，浅克隆 | `D:\zxsy-agent-visual-research\repos\assistant-ui` |
| commit | `4797ce5da22845dfa0c0d2cbd115f8e6fe42d2a2`（2026-11-25 17:41 +0800） | `git -C ... log -1`（只读命令） |
| React 包版本 | `@assistant-ui/react@0.15.38`（与 npm latest 一致） | `packages/react/package.json`；npm registry 查询 |
| Vue 包版本 | `@assistant-ui/vue@0.0.8`（npm 同名版本 0.0.8） | `packages/vue/package.json` |
| 本地运行环境 | node 22.23.2 / pnpm 10.28.0 / Chrome / Playwright 1.48.2（来自演示项目 `app/node_modules`） | AGENT-RULES 指定；本机实测 |
| 本地实验端口 | 18300（规则允许的 assistant-ui 示例端口），仅监听 `[::1]:18300`，通过 `http://localhost:18300` 访问 | `dev-server.log`；`netstat` 记录于日志 |
| 依赖隔离 | pnpm store：`D:\zxsy-agent-visual-research\.pnpm-store`；安装 157 个包；esbuild 需 `pnpm.onlyBuiltDependencies` 批准 postinstall | `D:\zxsy-agent-visual-research\apps\assistant-ui-local\package.json` |
| 许可证 | MIT | `repos/assistant-ui/LICENSE` |

### 1.1 官方在线页面的事实核对（避免把文档页当 live demo）

- `https://www.assistant-ui.com/examples/generative-ui` 打开后是文档页：标题 "Generative UI Example"，正文只有 Overview / Patterns Demonstrated / Key Concepts / Source；**没有任何 textarea/contenteditable**，只有一张内嵌产品截图（`img` 自然尺寸 1440×1098，来源 `/_next/image?url=%2Fscreenshot%2Fexamples%2Fgenerative-ui.png`）。证据：`official-web/probe-01.json`、`official-web/01-generative-ui-initial-1440x900.png`。
- 该页 `.md` 版本明确只提供 GitHub 源码链接，不提供 live demo。证据：`https://www.assistant-ui.com/examples/generative-ui.md`（WebFetch，2026-11-25）。
- `/examples` 列表中的 "Generative UI" 同样指向该文档页。证据：`official-web/probe-02.json`。
- 因此：**本报告把文档页内嵌图归为「官方素材」，把 `/playground` 与全站 Ask AI 的操作归为「官方在线实机」，把本地 18300 应用归为「本地开源运行」。三者不混用。**

---

## 2. 实机证据

### 2.1 官方素材：Generative UI 示例的产品截图（非本项目运行）

文件：`official-web/official-generative-ui-screenshot.png`（官方文档页内嵌原图，252 KB，1440×1098）

已亲自查看，观察到的设计特点：
- 左侧会话栏（New Thread / Search threads / 会话项），顶部示例内导航（Generative UI / present tool / Tool UI / Static primitive (legacy) / GUI chat (legacy)）、模型选择器（Claude Opus 5.5）、右上 "Show tool calls"。
- 用户消息是右侧浅灰气泡；助手回复不套整卡，而是"标题 → 正文 → 图片带 → 统计数值行 → 交互地图"连续排布；工具活动以一行 "2 tool calls ›" 折叠，不占据正文。
- 输入区为圆角大输入框，左侧 "+" 附件入口，右侧圆形发送按钮。
- 价值：证明"工具调用折叠 + 富内容直接嵌入回复流 + 交互地图与文本同卡连续"是官方推荐形态；不能据此声称我们复现了该示例。

### 2.2 官方在线实机 A：Playground（AI Builder）

- 入口：`https://www.assistant-ui.com/playground`
- 操作：在输入框输入 "Build a minimal chat thread with a composer and message list" 并回车，等待 12s。
- 截图：`official-web/04-playground-after-input-1440x900.png`（已亲自查看）
- 观察：
  - 用户消息为右侧浅灰胶囊；助手先输出一句自然语言，再以**单行工具活动** `getTemplateList  11 templates ›` 呈现工具调用（图标 + 工具名 + 结果摘要 + 展开箭头），不是卡片堆叠、不是日志面板。
  - 运行中发送按钮变为黑色方形"停止"；输入框占位 "Ask Xulux to build or refine the UI..."。
  - 结论：工具活动被压缩为可展开的一行，正文与工具行共享同一阅读节奏。
- 证据类别：官方在线实机操作（官方站点上的真实产品，非本项目）。

### 2.3 官方在线实机 B：全站 Ask AI（文档助手）

- 入口：`https://www.assistant-ui.com/` → 右上 "Ask AI"。
- 操作：提问 "How does assistant-ui render Generative UI?"，分别截取：
  - 等待态：`official-web/07-askai-streaming-1440x900.png`（已亲自查看）——面板右上 "New"、关闭 ×；用户气泡；助手区域先显示蓝色 `> thinking` 动画，不提前输出正文。
  - 工具活动态：`official-web/08-askai-final-1440x900.png`（已亲自查看）——助手一句话后，出现
    - `> listed the docs tree`（已完成，灰色，右侧耗时 `1.1s`）
    - `> running grep -ril "generative" /repo --include="*.mdx" -...`（进行中，蓝色箭头，等宽字体、单行截断）
    两条工具行均为小字号、低对比度、无边框卡片。
  - 完成态：`official-web/10-askai-answer-18s-1440x900.png`（已亲自查看）——助手输出**Markdown 表格**（present tool / Tool UI / MessagePrimitive.GenerativeUI 三行对比），下方正文段落，末尾 "Sources" 区域带 `Generative UI` 来源 chip，随后是复制/赞/踩操作条；面板顶部有 token 计数 `20.6k / 1M`。
- 失败尝试留档：`official-web/09-askai-answer-30s-1440x900.png` 是一次未成功发送（面板回到欢迎建议），**不作为任何设计结论依据**。
- 价值：提供了"思考态 → 工具时间线 → 正文（含表格）→ 来源 → 操作条"的完整生命周期实机样本。

### 2.4 本地开源运行：Vite + React + @assistant-ui/react 0.15.38

工程：`D:\zxsy-agent-visual-research\apps\assistant-ui-local`
- 依赖：`@assistant-ui/react@0.15.38`、react 19.3.1、vite 7.3.8、@vitejs/plugin-react 5.2.0。
- 运行时：`useLocalRuntime(makeAdapter(), { initialMessages })`，自定义 `ChatModelAdapter`（async generator，逐帧 yield 累计 content）。
- 渲染：`ThreadPrimitive.Root/Viewport/Messages` + `MessagePrimitive.Root/Parts` + `ComposerPrimitive.Root/Input/Send/Cancel` + `ActionBarPrimitive.Root/Copy/Reload`。
- 内容（**脚本模拟，UI 顶栏已明示"对话数据为脚本模拟，非模型输出"**）：
  - 初始用户消息："请判断 f(x)=x³−3x 的单调区间和极值，并画出大致图象。"
  - 助手消息：文本 → `plot_function` 工具调用（args 与 result 均含真实数值）→ `generative-ui` 组件树（Card/Stack/Stat/FunctionChart/Text/Button）→ 收尾文本。
  - 函数图由本地 JS 逐点计算绘制（f(x)=x³−3x，极值点 (−1,2)、(1,−2)）。
- 截图与观察（均已用 Read 亲自查看）：
  - `local-run/local-05-top-of-thread-1440x900.png`：用户气泡 → 助手两段文字 → 工具卡（标题栏 `plot_function` + 绿色"已完成·本地计算"，内部是真实的函数图与结果 chips）→ Generative UI 卡（统计行 + 第二张函数图 + 说明 + 按钮）；输入区固定在底部。
  - `local-run/local-06-tool-card-detail.png`：工具卡细节，图线极值点与标签位置正确。
  - `local-run/local-03-streaming-700ms.png`：追问后 700ms，助手仅显示第一段文本，输入区已变为红色"停止"；说明流式期间部分内容可先呈现。
  - `local-run/local-04-after-followup-1440x900.png`：追问完成后第二条助手消息包含第二套工具卡与 Generative UI 卡，页面自动跟随到底部。
  - `local-run/local-01-initial-1440x900.png`、`local-02-assistant-detail.png`：初始加载后自动滚到底部；元素截图受粘性底栏遮挡（见 2.5 局限）。
  - 页面结构数据：初始 `svgs=2, toolCards=1, gCards=1`；追问后 `msgs=4, toolCards=2, gCards=2`（`local-run/local-probe.json`）。控制台有 1 条资源 404（日志未记录具体 URL，推测为 favicon），无 pageerror。
- **自动滚动实测**（`local-run/local-probe2.json`；截图 `local-08-user-scrolled-up-during-stream.png`）：
  - 运行中把 `.thread-viewport` 置顶：内容高度 1550 → 2725，2.4s 后 scrollTop 仍为 0、`atBottom=false`；画面停在原阅读位置（local-08 可见首条消息与工具卡，未强制拉底）。
  - 点击"回到底部"后：scrollTop=1873、`atBottom=true`（`local-09-after-scroll-bottom-click.png`）。
  - 说明：本地复现了源码中"用户离开底部即暂停跟随、显式操作才恢复"的行为；注意该实验的滚动是程序化 scrollTop，不是真实手势，结论限于"上滚不被拉回"。

### 2.5 本地运行的失败点与局限（必须如实记录）

1. **没有接真实模型**：`127.0.0.1:11535` 开工探测连接失败（llama-server/Ollama 未启动，R3 当时未就绪）；按规则不自行启动 llama.cpp，改用自定义 `ChatModelAdapter` 脚本流。因此本实验证明的是"渲染与交互机制"，**不证明真实模型输出质量**。
2. **官方示例页不可交互**：`/examples/generative-ui` 为文档页（textarea=0），无法按原计划"在官方示例页输入并操作"；已用 Playground 与 Ask AI 补充官方在线实机证据，并单列类别。
3. **元素截图受粘性底栏遮挡**：`local-02`、`local-07` 的元素截图包含固定输入区覆盖层；判断 Generative UI 卡完整形态应以 `local-05` 为准。
4. **`examples/with-vue` 未运行**：该示例依赖 monorepo workspace 包与 node>=24.11，未在本轮 90 分钟时间盒内构建；只做了源码研究，**不声称 Vue 示例已实机运行**。
5. **未测试附件/语音/分支切换等全部能力**：本轮聚焦消息渲染、工具 UI、Generative UI、流式与滚动；附件、语音、分支选择仅做源码阅读。

---

## 3. 源码研究结论（全部附路径）

### 3.1 消息部件类型（Message Parts）

权威定义：`packages/core/src/types/message.ts`

- 用户消息部件：`text / image / file / data / audio(旧)`（`ThreadUserMessagePart`，约 431 行）。
- 助手消息部件：`text / reasoning / tool-call / source / file / image / data / generative-ui`（`ThreadAssistantMessagePart`，439 行起）。
- 关键字段：
  - `TextMessagePart`：`text`、`status`、`parentId`、`providerMetadata`（约 16 行起）。
  - `ToolCallMessagePart`（337 行起）：`toolCallId`、`toolName`、`args`（流式中为**部分解析**）、`argsText`（原始 JSON 文本）、`result`、`isError`、`isPreliminary`（中间结果，未定稿）、`artifact`（仅 UI 用）、`timing`、MCP app 元数据、`responseDeliveryStatus`。
  - `SourceMessagePart`：url/document 两种来源，带 id/title/url 或 mediaType。
  - `GenerativeUIMessagePart`：`spec: GenerativeUISpec`，流式友好、可渐进渲染。
  - 状态：`MessagePartStatus = running | complete | incomplete(reason: cancelled/length/content-filter/other/error)`；`ToolCallMessagePartStatus` 含 `requires-action`（reason: `tool-calls` | `interrupt`）。
- 默认渲染映射：`packages/core/src/react/primitives/message/MessageParts.tsx:388`（Text/Reasoning/Source/Image/File/Unstable_Audio/ToolGroup/ReasoningGroup + tools.by_name/Fallback + data + generativeUI 注册表）。
- 分组：同文件 `groupMessageParts`（110 行）**把连续 tool-call 与 reasoning 部件总是分组**；启用 chain-of-thought 时二者合并为一组。官方截图中 "2 tool calls ›" 即该分组的外显。

### 3.2 工具调用与组件事件如何关联模型上下文

**路径 A：工具定义 + 渲染器 + 结果回填（正向）**
- `examples/with-generative-ui/app/toolkit.tsx`：`defineToolkit({ select_date, collect_contact, generate_chart, show_location })`，每项含 `description / parameters(zod) / execute / render`。
- `humanTool()`：`packages/core/src/react/model-context/human-tool.ts:15`。注释明确：**human-in-the-loop 工具没有运行时实现**，由 `"use generative"` 编译器在构建期剥离并打上 `type: "human"`；到运行时才执行说明模块没被编译。
- 用户在组件内提交：`examples/with-generative-ui/components/contact-form-tool-ui.tsx:82` 调用 `addResult(form)`，把表单值作为工具结果写回该 tool-call 部件，随后模型可继续推理。
- 自动续跑：`examples/with-generative-ui/app/gui-chat/page.tsx:44` 使用 `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`（AI SDK 适配层），工具结果齐全即自动发起下一轮。
- 工具渲染器契约：`ToolCallMessagePartComponent<Args, Result>` 接收 `args / result / status / addResult / resume / respondToApproval`；`ChartToolUI` 在 `status.type === "running" && !args.data?.length` 时显示 "Generating chart..."，有数据即渲染（`examples/with-generative-ui/components/chart-tool-ui.tsx`）。这解释了我们本地实验中"工具卡先加载态、后结果"的可行实现。

**路径 B：前端组件反向暴露给模型（反向）**
- `packages/react/src/model-context/makeAssistantVisible.tsx`：包裹任意组件后，`aui.modelContext.register`（139 行）把**组件 outerHTML 作为 system 内容**注入，并注册 `click`（39 行）/`edit` 两个工具；模型通过 `data-click-id` / `data-edit-id` 操作真实 DOM，`edit` 使用原生 setter + input/change 事件，默认 settle 延迟 2000ms（可按元素 `data-action-settle-delay` 覆盖）。
- `examples/with-interactables/app/page.tsx:35`：`unstable_useInteractable("taskBoard", { description, stateSchema, initialState })` 返回 `[state, { setState, isPending }]`；模型自动获得 `update_taskBoard` 类工具，界面状态与模型状态双向同步。这是"用户输入与组件状态同步"的最成熟样本。
- 结论：成熟做法不是"每次点击发一条聊天消息"，而是**把界面状态变成模型可读写的外部状态，把模型动作变成组件状态变更**；只有自然语言意图才进入对话。

### 3.3 Generative UI 的实现与安全边界

- 规范类型：`GenerativeUINode = string | number | array | { component, props?, children?, key? }`；`GenerativeUISpec = { root }`（`packages/core/src/types/message.ts` 约 140–200 行）。
- 渲染器：`packages/core/src/react/primitives/generativeUI/GenerativeUI.tsx`
  - 白名单即安全边界：未知组件默认抛 `GenerativeUIRenderError`（101 行），可选 `Fallback` 软失败；递归上限 `MAX_DEPTH = 64`（58 行）防止恶意/失控响应爆栈；节点 key 默认按路径生成。
  - 测试：`packages/react/src/tests/generative-ui.primitive.test.tsx` 明确"无 allowlist 时渲染空并告警"。
- 官方示例的多种形态（按路由）：
  1. **主路由 `/`（当前主线）**：`app/generative-ui-toolkit.ts` 用 `createWidgetToolkit({ widget: { maxHeight: 720 }, spec: createSpecToolkit(catalog, { components, specPrompt: { customRules } }) })`，`catalog` 由 `toSpecCatalog(styledGenerativeUILibrary)` 生成；`app/page.tsx` 通过 `Tools({ toolkit: widgets.toolkit })` 注册，并用 `useWidgetInstructions` 预载格式规则。工具含 `render_spec` / `show_widget` / `edit_widget` / `read_me`；spec 属性可绑定此前工具结果路径（如 `/tools/search_flights/0`）。
  2. `render_gui` 工具 → 结果桥接到 `MessagePrimitive.GenerativeUI`（旧版 `/gui-chat` 路由：`app/gui-chat/page.tsx` + `components/assistant-message-gui.tsx`）。
  3. `present` 工具（`JSONGenerativeUI`，display: standalone）在独立展示面渲染（`app/present/page.tsx`、`lib/render-gui-tool.ts`）；单独 `/api/present` 端点避免工具集竞争。
  4. `/primitive`：静态 spec + `GenerativeUIRender` 白名单渲染，用于验证渲染器本身。
- 防"JSON 泄漏"：`lib/render-gui-tool.ts` 的 `renderGuiChatInstructions` 要求模型"不要把 JSON/代码块/工具结果贴进正文"；`isLeakedRenderGuiText()` 在客户端识别并隐藏形如 spec 的 JSON 文本。
- 流式友好：类型注释明确"partially-streamed spec renders progressively"（`types/message.ts` 中 `GenerativeUIMessagePart` 注释）。

### 3.4 流式与部分 Markdown 渲染

- 平滑打字：`packages/react/src/primitives/messagePart/MessagePartText.tsx:58`，`smooth` 默认 true，可传 `SmoothOptions`，并在 `prefers-reduced-motion: reduce` 下自动关闭；实现来自 `utils/smooth/useSmooth`。
- Markdown 解析/渲染：`packages/markdown/README.md:25`：
  - 流式时**未变化的块保持同一对象**，只重渲染变化块（块级记忆化）；
  - 传 `final`（消息完成）后，结尾未闭合语法不再"临时闭合"；
  - React/Vue/RN/Ink 多渲染器共享同一解析树；Vue 渲染器为 `@assistant-ui/markdown/vue`。
- 数学公式：`packages/react-markdown/src/preprocess.ts:6` 注释说明真实痛点——模型常输出 `\(...\)`、`\[...\]`、`[/math]` 等 remark-math 不识别的分隔符，且 `$5` 货币会被单美元公式吞掉；`preprocess` 在解析前归一化，并且"平滑展示先显示原始累计文本，再对可见前缀做 preprocess"。
- 价值：这是"部分 Markdown 不闪、不破版"的直接工程答案；演示项目若自研流式渲染，应实现"块级缓存 + final 标志 + 数学分隔符归一化"。

### 3.5 自动滚动策略（本轮最重要的可移植规则）

实现位置：
- React 绑定：`packages/react/src/primitives/thread/useThreadViewportAutoScroll.ts`（118 行）
- 控制器：`packages/store/src/utils/thread-viewport-auto-scroll.ts`（529 行）

策略拆解：
1. **三态**：`followBottom`（是否跟随底部）、`followPaused`（是否因用户操作暂停）、`intent`（平滑滚动意图，null 表示无）。
2. **暂停跟随的触发**：
   - 用户向上滚动：`scrolledAway`（scrollTop < 上次值，且内容未缩短）→ `followBottom = false`（248 行）。
   - 打开折叠/详情：`pauseFollowOnExpand`（328 行）捕获 `click`，命中 `[aria-expanded]` / `summary` 的"展开"动作即暂停。
   - 键盘滚动键、触摸上滑、滚轮向上：`noteScrollGesture`（362 行）产生仅存活约两帧的 `upwardInput` 信号；嵌套可滚动区域优先消费上滑（`nestedScrollerTakesUpward`）。
   - 用户主动操作（pointerdown/wheel/touchstart）会取消待执行的"滚到底"（`cancelPendingScrollToBottom`）。
3. **主动滚底的时机**：run 开始（`runStarted`）、首次有消息初始化（`scrollToBottomOnInitialize`）、切换会话（`threadSwitched`）、用户点击 ScrollToBottom。
4. **历史前插**：`messagesPrepended(previousFirstMessageId)`（95 行）用 `keepMessageAt` 锚定原首条消息的视口偏移，加载更早历史不跳；若用户正在底部则不受影响。
5. **内容增长**：ResizeObserver → `followGrowth()`；只有"跟随中且未暂停"才滚底，否则保持位置；`contentInset`（footer/输入区）单独计量，避免输入框高度变化误触发。
6. **顶部锚定模式**：`turnAnchor: "top"` 时用户消息锚定顶部、助手回复向下增长，`holdFollow` 逻辑不同（`useThreadViewportAutoScroll` 选项注释）。
7. **本地实测验证**：见 2.4 与 `local-probe2.json`——上滚后内容增长不被拉回，点击回到底部恢复。

### 3.6 Composer / ActionBar / BranchPicker 的产品细节

- Composer：`ComposerPrimitive.Root/Input/Send/Cancel/AddAttachment/Attachments/Quote/Queue`（`packages/react/src/primitives/composer/`）。Input 基于 `react-textarea-autosize`，Enter 发送、Shift+Enter 换行；运行中显示 Cancel（停止）；`useComposerRunStartFocusGuard` 处理运行开始时的焦点保护。
- ActionBar：`ActionBarPrimitive.Root` 支持 `hideWhenRunning`、`autohide: "always"|"not-last"|"never"`、`autohideFloat`（36 行附近），并提供 Copy/Edit/Reload/ExportMarkdown/Feedback/Speak 等原子操作；交互期间加锁保持可见（`useActionBarFloatStatus` + interaction lock），避免鼠标移入工具栏时消失。
- BranchPicker：`BranchPickerPrimitive.Root` 的 `hideWhenSingleBranch`（19 行）默认 false；提供 Previous/Next/Count/Number，配合重新生成产生多分支。
- 价值：这些"小动作"是成熟感的重要来源——运行中隐藏操作条、悬浮才显示、复制成功态、单分支不显示翻页。

### 3.7 Human-in-the-loop 的三种模式

1. **表单/选择型 human tool**：`humanTool()` + 工具渲染器，用户在组件内完成后 `addResult` 回填（ContactForm / DatePicker）。
2. **审批型**：`ToolApprovalOption`（allow-once / allow-always / reject-once / reject-always，含 confirm 步骤）与 `respondToApproval`；渲染器可按 `kind` 提供默认标签。
3. **中断/恢复型**：`requires-action` 状态 reason 为 `interrupt`；`resumeToolCall` 把任意 payload 交回工具；适合"暂停等待用户补充信息"。

共同点：**HITL 不是新开一条消息，而是在原 tool-call 部件位置就地完成**；完成后结果写回同一条消息，模型自动续跑（配合 `sendAutomaticallyWhen`）。

### 3.8 Vue 支持（与演示项目直接相关）

- `packages/vue@0.0.8`：Vue 原语实现包括 `ThreadPrimitiveViewport/Messages/Suggestions/ScrollToBottom`、`MessagePrimitiveParts`、`ComposerPrimitiveInput/Send/Cancel`、`ActionBarPrimitiveCopy/Edit/Reload`、`BranchPickerPrimitive*`、`AuiIf`、`useAuiState`（`packages/vue/src/primitives/`、`src/useAuiState.ts`）。
- `examples/with-vue/src/runtime.ts:82`：`ExternalStoreAdapter` 形态——`messages / isRunning / convertMessage / setMessages / onNew / onEdit / onReload / onCancel` + `adapters.threadList`（threadId/threads/onSwitchToThread/onSwitchToNewThread）；`makeAdapter()` 每次状态变化重建并 `core.setAdapter(...)`（同文件末尾）。
- `examples/with-vue/src/App.vue`：标准组合——ThreadList 侧栏、`ThreadPrimitiveViewport`、空态建议、`ThreadPrimitiveMessages`、粘性 `ViewportFooter` + `ComposerPrimitiveInput` + 运行态切换 Send/Cancel、`ThreadPrimitiveScrollToBottom`。
- `packages/markdown/README.md`：Vue Markdown 渲染器同样支持 `text/final/components` 与流式块记忆化。
- 状态：源码研究结论；**未运行**（见 2.5）。

---

## 4. 可移植到 Vue 演示项目的设计规则（不移植 React 代码）

> 以下规则只借用协议、状态机与产品细节；实现建议均以 Vue 3 + 现有消息协议为落点。

### A. 消息模型

- **A1 部件化消息**：助手消息 = 有序部件数组（`text | reasoning | tool-call | source | image/file | data | generative-ui`），而不是一个 HTML 字符串。渲染层按 `part.type` 分派组件。依据：`types/message.ts`。
- **A2 工具调用是一等部件**：保留 `toolCallId / toolName / args / argsText / result / isError / isPreliminary / status`；流式中允许 `args` 不完整，用 `status` 区分 running/complete/requires-action。依据：`ToolCallMessagePart`（337 行起）。
- **A3 连续工具调用分组**：相邻 tool-call 合并为"n tool calls ›"一行，默认折叠，展开看细节；不要每个工具一张卡。依据：`groupMessageParts`（MessageParts.tsx:110）+ 官方截图 "2 tool calls ›"。
- **A4 部件顺序即叙事顺序**：文本—工具—组件—收尾文本共处一条消息，不拆成多条气泡。依据：官方示例截图与本地 `local-05`。

### B. 工具与上下文

- **B1 结果就地回填**：工具结果写入原 tool-call 部件；HITL 在部件位置完成，不新增聊天气泡。依据：`addResult`（contact-form-tool-ui.tsx:82）、`humanTool`（human-tool.ts:15）。
- **B2 自动续跑**：工具结果齐全后由运行时自动发起下一轮（等价 `sendAutomaticallyWhen`），用户不需要再点"继续"。依据：`gui-chat/page.tsx:44`。
- **B3 组件状态 ↔ 模型状态**：把可交互组件声明为 `{ id, description, stateSchema, initialState }`，UI 操作只改状态；模型通过生成的 update 工具改同一状态；双向同步，不产生聊天消息。依据：`examples/with-interactables/app/page.tsx:35`。
- **B4 让模型"看见"组件**（可选、需白名单）：对允许被模型操作的组件暴露结构化摘要（而非整段 HTML）+ 明确的 click/edit 动作与 settle 等待。依据：`makeAssistantVisible.tsx:39/139`。演示项目离线实现时应只暴露业务语义动作（如"切换参数 a"），不要暴露任意 DOM 操作。

### C. Generative UI

- **C1 JSON 组件树 + 白名单**：`{ component, props?, children?, key? }`；宿主注册表决定可渲染组件；未知组件默认抛错（可配 Fallback 软失败）；无 allowlist 时测试显示渲染为空并告警。依据：`GenerativeUI.tsx:101`、`packages/react/src/tests/generative-ui.primitive.test.tsx`。
- **C2 递归与体积上限**：限制深度（参考 64）、节点数、字符串长度；流式 spec 可渐进渲染，但必须容错部分 JSON。依据：`MAX_DEPTH`（58 行）+ 类型注释。
- **C3 组件选择遵循教学语义**：允许 Card/Stack/Stat/Text/Button/图表等少量基础件，禁止模型生成任意 HTML/脚本；安全边界在宿主注册表。依据：官方 `render_gui` 描述与 `defineGenerativeComponents`。
- **C4 禁止 JSON 泄漏**：提示词要求模型不要复述 spec；客户端过滤形如 spec 的 JSON 文本，避免"组件 + 一坨 JSON"双份展示。依据：`isLeakedRenderGuiText`（`lib/render-gui-tool.ts`）。

### D. 流式渲染

- **D1 文本平滑但可关闭**：逐字显示应默认开启、尊重 `prefers-reduced-motion`，并允许按消息关闭。依据：`MessagePartText.tsx:58`。
- **D2 块级记忆化**：Markdown 按块缓存，只重渲染变化块；避免整段重排造成跳动。依据：`packages/markdown/README.md:25`。
- **D3 final 标志**：流式期间对未闭合语法做临时闭合，结束后按最终语义重渲染一次。依据：同上。
- **D4 数学先行归一化**：解析前统一 `\(...\)`、`\[...\]`、`$$...$$`，并保护 `$5` 类货币；公式渲染组件应复用同一套 KaTeX 配置。依据：`preprocess.ts:6`。
- **D5 流式期间不谎报**：只有 `status=complete` 才显示"完成/已验证"；运行中显示进行态（参考 ChartToolUI 的 "Generating chart..."）。

### E. 滚动与输入

- **E1 跟随状态机**：维护 `followBottom/followPaused`；离开底部即暂停；只有新 run 开始、切换会话、点击"回到底部"才恢复。依据：`thread-viewport-auto-scroll.ts:248/328/362`。
- **E2 不打断阅读**：用户上滚、打开折叠、键盘滚动都不得被拉回；输入框高度变化不得误触发滚底（contentInset 单独计量）。依据：同文件。
- **E3 历史前插锚定**：加载更早消息时保持当前首条消息的视口偏移。依据：`messagesPrepended`（95 行）。
- **E4 明确出口**：离开底部时显示"回到底部"按钮；只有用户点击才平滑回底。依据：本地 `local-08/09` 实测。
- **E5 运行中可停止**：发送按钮切换为停止；停止后保留已生成内容与正确状态。依据：官方 Playground 截图 04 + 本地 `local-03`。

### F. 操作与细节

- **F1 操作条按需出现**：运行中隐藏；悬浮/聚焦显示；复制有成功态；重新生成产生分支并显示 BranchPicker（单分支隐藏）。依据：`ActionBarRoot.tsx:36`、`BranchPickerRoot.tsx:19`、`with-vue/src/Message.vue`。
- **F2 工具活动低干扰**：单行、小字号、可展开、带耗时；不要日志面板或大面积卡片。依据：官方 Ask AI 截图 08、Playground 截图 04。
- **F3 来源与产物分离**：来源用 chip/列表单独区（如 Ask AI 的 Sources），不混进正文段落。依据：官方截图 10。
- **F4 组件与对话分工**：展开/拖拽/切换/查看引用只改组件状态；只有自然语言请求才发消息。依据：`useInteractable` 模式 + 任务书 §10.5。

### G. Vue 落地建议（不复制 React 代码）

- **G1 适配层**：实现一个 `ExternalStoreAdapter` 风格的 Vue store（messages/isRunning/send/edit/reload/cancel + threadList），把现有离线 SSE 回放适配成"部件数组"；参考 `examples/with-vue/src/runtime.ts:82`。
- **G2 渲染层**：`MessageParts.vue` 按 `part.type` 分派；`ToolPart.vue` 按 `toolName` 查注册表；`GenerativePart.vue` 解析 spec 并查本地组件表；Markdown/公式继续用现有渲染管线。
- **G3 滚动层**：用组合式函数实现 E1–E4（scroll 监听 + ResizeObserver + 消息锚点），不要依赖 CSS `scroll-behavior` 单独完成。
- **G4 不引入 React 运行时**：`@assistant-ui/vue@0.0.8` 虽存在，但本轮**未验证**其在离线单文件构建中的体积/兼容性；建议先按协议自研，必要时再评估该包。

---

## 5. 对本项目的直接取舍

**建议吸收**
- 部件化消息模型（A1–A4）与工具结果就地回填（B1–B2）。
- 工具活动折叠为一行（A3/F2），Generative UI 白名单（C1–C3）。
- 流式块记忆化 + final + 数学分隔符归一化（D2–D4）。
- 滚动状态机 E1–E4（本轮已本地验证其必要性）。
- 操作条与分支选择细节（F1）。

**不建议照搬**
- `makeAssistantVisible` 的整段 HTML 注入：演示项目离线、安全边界不同，应只暴露业务语义动作。
- 官方 `present` 独立展示面：需要额外布局与状态，本轮演示项目优先保证对话内连续性。
- 直接引入 `@assistant-ui/vue`：未验证，且演示项目已有渲染管线；先借思想。

**风险**
- 部件协议会改动现有消息数据结构，需与离线 SSE 回放、历史恢复同步迁移。
- "工具活动一行"若缺少真实工具，会变成新的装饰；必须确保工具结果来自真实本地计算。
- 生成式组件的白名单若过窄会显得僵硬，过宽则失控；建议按教学场景定义 8–12 个基础件。

---

## 6. 证据登记表

> 逐文件登记（含每个截图/探测 JSON 的来源、类别、观察、限制）见：
> `evidence/open-source-runtime/assistant-ui/EVIDENCE-INDEX.md`。下表为汇总视图。

| 编号 | 产品/版本 | 原始来源 | 日期 | 场景 | 类别 | 观察到的设计特点 | 参考价值 | 可否复用思想 | 无法验证 |
|---|---|---|---|---|---|---|---|---|---|
| O1 | assistant-ui docs | https://www.assistant-ui.com/examples/generative-ui | 2026-11-25 | 官方示例说明页 | 官方在线页面（非 live） | 文档页 + 内嵌官方截图；无输入框 | 说明官方示例路由与能力 | 是（信息） | 页面非交互 |
| O2 | assistant-ui generative-ui | 同上，内嵌图 | 2026-11-25 | 示例产品截图 | 官方素材（非本项目运行） | 工具折叠行、统计行、地图、会话栏 | 富内容与工具并置的视觉基准 | 是（形态） | 无法操作验证 |
| O3 | assistant-ui Playground | https://www.assistant-ui.com/playground | 2026-11-25 | AI Builder 对话 | 官方在线实机操作 | 单行工具活动 `getTemplateList 11 templates ›`；运行中停止键 | 工具活动低干扰表达 | 是 | 后端模型不可见 |
| O4 | assistant-ui Ask AI | https://www.assistant-ui.com/（Ask AI） | 2026-11-25 | 文档问答 | 官方在线实机操作 | thinking → 工具时间线（1.1s/运行中）→ 表格正文 → Sources → 操作条 | 完整消息生命周期 | 是 | 内部实现不可见 |
| O5 | 本地最小应用 | http://localhost:18300（自建） | 2026-11-25 | 工具卡 + Generative UI + 流式 + 滚动 | 本地开源运行 | 工具卡、组件树、第二张图表、上滚不被拉回 | 验证协议可落地 Vue 类比 | 是 | 无真实模型；无附件 |
| O6 | 源码 | `repos/assistant-ui` commit 4797ce5 | 2026-11-25 | 消息部件/工具/GenUI/滚动/Markdown | 源码研究结论 | 见第 3 节 | 工程规则来源 | 是 | 未运行 Vue 示例 |

### 6.1 截图清单（均已用 Read 亲自查看）

官方：
- `official-web/01-generative-ui-initial-1440x900.png`（文档页）
- `official-web/official-generative-ui-screenshot.png`（官方素材原图）
- `official-web/04-playground-after-input-1440x900.png`（Playground 实机）
- `official-web/07-askai-streaming-1440x900.png`（Ask AI 等待/thinking）
- `official-web/08-askai-final-1440x900.png`（Ask AI 工具时间线）
- `official-web/10-askai-answer-18s-1440x900.png`（Ask AI 表格/来源/操作条）
- 未用于结论：`02-examples-index`、`03-playground-initial`、`05-home-initial`、`06-askai-opened`、`09-askai-answer-30s`（失败尝试）

本地：
- `local-run/local-01-initial-1440x900.png`、`local-02-assistant-detail.png`
- `local-run/local-03-streaming-700ms.png`、`local-04-after-followup-1440x900.png`
- `local-run/local-05-top-of-thread-1440x900.png`
- `local-run/local-06-tool-card-detail.png`、`local-07-genui-card-detail.png`
- `local-run/local-08-user-scrolled-up-during-stream.png`、`local-09-after-scroll-bottom-click.png`
- 数据：`local-run/local-probe.json`、`local-run/local-probe2.json`

---

## 7. 未验证与后续建议

1. **真实模型下的部件流**：本轮脚本模拟；建议 W1 其余代理若启动 llama-server（11535），补一次真实 SSE → tool-call → 文本的部件流验证。
2. **Vue 原语实机**：`@assistant-ui/vue@0.0.8` 与 `examples/with-vue` 未运行；建议在独立研究目录做一次 Vue 最小应用（非演示项目）验证其离线可行性。
3. **附件与多模态**：Composer AddAttachment/Attachments 仅源码阅读；未验证拖拽、粘贴、图片预览。
4. **工具审批 UI**：`ToolApprovalOption` 仅源码阅读；未构造审批交互截图。
5. **官方示例的 `present`/`tool-ui` 路由**：文档页未提供 live，无法实机；只据源码与官方截图描述。
6. **滚动在移动端/触摸下的行为**：源码有 touch 处理，本轮未做触摸实测。
