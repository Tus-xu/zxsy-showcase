# 03a · 开源实机：Open WebUI 0.13.5 + 本地 Qwen3-4B（llama.cpp CPU）

采集日期：2026-11-25
证据类别：**开源运行 · 实机操作**（全部截图来自本机真实运行，非官方素材、非概念稿）
视口：1440 × 900，deviceScaleFactor = 1，Chrome（Playwright `chromium.launch({ channel: 'chrome' })`）
研究根：`D:\zxsy-agent-visual-research`（隔离目录；未使用 Docker，未接触原真实项目）

---

## 1. 结论摘要

- 在无 Docker、无 NVIDIA GPU 的 Windows 机器上，**真实跑通**了完整智能体平台 Open WebUI 0.13.5 + 本地 4B 模型（llama.cpp CPU 推理），并完成了统一测试任务 T01–T09 的实机操作与截图采集。
- Open WebUI 的强项是「**平台壳**」：会话/知识库/工作空间/模型连接/停止与重试/历史恢复都在一个成熟产品框架里；弱项是「**教学级消息体验**」仍以通用聊天为中心——引用角标不明显、附件预览有缺陷、富内容是否渲染完全取决于模型是否输出裸 Markdown。
- 本地 Qwen3-4B-Instruct-2507 Q4_K_M 在 16 线程 CPU 上约 **8.5–18.6 token/s**（短上下文 14.8–18.6，长上下文约 8.5），首 token 延迟 3–4.1 秒；足以做体验研究，不适合高节奏课堂演示。
- 对演示项目最有价值的是它的**消息生命周期细节**：悬停操作栏、停止后“继续回答”、重新生成的分支菜单、追问建议、知识库 chip、mermaid/表格/公式的渲染分工。

---

## 2. 环境、版本与许可证

| 项 | 值 | 依据 |
|---|---|---|
| OS / CPU / RAM | Windows 11 Home China 10.0.26200 / 20 逻辑核 / 16GB / Intel Iris Xe（无 CUDA） | 运行环境 |
| Open WebUI | **0.13.5**（PyPI wheel，uv 安装） | `logs/openwebui-out.log`；`/api/config` 返回 `"version":"0.13.5"` |
| Python | 3.11.18（uv 管理，venv `venvs/openwebui`） | `logs/openwebui-out.log` |
| llama.cpp | **b12722**，`llama-server --version` → 1.0.0-dev (build 12722, commit e6443bd7e)，Windows CPU x64 | `logs/llama-server-err.log` |
| 模型 | `Qwen3-4B-Instruct-2507-Q4_K_M.gguf`，2,497,281,120 B；n_params 4,022,468,096；n_ctx 8192；Q4_K_M | `/v1/models` 响应；`measurements/` |
| 模型校验 | SHA256 `3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597`，与 HuggingFace LFS 值一致 | 2026-11-25 实测 Get-FileHash |
| 端口 | llama-server `127.0.0.1:11535`；Open WebUI `127.0.0.1:18080` | `logs/*.pid` |

### 许可证结论（必读）

- 仓库 `repos/open-webui` HEAD `926f826e`（2026-11-25）的 LICENSE 为 **Open WebUI License**（BSD-3-Clause 式条款 + 第 4 条品牌保留条款）。
- `LICENSE_NOTICE`：commit `a76068d6` 之前为 MIT，`a76068d6`→`60d84a3a` 为 BSD-3-Clause，之后为 Open WebUI License。
- PyPI 0.13.5 的 `info.license` 同为 Open WebUI License。
- 本研究为**单机、单用户、<50 人**的本地研究部署，属于许可证允许的品牌保留场景；**未去除/替换任何 Open WebUI 品牌**，**未再分发**，仅作研究参考，不把其代码/品牌/素材复制进演示项目。
- 依赖审查：`pyproject.toml` 为纯 Python 服务栈（FastAPI/uvicorn/SQLAlchemy/sqlite/chromadb/transformers 等），无 Docker 硬依赖；`requires-python = ">= 3.11, < 3.13.0a1"`。

---

## 3. 部署过程与兼容性处理（含失败点）

