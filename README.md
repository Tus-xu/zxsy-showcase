# Mathesis 离线演示（现役复刻版）

> 本仓库交付一个**断网可运行的现役系统复刻包**：页面、组件、图标、样式、编辑器、渲染器全部来自现役前端
> （`D:\zxsy-math-arena\frontend` 原样 fork），后端在**服务边界**用 run-02 真机采证的响应回放。
> 本轮不走「重画页面」，也不允许补制/改写：现役没有的内容，离线也不出现（见 `未通过项.md`）。

## 交付物

| 文件 | 说明 |
|---|---|
| `release/开始演示.html` | **唯一对外入口**：单文件（约 18.4 MB，全资源内联），双击即用、无需联网/安装/起服务 |
| `release/素材/题1..3.png` | 三张原题图（与现役上传采证同源，逐字节一致） |
| `release/主持人手册.md` | 演示脚本（只含本轮真实跑通的 20 个页面 + 两条样板；受阻处照实说明） |
| `release/现役离线对照表.md` | 逐页/逐控件对照（现役证据 → 离线状态 → 判定） |
| `release/未通过项.md` | 现役阻塞与未采证项（离线不编造） |

## 两条样板（本轮验收口径）

1. **样板一**：学生正常入口 → 上传 `题1.png` → 按采证脚本逐轮推进 → 停在现役真实终点（**未收束**：第 8 轮进入前置补课卡）。
   - 离线回放与采证 SSE **逐轮对齐**（A/B/C 各 9 轮），断网 0 请求。
2. **样板二**：教师备课中心 → 工作台 → **现役受阻**（教学蓝图未生成 → 课件 0 页 → 7 个工具与「发布课堂」disabled → 导出三卡 disabled → 重试 409）。
   - 离线**逐字复现该阻塞**；不提供发布成功态/班级列表/导出产物。

## 目录

| 路径 | 内容 |
|---|---|
| `app/` | **产品源码**：现役前端 fork（`src/` 原样 + `src/offline/` 回放层 + `vite.config.offline.mjs`） |
| `release/` | 发行包（见上表） |
| `evidence/live/run-02/` | 本轮三端实测证据：截图、逐轮 SSE、网络响应、报告 |
| `qa/audit-r02/` | 旧展示版 194 项逐项盘点（四分类 + 撤下清单） |
| `qa/parity-r02/` | 现役 vs 离线 逐屏并排对照（18 页 + 样板一/二复跑脚本） |
| `qa/release-audit/` | 发行包断网审计（20 条路由 + 样板一） |
| `qa/verify-final/` | 独立验收者结论（最终裁决） |
| `docs/ARCHITECTURE-OFFLINE.md` | 架构与「服务边界」说明 |
| `scripts/` | 构建打包（`package_release.py`）与文档生成 |
| `src/`（旧） | **上一轮自建展示版，已停用**，仅作审计对照保留；不参与构建、不进发行包 |

## 构建 / 验证

```bash
cd app
VITE_OFFLINE=1 VITE_PREP_SURFACE=immersive VITE_RESEARCH_SURFACE=immersive \
  pnpm exec vite build --config vite.config.offline.mjs    # → app/dist-offline/index.html（单文件）

python scripts/package_release.py      # 组装 release/ + 静态检查 + 打印入口 SHA-256
python qa/release-audit/audit_release.py   # 断网审计（应 0 请求 / 0 页面错误）
python qa/parity-r02/replay_template1.py A B C   # 样板一逐轮回放核对
python qa/parity-r02/workbench_parity.py        # 样板二工作台状态比对
```

## 证据（本轮 run-02，2026-11-22 02:03–03:10 +08:00）

- 三端实测报告：`evidence/live/run-02/{student,teacher,research}/REPORT.md`
- 逐屏并排图：`qa/parity-r02/shots/side-*.png`（1652×941 与 3352×981）
- 取样脚本可复跑：`evidence/live/run-02/*/scripts/`、`qa/parity-r02/*.py`、`qa/release-audit/*.py`
- 断网审计数字：**20 条路由 + 样板一全流程 = 0 个 http(s)/ws 请求、0 个 pageerror**

## 已知边界（如实）

1. 离线包**不含模型调用**：所有回复是现役采证时的真实响应；未采证的输入会得到明确的「离线演示」提示，不会生成新回答。
2. 现役本身受阻的环节（三题引导未收束、教师备课/导出/发布、科研 CID 字体 PDF 白屏等）在离线**同样受阻**，详见 `未通过项.md`。
3. 外部视频不随包（离线无网络）；封面与卡片信息来自采证，已内联。
4. 科研阅读的 cMap/字体缺陷、Agent 不读项目文献等属现役缺陷，未在离线版"修好"。