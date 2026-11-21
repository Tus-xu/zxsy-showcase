# 科研端 · 数据 QA / 产物 / 来源说明 收尾报告

> 角色：research-end 子代理（初始承接科研端三页实现；P0 修复后按主控改派，页面实现移交 `research-ui`，本报告只覆盖本轮由我完成/验证的部分）。
> 时间：2026-11-21 03:00–03:40（Asia/Shanghai）。模式：PROTOTYPE_ONLY（离线演示，无网络依赖）。

## 1. 状态

| 项 | 状态 | 证据 |
|---|---|---|
| `src/data/research.js` 语法修复（P0，全站 build 阻塞） | **完成** | `node -e import(...)` → `OK 36 exports`；`qa` 侧两次 build 通过 |
| `pnpm exec vite build --outDir dist-research` | **PASS** | `✓ 356 modules transformed. ✓ built in 4.51s`（修复前 SyntaxError，修复后 4.34s / 4.51s 两次通过） |
| 三份随包讲义 PDF（真实可打开） | **完成** | `qa/research/artifacts/research-paper-1..3.pdf`，pypdf 校验 6/5/3 页、逐页文本探针与页脚页码 PASS |
| 数据 QA（数学/证据/页码/写作补丁） | **完成 28/28 PASS** | `qa/research/DATA-QA.md` |
| 来源说明（供 curation 台账） | **完成** | `qa/research/SOURCE-NOTES.md` |
| 科研端 READ/WRITE/Home 页面实现与 Playwright 截图 | **移交 / 未完成（见 FAILURES）** | 主控 03:2x 改派 `research-ui` 接手 `src/ends/research/**`、`src/components/research/**` |
| 浏览器内「编辑→编译→下载 PDF」与单文件发行构建 | **未由我验证** | 由 `research-ui` + 主控执行；我仅验证了数据与 PDF 产物 |

## 2. 本轮 CHANGED（只列我写入的文件）

| 文件 | 说明 |
|---|---|
| `src/data/research.js` | 扩写为完整科研端数据：3 个项目、4 份随包自撰讲义（分页 block、12 条可核验问答、4 组 Agent 工具结论）、3 条公式检查案例、3 套写作工程源码 + 可恢复错误脚本、查询/时间/证据辅助函数；修复 P0 字符串转义；归一化 String.raw 内 LaTeX 反斜杠；补 2 个摘要 block id；把第 5 页交叉引用页码改为第 3 页 |
| `qa/research/tmp/dump_papers.mjs` | data → QA JSON（保留原始 tex/文本） |
| `qa/research/tmp/make_papers_pdf.py` | reportlab + simhei 生成 3 份 PDF（一数据页 = 一 PDF 页，含页眉声明与页脚页码） |
| `qa/research/tmp/verify_pdfs.py` | pypdf 页数/逐页中文探针/页脚页码校验 → PASS |
| `qa/research/tmp/data_qa.mjs` | 数据 QA（28 项）→ PASS，输出 `qa/research/DATA-QA.md` |
| `qa/research/tmp/golden-crops/` | READ/WRITE Golden 2×/3× 区域放大图（视觉基线自查素材） |
| `qa/research/artifacts/research-paper-1..3.pdf` + `previews/*.png` | 3 份讲义 PDF 与页面预览图 |
| `qa/research/DATA-QA.md` / `SOURCE-NOTES.md` / `REPORT.md` | 本报告与交付文档 |
| `src/ends/research/ResearchHome.vue` | 03:06 由我写入的启动页实现（收到改派通知前；现已移交 `research-ui`，若与其版本冲突以 `research-ui` 为准） |

**未修改**（禁止文件）：`src/router.js`、`src/shells/**`、`src/styles/*.css`、`src/state/demo.js`、`src/lib/**`、其它 `src/data/*` 文件均未由我写入（mtime 可复核；期间 shell/router 的改动来自主控）。

## 3. VERIFIED（命令与结果）

```powershell
# 1) P0 语法修复校验（修复后）
node -e "import('file:///D:/zxsy-math-arena-showcase/src/data/research.js').then(m=>console.log('OK',Object.keys(m).length))"
# → OK 36

# 2) 展示项目构建（任务要求命令）
cd D:\zxsy-math-arena-showcase
pnpm exec vite build --outDir dist-research
# → ✓ 356 modules transformed. ✓ built in 4.51s（产物 dist-research/assets/index-*.js/css）

# 3) 数据 QA（数学 + 证据 + 页码 + 写作补丁）
node qa/research/tmp/data_qa.mjs
# → RESULT: PASS (28/28)；数学/证据细节见 qa/research/DATA-QA.md

# 4) 讲义 PDF 生成 + pypdf 校验
node qa/research/tmp/dump_papers.mjs
C:\python13\python.exe qa/research/tmp/make_papers_pdf.py
C:\python13\python.exe qa/research/tmp/verify_pdfs.py
# → research-paper-1/2/3: pdf pages=6/5/3（= data pages），逐页中文探针命中，页脚“第 N 页 / 共 M 页”，RESULT: PASS
```

