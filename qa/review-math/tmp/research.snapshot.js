/**
 * 科研端演示数据与离线能力（阅读 / 公式检查 / 写作编译）。
 *
 * 重要事实边界
 * - 本文件中的全部“讲义/论文”均为随包演示而自撰的离线材料（非外部论文、非真实文献），
 *   界面必须展示 RESEARCH_DISCLAIMER；引文与页码只能指向这些随包页面，禁止伪造外部引用。
 * - 公式检查、推导校验、LaTeX 诊断均为离线演示规则引擎的审核结论，不是模型实时生成。
 * - 写作工程的“编译”是离线演示编译器（XeLaTeX 常用命令子集）+ pdf-lib 真实产 PDF。
 */
export const RESEARCH_DISCLAIMER = '随包演示讲义（自撰，非外部论文）'

/* ==========================================================================
 * 1. 科研项目
 * ========================================================================== */
export const researchProjects = [
  {
    id: 'p-fem',
    name: '有限元误差分析',
    desc: '基于变分方法的椭圆问题数值解',
    cover: 'fem',
    memory: '研究有限元方法的误差估计理论，探索椭圆型偏微分方程的数值解法。',
    papers: ['fem-cea', 'fem-num'],
    writeProjectId: 'p-fem',
    seedNotes: [
      {
        id: 'seed-n1',
        title: 'Céa 引理与误差估计',
        projectId: 'p-fem',
        paperId: 'fem-cea',
        page: 4,
        block: 'thm-cea',
        time: '今天 10:24',
        source: '演示预置笔记',
      },
      {
        id: 'seed-n2',
        title: '有限元方法的收敛性',
        projectId: 'p-fem',
        paperId: 'fem-cea',
        page: 5,
        block: 'cor-conv',
        time: '昨天 20:11',
        source: '演示预置笔记',
      },
      {
        id: 'seed-n3',
        title: '椭圆问题的变分形式',
        projectId: 'p-fem',
        paperId: 'fem-cea',
        page: 2,
        block: 'def-velliptic',
        time: '9 月 10 日',
        source: '演示预置笔记',
      },
    ],
  },
  {
    id: 'p-condition',
    name: '公式适用条件核查',
    desc: '初等代数与微积分中的隐含条件',
    cover: 'condition',
    memory: '核查常见代数变形的适用条件：开方、约分与配方，关注定义域与反例。',
    papers: ['cond-formula'],
    writeProjectId: 'p-condition',
    seedNotes: [
      {
        id: 'seed-n4',
        title: '√(x²)=x 缺少 x≥0',
        projectId: 'p-condition',
        paperId: 'cond-formula',
        page: 2,
        block: 'prop-sqrt',
        time: '今天 09:40',
        source: '演示预置笔记',
      },
    ],
  },
  {
    id: 'p-writing',
    name: '写作与编译实验',
    desc: 'LaTeX 多文件项目与编译错误恢复',
    cover: 'writing',
    memory: '维护可编译的 LaTeX 多文件工程，记录编译错误的定位与恢复过程。',
    papers: ['write-lecture'],
    writeProjectId: 'p-writing',
    seedNotes: [
      {
        id: 'seed-n5',
        title: '编译错误定位记录',
        projectId: 'p-writing',
        paperId: 'write-lecture',
        page: 3,
        block: 'p-qed-fix',
        time: '今天 09:12',
        source: '演示预置笔记',
      },
    ],
  },
]

/* ==========================================================================
 * 2. 随包演示讲义（分页内容 + 可核验问答 + Agent 能力结论）
 *    页码从 1 开始；block.id 供“证据来源/定位原文”使用。
 * ========================================================================== */

const FONT_NOTE = '本讲义为离线演示自撰材料，不引用外部论文；页码与引文均可在随包页面中核对。'

