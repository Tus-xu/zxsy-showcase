# 科研端随包材料来源说明（SOURCE-NOTES）

> 本文件供 curation 台账 / 验收引用。范围：科研端阅读与写作场景的三份随包演示讲义、公式检查案例、写作工程素材，以及 `qa/research/artifacts/` 中的 3 份 PDF 产物。
> 生成时间：2026-11-21（run-01 展示项目）
> 数据源：`src/data/research.js`（唯一内容源，页面与 PDF 均从它派生）

## 1. 来源类别与真实性声明

| 项 | 声明 |
|---|---|
| 三份讲义 | **随包演示讲义（自撰，非外部论文）**。全部文字、公式、数值表、反例由本项目为离线演示撰写，不对应任何真实期刊论文 / 学位论文 / 教材。 |
| 引用 | 材料之间只互相引用「随包演示讲义」，写作工程 `refs.bib` 的条目全部是 `@misc` 演示材料（`note = {离线演示材料，非外部论文}`）。**不存在真实外部文献、DOI、作者或年份的伪造**。 |
| 参考基线 | 视觉与信息架构参考 `D:\zxsy-math-arena\docs\research-workspace\golden\READ-GOLDEN.png / WRITE-GOLDEN.png`（1672×941）；真实产品样本为 run-01（`evidence/live/run-01/inventory/researcher-*.png`，本轮工作台为空态），材料内容属**策展补制**。 |
| 公式检查 | 离线演示的**审核结论**（规则引擎 + 预置反例），不是模型实时生成；界面必须同时展示该说明。 |
| 写作编译 | 离线演示编译器（XeLaTeX 常用命令子集）+ pdf-lib 在浏览器内真实生成 PDF；不连接 TeX 服务、不发网络请求。 |

## 2. 三份讲义与问答溯源（页码与界面分页一致）

### 2.1 《变分形式与 Céa 引理》（项目 `p-fem`，6 页，`fem-cea`）

| 问答 id | 类型 | 问题 | 答案依据（页 / 段落 block） |
|---|---|---|---|
| `cea-thm` | 定理条件 | Céa 引理成立需要哪些条件？ | 第 4 页「定理 2.1」`thm-cea`；第 2 页「定义 1.1（V-椭圆性）」`def-velliptic` |
| `cea-proof` | 证明段落 | Céa 引理的证明用了哪两步？ | 第 4 页「证明」`proof-cea`；第 4 页条件说明 `p-cea-cond` |
| `cea-def` | 定义 | V-椭圆（强制）是什么意思？ | 第 2 页「定义 1.1」`def-velliptic`；第 4 页「定理 2.1」`thm-cea` |
| `cea-conv` | 定理条件 | 推论 3.1 的收敛阶是多少？ | 第 5 页「推论 3.1」`cor-conv`；第 5 页 L² 说明 `p-num-ref` |

Agent 能力证据：推导校验 / 引用补全 → 第 4 页定理；LaTeX 对照 → 第 4 页 (2.2) 式 `fem-cea-4-3` + 条件说明；翻译与改写 → 第 1 页摘要 `p-abstract`。

### 2.2 《有限元误差的数值实验》（项目 `p-fem`，4 页，`fem-num`）

| 问答 id | 类型 | 问题 | 答案依据 |
|---|---|---|---|
| `num-order` | 定理条件 | 表 1 中能量范数的收敛阶是多少？ | 第 2 页「表 1」`table-num`；第 2 页结果说明 `p-num-order` |
| `num-l2` | 定理条件 | L² 范数为什么是二阶收敛？ | 第 3 页「表 2」`table-l2`；第 3 页分析 `p-num-l2` |

数值可复算（见 `qa/research/DATA-QA.md`）：表 1 `e_h/h ≈ 0.446–0.448`（一阶）；表 2 `e_h/h² ≈ 0.1997–0.2048`（二阶）。

### 2.3 《三个常见公式的条件漏洞》（项目 `p-condition`，5 页，`cond-formula`）

| 问答 id | 类型 | 问题 | 答案依据 |
|---|---|---|---|
| `cond-def` | 定义 | √(x²) 等于 x 吗？ | 第 2 页「定义 1.1（算术平方根）」`def-sqrt`、「命题 1.2」`prop-sqrt`、反例 `p-sqrt-counter` |
| `cond-frac` | 定义 | 约分需要什么条件？ | 第 3 页「定义 2.1（分式有意义）」`def-frac`、「命题 2.2」`prop-frac`、反例 `p-frac-counter` |
| `cond-identity` | 证明段落 | 配方恒等式为什么不需要附加条件？ | 第 4 页「命题 3.1」`prop-square`、说明 `p-square-why` |

### 2.4 《从草稿到可编译 PDF：写作工程讲义》（项目 `p-writing`，3 页，`write-lecture`）

| 问答 id | 类型 | 问题 | 答案依据 |
|---|---|---|---|
| `write-qed` | 证明段落 | 讲义里如何处理可恢复的编译错误？ | 第 3 页错误说明 `p-qed-error`、修复方式 `p-qed-fix` |
| `write-proof` | 证明段落 | 示例证明段落如何收尾？ | 第 3 页示例证明 `proof-write`、命题 2.1 `prop-write-square` |