1. **llama.cpp**：GitHub `releases/latest` 为 v1.0.0，但该 release 只有 `nightly-tag.txt`，没有 Windows 资产；改用滚动构建 **b12722** 的 `llama-b12722-bin-win-cpu-x64.zip`（25,224,705 B），解压到 `tools/llama.cpp`。
2. **模型下载**：HuggingFace 直连多次中断（44MB、1.19GB、1.26GB 处，curl exit 56/255，约 0.6–1.0 MB/s）；改用 **ModelScope 镜像**续传（同一仓库同一文件，size 完全一致），实测 3.1–5.0 MB/s，最终 SHA256 与 HF LFS 一致。这是本次最耗时的步骤（约 40 分钟）。
3. **Open WebUI 安装**：`uv pip install open-webui` 成功，拉取约 1.5GB+ wheel（chromadb、transformers、sentence-transformers、onnxruntime、faster-whisper 等）。
4. **Windows 兼容补丁（已记录）**：`open_webui/utils/machines/managed.py:48` 硬编码 `tempfile.mkdtemp(..., dir='/tmp')`，Windows 无 `/tmp` 导致启动 `FileNotFoundError: '/tmp\open-webui-...'`。将该处改为 `dir=tempfile.gettempdir()`（原文件备份 `logs/managed.py.orig`），并把 `TMP/TEMP` 指向研究目录 `tmp`。仅影响 SSH 机器隧道的临时目录，不影响聊天 UI 与推理。
5. **启动命令**：
   - `llama-server.exe --host 127.0.0.1 --port 11535 -m <gguf> -c 8192 -np 1 --jinja --alias qwen3-4b-local -t 16 --no-webui`
   - `open-webui.exe serve --host 127.0.0.1 --port 18080`
   - 环境：`DATA_DIR`、`HF_HOME`、`TMP/TEMP` 均指向研究目录；`OPENAI_API_BASE_URL=http://127.0.0.1:11535/v1`、`OPENAI_API_KEY=dummy`、`WEBUI_AUTH=False`（单用户免登录）、`ENABLE_OLLAMA_API=False`、`ANONYMIZED_TELEMETRY=False`、`SCARF_NO_ANALYTICS=True`。
6. **首次启动**：迁移 SQLite，并加载 embedding 模型 `sentence-transformers/all-MiniLM-L6-v2`（用于知识库 RAG），日志见 `logs/openwebui-err.log`。
7. **进程**：llama-server PID 49944；Open WebUI PID 48160（`logs/*.pid`）。

> 失败点与替代：HuggingFace 断连（改用 ModelScope，已校验）；Windows `/tmp`（补丁，已记录）；`/api/models` 直接 curl 返回 401（单用户 token 在浏览器 localStorage 中，浏览器内正常）。

---

## 4. 统一测试任务 T01–T09 结果

| 编号 | 任务 | 结果 | 关键证据 |
|---|---|---|---|
| T01 | 简单问答：导数=0 为什么不一定有极值 | ✅ 完成 | `screenshots/t01-01-final.png`；连续帧 `frames/t01/`；`measurements/t01.json` |
| T02 | 复杂解析：三次函数单调区间与极值 | ✅ 完成 | `screenshots/t02-01-final.png`；`frames/t02/`；`measurements/t02.json` |
| T03 | 图片题目理解 | ⚠️ 附件 UI 可用，但文本模型不支持视觉 | `screenshots/t03-01-attached.png`、`t03-03-final.png`；`measurements/t03.json` |
| T04 | 多轮追问 | ✅ 完成 | `screenshots/t04-01-turn1.png`、`t04-03-turn2-final.png`；`measurements/t04.json` |
| T05 | 用户错误作答 | ✅ 完成 | `screenshots/t05-02-final.png`；`measurements/t05.json` |
| T06 | 图形/富内容 | ✅ 完成（含一次真实失败） | `screenshots/t06-01-final.png`（整体被代码围栏包裹）、`t06b-02-final.png`、`t06b-03-top.png`；`frames/t06/`；`measurements/t06.json`、`t06b.json` |
| T07 | 知识引用/工具 | ✅ 知识库引用生效；⚠️ 无可见引用角标；未测工具调用 | `screenshots/t07-08-question-ready.png`、`t07-10-final.png`、`t07-06-uploaded.png`；`measurements/t07.json` |
| T08 | 长短回答交替 | ✅ 完成 | `screenshots/t08-01-long-history.png`、`t08-03-short-final.png`；`measurements/t08.json` |
| T09 | 会话操作 | ✅ 大部分完成（滚动一项中等强度） | `screenshots/t09-03-after-stop.png`、`t09-18-regen-menu.png`、`t09-14-edit-open.png`、`t09-26-copy-t01.png`、`t09-16-switched.png`、`t09-17-after-reload.png`；`measurements/t09*.json`、`scrolltest.json` |