export const researchPapers = {
  'fem-cea': {
    id: 'fem-cea',
    projectId: 'p-fem',
    title: '变分形式与 Céa 引理',
    tabTitle: '变分形式与 Céa 引理',
    short: 'Céa 引理',
    authors: 'Mathesis 演示项目组',
    year: 2026,
    meta: `${RESEARCH_DISCLAIMER} · 6 页`,
    fileName: 'cea-lemma-lecture.pdf',
    defaultPage: 4,
    pages: [
      {
        no: 1,
        blocks: [
          {
            t: 'title',
            title: '变分形式与 Céa 引理',
            sub: '椭圆型偏微分方程有限元误差估计的预备讲义',
            author: '随包演示讲义（自撰，非外部论文）',
            date: '2026 年 11 月 · 演示版',
          },
          { t: 'h3', text: '摘要' },
          {
            t: 'p',
            id: 'p-abstract',
            text: '本讲义整理椭圆型偏微分方程有限元方法的三个基础环节：变分形式、Galerkin 逼近与 Céa 引理。所有命题都在有限维子空间上讨论，并在第 2.3 节给出 Céa 引理的完整证明。本材料为离线演示而自撰，引用与页码均可与本讲义页面逐条核对。',
          },
          {
            t: 'p',
            text: '关键词：变分问题；Galerkin 逼近；Céa 引理；V-椭圆性；先验误差估计',
          },
          { t: 'quote', text: '阅读提示：可选中任一段落后，在右侧 Research Agent 中提问，再点击“定位原文”回到本页对应段落。' },
        ],
      },
      {
        no: 2,
        blocks: [
          { t: 'h1', text: '1 变分问题' },
          { t: 'h2', text: '1.1 空间与双线性型' },
          {
            t: 'p',
            text: '设 Ω⊂R^d 是有界多边形区域，V=H_0^1(Ω) 为 Sobolev 空间。给定 a(x) 满足一致椭圆条件 0<a_0≤a(x)≤a_1，定义双线性型 a(u,v)=∫_Ω a(x)∇u·∇v dx，以及线性泛函 (f,v)=∫_Ω f v dx。',
          },
          {
            t: 'defn',
            id: 'def-velliptic',
            title: '定义 1.1（V-椭圆性 / 强迫性）',
            text: '若存在常数 α>0，使得对任意 v∈V 都有 a(v,v)≥α‖v‖_V^2，则称双线性型 a(·,·) 在 V 上是 V-椭圆的，α 称为椭圆性常数。',
            ask: 'cea-def',
          },
          {
            t: 'p',
            text: '在一致椭圆条件下，a(·,·) 连续且 V-椭圆：连续性常数为 M=a_1，椭圆性常数为 α=a_0。这两个常数在第 2.3 节的误差估计中会再次出现。',
          },
          {
            t: 'theorem',
            id: 'lax',
            title: '引理 1.1（Lax–Milgram）',
            text: '若 a(·,·) 连续且 V-椭圆，则对任意 f∈V*，存在唯一的 u∈V 使得 a(u,v)=(f,v) 对所有 v∈V 成立，并且 ‖u‖_V≤‖f‖_V*/α。',
          },
          {
            t: 'p',
            text: 'Lax–Milgram 引理给出连续问题的适定性。有限元方法要回答的是：用有限维子空间 V_h 替换 V 后，解 u_h 与 u 相差多远。',
          },
        ],
      },
      {
        no: 3,
        blocks: [
          { t: 'h1', text: '2 Galerkin 逼近' },
          { t: 'h2', text: '2.1 离散变分问题' },
          {
            t: 'p',
            text: '取 V_h⊂V 为有限维子空间（例如分片线性多项式空间），dim V_h=N_h<∞。离散问题为：求 u_h∈V_h 使得 a(u_h,v_h)=(f,v_h) 对所有 v_h∈V_h 成立。',
          },
          {
            t: 'p',
            text: '由 Lax–Milgram 引理，离散问题同样存在唯一解。这里的关键是 V_h⊂V，因此 a(·,·) 限制在 V_h 上仍保持连续与 V-椭圆，且常数相同。',
          },
          { t: 'h2', text: '2.2 Galerkin 正交性' },
          {
            t: 'p',
            id: 'p-galerkin',
            text: '两式相减得 a(u−u_h,v_h)=0 对所有 v_h∈V_h 成立，这称为 Galerkin 正交性：误差 u−u_h 在能量内积意义下正交于整个有限维子空间。',
          },
          { t: 'formula', tex: String.raw`a(u-u_h,\; v_h)=0,\qquad \forall v_h\in V_h`, num: '(2.1)' },
          {
            t: 'p',
            text: '正交性说明 u_h 是 u 在能量范数下的最佳逼近候选；把它与连续性、椭圆性结合，就得到下一节的 Céa 引理。',
          },
        ],
      },
      {
        no: 4,
        blocks: [
          { t: 'h1', text: '2.3 逼近误差估计' },
          {
            t: 'p',
            text: '设 V_h⊂V 为有限维子空间，u∈V 为变分问题的解，u_h∈V_h 为有限元解。若双线性型 a(·,·) 连续且强制，则存在与 h 无关的常数 C，使得以下估计成立。',
          },
          {
            t: 'theorem',
            id: 'thm-cea',
            title: '定理 2.1（Céa 引理）',
            text: '设 a(·,·) 连续（常数 M）且 V-椭圆（常数 α>0），V_h⊂V。则对所有 v_h∈V_h 有 ‖u−u_h‖_V ≤ (M/α) inf_{v_h∈V_h} ‖u−v_h‖_V。',
            ask: 'cea-thm',
          },
          {
            t: 'formula',
            tex: String.raw`\|u-u_h\|_V \;\le\; \frac{M}{\alpha}\, \inf_{v_h\in V_h}\|u-v_h\|_V`,
            num: '(2.2)',
          },
          {
            t: 'p',
            id: 'p-cea-comment',
            text: '该结果即所谓的 Céa 引理：有限元解的误差被最佳逼近误差控制在常数 M/α 倍之内，因此收敛阶完全由逼近空间 V_h 的性质决定。',
          },
          {
            t: 'proof',
            id: 'proof-cea',
            label: '证明',
            text: '对任意 v_h∈V_h，由 Galerkin 正交性有 a(u−u_h,v_h)=0，于是 a(u−u_h,u−u_h)=a(u−u_h,u−v_h)。由连续性，a(u−u_h,u−v_h)≤M‖u−u_h‖_V‖u−v_h‖_V；由 V-椭圆性，a(u−u_h,u−u_h)≥α‖u−u_h‖_V^2。约去 ‖u−u_h‖_V 得 ‖u−u_h‖_V≤(M/α)‖u−v_h‖_V，对 v_h∈V_h 取下确界即证。',
            ask: 'cea-proof',
          },
          {
            t: 'p',
            id: 'p-cea-cond',
            text: '注意证明只用了两个条件：Galerkin 正交性（保证交叉项可换成 u−v_h）与 V-椭圆性（保证能量范数可由 a(·,·) 控制）。若论文中没有声明 α>0，则该结论中的常数 M/α 无法定义。',
          },
        ],
      },
      {
        no: 5,
        blocks: [
          { t: 'h1', text: '3 收敛性推论' },
          {
            t: 'p',
            text: '若 V_h 是分片线性有限元空间且网格满足形状正则，则存在插值算子 I_h:V→V_h，使得 ‖u−I_h u‖_V≤C h‖u‖_{H^2}。结合 Céa 引理即得能量范数下的最优收敛阶。',
          },
          {
            t: 'corollary',
            id: 'cor-conv',
            title: '推论 3.1',
            text: '在定理 2.1 的条件下，若 u∈H^2(Ω)∩H_0^1(Ω)，则 ‖u−u_h‖_V≤C h|u|_{H^2}，其中 C 只依赖于 M/α 与网格形状正则常数。',
            ask: 'cea-conv',
          },
          {
            t: 'p',
            text: '该推论说明：误差估计的常数部分可以拆成“问题常数 M/α”与“逼近常数 C h”两部分；前者由方程决定，后者由网格与单元类型决定。',
          },
          {
            t: 'p',
            id: 'p-num-ref',
            text: '推论 3.1 只给出 H^1 范数下的估计；L^2 范数下的估计通常需要 Aubin–Nitsche 对偶技巧，可参见随包材料《有限元误差的数值实验》第 3 页的定性说明。',
          },
        ],
      },
      {
        no: 6,
        blocks: [
          { t: 'h1', text: '4 小结与阅读检查' },
          {
            t: 'list',
            ordered: false,
            items: [
              '变分问题的适定性由 Lax–Milgram 引理给出；',
              'Galerkin 正交性是误差估计的起点；',
              'Céa 引理把误差控制为最佳逼近误差的 M/α 倍；',
              '使用 Céa 引理时必须声明 α>0（V-椭圆性）与 V_h⊂V。',
            ],
          },
          {
            t: 'p',
            text: FONT_NOTE + '读者可选中第 2.3 节的定理或证明段落，在右侧向 Research Agent 追问条件与证明步骤。',
          },
          {
            t: 'quote',
            text: '阅读提示：选中任意段落后，点击浮动工具条中的“问 AI”，即可得到带页码与段落定位的结构化回答。',
          },
        ],
      },
    ],
    qa: {
      'cea-thm': {
        id: 'cea-thm',
        kind: '定理条件',
        question: 'Céa 引理成立需要哪些条件？',
        status: 'basic',
        statusLabel: '基本成立（条件齐备）',
        summary: 'Céa 引理在本讲义中有完整陈述与证明；结论成立所需的条件已在定理 2.1 中列出，缺一不可。',
        judgment: '结论：在 V_h⊂V、a(·,·) 连续且 V-椭圆（α>0）的前提下，误差上界成立，且常数 C=M/α 与网格尺寸 h 无关。',
        keyPoints: [
          'V_h⊂V：有限元空间必须是解空间的子空间；',
          'a(·,·) 连续（常数 M）且 V-椭圆（常数 α>0）；',
          'Galerkin 正交性：a(u−u_h,v_h)=0 对所有 v_h∈V_h 成立；',
          '常数 C=M/α 与 h 无关，收敛阶由最佳逼近误差决定。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'thm-cea', label: '第 4 页 · 定理 2.1' },
          { paperId: 'fem-cea', page: 2, block: 'def-velliptic', label: '第 2 页 · 定义 1.1（V-椭圆性）' },
        ],
        note: '若稿件只写“由 Céa 引理可得”而未声明 α>0，应补充 V-椭圆性假设。',
        suggestions: ['cea-proof', 'cea-def'],
      },
      'cea-proof': {
        id: 'cea-proof',
        kind: '证明段落',
        question: 'Céa 引理的证明用了哪两步？',
        status: 'verified',
        statusLabel: '已验证（逐步可核对）',
        summary: '证明由 Galerkin 正交性起手，用连续性与 V-椭圆性分别给出上界与下界，最后约去误差范数并取确界。',
        judgment: '证明过程完整，两步核心不等式的方向正确，常数 M/α 的来源可核对。',
        keyPoints: [
          '第一步：Galerkin 正交性把 a(u−u_h,u−u_h) 换成 a(u−u_h,u−v_h)；',
          '第二步：连续性给出上界 M‖u−u_h‖_V‖u−v_h‖_V，V-椭圆性给出下界 α‖u−u_h‖_V^2；',
          '约去 ‖u−u_h‖_V 后对 v_h∈V_h 取下确界，即得 Céa 估计。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'proof-cea', label: '第 4 页 · 定理 2.1 的证明' },
          { paperId: 'fem-cea', page: 4, block: 'p-cea-cond', label: '第 4 页 · 条件说明' },
        ],
        note: '证明中若省略“对 v_h 取下确界”一句，结论仍然正确，但读者无法看出常数与 h 无关。',
        suggestions: ['cea-thm'],
      },
      'cea-def': {
        id: 'cea-def',
        kind: '定义',
        question: 'V-椭圆（强制）是什么意思？',
        status: 'verified',
        statusLabel: '已验证（定义可直接核对）',
        summary: 'V-椭圆性要求双线性型在任意非零方向上的“能量”被范数平方从下方控制，这是 Lax–Milgram 与 Céa 估计的共同前提。',
        judgment: '定义 1.1 的表述完整：存在 α>0，使 a(v,v)≥α‖v‖_V^2 对所有 v∈V 成立。',
        keyPoints: [
          'α 称为椭圆性常数，必须为正；',
          '一致椭圆条件 0<a_0≤a(x) 下可取 α=a_0；',
          '它保证能量内积正定，从而保证变分问题适定。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 2, block: 'def-velliptic', label: '第 2 页 · 定义 1.1' },
          { paperId: 'fem-cea', page: 4, block: 'thm-cea', label: '第 4 页 · 定理 2.1 的使用' },
        ],
        note: '若只假定 a(·,·) 连续而不假定 V-椭圆，Céa 估计的形式不变，但常数 M/α 不存在。',
        suggestions: ['cea-thm'],
      },
      'cea-conv': {
        id: 'cea-conv',
        kind: '定理条件',
        question: '推论 3.1 的收敛阶是多少？',
        status: 'basic',
        statusLabel: '基本成立（需正则性假设）',
        summary: '在 Céa 引理与分片线性插值估计的基础上，能量范数误差是一阶收敛；这要求解具有 H^2 正则性。',
        judgment: '结论：若 u∈H^2(Ω)∩H_0^1(Ω) 且网格形状正则，则 ‖u−u_h‖_V≤C h|u|_{H^2}。',
        keyPoints: [
          '插值误差 ‖u−I_h u‖_V≤C h‖u‖_{H^2}；',
          '与 Céa 引理复合得到 O(h) 收敛；',
          '常数 C 只依赖 M/α 与网格形状正则常数。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 5, block: 'cor-conv', label: '第 5 页 · 推论 3.1' },
          { paperId: 'fem-cea', page: 5, block: 'p-num-ref', label: '第 5 页 · L^2 估计说明' },
        ],
        note: 'H^2 正则性在凹角区域可能失效，此时收敛阶会下降；讲义只讨论凸区域。',
        suggestions: ['cea-thm'],
      },
    },
    tools: {
      verify: {
        status: 'basic',
        statusLabel: '基本成立（概率较高）',
        summary: '该不等式的推导整体正确。在 V-椭圆（α>0）与 V_h⊂V 的条件下，结论在正文中给出并可逐条核对。',
        keyPoints: [
          'V_h⊂V，a(·,·) 连续且强制（α>0）；',
          '由 Galerkin 正交性得到误差交叉项；',
          '常数 C=M/α 与 h 无关。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'thm-cea', label: '第 4 页 · 定理 2.1' },
        ],
        note: '若读者只想要结论，可直接引用定理 2.1；若要写入自己的论文，建议同时声明 α>0。',
      },
      citations: {
        status: 'supported',
        statusLabel: '证据充分（仅项目内材料）',
        summary: '本项目的全部材料均为随包演示讲义。演示版不会生成未经验证的外部引用，只提供可核对的项目内证据位置。',
        keyPoints: [
          '未发现外部文献伪造；',
          '候选证据：随包讲义《变分形式与 Céa 引理》第 4 页；',
          '建议引用格式：（随包演示讲义《变分形式与 Céa 引理》，第 4 页）。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'thm-cea', label: '第 4 页 · 定理 2.1' },
        ],
      },
      latex: {
        status: 'info',
        statusLabel: '需要补充说明',
        summary: '讲义中的误差估计式与写作草稿 sections/theory.tex 的公式一致；草稿缺少 α>0 的条件说明，建议补一句 V-椭圆性假设。',
        keyPoints: [
          '公式主体一致：\|u-u_h\|_V ≤ (M/α) inf\|u-v_h\|_V；',
          '草稿第 5 行的引用键与 refs.bib 不一致（见右侧“引用补全”）；',
          '草稿未声明 α>0，读者无法判断常数是否存在。',
        ],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'fem-cea-4-3', label: '第 4 页 · (2.2) 式' },
          { paperId: 'fem-cea', page: 4, block: 'p-cea-cond', label: '第 4 页 · 条件说明' },
        ],
        diff: {
          file: 'sections/theory.tex',
          line: 4,
          removed: '双线性型 $a(u,v)$ 在 $V$ 上连续且强制，因此离散问题存在唯一解。',
          added: '双线性型 $a(u,v)$ 在 $V$ 上连续且 $V$-椭圆（$\\\alpha>0$），因此离散问题存在唯一解。',
          note: '需要用户在接受前查看差异；接受后可在写作工作区重新编译。',
        },
      },
      translate: {
        status: 'info',
        statusLabel: '离线审核译文',
        summary: '对摘要段落的英文译稿（保持数学记号与引用不变，术语与项目内草稿一致）。',
        en: 'This lecture reviews three foundations of the finite element method for elliptic partial differential equations: the variational formulation, the Galerkin approximation and Céa\'s lemma. All statements are discussed on finite-dimensional subspaces, and a complete proof of Céa\'s lemma is given in Section 2.3.',
        keyPoints: [
          '术语：V-ellipticity → V-椭圆性；Galerkin orthogonality → Galerkin 正交性；',
          '公式与引用保持原样，不翻译数学记号；',
          '译文只覆盖本页摘要，不替代全文。',
        ],
        evidence: [{ paperId: 'fem-cea', page: 1, block: 'p-abstract', label: '第 1 页 · 摘要' }],
      },
    },
  },

  'fem-num': {
    id: 'fem-num',
    projectId: 'p-fem',
    title: '有限元误差的数值实验',
    tabTitle: '有限元误差的数值实验',
    short: '数值实验',
    authors: 'Mathesis 演示项目组',
    year: 2026,
    meta: `${RESEARCH_DISCLAIMER} · 4 页`,
    fileName: 'fem-error-experiment.pdf',
    defaultPage: 2,
    pages: [
      {
        no: 1,
        blocks: [
          {
            t: 'title',
            title: '有限元误差的数值实验',
            sub: '能量范数与 L^2 范数的收敛阶核对',
            author: '随包演示讲义（自撰，非外部论文）',
            date: '2026 年 11 月 · 演示版',
          },
          { t: 'h3', text: '摘要' },
          {
            t: 'p',
            text: '本讲义记录两组可复算的有限元误差数值实验：能量范数一阶收敛与 L^2 范数二阶收敛。表格中的数值由讲义作者按脚本生成并四舍五入，读者可在本页直接相除核对收敛阶。',
          },
          { t: 'quote', text: '说明：本演示不包含外部数据或论文引用，表中数据仅用于核对讲义内的收敛阶结论。' },
        ],
      },
      {
        no: 2,
        blocks: [
          { t: 'h1', text: '1 实验设置' },
          {
            t: 'p',
            text: '取单位正方形上的 Poisson 问题 −Δu=f，精确解取 u(x,y)=sin(πx)sin(πy)，右端项由方程给出。采用一致三角剖分，网格尺寸 h=1/4, 1/8, 1/16, 1/32，用分片线性有限元求解。',
          },
          {
            t: 'table',
            id: 'table-num',
            caption: '表 1 能量范数误差与收敛阶',
            head: ['h', '误差 e_h', 'e_h / h'],
            rows: [
              ['1/4', '0.1120', '0.448'],
              ['1/8', '0.0558', '0.446'],
              ['1/16', '0.0279', '0.446'],
              ['1/32', '0.0140', '0.448'],
            ],
            note: '第四列 e_h/h 稳定在 0.446 附近，说明 e_h=O(h)。',
          },
          {
            t: 'p',
            id: 'p-num-order',
            text: '从表 1 可见：h 每减半，能量范数误差近似减半，e_h/h 稳定在 0.446 附近。这验证了推论 3.1 中 O(h) 的收敛阶。',
            ask: 'num-order',
          },
        ],
      },
      {
        no: 3,
        blocks: [
          { t: 'h1', text: '2 结果分析' },
          {
            t: 'table',
            id: 'table-l2',
            caption: '表 2 L^2 范数误差与收敛阶',
            head: ['h', '误差 e_h', 'e_h / h^2'],
            rows: [
              ['1/4', '0.01260', '0.2016'],
              ['1/8', '0.00314', '0.2010'],
              ['1/16', '0.00078', '0.1997'],
              ['1/32', '0.00020', '0.2048'],
            ],
            note: '第四列 e_h/h^2 稳定在 0.20 附近，说明 L^2 误差为 O(h^2)。',
          },
          {
            t: 'p',
            id: 'p-num-l2',
            text: '表 2 中 L^2 范数误差约为 O(h^2)：h 每减半，误差约变为原来的四分之一。该现象与 Aubin–Nitsche 对偶论证的结论一致，也说明数值实验与 Céa 引理给出的理论阶相容。',
            ask: 'num-l2',
          },
          {
            t: 'p',
            text: '需要强调：表 1 的估计由 Céa 引理与插值误差直接得到；表 2 的二阶收敛则依赖额外的对偶正则性假设，不能直接由 Céa 引理推出。',
          },
        ],
      },
      {
        no: 4,
        blocks: [
          { t: 'h1', text: '3 复现与说明' },
          {
            t: 'list',
            ordered: true,
            items: [
              '按 h=1/4 到 1/32 生成一致三角剖分；',
              '组装刚度矩阵与载荷向量，解线性方程组；',
              '在加密网格上计算能量范数与 L^2 范数误差；',
              '用 e_h/h 与 e_h/h^2 两列核对收敛阶。',
            ],
          },
          {
            t: 'p',
            text: '本页数据为四舍五入后的演示值，除法核对时会出现末位差异。所有结论仅用于本随包演示讲义内部自洽性检查，不构成对外部论文或外部数据的引用。',
          },
          { t: 'quote', text: '证据说明：本讲义的数值与说明均可在第 2–3 页逐项核对，没有外部来源。' },
        ],
      },
    ],
    qa: {
      'num-order': {
        id: 'num-order',
        kind: '定理条件',
        question: '表 1 中能量范数的收敛阶是多少？',
        status: 'verified',
        statusLabel: '已验证（表内可复算）',
        summary: '表 1 的 e_h/h 一列稳定在 0.446 附近，说明能量范数误差为 O(h)，与推论 3.1 一致。',
        judgment: '结论：能量范数一阶收敛；数据与理论阶相容。',
        keyPoints: [
          'h 减半时误差近似减半；',
          'e_h/h 在 0.446–0.448 之间波动（四舍五入造成）；',
          '理论依据：Céa 引理 + 分片线性插值估计。',
        ],
        evidence: [
          { paperId: 'fem-num', page: 2, block: 'table-num', label: '第 2 页 · 表 1' },
          { paperId: 'fem-num', page: 2, block: 'p-num-order', label: '第 2 页 · 结果说明' },
        ],
        note: '若把表 1 的第三列误写成 e_h/h^2，则数值会变成 0.448/h，与表中不符。',
        suggestions: ['num-l2'],
      },
      'num-l2': {
        id: 'num-l2',
        kind: '定理条件',
        question: 'L^2 范数为什么是二阶收敛？',
        status: 'basic',
        statusLabel: '基本成立（需对偶假设）',
        summary: '表 2 的 e_h/h^2 稳定在 0.20 附近，误差约每加密一次变为四分之一；这来自 Aubin–Nitsche 对偶论证，而非 Céa 引理的直接推论。',
        judgment: '结论：在额外对偶正则性假设下，L^2 误差为 O(h^2)。',
        keyPoints: [
          '表 2：h 减半，误差约变为 1/4；',
          'L^2 估计需要对偶问题解的正则性假设；',
          '数值阶与理论阶一致。',
        ],
        evidence: [
          { paperId: 'fem-num', page: 3, block: 'table-l2', label: '第 3 页 · 表 2' },
          { paperId: 'fem-num', page: 3, block: 'p-num-l2', label: '第 3 页 · 结果分析' },
        ],
        note: 'Nitsche 技巧的完整证明不在本讲义范围内，本页只做数值核对。',
        suggestions: ['num-order'],
      },
    },
    tools: {
      verify: {
        status: 'basic',
        statusLabel: '基本成立（数值自洽）',
        summary: '表 1、表 2 的收敛比列可用除法直接复核；两表的收敛阶与讲义结论一致。',
        keyPoints: ['表 1 的 e_h/h 稳定 → 一阶；', '表 2 的 e_h/h^2 稳定 → 二阶；', '数据为四舍五入值，末位存在合理误差。'],
        evidence: [
          { paperId: 'fem-num', page: 2, block: 'table-num', label: '第 2 页 · 表 1' },
          { paperId: 'fem-num', page: 3, block: 'table-l2', label: '第 3 页 · 表 2' },
        ],
      },
      citations: {
        status: 'supported',
        statusLabel: '证据充分（仅项目内材料）',
        summary: '本讲义的数值实验没有引用外部数据或论文；若需要在写作中引用，应引用《变分形式与 Céa 引理》中的定理 2.1 与推论 3.1。',
        keyPoints: ['无外部引用；', '理论依据指向项目内讲义第 4–5 页；', '不生成未验证的外部文献。'],
        evidence: [
          { paperId: 'fem-cea', page: 4, block: 'thm-cea', label: '《变分形式与 Céa 引理》第 4 页 · 定理 2.1' },
          { paperId: 'fem-cea', page: 5, block: 'cor-conv', label: '《变分形式与 Céa 引理》第 5 页 · 推论 3.1' },
        ],
      },
      latex: {
        status: 'info',
        statusLabel: '需要补充说明',
        summary: '写作草稿的“数值实验”一节只有一句占位说明，建议在正文中写明表 1 的 O(h) 结论与表 2 的对偶假设。',
        keyPoints: ['草稿缺少数值结论；', '建议补充“e_h/h 稳定”这一观察；', '所有数字仅来自随包讲义，不引用外部来源。'],
        evidence: [{ paperId: 'fem-num', page: 2, block: 'table-num', label: '第 2 页 · 表 1' }],
        diff: {
          file: 'sections/theory.tex',
          line: 20,
          removed: '数值实验见随包演示讲义《有限元误差的数值实验》，此处不再展开。',
          added: '数值实验显示能量范数误差 e_h/h 稳定在 0.446 附近（O(h)），详见随包演示讲义《有限元误差的数值实验》第 2 页。',
          note: '接受后需要重新编译并在预览中核对。',
        },
      },
      translate: {
        status: 'info',
        statusLabel: '离线审核译文',
        summary: '摘要段落英文译稿：保持数字与范数记号不变。',
        en: 'This note records two reproducible numerical experiments on finite element errors: first-order convergence in the energy norm and second-order convergence in the L^2 norm. The values in the tables were generated by the lecturer\'s script and rounded; the convergence orders can be checked by direct division on this page.',
        keyPoints: ['数值与单位保持原样；', '术语：energy norm → 能量范数；L^2 norm → L^2 范数。'],
        evidence: [{ paperId: 'fem-num', page: 1, block: 'p-abstract', label: '第 1 页 · 摘要' }],
      },
    },
  },

  'cond-formula': {
    id: 'cond-formula',
    projectId: 'p-condition',
    title: '三个常见公式的条件漏洞',
    tabTitle: '三个常见公式的条件漏洞',
    short: '公式条件',
    authors: 'Mathesis 演示项目组',
    year: 2026,
    meta: `${RESEARCH_DISCLAIMER} · 5 页`,
    fileName: 'formula-conditions.pdf',
    defaultPage: 2,
    pages: [
      {
        no: 1,
        blocks: [
          {
            t: 'title',
            title: '三个常见公式的条件漏洞',
            sub: '开方、约分与配方：定义域与隐含条件',
            author: '随包演示讲义（自撰，非外部论文）',
            date: '2026 年 11 月 · 演示版',
          },
          { t: 'h3', text: '摘要' },
          {
            t: 'p',
            text: '本讲义用三个案例说明代数变形中的隐含条件：√(x²) 与 |x| 的关系、约分对分母非零的要求，以及配方法恒等式为何不需要附加条件。每个案例都给出可核对的反例或证据位置。',
          },
          {
            t: 'p',
            text: '关键词：算术平方根；定义域；约分；配方法；恒等变形',
          },
          { t: 'quote', text: '演示说明：右侧“公式检查”是离线演示的审核结论（规则引擎 + 预置反例），不是模型实时生成。' },
        ],
      },
      {
        no: 2,
        blocks: [
          { t: 'h1', text: '1 平方根：√(x²) 等于什么？' },
          {
            t: 'defn',
            id: 'def-sqrt',
            title: '定义 1.1（算术平方根）',
            text: '对 x≥0，√x 表示唯一的非负实数 y，使得 y²=x。因此 √x≥0 恒成立；反过来，若只写 √(x²)，它同样表示一个非负数。',
            ask: 'cond-def',
          },
          {
            t: 'prop',
            id: 'prop-sqrt',
            title: '命题 1.2',
            text: '对任意实数 x，有 √(x²)=|x|；只有当 x≥0 时，才有 √(x²)=x。',
            ask: 'cond-def',
          },
          {
            t: 'p',
            id: 'p-sqrt-counter',
            text: '反例：取 x=−2，则 √((−2)²)=√4=2，而 x=−2，因此 √(x²)=x 不成立。正确的化简结果应为 |−2|=2。',
          },
          {
            t: 'p',
            text: '常见错误是把 √(x²) 直接写成 x；正确的化简是 |x|。在解题中若不确定 x 的符号，应分 x≥0 与 x<0 两种情况讨论，或保留绝对值。',
          },
        ],
      },
      {
        no: 3,
        blocks: [
          { t: 'h1', text: '2 约分：分母非零是前提' },
          {
            t: 'defn',
            id: 'def-frac',
            title: '定义 2.1（分式有意义）',
            text: '分式 P(x)/Q(x) 有意义的条件是 Q(x)≠0；只有在此条件下，才能对分子与分母作恒等变形或约分。',
            ask: 'cond-frac',
          },
          {
            t: 'prop',
            id: 'prop-frac',
            title: '命题 2.2',
            text: '当 x≠1 时，(x²−1)/(x−1)=x+1；但等式两边的定义域不同，不能把 x=1 直接代入约分后的式子。',
            ask: 'cond-frac',
          },
          {
            t: 'p',
            id: 'p-frac-counter',
            text: '反例：原式在 x=1 处分母为 0，表达式无定义；约分后得到 x+1=2，看似有值，实际上是被“约掉”的因式 (x−1) 在 x=1 处为零所造成。',
          },
          {
            t: 'p',
            text: '结论：约分需要分母非零。在解方程或求极限时，要单独讨论分母为零的点，不能把约分后的式子当作与原式完全等价的函数。',
          },
        ],
      },
      {
        no: 4,
        blocks: [
          { t: 'h1', text: '3 配方法：一个无需附加条件的恒等式' },
          {
            t: 'prop',
            id: 'prop-square',
            title: '命题 3.1（配方恒等式）',
            text: '对任意实数 x 与 b，有 x²+2bx=(x+b)²−b²。',
            ask: 'cond-identity',
          },
          { t: 'formula', tex: String.raw`x^2+2bx=(x+b)^2-b^2`, num: '(3.1)' },
          {
            t: 'p',
            id: 'p-square-why',
            text: '该恒等式由展开 (x+b)²−b²=x²+2bx+b²−b² 直接得到，对一切实数 x、b 成立，不需要 x≥0 或分母非零之类的附加条件。',
            ask: 'cond-identity',
          },
          {
            t: 'p',
            text: '这说明“是否需要附加条件”取决于变形本身：配方是恒等变形；开方、约分、乘除以含变量的分母则需要额外条件。判断标准是变形前后定义域与符号是否被改变。',
          },
        ],
      },
      {
        no: 5,
        blocks: [
          { t: 'h1', text: '4 核查清单与证据' },
          {
            t: 'list',
            ordered: false,
            items: [
              '开方前确认被开方数与结果的符号；',
              '约分前确认分母不为零，并单独讨论零点；',
              '配方恒等式可在任意实数范围内使用；',
              '所有结论都应写在原定义域内，并给出反例核验。',
            ],
          },
          {
            t: 'p',
            text: '本讲义为离线演示自撰材料。三个案例的反例与证据均可在第 2–4 页核对，不引用外部论文；页面中的反例可用具体数值复算。',
          },
          { t: 'quote', text: '演示说明：右侧“公式检查”是离线演示的审核结论，不是模型实时生成。' },
        ],
      },
    ],
    qa: {
      'cond-def': {
        id: 'cond-def',
        kind: '定义',
        question: '√(x²) 等于 x 吗？',
        status: 'needs-condition',
        statusLabel: '需要补充条件（x≥0）',
        summary: '由算术平方根的定义，√(x²) 恒为非负数，因此它等于 |x| 而不是 x；只有 x≥0 时两者才相等。',
        judgment: '结论：√(x²)=x 只在 x≥0 时成立；对一切实数成立的原式应为 √(x²)=|x|。',
        keyPoints: [
          '定义 1.1：√ 表示算术平方根，结果非负；',
          '命题 1.2：对任意实数 x，√(x²)=|x|；',
          '反例：x=−2 时左边为 2、右边为 −2，2≠−2。',
        ],
        evidence: [
          { paperId: 'cond-formula', page: 2, block: 'def-sqrt', label: '第 2 页 · 定义 1.1' },
          { paperId: 'cond-formula', page: 2, block: 'prop-sqrt', label: '第 2 页 · 命题 1.2' },
          { paperId: 'cond-formula', page: 2, block: 'p-sqrt-counter', label: '第 2 页 · 反例' },
        ],
        note: '若题目限定 x≥0，则 √(x²)=x 成立；离开该条件就不能直接化简。',
        suggestions: ['cond-frac', 'cond-identity'],
      },
      'cond-frac': {
        id: 'cond-frac',
        kind: '定义',
        question: '约分需要什么条件？',
        status: 'needs-condition',
        statusLabel: '需要补充条件（分母≠0）',
        summary: '约分是恒等变形，其前提是分式有意义：分母不为零。被约去的因式为零的点必须单独讨论。',
        judgment: '结论：(x²−1)/(x−1)=x+1 仅在 x≠1 时成立；在 x=1 处原式无定义。',
        keyPoints: [
          '定义 2.1：分式有意义的条件是分母不为零；',
          '命题 2.2：约分后表达式定义域可能扩大；',
          '反例：x=1 时原式分母为 0，无定义。',
        ],
        evidence: [
          { paperId: 'cond-formula', page: 3, block: 'def-frac', label: '第 3 页 · 定义 2.1' },
          { paperId: 'cond-formula', page: 3, block: 'prop-frac', label: '第 3 页 · 命题 2.2' },
          { paperId: 'cond-formula', page: 3, block: 'p-frac-counter', label: '第 3 页 · 反例' },
        ],
        note: '在解方程时，约分可能引入“增根”，必须回代原式检验。',
        suggestions: ['cond-def', 'cond-identity'],
      },
      'cond-identity': {
        id: 'cond-identity',
        kind: '证明段落',
        question: '配方恒等式为什么不需要附加条件？',
        status: 'verified',
        statusLabel: '已验证（恒等式可展开核对）',
        summary: '配方是恒等变形：展开右边即可验证等式，对任意实数 x、b 成立，因此不需要定义域或符号条件。',
        judgment: '结论：x²+2bx=(x+b)²−b² 对一切实数成立；这是一个恒等式，不是条件等式。',
        keyPoints: [
          '展开 (x+b)²−b²=x²+2bx+b²−b²=x²+2bx；',
          '等式两边的定义域都是全体实数；',
          '与开方、约分不同，配方不改变定义域或符号。',
        ],
        evidence: [
          { paperId: 'cond-formula', page: 4, block: 'prop-square', label: '第 4 页 · 命题 3.1' },
          { paperId: 'cond-formula', page: 4, block: 'p-square-why', label: '第 4 页 · 说明' },
        ],
        note: '配方后再开方或约分时仍可能引入条件；条件来自后续步骤，而不是配方本身。',
        suggestions: ['cond-def'],
      },
    },
    tools: {
      verify: {
        status: 'basic',
        statusLabel: '基本成立（依赖定义域声明）',
        summary: '三个变形的判断整体正确：开方与约分需要附加条件，配方是恒等式。建议在最终答案中显式写出定义域。',
        keyPoints: ['√(x²)=|x|，x≥0 时才等于 x；', '约分需分母非零；', '配方恒等式无需附加条件。'],
        evidence: [
          { paperId: 'cond-formula', page: 2, block: 'prop-sqrt', label: '第 2 页 · 命题 1.2' },
          { paperId: 'cond-formula', page: 3, block: 'prop-frac', label: '第 3 页 · 命题 2.2' },
        ],
      },
      citations: {
        status: 'supported',
        statusLabel: '证据充分（仅项目内材料）',
        summary: '三个案例的证据都来自本讲义页面，不涉及外部文献；若要引用，请使用“随包演示讲义《三个常见公式的条件漏洞》第 N 页”的格式。',
        keyPoints: ['无外部文献伪造；', '反例与命题都能在随包页面核对；', '不生成 DOI 或外部链接。'],
        evidence: [
          { paperId: 'cond-formula', page: 2, block: 'p-sqrt-counter', label: '第 2 页 · 反例' },
          { paperId: 'cond-formula', page: 4, block: 'prop-square', label: '第 4 页 · 命题 3.1' },
        ],
      },
      latex: {
        status: 'info',
        statusLabel: '需要补充说明',
        summary: '写作草稿《公式适用条件核查笔记》只写了结论，缺少反例与定义域说明；建议把 x=−2 的反例补进正文。',
        keyPoints: ['草稿缺少反例；', '建议补充“√(x²)=|x|”的定义依据；', '补写后需重新编译核对。'],
        evidence: [{ paperId: 'cond-formula', page: 2, block: 'p-sqrt-counter', label: '第 2 页 · 反例' }],
        diff: {
          file: 'main.tex',
          line: 10,
          removed: '对任意实数 $x$，有 $\\sqrt{x^2}=|x|$；只有当 $x\\ge 0$ 时才有 $\\sqrt{x^2}=x$。',
          added: '对任意实数 $x$，有 $\\sqrt{x^2}=|x|$；只有当 $x\\ge 0$ 时才有 $\\sqrt{x^2}=x$。反例：$x=-2$ 时 $\\sqrt{4}=2\\ne -2$。',
          note: '接受后重新编译，可在预览中核对。',
        },
      },
      translate: {
        status: 'info',
        statusLabel: '离线审核译文',
        summary: '命题 1.2 的英文译稿（保持数学记号不变）。',
        en: 'For every real number x, one has sqrt(x^2) = |x|; moreover sqrt(x^2) = x holds if and only if x >= 0.',
        keyPoints: ['数学记号保持原样；', '术语：arithmetic square root → 算术平方根；domain → 定义域。'],
        evidence: [{ paperId: 'cond-formula', page: 2, block: 'prop-sqrt', label: '第 2 页 · 命题 1.2' }],
      },
    },
  },

  'write-lecture': {
    id: 'write-lecture',
    projectId: 'p-writing',
    title: '从草稿到可编译 PDF：写作工程讲义',
    tabTitle: '写作工程讲义',
    short: '写作工程',
    authors: 'Mathesis 演示项目组',
    year: 2026,
    meta: `${RESEARCH_DISCLAIMER} · 3 页`,
    fileName: 'writing-workflow.pdf',
    defaultPage: 3,
    pages: [
      {
        no: 1,
        blocks: [
          {
            t: 'title',
            title: '从草稿到可编译 PDF：写作工程讲义',
            sub: '多文件 LaTeX 工程、编译日志与错误恢复',
            author: '随包演示讲义（自撰，非外部论文）',
            date: '2026 年 11 月 · 演示版',
          },
          { t: 'h3', text: '摘要' },
          {
            t: 'p',
            text: '本讲义说明离线演示写作工程的组成：main.tex、sections 目录、refs.bib 与编译日志。示例均可在本演示的“写作”工作区复现：编辑、保存、编译、查看日志并下载真实 PDF。',
          },
          { t: 'quote', text: '写作原则：AI 改稿必须先展示差异再接受；编译失败保留上次成功产物；日志点击可定位文件与行号。' },
        ],
      },
      {
        no: 2,
        blocks: [
          { t: 'h1', text: '1 多文件工程结构' },
          {
            t: 'p',
            text: '根文件 main.tex 只保留导言区、标题与 \input 指令；sections 目录下的文件各写一节；refs.bib 保存项目内引用条目。编译时按 \input 顺序展开，再解析章节、公式与引用。',
          },
          {
            t: 'list',
            id: 'p-write-structure',
            ordered: true,
            items: [
              '读取工程文件与导言区宏包；',
              '按 \input 顺序展开正文；',
              '解析章节、公式、列表与引用键；',
              '检测未定义命令、未定义引用与花括号配对；',
              '排版预览并生成 PDF 产物。',
            ],
          },
          {
            t: 'p',
            text: '本演示的编译器是离线 XeLaTeX 常用命令子集，不支持完整 TeX 宏语言；遇到不支持的命令会给出可定位的错误，而不是静默失败。',
          },
        ],
      },
      {
        no: 3,
        blocks: [
          { t: 'h1', text: '2 一个可恢复的编译错误' },
          {
            t: 'p',
            id: 'p-qed-error',
            text: '\\qedhere 由 amsthm 宏包提供。若导言区没有 \\usepackage{amsthm}，编译器会报“未定义的控制序列”。错误日志给出文件名与行号，点击即可定位。',
            ask: 'write-qed',
          },
          {
            t: 'prop',
            id: 'prop-write-square',
            title: '命题 2.1（示例证明段落）',
            text: '对任意实数 x 与 b，有 x²+2bx=(x+b)²−b²。',
          },
          {
            t: 'proof',
            id: 'proof-write',
            label: '证明',
            text: '展开右边：(x+b)²−b²=x²+2bx+b²−b²=x²+2bx，故等式成立。证明结束时应给出证毕符号，例如 \\qedhere 或 \\qed。',
            ask: 'write-proof',
          },
          {
            t: 'p',
            id: 'p-qed-fix',
            text: '修复方式有两种：一是在导言区加入 \\usepackage{amsthm}，二是删除该命令。两种方式都必须重新编译，并核对预览与下载 PDF 都指向最新成功版本。',
            ask: 'write-qed',
          },
          {
            t: 'p',
            text: '写作建议：所有 AI 改稿先展示差异再接受或拒绝；编译失败时保留上次成功产物；日志中的错误条目可点击定位到对应文件与行号。',
          },
        ],
      },
    ],
    qa: {
      'write-qed': {
        id: 'write-qed',
        kind: '证明段落',
        question: '讲义里如何处理可恢复的编译错误？',
        status: 'verified',
        statusLabel: '已验证（写作工作区可复现）',
        summary: '讲义要求先定位错误，再选择修复方式并重新编译；失败期间保留上次成功产物，日志可点击定位。',
        judgment: '结论：缺少 amsthm 时 \\qedhere 报错；添加宏包或删除命令并重新编译即可恢复。',
        keyPoints: [
          '未定义命令会给出文件与行号；',
          '修复方式：加入 \\usepackage{amsthm} 或删除该命令；',
          '编译失败时保留上次成功预览，重新编译成功后更新。',
        ],
        evidence: [
          { paperId: 'write-lecture', page: 3, block: 'p-qed-error', label: '第 3 页 · 错误说明' },
          { paperId: 'write-lecture', page: 3, block: 'p-qed-fix', label: '第 3 页 · 修复方式' },
        ],
        note: '本演示的写作工作区复现了同一错误链路，可在“写作”中实际操作。',
        suggestions: ['write-proof'],
      },
      'write-proof': {
        id: 'write-proof',
        kind: '证明段落',
        question: '示例证明段落如何收尾？',
        status: 'verified',
        statusLabel: '已验证（展开可核对）',
        summary: '示例证明由展开右边完成，末尾应给出证毕符号；证毕符号依赖 amsthm 宏包。',
        judgment: '结论：证明步骤正确；收尾命令 \\qedhere 需要 amsthm 支持。',
        keyPoints: [
          '证明只用一次代数展开；',
          '证毕符号是排版需求，不影响命题成立；',
          '若宏包缺失，应修复编译配置而不是删掉证明结论。',
        ],
        evidence: [
          { paperId: 'write-lecture', page: 3, block: 'proof-write', label: '第 3 页 · 示例证明' },
          { paperId: 'write-lecture', page: 3, block: 'prop-write-square', label: '第 3 页 · 命题 2.1' },
        ],
        note: '写作时建议先完成语义，再处理排版命令，避免因排版问题中断写作。',
        suggestions: ['write-qed'],
      },
    },
    tools: {
      verify: {
        status: 'basic',
        statusLabel: '基本成立（示例可复现）',
        summary: '示例证明与命题自洽，错误说明与写作工作区的实际编译行为一致。',
        keyPoints: ['命题由展开直接验证；', '错误来自 amsthm 依赖而非数学内容；', '修复后需重新编译核对。'],
        evidence: [
          { paperId: 'write-lecture', page: 3, block: 'proof-write', label: '第 3 页 · 示例证明' },
        ],
      },
      citations: {
        status: 'supported',
        statusLabel: '证据充分（仅项目内材料）',
        summary: '写作讲义不引用外部文献；写作工程中的 refs.bib 只保存项目内演示讲义条目。',
        keyPoints: ['无外部引用；', 'refs.bib 中的条目均为随包演示材料；', '不生成未验证 DOI。'],
        evidence: [{ paperId: 'write-lecture', page: 2, block: 'p-write-structure', label: '第 2 页 · 工程结构' }],
      },
      latex: {
        status: 'info',
        statusLabel: '需要补充说明',
        summary: '写作草稿已包含证明段落，但缺少证毕符号；建议按讲义第 3 页在证明末尾加入 \\qedhere，并确认 amsthm 宏包。',
        keyPoints: ['草稿缺少证毕符号；', '加入前需确认 amsthm；', '应用后需重新编译。'],
        evidence: [{ paperId: 'write-lecture', page: 3, block: 'p-qed-error', label: '第 3 页 · 错误说明' }],
        diff: {
          file: 'main.tex',
          line: 16,
          removed: '（无）',
          added: '\\usepackage{amsthm}',
          note: '在导言区加入宏包后再使用 \\qedhere。',
        },
      },
      translate: {
        status: 'info',
        statusLabel: '离线审核译文',
        summary: '摘要段落英文译稿。',
        en: 'This lecture explains the structure of the offline writing workspace: main.tex, the sections directory, refs.bib and the compile log. The example can be reproduced in the Write workspace: edit, save, compile, inspect the log and download the generated PDF.',
        keyPoints: ['术语：compile log → 编译日志；preview → 预览。'],
        evidence: [{ paperId: 'write-lecture', page: 1, block: 'p-abstract', label: '第 1 页 · 摘要' }],
      },
    },
  },
}