## 3. 公式检查三案例溯源（离线审核结论）

| 案例 id | 命题 | 判断 | 依据 / 反例 | 证据位置 |
|---|---|---|---|---|
| `sqrt-square` | √(x²)=x | **不成立，需要补充条件 x≥0**，正确结论 √(x²)=\|x\| | 反例 x=−2：√((−2)²)=√4=2 ≠ −2（`Math.sqrt` 数值核验一致） | 第 2 页 `def-sqrt`、`p-sqrt-counter` |
| `cancel-zero` | (x²−1)/(x−1)=x+1 | **不成立，需要补充条件 x≠1** | 反例 x=1：原式分母为 0，数值求值为 NaN；约分后 x+1=2 | 第 3 页 `def-frac`、`p-frac-counter` |
| `complete-square` | x²+2bx=(x+b)²−b² | **成立（恒等式，无需附加条件）** | 展开即得；5 组 (x,b=2) 抽样左右相等 | 第 4 页 `prop-square`、`p-square-why` |

## 4. PDF 产物（`qa/research/artifacts/`）

| 文件 | 对应材料 | 页数 | 说明 | SHA-256 |
|---|---|---|---|---|
| `research-paper-1.pdf` | 《变分形式与 Céa 引理》 | 6 | 每 PDF 页 = data 中第 N 页，页脚「第 N 页 / 共 M 页」 | `C4D5D7F222F59A9A819EAA04C5F8FC0DBDC6DE31612250F24D21697751F7B38C` |
| `research-paper-2.pdf` | 《三个常见公式的条件漏洞》 | 5 | 同上 | `898FA1368C784638BE97B3218D8B33B9E5B97C633CCCC661778BC7D11DB0050B` |
| `research-paper-3.pdf` | 《从草稿到可编译 PDF：写作工程讲义》 | 3 | 同上 | `50D9701C98565480B0572056B83963414612B8F09788EC97480E4D1513B3784B` |

生成与校验（全部本地、无网络）：

```powershell
node qa/research/tmp/dump_papers.mjs                    # data → QA JSON（保留原始 tex/文本）
C:\python13\python.exe qa/research/tmp/make_papers_pdf.py   # reportlab + simhei，一数据页一 PDF 页
C:\python13\python.exe qa/research/tmp/verify_pdfs.py       # pypdf：页数、逐页中文探针、页脚页码
# RESULT: PASS（3 份 PDF 页数分别 6/5/3，逐页文本探针全部命中，页脚页码正确）
```

说明：
- PDF 中数学公式为**纯文本近似**（如 `√(x²)=|x|`、`(M)/(α)`），原因是 reportlab 不跑 TeX；界面与验收的公式权威展示以页面 KaTeX 渲染为准，PDF 用于**内容、页码与产物真实性**核对。
- PDF 由 `src/data/research.js` 直接派生；若数据修订，需重跑上述三条命令并更新哈希。

## 5. 写作工程素材来源（项目 `p-fem` 等）

- `writingProjects` 中 `main.tex / sections/introduction.tex / sections/theory.tex / refs.bib` 均为自撰演示草稿；`sections/theory.tex` 第 5 行 `\cite{Cea1971}` 为**故意保留的未定义引用**，用于复现「未定义引用」警告与「引用补全」差异修复。
- 「改进建议」中的 `\qedhere` 补丁为**故意保留的可恢复错误脚本**：`sections/theory.tex` 证明末尾插入 `\qedhere`，在未加载 `amsthm` 时触发「未定义的控制序列」，修复方案为在主文件导言区加入 `\usepackage{amsthm}` 或删除该命令；修复后重新编译成功并可下载 PDF。
- 以上错误与修复均已实际编译验证，不是伪造的假错误。

## 6. 数据 QA 结果与修订记录

- 自动核验：`node qa/research/tmp/data_qa.mjs` → **28/28 PASS**（详见 `qa/research/DATA-QA.md`）：页码连续、数值表可复算、三个公式反例核验、Céa 表述与证明、全部证据 paper+page+block 可定位、项目—材料关联、写作补丁锚点、公式 `$` 成对、免责声明标注。
- 本轮修正：
  1. 将 `String.raw` 模板中被写成双反斜杠的 LaTeX 源码归一化为单反斜杠（8 处），确保写作工作区显示真实 LaTeX；
  2. 《变分形式与 Céa 引理》第 5 页交叉引用「数值实验第 2 页」→「第 3 页」（L² 讨论位于第 3 页）；
  3. `fem-num` / `write-lecture` 摘要段落补 `id: 'p-abstract'`，修复「翻译与改写」证据定位。
- 已知限制：`src/data/research.js` 末尾的离线编译器辅助函数（`validateLatexProject / parseLatexProject / plainMath` 等）为早期草稿实现，其中部分正则字面量存在多余反斜杠；当前页面实现使用 `src/components/research/latexEngine.js`（research-ui 自建）与 `qa` 侧 Python 转换，**不要直接复用这些辅助函数**，如需复用需先重写。数据本体（项目/材料/问答/公式/写作源码）已经 QA 通过。
