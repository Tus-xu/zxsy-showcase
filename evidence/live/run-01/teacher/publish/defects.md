# G2-1/G2-5 缺陷登记（教师课件发布与生成 · run-01）

| ID | 缺陷 | 锚点截图 | 影响 |
|---|---|---|---|
| G2-1-D1 | 授权教材库为空，教材选择卡无可选项 | `g2-1-21-textbook-picker.png`；`g2-1-60-prep-v2-surface.png` | NL 备课第一步即中断 |
| G2-1-D2 | AI 提案显示「暂不支持的内容类型」，无法确认教学路径 | `g2-1-60-prep-v2-surface.png` | 教学路径→课件/教案链路断 |
| G2-1-D3 | 无教学路径时 PPT 工具与「发布课堂」全部 disabled，无手工兜底 | `g2-1-51-ppt-initial.png`；`g2-1-55-ppt-state.png` | 无法发布任何课件 |
| G2-1-D4 | 旧错误横幅在后续成功轮次仍常驻 | `g2-1-12-generating-4.png`；`g2-1-42-after-reply.png` | 状态误导 |
| G2-1-D5 | 「重试」报 `retry_run 不可执行：无上下文快照` | `g2-1-03-after-generate.png` | 失败后不能原地重试 |
| G2-5-D1 | PPT/教案生成入口不可用（依赖未确认的教学路径） | `g2-1-34-ppt-tab.png`；`g2-1-45-ppt-tab.png` | 本轮无法产出课件/教案 |

数据侧证据：`tp_blueprints=0`、`decks=0`、`ppt_v2_deck_specs=0`（teacher_platform）。