/* ==========================================================================
 * 3. 公式检查案例（离线演示审核结论；含真实数值核验）
 * ========================================================================== */
export const formulaChecks = [
  {
    id: 'sqrt-square',
    title: '√(x²) = x',
    subtitle: '缺少 x≥0 条件',
    claim: '命题：对一切实数 x，都有 √(x²)=x。',
    status: 'needs-condition',
    statusLabel: '需要补充条件',
    judgment: '不成立。正确结论是 √(x²)=|x|；只有当 x≥0 时才有 √(x²)=x。',
    basis: '算术平方根的定义：√t 表示非负平方根，故 √(x²) 恒为非负数；而 x 可以为负。',
    counterexample: {
      x: -2,
      computed: 2,
      expected: -2,
      text: '取 x=−2：左边 √((−2)²)=√4=2，右边 x=−2，2≠−2，命题被推翻。',
    },
    evidence: [
      { paperId: 'cond-formula', page: 2, block: 'def-sqrt', label: '《三个常见公式的条件漏洞》第 2 页 · 定义 1.1' },
      { paperId: 'cond-formula', page: 2, block: 'p-sqrt-counter', label: '第 2 页 · 反例' },
    ],
    suggestion: '把结论改为 √(x²)=|x|；若题目限定 x≥0，再化简为 x。',
    engine: '离线规则：代入反例 x=−2 并用 Math.sqrt 数值核验',
  },
  {
    id: 'cancel-zero',
    title: '(x²−1)/(x−1) = x+1',
    subtitle: '约分需要分母非零',
    claim: '命题：对一切实数 x，(x²−1)/(x−1)=x+1。',
    status: 'needs-condition',
    statusLabel: '需要补充条件',
    judgment: '不成立。只有当 x≠1 时等式成立；x=1 时原式分母为零、无定义。',
    basis: '分式有意义的条件是分母不为零；约分会消去因式 (x−1)，从而改变表达式的定义域。',
    counterexample: {
      x: 1,
      computed: Number.NaN,
      expected: 2,
      text: '取 x=1：原式 (1−1)/(1−1)=0/0 无定义，而右边 x+1=2，等式两边意义不同。',
    },
    evidence: [
      { paperId: 'cond-formula', page: 3, block: 'def-frac', label: '《三个常见公式的条件漏洞》第 3 页 · 定义 2.1' },
      { paperId: 'cond-formula', page: 3, block: 'p-frac-counter', label: '第 3 页 · 反例' },
    ],
    suggestion: '补上 x≠1 条件；解方程时回代原式排除增根。',
    engine: '离线规则：在 x=1 处用数值求值检测分母为 0',
  },
  {
    id: 'complete-square',
    title: 'x²+2bx = (x+b)²−b²',
    subtitle: '正确的配方恒等式',
    claim: '命题：对任意实数 x、b，x²+2bx=(x+b)²−b²。',
    status: 'verified',
    statusLabel: '已验证',
    judgment: '成立。这是恒等变形：展开右边即得左边，两边定义域都是全体实数，不需要附加条件。',
    basis: '展开 (x+b)²−b²=x²+2bx+b²−b²=x²+2bx，等式对一切实数成立。',
    counterexample: {
      x: 1.5,
      b: 2,
      text: '数值抽样：取 b=2 与 x=−3, −0.5, 0, 1.5, 4，左右两边计算值逐一相等（见下方核验表）。',
      samples: [
        { x: -3, left: 9 - 12, right: 1 - 4 },
        { x: -0.5, left: 0.25 - 2, right: 2.25 - 4 },
        { x: 0, left: 0, right: 4 - 4 },
        { x: 1.5, left: 2.25 + 6, right: 12.25 - 4 },
        { x: 4, left: 16 + 16, right: 36 - 4 },
      ],
    },
    evidence: [
      { paperId: 'cond-formula', page: 4, block: 'prop-square', label: '《三个常见公式的条件漏洞》第 4 页 · 命题 3.1' },
      { paperId: 'cond-formula', page: 4, block: 'p-square-why', label: '第 4 页 · 恒等式说明' },
    ],
    suggestion: '恒等式可直接使用；若后续步骤再开方或约分，需要重新检查条件。',
    engine: '离线规则：代入 5 组 (x,b) 用数值等式核验',
  },
]