### 4.1 T01 简单问答（`t01.json`）

- 首 token 延迟：约 **3.0 s**（帧 0–4 长度 0，帧 4 开始出现“导数等于”）。
- 回答 624 字，包含行内 KaTeX（如 `f(x)=x^3`）、绿色 ✅ / 红色 ❌ 列表、加粗总结；**无表格**。
- 消息操作栏在回答下方常驻（时间戳右侧），输入框右侧出现“追问”建议，并把第一条建议作为 **输入框 placeholder**。
- 视觉观察：回答区最大宽度约 58rem，正文左对齐；模型名与头像行在内容上方；用户消息为右对齐浅灰气泡。

### 4.2 T02 复杂解析（`t02.json`）

- 首 token 约 **4.1 s**；最终 1105 字。
- DOM 统计：**41 个 KaTeX**、1 个 Markdown 表格、7 个标题、15 个列表项。
- 表格带 **复制/下载** 两个图标按钮（右上角）；公式为行内/独立混排；结论用 ✅ 标记。
- 自动滚动：生成中内容增长时视图跟随底部；最终截图停在底部并显示“追问”区。

### 4.3 T03 图片上传（`t03.json`，未验证视觉理解）

- 附件 UI 可用：文件输入接收 PNG 后，输入框顶部出现缩略图；发送后图片显示在用户消息上方。
- **真实缺陷**：刚附加时缩略图与输入框 placeholder 文字重叠（`t03-01-attached.png`），视觉上像半透明小图压在“有什么我能帮您的吗?”上。
- 发送后，llama-server 返回错误并在聊天中显示为灰色提示气泡：
  `image input is not supported - hint: if this is unexpected, you may need to provide the mmproj`（`t03-03-final.png`）。
- 结论：**附件/图片消息链路已验证；视觉理解未验证**，因为所选模型为纯文本 GGUF，未加载 mmproj。

### 4.4 T04 多轮追问（`t04.json`）

- 第 1 轮 491 字，给出 `x=±1` 的单调区间；第 2 轮 800 字，只解释“为什么 f'(x)>0 推出递增”，并用**中值定理**给出严格推导。
- 第二轮回答包含灰色左边框引用块 + 独立公式，视觉上把“引用/推导”与正文分层。
- 上下文继承正确：没有重复第一轮的计算。

### 4.5 T05 用户错误作答（`t05.json`）

- 回答 1028 字，开头直接指出“你的思路有一个关键错误”，随后用 **✅ 正确 / ❌ 错误** 对照块和“你的思路部分正确（导数为零求驻点），但结论错误”收束。
- 这是“承接错误”而非“重新讲全部内容”的正面样例；但仍附带了完整背景解释，篇幅偏长。

### 4.6 T06 富内容（`t06.json` / `t06b.json`）

**第一次（失败样例）**：模型把整段回答包在 ` ```markdown ... ``` ` 中，Open WebUI 将其渲染为**代码块**（行号、折叠/保存/复制工具栏），LaTeX、表格、mermaid 全部没有渲染（`t06-01-final.png`）。这是真实世界中很常见的“模型格式选择导致富内容失效”。

