# assistant-ui 证据登记索引（R4）

- 研究编号：R4
- 采集日期：2026-11-25
- 视口：1440×900，deviceScaleFactor=1（Playwright chrome channel，headless）
- 分类约定：
  - **官方素材**：官方页面内嵌的产品截图，不是本项目运行
  - **官方在线实机**：在 assistant-ui 官方站点上真实操作的产品（Playground / Ask AI）
  - **本地开源运行**：研究目录内自建 Vite+React 应用（localhost:18300）
  - **源码研究**：仅阅读仓库代码，无运行画面
- 结论只使用已用 Read 亲自查看过的图片；未查看的图片明确标注"未用于视觉结论"。

## official-web/

| 文件 | 编号 | 产品/版本 | 原始来源 | 场景 | 类别 | 观察到的要点 | 参考价值 | 可复用思想 | 无法验证 |
|---|---|---|---|---|---|---|---|---|---|
| `01-generative-ui-initial-1440x900.png` | O1 | assistant-ui 官网（2026-11-25） | https://www.assistant-ui.com/examples/generative-ui | 示例说明页 | 官方在线页面（非 live） | 文档页：标题/概述/Patterns/Key Concepts/Source；内嵌一张产品截图；无输入框 | 证明该页不是可交互 demo | 信息参考 | 页面内无法操作 |
| `official-generative-ui-screenshot.png` | O2 | with-generative-ui 示例（官方截图） | 同上页面内嵌图（`/_next/image?url=%2Fscreenshot%2Fexamples%2Fgenerative-ui.png`） | 示例产品界面 | 官方素材 | 会话栏；示例内导航；模型选择；`2 tool calls ›` 折叠；标题/正文/图片带/统计行/交互地图连续；"+"附件 + 圆形发送 | 富内容与工具并置的视觉基准 | 形态可借鉴 | 无法交互验证；不能称本项目运行 |
| `02-examples-index-1440x900.png` | O3 | assistant-ui 官网 | https://www.assistant-ui.com/examples | 示例列表 | 官方在线页面 | 列表含 15 个示例入口；Generative UI 指向文档页 | 了解示例范围 | 信息参考 | 未做视觉结论（未查看） |
| `03-playground-initial-1440x900.png` | O4 | assistant-ui Playground | https://www.assistant-ui.com/playground | 初始界面 | 官方在线实机 | 初始页（probe-02.json 记录 textarea 占位 "Describe what you want to build with assistant-ui..."） | 入口确认 | — | 未做视觉结论（未查看） |
| `04-playground-after-input-1440x900.png` | O5 | assistant-ui Playground（AI Builder） | 同上 | 输入并发送后 | 官方在线实机 | 用户浅灰胶囊；助手一句话 + 单行 `getTemplateList  11 templates ›`（图标/工具名/结果摘要/展开）；运行中黑色方块停止键 | 工具活动压缩为一行 | 是 | 后端模型与工具实现不可见 |
| `05-home-initial-1440x900.png` | O6 | assistant-ui 首页 | https://www.assistant-ui.com/ | 首页 | 官方在线页面 | 首页布局（probe 未记录细节） | 入口确认 | — | 未做视觉结论（未查看） |
| `06-askai-opened-1440x900.png` | O7 | assistant-ui Ask AI | 首页右上 Ask AI | 面板打开 | 官方在线实机 | 面板打开（未查看该图） | — | — | 未做视觉结论（未查看） |
| `07-askai-streaming-1440x900.png` | O8 | assistant-ui Ask AI | 同上 | 提问后 1.5s | 官方在线实机 | 用户气泡；蓝色 `> thinking` 动画；输入 "Ask a question..."；New/× | 等待态先思考、不提前吐正文 | 是 | 内部推理内容不可见 |
| `08-askai-final-1440x900.png` | O9 | assistant-ui Ask AI | 同上 | 提问后 7s | 官方在线实机 | 助手一句 + `listed the docs tree`（完成，1.1s）+ `running grep -ril "generative" ...`（运行中，蓝色箭头，等宽单行截断）；工具行小字低对比 | 工具时间线低干扰表达 | 是 | 最终答案尚未出现 |
| `09-askai-answer-30s-1440x900.png` | O10 | assistant-ui Ask AI | 同上 | 一次未成功发送 | 失败留档 | 面板回到欢迎建议（未发送） | 不作设计结论 | — | 不用于任何结论 |
| `10-askai-answer-18s-1440x900.png` | O11 | assistant-ui Ask AI | 同上 | 提问后 18s | 官方在线实机 | Markdown 表格（present tool / Tool UI / MessagePrimitive.GenerativeUI）；正文段落；Sources chip `Generative UI`；复制/赞/踩；token 计数 20.6k/1M | 完整回答生命周期与来源呈现 | 是 | 引用文档内部实现不可见 |
| `probe-01.json` | — | 官网探测 | Playwright | 页面结构 | 数据 | textarea=0；img 1440×1098；页面正文 | 证明非 live | — | — |
| `probe-02.json` | — | 官网探测 | Playwright | examples/playground | 数据 | 15 个示例链接；playground 占位符；内嵌图 URL | 入口与素材来源 | — | — |
| `probe-03.json` | — | Playground | Playwright | 操作后正文 | 数据 | "I'll find the right starter..." + getTemplateList + 11 templates | 工具活动文本 | — | — |
| `probe-04.json` | — | Ask AI | Playwright | 第一轮工具活动 | 数据 | thinking → listed the docs tree 1.1s → running grep | 生命周期文本 | — | — |
| `probe-05.json` | — | Ask AI | Playwright | 失败发送 | 数据 | 欢迎建议文本 | 失败留档 | — | — |
| `probe-06.json` | — | Ask AI | Playwright | 完成态 | 数据 | 面板 token 计数 | 辅助 | — | — |