/* ==========================================================================
 * 4. 写作工程（多文件 LaTeX + 可恢复错误脚本）
 * ========================================================================== */
const FEM_MAIN = String.raw`\documentclass{article}
\usepackage{ctex}
\usepackage{amsmath, amssymb}
\usepackage{graphicx}

\title{有限元方法中椭圆问题的误差估计}
\author{Xu Chao}
\date{2026 年 11 月 21 日}

\begin{document}

\maketitle

\begin{abstract}
本文讨论有限元方法求解椭圆型问题时的误差估计。基于 Céa 引理与插值理论，
我们给出 $H^1$ 与 $L^2$ 范数下的最优收敛阶，并通过数值实验验证理论结果。
\end{abstract}

\input{sections/introduction}
\input{sections/theory}

\bibliographystyle{plain}
\bibliography{refs}

\end{document}
`

const FEM_INTRO = String.raw`\section{引言}

有限元方法（Finite Element Method, FEM）是求解偏微分方程的经典数值方法，
在工程与科学计算中得到了广泛应用。设 $\Omega \subset \mathbb{R}^d$ 为有界区域，
考虑如下椭圆方程：
\begin{equation}
  -\nabla \cdot (a(x)\nabla u) = f \quad \text{in } \Omega,
\end{equation}
其中 $a(x)$ 满足一致椭圆条件。本文关注有限元解的误差估计。
`