**第二次（成功样例，明确要求不要整体加围栏）**：DOM 统计 KaTeX 2 个（含 1 个 display）、表格 1 个、mermaid 渲染为 SVG（`flowchart-v2`，节点元素 22 个），另有 6 个 SVG 图标。
- mermaid 图带**下载 / 刷新 / 复制**按钮，源码块可展开（`t06b-03-top.png` 可见源码与展开箭头）。
- **用户消息**本身也渲染 Markdown：行内/独立公式、编号列表均生效；但用户输入的 ```mermaid 围栏不会被渲染成图（按字面显示）。
- 结论：Open WebUI 的渲染能力足够，但**对模型输出格式非常敏感**；演示项目应自己做“内容富化/重排”而不是把渲染责任全部交给模型。

### 4.7 T07 知识引用与工具（`t07.json`）

- 在“工作空间 → 知识库”通过 UI 创建知识库《导数与极值教研资料》，并上传本地 `derivative-extremum.md`（1.2 KB），列表显示成功（`t07-06-uploaded.png`）。
- 聊天输入框键入 `#` 选择知识库后，composer 顶部出现 chip：**“导数与极值教研资料 / 知识库”**；该 chip 也固定显示在用户消息上方（`t07-08-question-ready.png`、`t07-10-final.png`）。
- 回答明确写“根据您提供的资料《导数与极值教研资料》”，给出第一充分条件与 f''(x0)=0 的处理，并**主动声明“资料中未明确说明……”**，属于较好的 grounded 行为。
- **未观察到**编号引用角标、来源卡片或可点击引用（DOM 中 citation/source 元素为 0）。Open WebUI 的引用 UI 需要模型输出特定引用标记或使用其原生 RAG 引用机制，本次未触发。
- **工具调用未测试**：本地 llama.cpp 未配置 tools/MCP，T07 只验证了 RAG 知识引用，不等同于工具活动。

### 4.8 T08 长短回答交替（`t08.json`）

- 在 T02 的 1105 字长回答后追问“用一句话总结上面的结论”，得到 **87 字**的单句总结（含区间与极值）。
- `t08-03-short-final.png` 同屏可见上方长表格/结论与下方短回答，节奏对比明显；短回答同样有操作栏与追问区。

### 4.9 T09 会话操作（`t09*.json`）

| 操作 | 观察 | 证据 |
|---|---|---|
| 停止生成 | 点击“停止”后，已生成的部分保留（293 字，末句停在未闭合公式 `若 $ f'(`）；操作栏出现 **“继续回答”** | `t09-03-after-stop.png` |
| 重新生成 | 点击“重新生成”不是立即重跑，而是打开菜单：**提出修改建议 / 重试 / 添加详情 / 精炼表达**；点“重试”后确认重新开始生成 | `t09-18-regen-menu.png`；`t09c.json` `retryClicked=true, started=true` |
| 复制 | 复制得到的是 **Markdown 源码**（如 `**极值点**` 带星号），不是渲染后的纯文本；这有利于把回答贴进笔记/文档 | `t09-26-copy-t01.png`；`copy4.json` |
| 编辑用户消息 | 进入编辑态：气泡内可改文字，底部有 **保存 / 取消 / 另存为分支**；Esc 可取消 | `t09-14-edit-open.png`；`t09b.json` |
| 切换会话 | 侧栏点击历史会话，URL 变为 `/c/<id>` 并加载对应消息 | `t09-16-switched.png`；`t09b.json` |
| 向上滚动是否被拉回 | 长回答生成中把 `#messages-container` 滚到 0 后，连续 8 次采样 scrollTop 均为 0，未被拉回底部；但该次未逐帧记录 generating 标志，**证据强度中等** | `t09-15-scrolled-up.png`；`t09b.json` `scrollWhileGenerating` |
| 历史恢复 | 刷新页面后消息仍在（1 条 assistant，末尾文本完整） | `t09-17-after-reload.png`；`t09b.json` |