## local-run/

| 文件 | 编号 | 产品/版本 | 原始来源 | 场景 | 类别 | 观察到的要点 | 参考价值 | 可复用思想 | 无法验证 |
|---|---|---|---|---|---|---|---|---|---|
| `local-01-initial-1440x900.png` | L1 | 本地 app（@assistant-ui/react 0.15.38） | http://localhost:18300 | 初始加载 | 本地开源运行 | 自动滚到底部；可见 Generative UI 卡与收尾文本；输入框固定底部 | 自动初始化滚底 | 是 | 数据为脚本模拟 |
| `local-02-assistant-detail.png` | L2 | 同上 | 同上 | 助手消息元素截图 | 本地开源运行 | 工具卡尾部 + GenUI 卡 + 收尾文本；元素截图受粘性栏遮挡 | 局部细节 | 有限 | 不代表完整卡片 |
| `local-03-streaming-700ms.png` | L3 | 同上 | 同上 | 追问后 700ms | 本地开源运行 | 助手仅第一段文本；输入区红色"停止"；自动跟随到底 | 流式部分内容先出现 | 是 | 无真实模型 |
| `local-04-after-followup-1440x900.png` | L4 | 同上 | 同上 | 追问完成 | 本地开源运行 | 第二条回复含第二套 GenUI 卡与收尾文本；自动跟随到底 | 多轮连续 | 是 | 无真实模型 |
| `local-05-top-of-thread-1440x900.png` | L5 | 同上 | 同上 | 滚动到顶部 | 本地开源运行 | 用户气泡 → 两段文本 → 工具卡（`plot_function` + 完成徽标 + 真实函数图 + 结果 chips）→ GenUI 卡；"回到底部"按钮出现 | 完整消息形态 | 是 | 数据为脚本模拟 |
| `local-06-tool-card-detail.png` | L6 | 同上 | 同上 | 工具卡细节 | 本地开源运行 | 函数图曲线、极值点标签、结果 chips | 工具 UI 细节 | 是 | 数据为脚本模拟 |
| `local-07-genui-card-detail.png` | L7 | 同上 | 同上 | GenUI 卡细节 | 本地开源运行 | 统计行 + 函数图（受粘性栏遮挡） | 组件树渲染 | 有限 | 遮挡；以 L5 为准 |
| `local-08-user-scrolled-up-during-stream.png` | L8 | 同上 | 同上 | 流式中上滚 | 本地开源运行 | 画面停在首条消息与工具卡；内容继续增长未被拉回；"回到底部"出现 | 滚动暂停跟随 | 是 | 程序化 scrollTop，非真实手势 |
| `local-09-after-scroll-bottom-click.png` | L9 | 同上 | 同上 | 点击回到底部 | 本地开源运行 | 跳到最新回复底部 | 显式恢复跟随 | 是 | — |
| `local-probe.json` | — | 同上 | Playwright | 结构与状态 | 数据 | 初始 svgs=2/toolCards=1/gCards=1；追问后 msgs=4/toolCards=2/gCards=2；仅 favicon 404 | 机制验证 | — | — |
| `local-probe2.json` | — | 同上 | Playwright | 滚动实验 | 数据 | 上滚后 top=0、atBottom=false（高度 1550→2725）；点击后 top=1873、atBottom=true | 滚动状态机实证 | — | 程序化滚动 |