const FEM_THEORY = String.raw`\section{有限元误差估计}

记 $V = H_0^1(\Omega)$，$V_h \subset V$ 为分片线性有限元空间。
双线性型 $a(u,v)$ 在 $V$ 上连续且强制，因此离散问题存在唯一解。
已有工作的误差估计可参考 \cite{Cea1971}。

\begin{equation}
  \|u - u_h\|_V \le \frac{M}{\alpha} \inf_{v_h \in V_h} \|u - v_h\|_V .
\end{equation}

\begin{proof}
由 Galerkin 正交性 $a(u-u_h,v_h)=0$ 与 V-椭圆性 $a(v,v)\ge \alpha\|v\|_V^2$，
可得误差估计
\[
  \|u-u_h\|_V \le \frac{M}{\alpha}\inf_{v_h\in V_h}\|u-v_h\|_V .
\]
\end{proof}

\section{数值实验}
数值实验见随包演示讲义《有限元误差的数值实验》，此处不再展开。
`

const FEM_BIB = String.raw`@misc{demo-cea,
  author = {Mathesis 演示项目组},
  title  = {变分形式与 Céa 引理（随包演示讲义，自撰）},
  year   = {2026},
  note   = {离线演示材料，非外部论文}
}

@misc{demo-num,
  author = {Mathesis 演示项目组},
  title  = {有限元误差的数值实验（随包演示讲义，自撰）},
  year   = {2026},
  note   = {离线演示材料，非外部论文}
}
`

const COND_MAIN = String.raw`\documentclass{article}
\usepackage{ctex}
\usepackage{amsmath}

\title{公式适用条件核查笔记}
\author{Xu Chao}
\date{2026 年 11 月 21 日}

\begin{document}

\maketitle

\section{平方根}
对任意实数 $x$，有 $\sqrt{x^2}=|x|$；只有当 $x\ge 0$ 时才有 $\sqrt{x^2}=x$。

\section{约分}
分式有意义要求分母不为零；约分前应先确定定义域。

\section{配方}
对任意实数 $x$ 与 $b$，有 $x^2+2bx=(x+b)^2-b^2$。

\end{document}
`

const COND_BIB = String.raw`@misc{demo-condition,
  author = {Mathesis 演示项目组},
  title  = {三个常见公式的条件漏洞（随包演示讲义，自撰）},
  year   = {2026},
  note   = {离线演示材料，非外部论文}
}
`

const WRITING_NOTE_MAIN = String.raw`\documentclass{article}
\usepackage{ctex}
\usepackage{amsmath, amsthm}

\title{写作与编译实验记录}
\author{Xu Chao}
\date{2026 年 11 月 21 日}

\begin{document}

\maketitle

\section{实验目的}
记录多文件 LaTeX 工程的编辑、编译与错误恢复过程。

\section{示例证明}
\begin{proof}
对任意实数 $x$ 与 $b$，展开 $(x+b)^2-b^2=x^2+2bx$，命题成立。
\end{proof}

\section{结论}
编译失败时保留上次成功产物，并通过编译日志定位错误。

\end{document}
`

const WRITING_NOTE_BIB = String.raw`@misc{demo-writing,
  author = {Mathesis 演示项目组},
  title  = {从草稿到可编译 PDF（随包演示讲义，自撰）},
  year   = {2026},
  note   = {离线演示材料，非外部论文}
}
`

export const writingProjects = {
  'p-fem': {
    id: 'p-fem',
    title: '有限元方法中椭圆问题的误差估计',
    files: {
      'main.tex': { kind: 'tex', content: FEM_MAIN },
      'sections/introduction.tex': { kind: 'tex', content: FEM_INTRO },
      'sections/theory.tex': { kind: 'tex', content: FEM_THEORY },
      'refs.bib': { kind: 'bib', content: FEM_BIB },
    },
    assets: ['figures/mesh.png', 'figures/error_plot.pdf', 'tables/'],
    patches: [
      {
        id: 'qed-close',
        title: '在证明末尾加入证毕符号',
        capability: '改进建议',
        summary: '讲义建议证明以证毕符号收尾，使排版与数学表达一致。该命令由 amsthm 宏包提供。',
        reason: '当前证明段落结束于公式环境之后，没有证毕符号；加入 \\qedhere 可让证毕符号与公式同行。',
        diff: {
          file: 'sections/theory.tex',
          removed: [],
          added: ['\\qedhere'],
          note: '插入到证明环境内最后一个公式之后；若导言区未加载 amsthm，编译会报未定义的控制序列。',
        },
        patch: { mode: 'insertAfter', file: 'sections/theory.tex', anchor: '\\]', text: '\\qedhere' },
        afterApply: '已插入 \\qedhere，正在自动编译。若出现未定义命令错误，请在“LaTeX 错误解释”中查看修复方案。',
      },
      {
        id: 'polish-abstract',
        title: '摘要语句润色',
        capability: '语言润色',
        summary: '把“求解椭圆型问题”改为“求解椭圆型偏微分方程”，语义更准确；保留数学记号与引用。',
        reason: '润色建议只调整措辞，不改变结论、公式与引用。',
        diff: {
          file: 'main.tex',
          removed: ['本文讨论有限元方法求解椭圆型问题时的误差估计。'],
          added: ['本文研究有限元方法求解椭圆型偏微分方程时的误差估计。'],
          note: '保持 \\(H^1\\) 与 \\(L^2\\) 记号不变。',
        },
        patch: {
          mode: 'replace',
          file: 'main.tex',
          find: '本文讨论有限元方法求解椭圆型问题时的误差估计。',
          replace: '本文研究有限元方法求解椭圆型偏微分方程时的误差估计。',
        },
        afterApply: '润色已应用，正在自动编译。',
      },
      {
        id: 'translate-abstract',
        title: '摘要翻译成英文',
        capability: '翻译成英文',
        summary: '把摘要译为英文，数学记号与引用保持原样。',
        reason: '翻译保持术语一致：finite element method、Céa 引理、convergence order。',
        diff: {
          file: 'main.tex',
          removed: ['本文讨论有限元方法求解椭圆型问题时的误差估计。基于 Céa 引理与插值理论，', '我们给出 $H^1$ 与 $L^2$ 范数下的最优收敛阶，并通过数值实验验证理论结果。'],
          added: ['This paper studies error estimates of the finite element method for elliptic problems. Based on Céa\'s lemma and interpolation theory,', 'we derive optimal convergence orders in the $H^1$ and $L^2$ norms, and verify the theoretical results by numerical experiments.'],
          note: '数学记号 $H^1$、$L^2$ 保持不变。',
        },
        patch: {
          mode: 'replace',
          file: 'main.tex',
          find: '本文讨论有限元方法求解椭圆型问题时的误差估计。基于 Céa 引理与插值理论，\n我们给出 $H^1$ 与 $L^2$ 范数下的最优收敛阶，并通过数值实验验证理论结果。',
          replace: 'This paper studies error estimates of the finite element method for elliptic problems. Based on Céa\'s lemma and interpolation theory,\nwe derive optimal convergence orders in the $H^1$ and $L^2$ norms, and verify the theoretical results by numerical experiments.',
        },
        afterApply: '摘要已替换为英文，正在自动编译。',
      },
    ],
  },
  'p-condition': {
    id: 'p-condition',
    title: '公式适用条件核查笔记',
    files: {
      'main.tex': { kind: 'tex', content: COND_MAIN },
      'refs.bib': { kind: 'bib', content: COND_BIB },
    },
    assets: [],
    patches: [],
  },
  'p-writing': {
    id: 'p-writing',
    title: '写作与编译实验记录',
    files: {
      'main.tex': { kind: 'tex', content: WRITING_NOTE_MAIN },
      'refs.bib': { kind: 'bib', content: WRITING_NOTE_BIB },
    },
    assets: [],
    patches: [],
  },
}