补充观察：
- 生成可能非常长（服务器日志出现单次 **n_gen=4596 tokens**），`-np 1` 时后续请求排队；需要 UI 的停止按钮作为“刹车”。
- 侧栏按“今天/更早”分组，显示相对时间和自动生成的会话标题；**中文提问常被自动标题成英文**（如“Function Monotonicity”“Critical Points”“Math Problem Solution”），这是模型自动命名带来的双刃剑。
- 输入区“+”菜单包含：**上传文件 / 截图 / Attachments / 代码解释器**；模型选择器、语音输入、语音模式在同一行。
- 首次进入有更新日志弹窗（`00-initial.png`），关闭后进入空态“User，今天过得怎么样？”和 4 组建议。

---

## 5. 流式输出与连续帧分析

连续帧均为 400ms 间隔、1440×900，路径见第 7 节。

### T01（`frames/t01/frame-00..11.png`，`t01.json`）

- t≈0.9–2.5s：assistant 气泡已出现（头像+模型名），内容为空，底部有光标；无骨架屏。
- t≈3.0s：首字出现“导数等于”；之后每 400ms 增加约 6–8 字。
- 前 3 秒无任何“加载中”文案，只有光标闪烁——**等待感靠光标而非进度提示**。
- 公式在流式过程中逐步由 Markdown 转为 KaTeX；未见明显横向跳动（截图对比未见布局宽度变化），但未做像素级 diff。

### T02（`frames/t02/frame-00..11.png`）

- t≈0.95–3.6s：内容为空；t≈4.1s 首字出现（6 字），随后 13/19/28/35/43 字递增。
- 首 token 延迟与 prompt 长度正相关（T02 4.1s vs T01 3.0s）。
- 生成中视图保持底部；标题栏的会话名在生成后变为自动标题。

### T06（`frames/t06/frame-00..09.png`）