### 产物哈希（SHA-256）

| 文件 | 内容 | 页数 | SHA-256 |
|---|---|---|---|
| `qa/research/artifacts/research-paper-1.pdf` | 《变分形式与 Céa 引理》 | 6 | `C4D5D7F222F59A9A819EAA04C5F8FC0DBDC6DE31612250F24D21697751F7B38C` |
| `qa/research/artifacts/research-paper-2.pdf` | 《三个常见公式的条件漏洞》 | 5 | `898FA1368C784638BE97B3218D8B33B9E5B97C633CCCC661778BC7D11DB0050B` |
| `qa/research/artifacts/research-paper-3.pdf` | 《从草稿到可编译 PDF：写作工程讲义》 | 3 | `50D9701C98565480B0572056B83963414612B8F09788EC97480E4D1513B3784B` |

## 4. EVIDENCE（可复查）

- 数学与事实（全部 PASS）：√(x²)=x 反例 x=−2（√4=2≠−2）；约分反例 x=1 原式 NaN；配方恒等式 5 组抽样；表 1 `e_h/h≈0.446–0.448`（一阶）、表 2 `e_h/h²≈0.1997–0.2048`（二阶）；Céa 引理四条件（V_h⊂V、连续、V-椭圆 α>0、M/α inf）；Céa 证明两步（Galerkin 正交性 + 连续/椭圆不等式）。
- 证据引用完整性：全部问答/工具/公式检查的 `(paperId, page, block)` 均可在数据中定位（28/28）。
- 来源边界：三份讲义 meta 均含「随包演示讲义（自撰，非外部论文）」；refs.bib 仅 `@misc` 演示材料；公式检查带「离线演示审核结论，不是模型实时生成」说明。详见 `SOURCE-NOTES.md`。
- 视觉基线素材：`qa/research/tmp/golden-crops/read-*.png / write-*.png`（READ/WRITE Golden 2×/3× 放大）。
- 改派说明：READ/WRITE/Home 的浏览器验收截图与「编译错误→修复→下载 PDF」证据需由 `research-ui` / 主控产出；本轮我未生成，不冒充通过。

## 5. FAILURES / 未完成

1. **科研端页面 Playwright 验收未由我完成**：`ResearchRead.vue`、`ResearchWrite.vue` 仍为骨架（03:2x 主控将页面实现移交 `research-ui`）；我未产出三栏阅读、证据定位、公式检查入口、写作编译链路的浏览器截图。`ResearchHome.vue` 有我 03:06 的一版实现，但归属已改派，可能与 `research-ui` 冲突。
2. **浏览器内真实下载 PDF 未由我验证**：我只验证了 reportlab 生成的 3 份讲义 PDF（内容/页码/哈希）；写作工作区「编辑→编译失败→修正→重新编译→下载 PDF」的真实链路与 pypdf 校验归 `research-ui`。
3. **单文件发行构建（`pnpm build:single` / release）未验证**：只验证了 `vite build --outDir dist-research`。
4. **数据层辅助函数已知限制**：`src/data/research.js` 末尾 `validateLatexProject / parseLatexProject / plainMath` 等为早期草稿实现，部分正则字面量含多余反斜杠；页面已改用 `src/components/research/latexEngine.js`，QA PDF 用 Python 转换。不要直接复用这些辅助函数（数据本体已 QA 通过）。
5. `ResearchHome.vue` 双写风险：我在收到改派通知的同时写入了 Home 实现，若 `research-ui` 已写自己的版本，以 `research-ui` 为准并由主控裁决，避免两版混用。

## 6. NEXT

1. `research-ui` 完成三页后：用 `qa/research/tmp/data_qa.mjs` 防数据回归；页面导出 PDF 必须走 `buildPdfDocument()`（内部已做 `pdfSafeText`，剔除离线 CJK 子集字体缺失的 − ⊂ ⊆ ‖ ² → 等字符）。
2. 主控跑整包 `pnpm build:single` + 断网双击验证；科研端截图建议：READ 三栏+证据定位、公式检查三案例、WRITE 编译失败→修正→成功+下载 PDF。
3. 将 `qa/research/artifacts/*.pdf` 复制进 release 产物目录（来源与哈希见 `SOURCE-NOTES.md`）。
4. `SOURCE-NOTES.md` 已按「问答 → 页码/段落」映射，可直接并入 curation 台账。

RESEARCH-END-DONE