/** 自定义项目（演示版新建）的起步工程：只含一个可编译的最小模板。 */
export function starterWritingFiles(name = '新建科研项目') {
  return {
    'main.tex': {
      kind: 'tex',
      content: String.raw`\documentclass{article}
\usepackage{ctex}
\usepackage{amsmath}

\title{${name}}
\author{Xu Chao}
\date{2026 年 11 月 21 日}

\begin{document}

\maketitle

\begin{abstract}
这是离线演示中新建项目的起步草稿。可以直接编辑、保存、编译并下载 PDF。
\end{abstract}

\section{引言}
在此写下研究问题与动机。

\section{方法}
在此写下主要推导。

\end{document}
`,
    },
    'refs.bib': { kind: 'bib', content: '@misc{demo-starter,\n  author = {Mathesis 演示项目组},\n  title = {离线演示材料},\n  year = {2026}\n}\n' },
  }
}

export const CUSTOM_PROJECT_TEMPLATE = {
  name: '新建科研项目',
  desc: '用户新建的离线演示项目',
  memory: '尚未导入文献。可先从随包演示讲义导入一篇材料，再开始阅读与写作。',
  cover: 'writing',
}

/* ==========================================================================
 * 5. 查询辅助
 * ========================================================================== */
export function findProject(id) {
  return researchProjects.find((p) => p.id === id) || null
}

export function findPaper(id) {
  return researchPapers[id] || null
}

/** 项目可用文献（含用户导入项）；导入记录保存在项目对象的 imported 数组。 */
export function projectPapers(project) {
  if (!project) return []
  const ids = [...new Set([...(project.papers || []), ...(project.imported || [])])]
  return ids.map((id) => researchPapers[id]).filter(Boolean)
}

export function paperPage(paper, page) {
  if (!paper) return null
  const idx = Math.min(Math.max((page || 1) - 1, 0), paper.pages.length - 1)
  return paper.pages[idx]
}

export function findBlock(paperId, pageNo, blockId) {
  const paper = findPaper(paperId)
  if (!paper) return null
  const page = paper.pages.find((p) => p.no === pageNo)
  if (!page) return null
  const idx = page.blocks.findIndex((b, i) => (b.id || `${paperId}-${pageNo}-${i}`) === blockId)
  return idx >= 0 ? { page, block: page.blocks[idx], index: idx } : null
}

export function blockId(paperId, pageNo, block, index) {
  return block.id || `${paperId}-${pageNo}-${index}`
}

/** 证据引文：从随包页面原文提取，保证界面引文与页面内容一致。 */
export function blockQuote(paperId, pageNo, id, max = 160) {
  const found = findBlock(paperId, pageNo, id)
  if (!found) return ''
  const raw = plainBlockText(found.block)
  return raw.length > max ? raw.slice(0, max) + '…' : raw
}

export function plainBlockText(block) {
  if (!block) return ''
  const clean = (s) => String(s || '').replace(/\$([^$]*)\$/g, '$1').replace(/\*\*/g, '').trim()
  if (block.t === 'list') return (block.items || []).map(clean).join('；')
  if (block.t === 'table') return [block.caption, (block.head || []).join(' | '), ...(block.rows || []).map((r) => r.join(' | ')), block.note].filter(Boolean).join('；')
  if (block.t === 'formula') return block.tex || ''
  if (block.t === 'title') return [block.title, block.sub].filter(Boolean).join('：')
  return clean(block.text || '')
}

export function paperIndex(paperId) {
  const ids = Object.keys(researchPapers)
  const i = ids.indexOf(paperId)
  return i < 0 ? 1 : i + 1
}

/** 语境问答匹配：优先命中当前论文，再回退到同项目其它论文。 */
export function matchQA(projectId, paperId, text) {
  const q = String(text || '').trim()
  if (!q) return null
  const project = findProject(projectId)
  const papers = projectPapers(project)
  const current = findPaper(paperId)
  const order = [current, ...papers].filter((p, i, arr) => p && arr.indexOf(p) === i)
  let best = null
  let bestScore = 0
  for (const paper of order) {
    for (const qa of Object.values(paper.qa || {})) {
      let score = 0
      for (const kw of qaKeywords(qa)) {
        if (kw && q.includes(kw)) score += kw.length >= 3 ? 2 : 1
      }
      if (score > bestScore) {
        bestScore = score
        best = { paper, qa }
      }
    }
  }
  if (best && bestScore > 0) return { paperId: best.paper.id, qaId: best.qa.id, qa: best.qa }
  return null
}

function qaKeywords(qa) {
  const base = [qa.kind, qa.question]
  const extra = {
    'cea-thm': ['条件', 'céa', 'cea', '引理', '定理', '椭圆', 'α', '强制'],
    'cea-proof': ['证明', '证明段落', '哪两步', '推导', '正交性'],
    'cea-def': ['定义', 'v-椭圆', '强制', '什么意思', '椭圆性'],
    'cea-conv': ['收敛阶', '推论', '收敛', '阶'],
    'num-order': ['收敛阶', '表 1', '能量范数', '一阶'],
    'num-l2': ['l2', '二阶', '对偶', '收敛阶'],
    'cond-def': ['√', '根号', '平方根', 'x²', '定义', '等于 x'],
    'cond-frac': ['约分', '分母', '定义域', '条件'],
    'cond-identity': ['配方', '恒等式', '条件', '为什么'],
    'write-qed': ['编译错误', 'qedhere', '错误', '修复', '恢复'],
    'write-proof': ['证明', '收尾', '证毕', 'qedhere'],
  }
  return [...base, ...(extra[qa.id] || [])].filter(Boolean)
}

export function qaById(paperId, qaId) {
  const paper = findPaper(paperId)
  return paper?.qa?.[qaId] || null
}

export function findQAOwning(projectId, qaId) {
  const project = findProject(projectId)
  for (const paper of projectPapers(project)) {
    if (paper.qa?.[qaId]) return { paper, qa: paper.qa[qaId] }
  }
  for (const paper of Object.values(researchPapers)) {
    if (paper.qa?.[qaId]) return { paper, qa: paper.qa[qaId] }
  }
  return null
}

export function formulaCheckById(id) {
  return formulaChecks.find((c) => c.id === id) || null
}

/* ==========================================================================
 * 6. 状态辅助
 * ========================================================================== */
export function formatClock(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatNoteTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return `今天 ${formatClock(ts)}`
  const yest = new Date(now.getTime() - 86400000)
  if (d.toDateString() === yest.toDateString()) return `昨天 ${formatClock(ts)}`
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function seedNotes(projectId) {
  const out = []
  for (const p of researchProjects) {
    for (const n of p.seedNotes || []) {
      if (!projectId || n.projectId === projectId) out.push(n)
    }
  }
  return out
}

/* ==========================================================================
 * 7. 离线 LaTeX 编译器（子集）：诊断 / 解析 / 分页 / PDF 文档
 * ========================================================================== */

const BASE_COMMANDS = new Set(
  String.raw`documentclass usepackage title author date begin end maketitle section subsection subsubsection input bibliography bibliographystyle cite label ref eqref frac sqrt mathbb mathrm mathbf mathit text textbf textit emph item centering caption includegraphics href hline newpage newcommand renewcommand setlength quad qquad left right nabla cdot cdots ldots dots le ge ne leq geq approx sim in notin subset subseteq forall exists partial int sum prod lim to rightarrow leftarrow Rightarrow infinity pm times div cdot ast star circ alpha beta gamma delta epsilon varepsilon zeta eta theta lambda mu nu xi pi rho sigma tau phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega hbar ell operatorname displaystyle textstyle scriptstyle mathop limits nolimits nonumber tag notag label ref pageref linewidth textwidth columnwidth hspace vspace smallskip medskip bigskip italic bf it rm sf tt underline mbox hfil hfill par noindent indent protect relax expandafter csname endcsname mathrm boldsymbol mathcal mathfrak mathsf mathtt stackrel overset underset binom choose dfrac tfrac cfrac qed`.split(/\s+/),
)

const PACKAGE_COMMANDS = {
  amsthm: ['qedhere', 'qed'],
  amsmath: ['text', 'frac', 'dfrac', 'tfrac', 'binom', 'overset', 'underset', 'tag', 'nonumber', 'notag', 'eqref', 'boldsymbol', 'operatorname', 'limits', 'nolimits'],
  amssymb: ['mathbb', 'mathfrak', 'leqslant', 'geqslant', 'varnothing'],
  ctex: [],
  graphicx: ['includegraphics'],
  hyperref: ['href'],
  enumerate: [],
}

const BASE_ENVS = new Set(['document', 'abstract', 'equation', 'equation*', 'align', 'align*', 'itemize', 'enumerate', 'proof', 'theorem', 'lemma', 'corollary', 'definition', 'proposition', 'table', 'tabular', 'figure', 'center', 'displaymath', 'quote', 'verbatim'])

function stripComment(line) {
  let out = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      out += ch + line[i + 1]
      i++
      continue
    }
    if (ch === '%') break
    out += ch
  }
  return out
}

export function usePackages(files) {
  const pkgs = new Set()
  for (const content of Object.values(files)) {
    const src = String(content?.content ?? content ?? '')
    for (const m of src.matchAll(/\\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}/g)) {
      m[1].split(',').forEach((p) => pkgs.add(p.trim()))
    }
  }
  return pkgs
}

export function knownCommands(files) {
  const pkgs = usePackages(files)
  const set = new Set(BASE_COMMANDS)
  for (const p of pkgs) for (const c of PACKAGE_COMMANDS[p] || []) set.add(c)
  for (const content of Object.values(files)) {
    const src = String(content?.content ?? content ?? '')
    for (const m of src.matchAll(/\\(?:new|renew)command\*?\{?\\([a-zA-Z@]+)\}?/g)) set.add(m[1])
    for (const m of src.matchAll(/\\\def\\([a-zA-Z@]+)/g)) set.add(m[1])
  }
  return set
}

/**
 * 诊断工程：返回错误/警告/信息条目（不中断 UI）。
 * levels: error（终止编译）/ warning（编译成功但有警告）/ info
 */