- 模型整体输出 ` ```markdown ` 围栏时，代码块从第一帧起就以等宽字体出现，LaTeX 完全没有渲染；说明**渲染路径在流式开始前就已决定**（按代码块处理），不是“先渲染后回退”。

> 说明：未采集 60fps 录屏，不能对“是否像素级跳动”下强结论；以上仅为 400ms 截图的可见状态。

---

## 6. 可移植到 Vue 演示项目的设计思想清单

> 只提炼设计思想，不复制 Open WebUI 代码/品牌/素材。

### 6.1 消息部件

1. **消息壳分层**：头像/模型名 → 正文 → 操作栏 → 时间戳；操作栏悬停显示、时间戳常驻，减少常驻图标噪音。
2. **操作栏语义完整**：编辑、复制、朗读、信息、赞/踩、重新生成；停止时把“重新生成”替换为“继续回答”，符合“部分结果也是结果”的心智。
3. **复制保留 Markdown 源**：学生把解答贴进笔记时保留公式/加粗，比复制纯文本更实用。
4. **错误也是消息**：后端错误以灰色圆角气泡 + 感叹号图标呈现，仍带操作栏，不弹出阻断式对话框。

### 6.2 工具活动与知识

5. **知识 chip 双位置**：输入区顶部（发送前确认“我带了这个资料”）+ 用户消息上方（回看时知道“这轮基于什么”）。
6. **grounded 声明**：回答中明确写出资料名，并对资料未覆盖的内容说“资料中未明确说明”，这比伪造引用更可信。
7. **引用角标不是必需，但要有来源感**：本次没有角标；演示项目若做引用，应在消息内给出可点击的来源条目，而不是只靠 prompt。

### 6.3 富内容

8. **渲染责任分层**：模型只负责产出结构化 Markdown；前端负责 KaTeX、表格、mermaid、代码块的渲染与失败降级。
9. **表格工具条**：表格右上角提供复制/下载，适合学情表格与解题步骤表。
10. **mermaid 双态**：图 + 可展开源码 + 下载/刷新/复制，兼顾“看”和“改”。
11. **整体围栏防御**：检测到整段回答被单一代码围栏包裹时，演示项目可自动“解围栏”再渲染，避免 T06 的失败样例。

### 6.4 自动滚动与流式

12. **跟随底部但尊重用户**：用户向上滚动后停止自动跟随；内容在下方增长不应把用户拽回（Open WebUI 源码中的 `autoScroll` 判定即此思想）。
13. **用光标而不是 spinner**：assistant 气泡先出现、光标闪烁，首 token 到达后逐字淡入（`fade-in-token`），等待感更自然。
14. **首 token 延迟要可感知**：3–4 秒的空白仅靠光标偏弱，演示项目可加“正在分析题目…”的轻量状态，但不伪造推理步骤。

### 6.5 会话与输入

15. **停止 → 继续回答**：把“中断”设计成可恢复状态，而不是丢弃。
16. **重新生成菜单化**：重试 / 添加详情 / 精炼表达，把“换一个答案”升级为“按意图重写”。
17. **编辑用户消息 + 另存为分支**：改错题条件时不破坏原对话，符合教学“试错”场景。
18. **追问建议 + 输入框 placeholder**：把下一步可问的问题显性化，降低学生不知道问什么的门槛；但要注意自动生成追问会额外消耗模型时间。
19. **输入区能力聚合**：“+”菜单（上传文件/截图/代码解释器）、模型选择、语音、发送/停止同区，减少页面跳转。
20. **会话自动标题**：降低命名负担，但中文场景应约束标题语言（本次中文提问被命名成英文标题）。

### 6.6 不应照搬的部分

- 附件缩略图与 placeholder 重叠的缺陷（T03）。
- 首 token 前 3–4 秒只有光标的空窗。
- 自动标题语言不一致。
- 知识库引用只有“文中提到资料名”而没有可点击来源。
- 生成可能失控地长（4596 tokens），需要前端提供更明显的长度/停止控制。

---

## 7. 证据索引

根目录：`docs/final-agent-experience-review/evidence/open-source-runtime/openwebui/`

### 7.1 截图（均为 2026-11-25 本机实机操作，1440×900）

| 文件 | 内容 | 类别 |
|---|---|---|
| `screenshots/00-initial.png` | 首次进入：更新日志弹窗、单用户已登录、空态 | 实机操作 |
| `screenshots/03-model-selected.png` | 模型选择器选中 `qwen3-4b-local`，侧栏展开 | 实机操作 |
| `screenshots/04-smoke-answer.png` | 冒烟问答“连接成功”，消息操作栏/追问区 | 实机操作 |
| `screenshots/t01-01-final.png` | T01 最终回答（KaTeX、✅/❌、追问） | 实机操作 |
| `frames/t01/frame-00..11.png` | T01 流式连续帧（400ms） | 实机操作 |
| `screenshots/t02-01-final.png` | T02 复杂解析（表格、公式、结论） | 实机操作 |
| `frames/t02/frame-00..11.png` | T02 流式连续帧 | 实机操作 |
| `screenshots/t03-01-attached.png` | 图片已附加，缩略图与 placeholder 重叠 | 实机操作（缺陷） |
| `screenshots/t03-03-final.png` | 图片消息 + 文本模型错误提示 | 实机操作 |
| `screenshots/t04-01-turn1.png` / `t04-03-turn2-final.png` | 多轮追问第二轮（中值定理、引用块） | 实机操作 |
| `screenshots/t05-02-final.png` | 错误作答纠正（✅/❌ 对照） | 实机操作 |
| `screenshots/t06-01-final.png` | 整体被 ```markdown 包裹 → 代码块（失败样例） | 实机操作 |
| `screenshots/t06b-02-final.png` / `t06b-03-top.png` | mermaid SVG、表格、行内/独立公式 | 实机操作 |
| `frames/t06/frame-00..09.png` | T06 流式连续帧 | 实机操作 |
| `screenshots/t07-06-uploaded.png` | 知识库详情：`derivative-extremum.md` 1.2KB | 实机操作 |
| `screenshots/t07-08-question-ready.png` | composer 中的知识库 chip | 实机操作 |
| `screenshots/t07-10-final.png` | 基于知识库的回答（无引用角标） | 实机操作 |
| `screenshots/t08-01-long-history.png` / `t08-03-short-final.png` | 长回答与 87 字短总结同屏 | 实机操作 |
| `screenshots/t09-03-after-stop.png` | 停止后的部分回答 + 继续回答 | 实机操作 |
| `screenshots/t09-18-regen-menu.png` | 重新生成菜单（重试/添加详情/精炼表达） | 实机操作 |
| `screenshots/t09-14-edit-open.png` | 编辑用户消息（保存/取消/另存为分支） | 实机操作 |
| `screenshots/t09-26-copy-t01.png` | 复制助手回答（剪贴板为 Markdown） | 实机操作 |
| `screenshots/t09-16-switched.png` | 切换到另一会话 | 实机操作 |
| `screenshots/t09-17-after-reload.png` | 刷新后历史恢复 | 实机操作 |
| `screenshots/t09-15-scrolled-up.png` / `t09-27-*.png` | 生成中向上滚动（中等强度） | 实机操作 |

