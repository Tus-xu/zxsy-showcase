# Mathesis 三端离线交互演示（独立展示项目）

> 本目录是**独立展示项目**（PROTOTYPE_ONLY），依据：
> - `D:\zxsy-math-arena\docs\superpowers\plans\2026-11-21-offline-showcase.md`（主方案）
> - `D:\zxsy-math-arena\docs\superpowers\plans\2026-11-21-guided-solving-cases.md`（三题手册）
>
> 原系统只用于取证；所有展示改动都在本目录。断网发行包在 `release\`。

## 快速开始

1. **直接演示（无需安装/联网/起服务）**：解压/复制 `release\` 到任意路径 → 双击 `release\开始演示.html`。
2. 主持人工具：页面右下角 ⚙ 或 `Ctrl+Shift+H`（跳检查点、单案/整场复位、网络尝试计数）。
3. 完整走法与已知边界：`release\主持人手册.md`；验收口径：`release\验收矩阵.csv`。
4. 三题原图：`release\素材\题1.png / 题2.png / 题3.png`（也可从原仓 `docs\superpowers\plans\` 选择同名原图，按内容哈希识别）。
5. 随包真实产物：`release\产物\`（PPTX / DOCX / PDF，可直接打开核对）。

## 开发与重建

```bash
pnpm install                 # 依赖（Node 22 + pnpm）
pnpm dev                     # 开发：http://127.0.0.1:5199
pnpm build:single            # 单文件发行构建 → release/index.html
python scripts/package_release.py   # 打包发行目录（开始演示.html + 素材 + 产物 + 手册 + 矩阵）
python qa/acceptance_offline.py     # 断网发行包验收（应 37/37 PASS）
```

- 单文件构建把所有 JS/CSS/KaTeX 字体/图片/CJK 子集字体内联进一个 HTML；断网 `file://` 直接运行。
- PDF 导出使用 `src/assets/fonts/offline-cjk.ttf`（GB2312 一级字子集，1.03MB，由 `scripts/make_font_subset.py` 生成）。
- 演示答卷图片由 `scripts/make_submission_images.py` 生成（演示素材）。

## 目录

| 路径 | 内容 |
|---|---|
| `src/ends/student/**` | 学生端：首页/引导解题/练题/错题/知识库/资源/课堂/双师/我的 |
| `src/ends/teacher/**` | 教师端：备课中心/工作台（课堂设计·PPT·教案）/批改/课堂监测/学情/题库/资源 |
| `src/ends/research/**` | 科研端：启动页/阅读溯源/写作编译/公式检查 |
| `src/data/**` | 全部内容数据（讲义/课件/教案/变式/知识库/答卷/科研材料） |
| `src/state/demo.js` | 本地状态与持久化（localStorage 命名空间 `mathesis-showcase-v1`，可整场复位） |
| `src/lib/**` | SHA-256 文件绑定、下载、PPTX/DOCX/PDF 生成 |
| `evidence/` | 证据目录（数学基准、真实运行 run-01、curation 台账、showcase 截图）——说明见 `evidence/README.md` |
| `qa/` | 验收脚本、验收矩阵、各实现组自测、独立评审（math/visual/functional） |
| `inventory/` | 现役三端入口清单（routes.csv / entry-summary.md） |
| `release/` | 发行包（唯一对外交付入口 `开始演示.html`） |

## 验收证据（关键）

- 数学基准（先封存后上传）：`evidence/solutions/sealed/math-baseline.{md,json}`
- 独立盲解：`evidence/solutions/blind/solver-1|2/solutions.md`
- 真实运行与缺陷：`evidence/live/run-01/`（入口 76 行、三题逐轮截图/转录/缺陷、教师发布/批改、科研导入/阅读/写作、学生双师）
- 修订台账：`evidence/curation.csv`、`evidence/curation-g2.csv`
- 离线验收：`qa/acceptance/report.json` + `qa/acceptance/*.png`
- 独立评审：`qa/review-math/REPORT.md`、`qa/review-visual/REPORT.md`、`qa/review-functional/REPORT.md`

## 已知边界（如实）

- 授权教材切片 `D:\知识库\AC切片` 本机未挂载：三课时使用**演示自撰素材**并在页面/手册标注，不冒充教材原文。
- 外部在线视频未随包：学生资源中心点击给出真实说明与本地讲义替代。
- 现役系统缺陷（三题引导、教师发布、科研 READ/WRITE 等）保留原始证据；展示版为策展改写/补制，不宣称原系统已修复。