export function validateLatexProject(files, { compiler = 'xelatex+bib' } = {}) {
  const errors = []
  const warnings = []
  const cmds = knownCommands(files)
  const pkgs = usePackages(files)
  const bibSrc = Object.values(files)
    .filter((f) => (f.kind || 'tex') === 'bib')
    .map((f) => String(f.content || ''))
    .join('\n')
  const bibKeys = new Set([...bibSrc.matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)].map((m) => m[1]))
  const labels = new Set()
  const refs = []
  for (const [path, file] of Object.entries(files)) {
    const kind = file.kind || (path.endsWith('.bib') ? 'bib' : path.endsWith('.cls') ? 'cls' : 'tex')
    if (kind !== 'tex') continue
    const lines = String(file.content || '').split('\n')
    const stack = []
    let envDepth = 0
    const envStack = []
    let hasDocBegin = false
    let hasDocEnd = false
    lines.forEach((raw, i) => {
      const lineNo = i + 1
      const line = stripComment(raw)
      // 花括号配对（跳过 \{ \} 转义）
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci]
        if (ci > 0 && line[ci - 1] === '\\') continue
        if (ch === '{') stack.push(lineNo)
        else if (ch === '}') {
          if (!stack.length) {
            errors.push({ level: 'error', file: path, line: lineNo, message: '多余的右花括号 }；编译终止。' })
          } else stack.pop()
        }
      }
      // 环境配对
      for (const m of line.matchAll(/\\\begin\{([^}]+)\}/g)) {
        envStack.push({ name: m[1], line: lineNo })
        envDepth++
        if (m[1] === 'document') hasDocBegin = true
        if (!BASE_ENVS.has(m[1])) warnings.push({ level: 'warning', file: path, line: lineNo, message: `未知环境 ${m[1]}；离线演示编译器可能无法排版。` })
      }
      for (const m of line.matchAll(/\\\end\{([^}]+)\}/g)) {
        if (m[1] === 'document') hasDocEnd = true
        const top = envStack.pop()
        if (!top || top.name !== m[1]) {
          errors.push({ level: 'error', file: path, line: lineNo, message: `环境不匹配：期望 \\\end{${top ? top.name : '?'}}，实际为 \\\end{${m[1]}}。` })
        }
        envDepth = Math.max(0, envDepth - 1)
      }
      // 未定义命令
      for (const m of line.matchAll(/\\([a-zA-Z@]+)/g)) {
        const name = m[1]
        if (cmds.has(name)) continue
        errors.push({
          level: 'error',
          file: path,
          line: lineNo,
          message: `未定义的控制序列：\\${name}；离线演示编译器不支持该命令（可用 amsthm 等宏包提供的命令需先在导言区加载）。`,
          code: 'undefined-command',
          command: name,
        })
      }
      // 未定义引用
      for (const m of line.matchAll(/\\\cite\{([^}]*)\}/g)) {
        m[1].split(',').forEach((keyRaw) => {
          const key = keyRaw.trim()
          if (key && !bibKeys.has(key)) {
            const close = [...bibKeys].find((k) => k.toLowerCase() === key.toLowerCase())
            warnings.push({
              level: 'warning',
              file: path,
              line: lineNo,
              message: `Citation '${key}' on page 1 undefined on input line ${lineNo}.`,
              code: 'undefined-citation',
              key,
              suggestion: close || [...bibKeys][0] || null,
            })
          }
        })
      }
      // labels / refs
      for (const m of line.matchAll(/\\\label\{([^}]+)\}/g)) labels.add(m[1])
      for (const m of line.matchAll(/\\(?:ref|eqref)\{([^}]+)\}/g)) refs.push({ key: m[1], file: path, line: lineNo })
      // \\input 文件存在性
      for (const m of line.matchAll(/\\\input\{([^}]+)\}/g)) {
        const name = m[1].trim()
        const candidates = [name, name.endsWith('.tex') ? name : `${name}.tex`]
        if (!candidates.some((c) => files[c])) {
          errors.push({ level: 'error', file: path, line: lineNo, message: `找不到被 \\\input 的文件：${name}。` })
        }
      }
    })
    if (stack.length) errors.push({ level: 'error', file: path, line: stack[0], message: '花括号未闭合；编译终止。' })
    if (envStack.length) errors.push({ level: 'error', file: path, line: envStack[envStack.length - 1].line, message: `环境 {${envStack[envStack.length - 1].name}} 未闭合。` })
    if (path === 'main.tex' && !hasDocBegin) errors.push({ level: 'error', file: path, line: 1, message: '缺少 \\begin{document}。' })
    if (path === 'main.tex' && !hasDocEnd) errors.push({ level: 'error', file: path, line: lines.length, message: '缺少 \\end{document}。' })
  }
  for (const r of refs) {
    if (!labels.has(r.key)) warnings.push({ level: 'warning', file: r.file, line: r.line, message: `Reference '${r.key}' on page 1 undefined on input line ${r.line}.`, code: 'undefined-ref' })
  }
  if (refs.some((r) => !labels.has(r.key)) && compiler !== 'xelatex') {
    warnings.push({ level: 'warning', file: 'main.tex', line: 1, message: 'There were undefined references.' })
  }
  if (warnings.some((w) => w.code === 'undefined-citation')) {
    warnings.push({ level: 'warning', file: 'main.tex', line: 1, message: 'There were undefined references.' })
  }
  return { errors, warnings, packages: [...pkgs], bibKeys: [...bibKeys] }
}

/** 展开 \\input 后的正文（用于解析与预览）。 */
export function expandLatex(files, mainFile = 'main.tex', depth = 0) {
  if (depth > 6) return ''
  const file = files[mainFile]
  if (!file) return ''
  const src = String(file.content || '')
  return src.replace(/\\(?:input|include)\{([^}]+)\}/g, (_, name) => {
    const clean = name.trim()
    const key = files[clean] ? clean : `${clean}.tex`
    if (!files[key]) return ''
    const inner = String(files[key].content || '')
    return '\n' + expandLatex(files, key, depth + 1) + '\n'
  })
}

/** 解析工程为预览/PDF 共用的文档模型。 */
export function parseLatexProject(files, mainFile = 'main.tex') {
  const merged = expandLatex(files, mainFile)
  const main = String(files[mainFile]?.content || merged)
  const preamble = main.slice(0, Math.max(0, main.indexOf('\\begin{document}')))
  const title = readCommandArg(preamble, 'title') || '未命名论文'
  const author = readCommandArg(preamble, 'author') || 'Xu Chao'
  const date = readCommandArg(preamble, 'date') || ''
  const bodyStart = merged.indexOf('\\begin{document}')
  const bodyEnd = merged.lastIndexOf('\\end{document}')
  const body = bodyStart >= 0 ? merged.slice(bodyStart + '\\begin{document}'.length, bodyEnd > 0 ? bodyEnd : merged.length) : merged
  const refKeys = Object.values(files)
    .filter((f) => (f.kind || '') === 'bib')
    .flatMap((f) => [...String(f.content || '').matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,/g)].map((m) => m[1]))
  const bibEntries = Object.values(files)
    .filter((f) => (f.kind || '') === 'bib')
    .flatMap((f) => parseBibEntries(String(f.content || '')))

  const preview = []
  const pdf = []
  const sections = []
  let sectionNo = 0
  let subNo = 0
  const lines = body.split('\n')
  let i = 0
  let para = []
  let curSection = null

  const flushPara = () => {
    const text = para.join(' ').trim()
    para = []
    if (!text) return
    const cleaned = cleanInlineForPreview(text, refKeys)
    const plain = cleanInlineForPdf(text, refKeys)
    if (!cleaned && !plain) return
    preview.push({ t: 'p', text: cleaned })
    pdf.push({ type: 'p', text: plain })
  }

  while (i < lines.length) {
    const raw = lines[i]
    const line = stripComment(raw).trim()
    if (!line) {
      flushPara()
      i++
      continue
    }
    if (/^\\\maketitle\b/.test(line)) {
      i++
      continue
    }
    const sec = line.match(/^\\\section\*?\{([^}]*)\}/)
    if (sec) {
      flushPara()
      sectionNo++
      subNo = 0
      const titleText = sec[1]
      sections.push({ level: 1, text: `${sectionNo} ${titleText}`, raw: line })
      preview.push({ t: 'h1', text: `${sectionNo} ${titleText}` })
      pdf.push({ type: 'h', text: `${sectionNo} ${titleText}` })
      curSection = `${sectionNo} ${titleText}`
      i++
      continue
    }
    const sub = line.match(/^\\\subsection\*?\{([^}]*)\}/)
    if (sub) {
      flushPara()
      subNo++
      sections.push({ level: 2, text: `${sectionNo}.${subNo} ${sub[1]}`, raw: line })
      preview.push({ t: 'h2', text: `${sectionNo}.${subNo} ${sub[1]}` })
      pdf.push({ type: 'h', text: `${sectionNo}.${subNo} ${sub[1]}` })
      i++
      continue
    }
    const subsub = line.match(/^\\\subsubsection\*?\{([^}]*)\}/)
    if (subsub) {
      flushPara()
      sections.push({ level: 3, text: subsub[1], raw: line })
      preview.push({ t: 'h3', text: subsub[1] })
      pdf.push({ type: 'h', text: subsub[1] })
      i++
      continue
    }
    const absBegin = line.match(/\\\begin\{abstract\}/)
    if (absBegin) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\\end\{abstract\}/.test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const text = buffer.join(' ').trim()
      if (text) {
        preview.push({ t: 'h3', text: '摘要' })
        preview.push({ t: 'p', text: cleanInlineForPreview(text, refKeys) })
        pdf.push({ type: 'h', text: '摘要' })
        pdf.push({ type: 'p', text: cleanInlineForPdf(text, refKeys) })
      }
      continue
    }
    if (/\\\begin\{equation\*?\}/.test(line)) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\\end\{equation\*?\}/.test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const tex = buffer.join(' ').trim()
      if (tex) {
        preview.push({ t: 'formula', tex })
        pdf.push({ type: 'formula', text: plainMath(tex) })
      }
      continue
    }
    const disp = line.match(/^\\\[(.*)$/)
    if (disp) {
      flushPara()
      let first = disp[1]
      if (/\\\]\s*$/.test(first)) {
        const tex = first.replace(/\\\]\s*$/, '').trim()
        if (tex) {
          preview.push({ t: 'formula', tex })
          pdf.push({ type: 'formula', text: plainMath(tex) })
        }
        i++
        continue
      }
      i++
      const buffer = first ? [first] : []
      while (i < lines.length && !/\\\]/.test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      if (i < lines.length) {
        const tail = stripComment(lines[i]).replace(/\\\].*/, '').trim()
        if (tail) buffer.push(tail)
      }
      i++
      const tex = buffer.join(' ').trim()
      if (tex) {
        preview.push({ t: 'formula', tex })
        pdf.push({ type: 'formula', text: plainMath(tex) })
      }
      continue
    }
    const listBegin = line.match(/\\\begin\{(itemize|enumerate)\}/)
    if (listBegin) {
      flushPara()
      const ordered = listBegin[1] === 'enumerate'
      i++
      const items = []
      while (i < lines.length && !/\\\end\{(?:itemize|enumerate)\}/.test(lines[i])) {
        const itemLine = stripComment(lines[i]).trim()
        const itemMatch = itemLine.match(/^\\\item\s*(.*)$/)
        if (itemMatch) items.push(itemMatch[1])
        else if (items.length && itemLine) items[items.length - 1] += ' ' + itemLine
        i++
      }
      i++
      if (items.length) {
        preview.push({ t: 'list', ordered, items: items.map((s) => cleanInlineForPreview(s, refKeys)) })
        pdf.push({ type: 'list', items: items.map((s) => cleanInlineForPdf(s, refKeys)) })
      }
      continue
    }
    const proofBegin = line.match(/\\\begin\{proof\}/)
    if (proofBegin) {
      flushPara()
      i++
      const buffer = []
      while (i < lines.length && !/\\\end\{proof\}/.test(lines[i])) {
        const cur = lines[i]
        if (/\\\begin\{equation\*?\}/.test(cur)) {
          i++
          while (i < lines.length && !/\\\end\{equation\*?\}/.test(lines[i])) i++
          i++
          continue
        }
        if (/^\\\[/.test(stripComment(cur).trim())) {
          i++
          while (i < lines.length && !/\\\]/.test(lines[i])) i++
          i++
          continue
        }
        buffer.push(stripComment(cur).trim())
        i++
      }
      i++
      const text = buffer.filter(Boolean).join(' ').trim()
      if (text) {
        preview.push({ t: 'proof', label: '证明', text: cleanInlineForPreview(text, refKeys) })
        pdf.push({ type: 'p', text: `证明：${cleanInlineForPdf(text, refKeys)}` })
      }
      continue
    }
    const theoremBegin = line.match(/\\\begin\{(theorem|lemma|corollary|definition|proposition)\}(?:\[([^\]]*)\])?/)
    if (theoremBegin) {
      flushPara()
      const envName = { theorem: '定理', lemma: '引理', corollary: '推论', definition: '定义', proposition: '命题' }[theoremBegin[1]]
      i++
      const buffer = []
      while (i < lines.length && !new RegExp(`\\\\\end\\{${theoremBegin[1]}\\}`).test(lines[i])) {
        buffer.push(stripComment(lines[i]).trim())
        i++
      }
      i++
      const text = buffer.filter(Boolean).join(' ').trim()
      const titleText = theoremBegin[2] ? `${envName}（${theoremBegin[2]}）` : envName
      preview.push({ t: 'theorem', title: titleText, text: cleanInlineForPreview(text, refKeys) })
      pdf.push({ type: 'p', text: `${titleText} ${cleanInlineForPdf(text, refKeys)}` })
      continue
    }
    if (/\\\begin\{(table|figure)\}/.test(line)) {
      flushPara()
      while (i < lines.length && !/\\\end\{(?:table|figure)\}/.test(lines[i])) i++
      i++
      continue
    }
    if (/\\\bibliography\{/.test(line)) {
      flushPara()
      i++
      continue
    }
    if (/\\\bibliographystyle\{/.test(line)) {
      i++
      continue
    }
    if (/^\\(?:label|centering|newpage|clearpage|smallskip|medskip|bigskip|hspace|vspace)\b/.test(line)) {
      i++
      continue
    }
    para.push(line)
    i++
  }
  flushPara()

  // 参考文献（项目内演示材料）
  if (bibEntries.length) {
    preview.push({ t: 'h3', text: '参考文献' })
    preview.push({ t: 'refs', items: bibEntries.map((e) => `[${e.key}] ${e.title}${e.author ? ' · ' + e.author : ''}（随包演示材料，非外部论文）`) })
    pdf.push({ type: 'h', text: '参考文献' })
    for (const e of bibEntries) pdf.push({ type: 'list', text: `[${e.key}] ${e.title}（随包演示材料）` })
  }

  if (!preview.length) {
    preview.push({ t: 'p', text: '（正文为空）可在左侧编辑 main.tex 后重新编译。' })
    pdf.push({ type: 'p', text: '（正文为空）' })
  }

  return {
    title,
    author,
    date,
    meta: [author, date, '随包演示写作工程 · 离线编译'].filter(Boolean),
    blocks: preview,
    pdfBlocks: pdf,
    sections,
    usedCites: [...new Set(body.matchAll(/\\\cite\{([^}]*)\}/g).flatMap((m) => m[1].split(',').map((s) => s.trim())))],
    refKeys,
  }
}

