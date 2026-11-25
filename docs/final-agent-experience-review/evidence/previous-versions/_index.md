# previous-versions 证据索引（R7）

- 采集日期：2026-11-25（Asia/Shanghai）
- 浏览器：Google Chrome 158.0.8127.88（Playwright `channel:'chrome'`，headless）
- 视口：1440×900、1920×1080，DPR=1，locale `zh-CN`，timezone `Asia/Shanghai`
- 入口：
  - 当前演示：`release/开始演示.html`（`file://`，`offline: true`，登录流程见 `qa/student-chat-showcase/presentation.mjs`）
  - V5：`docs/superpowers/plans/智学数研学生端AI回答设计基线V5/智学数研学生端AI回答设计基线V5/V5设计预览.html`
  - V6：`docs/superpowers/plans/智学数研_V6_实际修订与调研资源包/V6修订版/V6单文件离线预览.html`
- 截图脚本（临时，位于工作区）：`.work/agent-exp/scripts/r7/capture-all.mjs`、`capture-extra.mjs`、`make-boards.mjs`
- 对照板：`docs/final-agent-experience-review/visual-baseline/reference-boards/board-01..06*.png`

## 目录与数量

| 目录 | 张数 | 内容 |
|---|---:|---|
| `current/1440` | 23 | 标准 21 状态 + `unsupported-input`、`knowledge-03-source` |
| `current/1920` | 21 | 标准 21 状态 |
| `v5/1440` | 24 | 标准 21 状态 + `knowledge-03-source`、`knowledge-04-short`、`unsupported-input` |
| `v5/1920` | 21 | 标准 21 状态 |
| `v6/1440` | 24 | 同 V5 |
| `v6/1920` | 21 | 标准 21 状态 |

## 场景与文件名

| 场景 | 当前演示 | V5 | V6 |
|---|---|---|---|
| 首屏 | `home-01-top`、`home-02-suggestions` | `home-01-default`、`home-02-offline` | `home-01-default`、`home-02-offline` |
| 完整解析 | `photo-01-top`、`photo-02-bottom`、`photo-03-lightbox`、`photo-04-figure` | `solution-01-top`、`solution-02-middle`、`solution-03-bottom` | 同 V5 |
| 知识问答 | `knowledge-01-top`、`knowledge-02-bottom`、`knowledge-03-source` | `knowledge-01-initial`、`knowledge-02-secant`、`knowledge-03-source`、`knowledge-04-short` | 同 V5 |
| 动态图形 | `graph-01-initial`、`graph-02-frame`、`graph-03-counter` | `graph-01-initial`、`graph-02-slider`、`graph-03-flat` | 同 V5 |
| 练习 | `practice-01-question`、`practice-02-wrong` | `practice-01-question`、`practice-02-wrong`、`practice-03-correct` | 同 V5 |
| 引导/纠错 | `guide-01-initial`、`guide-02-method`、`guide-03-values` | `guide-01-initial`、`guide-02-wrong`、`guide-03-repaired`、`guide-04-saved` | 同 V5 |
| 错题 | `error-01-review`、`error-02-added`、`error-03-errors-page` | `error-00-empty`、`error-01-notebook` | 同 V5 |
| 历史会话 | `history-01-sidebar`、`history-02-reopen` | `history-01-switch`、`history-02-reload` | 同 V5 |
| 超范围输入（补充） | `unsupported-input` | `unsupported-input` | `unsupported-input` |

## 证据类别

- `current/*`、`v5/*`、`v6/*`：**实机操作**（本轮 Playwright 本地运行；当前演示为离线 release，V5/V6 为本地原型）。
- 历史采证（未复制到本目录，按原路径引用）：
  - `qa/parity-r02/shots/live-student-dialog.png`（原真实项目学生端首页/新对话，1672×941，2026-11-22 采证）
  - `evidence/live/run-02/student/shots/cap-A-02-reply1.png`（真实模型回复，双曲线题，1672×941）
  - `evidence/live/run-03/guide/shots/A-t05-after.png`（真实引导卡，表达式输入 + 进度，1672×941）
  - `evidence/live/run-03/guide/shots/B-t04-click.png`（真实填空/改写/跳过卡，1672×941）
  - `evidence/live/run-02/student/shots/s04-errors.png`（错题详情整页含弹窗，1672×2164）
  - `evidence/live/run-02/student/shots/s03-practice.png`（今日训练页面，1672×941）
- 竞品参考（其他研究代理采集，非本代理操作）：
  - `docs/final-agent-experience-review/evidence/market-competitors/math/desmos-03-extrema-points.png`
  - 来源记录：`docs/final-agent-experience-review/evidence/market-competitors/math/notes/desmos-run.json`（2026-11-25，Desmos calculator 实机）

## 说明与限制

- 历史截图均为原项目历史采证，不是当前版本效果；不得把历史截图描述为当前演示。
- V5/V6 是单文件/本地原型，回答来自预置节点/分支，没有真实模型、后端或跨会话历史；V5/V6 截图只证明设计预览的本地运行效果。
- 历史截图尺寸与当前/V5/V6 不同（1672×941 vs 1440×900/1920×1080），禁止做像素级结论。
- `capture-log.json` 中的 `shots` 字段是脚本写入时的近似值（V5/V6 后补了 `solution-02-middle`，实际每视口 21 张）；以本索引的表格与目录实际文件为准。
- 所有截图均为 `animations: 'disabled'` 的静态图；V5/V6 的 Canvas 图形需要实际拖动滑块才能看到动态变化，本目录的 `graph-02-slider` 是设置预设值后的状态，不是动画帧。