### 7.2 测量 JSON（`measurements/`）

`t01.json`、`t02.json`、`t03.json`、`t04.json`、`t05.json`、`t06.json`、`t06b.json`、`t07.json`、`t08.json`、`t09.json`、`t09b.json`、`t09c.json`、`copy4.json`、`scrolltest.json`、`setup2.json`、`explore.json` 等。

### 7.3 日志（`logs/`）

- `llama-server-err.log`：模型加载、上下文、每次请求的 token 速度（含 n_gen=4596 的长生成）。
- `openwebui-err.log`：0.13.5 启动、迁移、embedding 模型加载、Windows `/tmp` 失败栈（修复前）。
- `openwebui.pid` / `llama-server.pid`：PID 记录。
- `managed.py.orig`：Windows 兼容补丁前的原始文件。
- `llama-stream-test.txt`：`/v1/chat/completions` SSE 原始输出（68 个 chunk）。

### 7.4 复现步骤（简）

```powershell
# 1) llama-server
D:\zxsy-agent-visual-research\tools\llama.cpp\llama-server.exe --host 127.0.0.1 --port 11535 `
  -m D:\zxsy-agent-visual-research\models\Qwen3-4B-Instruct-2507-Q4_K_M.gguf `
  -c 8192 -np 1 --jinja --alias qwen3-4b-local -t 16 --no-webui
# 2) Open WebUI（环境变量见第 3 节）
D:\zxsy-agent-visual-research\venvs\openwebui\Scripts\open-webui.exe serve --host 127.0.0.1 --port 18080
# 3) Playwright 脚本
node D:\zxsy-math-arena-showcase\.work\agent-exp\scripts\r3\t01.js
```

---

## 8. 未验证与风险

1. **视觉理解（T03）未验证**：纯文本 GGUF，未加载 mmproj；只验证了附件 UI 与错误反馈。
2. **工具调用（T07 的工具部分）未验证**：未配置 tools/MCP；知识库 RAG 不等于工具活动。
3. **引用 UI 未触发**：无编号角标/来源卡片；不能据此评价 Open WebUI 的引用组件。
4. **滚动证据强度中等**：`t09b` 的 scrollTop 采样未同步记录 generating 标志；`scrolltest` 因模型排队/长生成未稳定完成。结论方向可信，但不宜作为像素级定论。
5. **重新生成**：只验证了菜单出现与“重试”启动；最终重生成的完整回答未单独截取（生成过长，已停止）。
6. **单用户模式**：`WEBUI_AUTH=False`，未测试登录、多用户、权限、分享。
7. **仅浅色主题、1440×900**：未测暗色、移动端、1920×1080。
8. **版本漂移**：0.13.5 为 2026-11-25 的 PyPI 版本；仓库 HEAD 更新，选择器/交互可能变化。
9. **平台运行成本**：16GB 内存下 llama-server 常驻约 4–5GB；`-np 1` 时并发请求排队，长回答会占用数分钟。

---

## 9. 本轮运行资源与清理

- 仅启动并停止以下**自己启动的**进程：
  - llama-server PID 49944（127.0.0.1:11535）
  - Open WebUI PID 48160（127.0.0.1:18080）
- 未触碰 5199、未启动 Docker、未对 `D:\zxsy-math-arena` 执行任何命令。
- 研究产物：`D:\zxsy-agent-visual-research\{models,venvs,tools,openwebui-data,cache,tmp,logs,assets,downloads}`。