function readCommandArg(src, name) {
  const m = src.match(new RegExp(`\\\\${name}\\{([^}]*)\\}`))
  return m ? m[1].trim() : ''
}

function parseBibEntries(src) {
  const out = []
  for (const m of src.matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g)) {
    const key = m[1]
    const body = m[2]
    const title = (body.match(/title\s*=\s*\{([^}]*)\}/) || [])[1] || ''
    const author = (body.match(/author\s*=\s*\{([^}]*)\}/) || [])[1] || ''
    out.push({ key, title, author })
  }
  return out
}

function refNumber(refKeys, key) {
  const i = refKeys.indexOf(key)
  return i >= 0 ? `[${i + 1}]` : '[?]'
}

function cleanInlineForPreview(text, refKeys) {
  let s = String(text || '')
  s = s.replace(/\\\textbf\{([^{}]*)\}/g, '**$1**')
  s = s.replace(/\\(?:emph|textit)\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\\cite\{([^}]*)\}/g, (_, keys) => keys.split(',').map((k) => refNumber(refKeys, k.trim())).join(''))
  s = s.replace(/\\(?:label|index)\{[^}]*\}/g, '')
  s = unescapeLatex(s)
  return s.trim()
}

function cleanInlineForPdf(text, refKeys) {
  let s = String(text || '')
  s = s.replace(/\\\cite\{([^}]*)\}/g, (_, keys) => keys.split(',').map((k) => refNumber(refKeys, k.trim())).join(''))
  s = s.replace(/\\(?:label|index)\{[^}]*\}/g, '')
  // 行内公式先转纯文本，避免后续命令剥离破坏公式结构
  s = s.replace(/\$([^$]*)\$/g, (_, tex) => plainMath(tex))
  s = s.replace(/\\(?:textbf|emph|textit|text|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\[a-zA-Z@]+\*?/g, '')
  s = unescapeLatex(s)
  return s.replace(/\s+/g, ' ').trim()
}

function unescapeLatex(s) {
  return String(s)
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/~/g, ' ')
}

/** TeX 数学 → 可嵌入 PDF 的纯文本（仅替换离线字体缺失的符号）。 */
export function plainMath(tex) {
  let s = String(tex || '')
  s = s.replace(/\\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  s = s.replace(/\\\sqrt\{([^{}]*)\}/g, '√($1)')
  s = s.replace(/\\(?:left|right)\s*/g, '')
  s = s.replace(/\\\inf\s*_\{([^{}]*)\}/g, 'inf_{$1}')
  s = s.replace(/\\(?:quad|qquad)\b/g, '  ')
  s = s.replace(/\\,|\\;|\\!/g, ' ')
  s = s.replace(/\\\text\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\\mathrm\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\\mathbb\{R\}/g, 'R')
  s = s.replace(/\\\mathbb\{([^{}]*)\}/g, '$1')
  s = s.replace(/\\\alpha/g, 'α').replace(/\\\beta/g, 'β').replace(/\\\gamma/g, 'γ').replace(/\\\delta/g, 'δ')
  s = s.replace(/\\\varepsilon/g, 'ε').replace(/\\\epsilon/g, 'ε').replace(/\\\lambda/g, 'λ').replace(/\\\mu/g, 'μ')
  s = s.replace(/\\\pi/g, 'π').replace(/\\\rho/g, 'ρ').replace(/\\\sigma/g, 'σ').replace(/\\\tau/g, 'τ')
  s = s.replace(/\\\phi/g, 'φ').replace(/\\\varphi/g, 'φ').replace(/\\\psi/g, 'ψ').replace(/\\\omega/g, 'ω')
  s = s.replace(/\\\Omega/g, 'Ω').replace(/\\\Sigma/g, 'Σ').replace(/\\\Phi/g, 'Φ').replace(/\\\Psi/g, 'Ψ')
  s = s.replace(/\\\nabla/g, 'grad ').replace(/\\\cdot/g, '·').replace(/\\\times/g, '×').replace(/\\\pm/g, '±')
  s = s.replace(/\\\le\b|\\\leq\b/g, '≤').replace(/\\\ge\b|\\\geq\b/g, '≥').replace(/\\\ne\b|\\\neq\b/g, '≠')
  s = s.replace(/\\\in\b/g, '∈').replace(/\\\notin\b/g, '∉').replace(/\\\subset\b/g, '⊂').replace(/\\\subseteq\b/g, '⊆')
  s = s.replace(/\\\forall/g, '∀').replace(/\\\exists/g, '∃').replace(/\\\partial/g, '∂').replace(/\\\infty/g, '∞')
  s = s.replace(/\\\int/g, '∫').replace(/\\\sum/g, '∑').replace(/\\\prod/g, '∏')
  s = s.replace(/\\\to\b|\\\rightarrow\b/g, '->').replace(/\\\Rightarrow/g, '=>')
  s = s.replace(/\\\hbar/g, 'h').replace(/\\\ell/g, 'l').replace(/\\\ldots|\\\dots|\\\cdots/g, '...')
  s = s.replace(/\\(?:displaystyle|textstyle|limits|nolimits|mathbf|mathit|rm|bf)\b/g, '')
  s = s.replace(/\\\\/g, ' ').replace(/[{}]/g, '').replace(/\$/g, '')
  s = s.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_($1)')
  s = s.replace(/\s+/g, ' ').trim()
  // 离线 CJK 子集字体缺少的符号 → 可渲染近似
  s = s.replace(/∇/g, 'grad ').replace(/ℝ/g, 'R').replace(/ℓ/g, 'l').replace(/⟨|⟩/g, '<>').replace(/⋅/g, '·').replace(/↦/g, '->').replace(/§/g, '第 ').replace(/｜/g, '|')
  return s
}

/** 文档 → 分页预览（按字符宽度估算行数；页面高度 700 设计像素）。 */
export function paginateDoc(doc) {
  const blocks = doc?.blocks || []
  const pageHeight = 700
  const pages = []
  let cur = []
  let y = 0
  const widthUnits = 46
  const unit = (text) => {
    let n = 0
    for (const ch of String(text || '')) n += /[\u4e00-\u9fff\\uff00-\\uffef]/.test(ch) ? 2 : 1
    return n
  }
  const heightOf = (b) => {
    if (b.t === 'title') return 150
    if (b.t === 'h1') return 58
    if (b.t === 'h2') return 40
    if (b.t === 'h3') return 34
    if (b.t === 'formula') return 62
    if (b.t === 'list') return 26 * (b.items?.length || 1) + 16
    if (b.t === 'table') return 26 * ((b.rows?.length || 1) + 1) + 34
    if (b.t === 'proof') return Math.max(28, Math.ceil(unit(b.text) / widthUnits) * 24 + 16)
    if (b.t === 'refs') return 22 * (b.items?.length || 1) + 12
    if (b.t === 'quote') return Math.max(30, Math.ceil(unit(b.text) / widthUnits) * 22 + 10)
    return Math.max(26, Math.ceil(unit(b.text) / widthUnits) * 24 + 12)
  }
  for (const b of blocks) {
    const h = heightOf(b)
    if (y + h > pageHeight && cur.length) {
      pages.push(cur)
      cur = []
      y = 0
    }
    cur.push(b)
    y += h
  }
  if (cur.length) pages.push(cur)
  return pages.length ? pages : [[]]
}

/** 文档 → exportPdf.buildPdf 消费的结构。 */
export function buildPdfDocument(doc) {
  return {
    title: pdfSafeText(doc.title),
    meta: (doc.meta || []).map(pdfSafeText),
    blocks: (doc.pdfBlocks || []).map((b) => {
      if (b.type === 'list') return { type: 'list', text: pdfSafeText(b.text || (b.items || []).join('；')) }
      if (b.type === 'formula') return { type: 'formula', text: pdfSafeText(b.text) }
      if (b.type === 'h') return { type: 'h', text: pdfSafeText(b.text) }
      if (b.type === 'quote') return { type: 'quote', text: pdfSafeText(b.text) }
      return { type: 'p', text: pdfSafeText(b.text) }
    }),
  }
}

/**
 * PDF 安全文本：离线 CJK 子集字体缺少的数学符号替换为可渲染近似。
 * 页面导出 PDF 前必须经过本函数（HTML/KaTeX 预览不受影响）。
 */
const PDF_SAFE_MAP = {
  '−': '-',
  '⊂': '包含于',
  '⊆': '包含于或等于',
  '∉': '不属于',
  '→': '->',
  '⇒': '=>',
  '‖': '||',
  '²': '^2',
  '³': '^3',
  '¹': '^1',
  '⁰': '^0',
  '⁴': '^4',
  '∀': '任意',
  '∃': '存在',
  '∂': 'd',
  '∇': 'grad ',
  'ℝ': 'R',
  'ℓ': 'l',
  '⟨': '<',
  '⟩': '>',
  '⋅': '·',
  '↦': '->',
  '§': '第',
  '｜': '|',
}

export function pdfSafeText(text) {
  let out = String(text ?? '')
  for (const [from, to] of Object.entries(PDF_SAFE_MAP)) out = out.split(from).join(to)
  // 去掉离线字体不包含的 emoji / 符号区字符
  return out.replace(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, '')
}

/** 从工程文件生成论文结构大纲（含摘要/参考文献）。 */
export function outlineFromFiles(files, mainFile = 'main.tex') {
  const out = []
  const main = String(files[mainFile]?.content || '')
  const abstractLine = main.split('\n').findIndex((l) => /\\\begin\{abstract\}/.test(l)) + 1
  if (abstractLine > 0) out.push({ level: 1, text: '摘要', file: mainFile, line: abstractLine })
  const walk = (key, depth = 0) => {
    const src = String(files[key]?.content || '')
    const lines = src.split('\n')
    let sec = 0
    let sub = 0
    const entries = []
    lines.forEach((raw, idx) => {
      const line = stripComment(raw).trim()
      const secM = line.match(/^\\\section\*?\{([^}]*)\}/)
      if (secM) {
        sec++
        sub = 0
        entries.push({ level: 1, text: `${sec} ${secM[1]}`, file: key, line: idx + 1 })
        return
      }
      const subM = line.match(/^\\\subsection\*?\{([^}]*)\}/)
      if (subM) {
        sub++
        entries.push({ level: 2, text: `${sec}.${sub} ${subM[1]}`, file: key, line: idx + 1 })
      }
    })
    for (const e of entries) out.push({ ...e, depth })
    lines.forEach((raw, idx) => {
      const m = stripComment(raw).match(/\\\input\{([^}]+)\}/)
      if (m) {
        const clean = m[1].trim()
        const child = files[clean] ? clean : `${clean}.tex`
        if (files[child]) walk(child, depth + 1)
      }
    })
  }
  walk(mainFile)
  const bibLine = main.split('\n').findIndex((l) => /\\\bibliography\{/.test(l)) + 1
  if (bibLine > 0) out.push({ level: 1, text: '参考文献', file: mainFile, line: bibLine })
  return out
}

/** 找到某文件某行所属的章节标题（用于 Agent 上下文）。 */
export function guessSection(files, file, line) {
  const outline = outlineFromFiles(files).filter((e) => e.file === file && e.line <= line)
  if (!outline.length) return '正文'
  const last = outline[outline.length - 1]
  return last.text
}

/** 起点项目的初始文件（深拷贝，避免污染只读数据）。 */
export function initialWritingFiles(projectId) {
  const proj = writingProjects[projectId]
  if (!proj) {
    return starterWritingFiles(findProject(projectId)?.name || CUSTOM_PROJECT_TEMPLATE.name)
  }
  const out = {}
  for (const [path, file] of Object.entries(proj.files)) out[path] = { kind: file.kind, content: file.content }
  return out
}

export function writingProjectMeta(projectId) {
  return writingProjects[projectId] || null
}