## 源码研究（无截图）

| 主题 | 路径 | 结论摘要 |
|---|---|---|
| 消息部件类型 | `repos/assistant-ui/packages/core/src/types/message.ts` | text/reasoning/tool-call/source/file/image/data/generative-ui；tool-call 含 args/argsText/result/isError/isPreliminary/status |
| 默认部件与分组 | `.../core/src/react/primitives/message/MessageParts.tsx` | 默认映射 388 行；`groupMessageParts` 110 行，连续 tool-call 必分组 |
| Generative UI 渲染器 | `.../core/src/react/primitives/generativeUI/GenerativeUI.tsx` | 白名单 101 行抛错；MAX_DEPTH=64（58 行）；支持 Fallback |
| 工具/HITL | `.../core/src/react/model-context/human-tool.ts`；`examples/with-generative-ui/components/contact-form-tool-ui.tsx` | humanTool 构建期剥离；`addResult` 回填结果 |
| 组件可见性 | `.../react/src/model-context/makeAssistantVisible.tsx` | 组件 HTML 注入 system + click/edit 工具；settle 2s |
| 互操作状态 | `examples/with-interactables/app/page.tsx` | `unstable_useInteractable` 状态 schema ↔ 模型工具 |
| 流式 Markdown | `packages/markdown/README.md`；`packages/react-markdown/src/preprocess.ts` | 块级记忆化、final 标志、数学分隔符归一化、smooth 可关 |
| 自动滚动 | `packages/react/src/primitives/thread/useThreadViewportAutoScroll.ts`；`packages/store/src/utils/thread-viewport-auto-scroll.ts` | followBottom/followPaused/intent；上滚与展开暂停；前插锚定 |
| 操作条/分支 | `packages/react/src/primitives/actionBar/ActionBarRoot.tsx`；`branchPicker/BranchPickerRoot.tsx` | autohide/hideWhenRunning；hideWhenSingleBranch |
| Vue | `packages/vue`；`examples/with-vue/src/runtime.ts`、`App.vue`、`Message.vue` | ExternalStoreAdapter + Vue 原语 + Vue Markdown；未运行 |

## 复用限制

- 所有官方截图（O2）为官方文档内嵌素材，不是本项目实机；引用时必须注明"官方素材"。
- 所有本地截图（L1–L9）来自自建研究应用，数据为脚本模拟；不得描述为智学数研演示项目实机或真实模型输出。
- O3–O7、O10 未用于视觉结论（未亲自查看或为失败留档）。
