/**
 * 学生个人知识库 · 随包自撰短材料
 *
 * 三份材料均为本展示项目自撰的演示资料（非教材、非平台原始资料）：
 *   1. 导数符号与函数单调性
 *   2. 椭圆的焦距与半焦距
 *   3. 配方法
 * 入库 → 就绪 → 查看切片 → 选中资料提问 → 基于材料段落的回答 + 原文定位。
 *
 * 引用纪律：
 *   - 每条回答的 citation.quote 必须是对应段落 text 的真实子串；
 *   - 检索不到时明确返回“未在资料中找到”，不允许编造引用；
 *   - 问答与段落对应关系由 qa/student-practice/qa_library_check.py 校验。
 *
 * 数据只读；入库状态、对话记录写入 store.ext.studentLibrary。
 */

/** 把段落切成可检索的“切片”（句读级，长句保留完整，仅用于展示真实切片）。 */
function buildSlices(material) {
  const slices = []
  let n = 0
  for (const para of material.paragraphs) {
    const sentences = para.text.match(/[^。；]+[。；]?/g) || [para.text]
    let buffer = ''
    for (const s of sentences) {
      if (buffer && buffer.length + s.length > 96) {
        n += 1
        slices.push({ id: `${material.id}-s${n}`, paragraphId: para.id, text: buffer.trim(), chars: buffer.trim().length })
        buffer = ''
      }
      buffer += s
    }
    if (buffer.trim()) {
      n += 1
      slices.push({ id: `${material.id}-s${n}`, paragraphId: para.id, text: buffer.trim(), chars: buffer.trim().length })
    }
  }
  return slices
}

const rawMaterials = [
  {
    id: 'derivative-sign',
    title: '导数符号与函数单调性',
    category: '微积分',
    short: '导数符号',
    source: '随包自撰演示材料 · 非教材',
    summary: '用导数符号判断单调区间：判定定理、允许个别驻点、驻点与极值的区别、求单调区间的步骤。',
    paragraphs: [
      {
        id: 'p1',
        heading: '一、单调性的判定定理',
        text: '设函数 f(x) 在区间 I 上可导。若对任意 x∈I 都有 f′(x)>0，则 f(x) 在区间 I 上单调递增；若对任意 x∈I 都有 f′(x)<0，则 f(x) 在区间 I 上单调递减。',
      },
      {
        id: 'p2',
        heading: '二、允许个别点导数为零',
        text: '若 f′(x)≥0 在区间 I 上成立，且 f′(x)=0 只在有限个点上出现，则 f(x) 在区间 I 上仍然严格单调递增。例如 f(x)=x³ 在 R 上满足 f′(x)=3x²≥0，仅 x=0 处导数为 0，所以 f(x)=x³ 在 R 上严格递增。',
      },
      {
        id: 'p3',
        heading: '三、驻点不等于极值点',
        text: 'f′(x0)=0 只说明 x0 是驻点，并不能说明 x0 是极值点。典型反例是 f(x)=x³ 在 x0=0：f′(0)=0，但函数在 0 两侧都递增，0 不是极值点。判断极值要看导数在 x0 两侧的符号是否改变。',
      },
      {
        id: 'p4',
        heading: '四、求单调区间的步骤',
        text: '求可导函数单调区间的一般步骤：① 求定义域；② 求导数 f′(x)；③ 解 f′(x)>0 与 f′(x)<0，求出导数符号改变的分界点；④ 用分界点把定义域分成若干区间，列表判断各区间上 f′(x) 的符号；⑤ 写出单调递增、单调递减区间。单调区间只能写成区间，不能用并集符号连接。',
      },
      {
        id: 'p5',
        heading: '五、常见易错提醒',
        text: '易错点：把 f′(x0)>0 当成“函数在 x0 附近递增”的充分条件；忽略定义域，例如 f(x)=1/x 在 x=0 无定义，不能把 (-∞,0)∪(0,+∞) 写成一个单调区间；以及把“导数为零”直接等同于“取得极值”。',
      },
    ],
    keywordIndex: [
      { paragraphId: 'p1', keywords: ['判定', '导数符号', '大于零', '单调递增', '单调递减', 'f′(x)>0', 'f′(x)<0'] },
      { paragraphId: 'p2', keywords: ['个别点', '导数为零', '等于零', 'x³', '严格递增', 'f′(x)≥0'] },
      { paragraphId: 'p3', keywords: ['驻点', '极值', '极值点', 'x³', '两侧', '符号改变'] },
      { paragraphId: 'p4', keywords: ['步骤', '单调区间', '定义域', '列表', '分界点', '怎么求'] },
      { paragraphId: 'p5', keywords: ['易错', '注意', '并集', '忽略定义域', '充分条件'] },
    ],
    suggestedQuestions: [
      '导数大于零和函数单调递增是什么关系？',
      'f′(x0)=0 就一定是极值点吗？',
      '求单调区间的步骤是什么？',
    ],
    qa: [
      {
        id: 'q1',
        question: '导数大于零和函数单调递增是什么关系？',
        match: [['导数', 'f′'], ['大于零', '大于0', '单调递增', '单调增']],
        answer:
          '资料给出的判定方向是：在区间上恒有 f′(x)>0，就可以判定 f 在该区间单调递增。反过来要注意两点：一是允许 f′(x)=0 在个别点出现，函数依然严格递增；二是“函数单调递增”并不要求每一点的导数都大于零。',
        citations: [
          { paragraphId: 'p1', quote: '若对任意 x∈I 都有 f′(x)>0，则 f(x) 在区间 I 上单调递增' },
          {
            paragraphId: 'p2',
            quote: '且 f′(x)=0 只在有限个点上出现，则 f(x) 在区间 I 上仍然严格单调递增',
          },
        ],
      },
      {
        id: 'q2',
        question: 'f′(x0)=0 就一定是极值点吗？',
        match: [['极值', '驻点'], ['零', '0', '等于']],
        answer:
          '不是。f′(x0)=0 只说明 x0 是驻点；判断极值还要看导数在 x0 两侧的符号是否改变。资料给出的反例是 f(x)=x³ 在 x0=0：该点导数为 0，但两侧都递增，0 不是极值点。',
        citations: [
          { paragraphId: 'p3', quote: 'f′(x0)=0 只说明 x0 是驻点，并不能说明 x0 是极值点' },
          { paragraphId: 'p3', quote: '判断极值要看导数在 x0 两侧的符号是否改变' },
        ],
      },
      {
        id: 'q3',
        question: '求单调区间的步骤是什么？',
        match: [['步骤', '怎么求', '如何求', '过程'], ['单调', '区间']],
        answer:
          '资料给出的步骤是：先求定义域，再求导数，解出 f′(x)>0 与 f′(x)<0 的分界点，用分界点划分区间并列表判断各区间导数符号，最后写出单调区间（只能写成区间，不能用并集符号连接）。',
        citations: [
          {
            paragraphId: 'p4',
            quote:
              '① 求定义域；② 求导数 f′(x)；③ 解 f′(x)>0 与 f′(x)<0，求出导数符号改变的分界点；④ 用分界点把定义域分成若干区间，列表判断各区间上 f′(x) 的符号；⑤ 写出单调递增、单调递减区间',
          },
          { paragraphId: 'p4', quote: '单调区间只能写成区间，不能用并集符号连接' },
        ],
      },
    ],
  },

  {
    id: 'ellipse-focus',
    title: '椭圆的焦距与半焦距',
    category: '解析几何',
    short: '椭圆焦距',
    source: '随包自撰演示材料 · 非教材',
    summary: '椭圆标准方程中 a、b、c 的关系，焦距的计算，焦点在 y 轴时的写法与常见易错。',
    paragraphs: [
      {
        id: 'p1',
        heading: '一、标准方程中的 a、b、c',
        text: '椭圆 x²/a² + y²/b² = 1（a>b>0）中，a 是长半轴长，b 是短半轴长，c 是半焦距；三者满足 c² = a² − b²。焦点在 x 轴上，坐标为 (−c,0) 与 (c,0)，焦距为 2c。',
      },
      {
        id: 'p2',
        heading: '二、焦距的计算例',
        text: '例如椭圆 x²/25 + y²/9 = 1：a²=25、b²=9，所以 c²=25−9=16，c=4，焦距 2c=8；长轴长 2a=10，短轴长 2b=6。',
      },
      {
        id: 'p3',
        heading: '三、焦点在 y 轴上的情形',
        text: '焦点在 y 轴时标准方程写成 y²/a² + x²/b² = 1（a>b>0），关系式仍是 c² = a² − b²，焦点坐标为 (0,−c) 与 (0,c)。判断焦点位置看 a² 在哪个变量下方，而不是看系数大小。',
      },
      {
        id: 'p4',
        heading: '四、椭圆定义与焦距的关系',
        text: '椭圆是到两定点（焦点）距离之和为常数 2a 的点的轨迹，且要求 2a > 2c，即 a > c。焦距越大，椭圆越扁；焦距为 0 时退化为圆（此时 a=b、c=0）。',
      },
      {
        id: 'p5',
        heading: '五、易错提醒',
        text: '易错点：把椭圆的 c² 写成 a²+b²（那是双曲线）；忘记交换 a、b 的角色，把 y 轴方向的半轴当成 a；以及把焦距 2c 与半焦距 c 混淆。',
      },
    ],
    keywordIndex: [
      { paragraphId: 'p1', keywords: ['a、b、c', 'abc', '关系', '半焦距', '焦距', 'c²', '标准方程'] },
      { paragraphId: 'p2', keywords: ['25', '9', '例题', '计算', '焦距', 'c=4', 'a=5', 'b=3'] },
      { paragraphId: 'p3', keywords: ['y 轴', 'y轴', '焦点在 y', '交换', '判断焦点'] },
      { paragraphId: 'p4', keywords: ['定义', '距离之和', '越扁', '圆', '2a', '焦距越大'] },
      { paragraphId: 'p5', keywords: ['易错', '注意', '混淆', '双曲线', '2c'] },
    ],
    suggestedQuestions: [
      '椭圆的 a、b、c 满足什么关系？',
      '椭圆 x²/25 + y²/9 = 1 的焦距是多少？',
      '焦点在 y 轴上时 c² 的公式变了吗？',
    ],
    qa: [
      {
        id: 'q1',
        question: '椭圆的 a、b、c 满足什么关系？',
        match: [['a、b、c', 'abc', 'abc关系', '关系式'], ['关系', '公式', '满足', '等于']],
        answer: '椭圆标准方程中长半轴 a、短半轴 b、半焦距 c 满足 c² = a² − b²；焦点在 x 轴上时焦点为 (−c,0)、(c,0)，焦距为 2c。',
        citations: [
          {
            paragraphId: 'p1',
            quote: 'a 是长半轴长，b 是短半轴长，c 是半焦距；三者满足 c² = a² − b²',
          },
          { paragraphId: 'p1', quote: '焦距为 2c' },
        ],
      },
      {
        id: 'q2',
        question: '椭圆 x²/25 + y²/9 = 1 的焦距是多少？',
        match: [['25', 'a²=25', 'a=5'], ['焦距', 'c=', 'c²']],
        answer: 'a²=25、b²=9，所以 c²=25−9=16，c=4，焦距 2c=8；对应长轴长 2a=10、短轴长 2b=6。',
        citations: [
          { paragraphId: 'p2', quote: 'a²=25、b²=9，所以 c²=25−9=16，c=4，焦距 2c=8' },
          { paragraphId: 'p2', quote: '长轴长 2a=10，短轴长 2b=6' },
        ],
      },
      {
        id: 'q3',
        question: '焦点在 y 轴上时 c² 的公式变了吗？',
        match: [['y 轴', 'y轴', '焦点在'], ['公式', 'c²', 'c^2', '关系', '变']],
        answer:
          '公式不变，仍是 c² = a² − b²。变化的是 a、b 的位置：焦点在 y 轴时标准方程写成 y²/a² + x²/b² = 1（a>b>0），焦点为 (0,−c)、(0,c)。判断焦点位置看 a² 在哪个变量下方，而不是看系数大小。',
        citations: [
          { paragraphId: 'p3', quote: '关系式仍是 c² = a² − b²，焦点坐标为 (0,−c) 与 (0,c)' },
          { paragraphId: 'p3', quote: '判断焦点位置看 a² 在哪个变量下方，而不是看系数大小' },
        ],
      },
      {
        id: 'q4',
        question: '焦距越大椭圆越扁吗？',
        match: [['扁', '形状'], ['焦距', '越大', '越大']],
        answer: '是的。资料说明焦点距离之和为常数 2a，且要求 a > c；焦距越大椭圆越扁，焦距为 0 时退化为圆（a=b、c=0）。',
        citations: [
          { paragraphId: 'p4', quote: '焦距越大，椭圆越扁；焦距为 0 时退化为圆（此时 a=b、c=0）' },
          { paragraphId: 'p4', quote: '要求 2a > 2c，即 a > c' },
        ],
      },
    ],
  },

  {
    id: 'completing-square',
    title: '配方法',
    category: '代数',
    short: '配方法',
    source: '随包自撰演示材料 · 非教材',
    summary: '二次式配方的一般步骤、顶点与最值公式、例题 y=x²−4x+3 与常见错误。',
    paragraphs: [
      {
        id: 'p1',
        heading: '一、配方法的目标',
        text: '配方法的目标是把二次式 ax²+bx+c 写成 a(x+m)²+n 的形式。关键是把含 x 的一次项 bx 凑成完全平方 (x + b/(2a))² 展开后的中间项。',
      },
      {
        id: 'p2',
        heading: '二、二次函数配方的一般步骤',
        text: '对 y=ax²+bx+c（a≠0）：① 提取二次项系数 a，得 y=a(x²+(b/a)x)+c；② 括号内配成完全平方，加上并减去 (b/(2a))²：y=a[(x+b/(2a))²−(b/(2a))²]+c；③ 展开常数：y=a(x+b/(2a))²+ (4ac−b²)/(4a)。',
      },
      {
        id: 'p3',
        heading: '三、配方后的顶点与最值',
        text: '配方得到 y=a(x+b/(2a))²+(4ac−b²)/(4a) 后，顶点坐标为 (−b/(2a), (4ac−b²)/(4a))，对称轴为直线 x=−b/(2a)。当 a>0 时函数在顶点取得最小值 (4ac−b²)/(4a)；当 a<0 时取得最大值。',
      },
      {
        id: 'p4',
        heading: '四、例题：y=x²−4x+3',
        text: '对 y=x²−4x+3 配方：y=(x²−4x+4)−4+3=(x−2)²−1。由此顶点为 (2,−1)，对称轴 x=2；因为 a=1>0，函数在 x=2 处取得最小值 −1。',
      },
      {
        id: 'p5',
        heading: '五、易错提醒',
        text: '易错点：配方时只给括号里的项加常数、却忘了乘以括号外的 a；把顶点横坐标写成 b/(2a) 而漏掉负号；以及把最小值 (4ac−b²)/(4a) 的符号记错。',
      },
    ],
    keywordIndex: [
      { paragraphId: 'p1', keywords: ['目标', '完全平方', '一次项', '中间项', '二次式'] },
      { paragraphId: 'p2', keywords: ['步骤', '提系数', '提取', '二次项系数', '怎么配方', '一般步骤'] },
      { paragraphId: 'p3', keywords: ['顶点', '最值', '对称轴', '最大', '最小'] },
      { paragraphId: 'p4', keywords: ['例题', 'x²−4x+3', '4x+3', '顶点', '最小值'] },
      { paragraphId: 'p5', keywords: ['易错', '注意', '负号', '忘了', '括号外'] },
    ],
    suggestedQuestions: [
      '配方法的一般步骤是什么？',
      '用配方法求 y=x²−4x+3 的顶点和最值',
      '为什么配方时要把二次项系数提出来？',
    ],
    qa: [
      {
        id: 'q1',
        question: '配方法的一般步骤是什么？',
        match: [['步骤', '怎么配', '如何配', '过程'], ['配方', '二次']],
        answer:
          '一般步骤：先提取二次项系数 a；再把括号内配成完全平方（加上并减去 (b/(2a))²）；最后展开常数，写成 y=a(x+b/(2a))²+(4ac−b²)/(4a)。',
        citations: [
          {
            paragraphId: 'p2',
            quote: '① 提取二次项系数 a，得 y=a(x²+(b/a)x)+c',
          },
          { paragraphId: 'p2', quote: '③ 展开常数：y=a(x+b/(2a))²+ (4ac−b²)/(4a)' },
        ],
      },
      {
        id: 'q2',
        question: '用配方法求 y=x²−4x+3 的顶点和最值',
        match: [['x²−4x', 'x^2-4x', 'x²-4x', '4x+3', '4x+3'], ['顶点', '最值', '最小值', '最大值']],
        answer:
          'y=x²−4x+3=(x²−4x+4)−4+3=(x−2)²−1。因此顶点为 (2,−1)，对称轴 x=2；a=1>0，所以函数在 x=2 处取得最小值 −1。',
        citations: [
          { paragraphId: 'p4', quote: 'y=(x²−4x+4)−4+3=(x−2)²−1' },
          { paragraphId: 'p4', quote: '由此顶点为 (2,−1)，对称轴 x=2' },
          { paragraphId: 'p4', quote: '函数在 x=2 处取得最小值 −1' },
        ],
      },
      {
        id: 'q3',
        question: '为什么配方时要把二次项系数提出来？',
        match: [['为什么', '原因', '提出来'], ['系数', '二次项']],
        answer:
          '因为完全平方的中间项要凑成 2·x·(b/(2a))。先把二次项系数 a 提到括号外，括号里才是 x²+(b/a)x 这种首项系数为 1 的形式，才能配成 (x+b/(2a))²；如果只给括号里加常数而忘了乘回外面的 a，配方结果就会出错。',
        citations: [
          { paragraphId: 'p2', quote: '① 提取二次项系数 a，得 y=a(x²+(b/a)x)+c' },
          { paragraphId: 'p5', quote: '配方时只给括号里的项加常数、却忘了乘以括号外的 a' },
        ],
      },
      {
        id: 'q4',
        question: 'a<0 时配方后最值怎么取？',
        match: [['a<0', '小于0', 'a 小于'], ['最大', '最小', '最值']],
        answer:
          '配方成 y=a(x+b/(2a))²+(4ac−b²)/(4a) 后，顶点坐标不变；当 a<0 时开口向下，函数在顶点取得最大值 (4ac−b²)/(4a)。（a>0 时才是最小值。）',
        citations: [
          { paragraphId: 'p3', quote: '当 a>0 时函数在顶点取得最小值 (4ac−b²)/(4a)；当 a<0 时取得最大值' },
          { paragraphId: 'p3', quote: '顶点坐标为 (−b/(2a), (4ac−b²)/(4a))' },
        ],
      },
    ],
  },
]

export const libraryMaterials = rawMaterials.map((m) => ({ ...m, slices: buildSlices(m) }))

export function findMaterial(id) {
  return libraryMaterials.find((m) => m.id === id) || null
}

export function getParagraph(materialId, paragraphId) {
  const m = findMaterial(materialId)
  return m ? m.paragraphs.find((p) => p.id === paragraphId) || null : null
}

function cite(material, paragraphId, quote) {
  const para = material.paragraphs.find((p) => p.id === paragraphId)
  if (!para || !para.text.includes(quote)) return null
  const slice = material.slices.find((s) => s.paragraphId === paragraphId && s.text.includes(quote))
  return {
    materialId: material.id,
    materialTitle: material.title,
    paragraphId,
    paragraphHeading: para.heading,
    sliceId: slice ? slice.id : null,
    quote,
  }
}

const normQuestion = (q) =>
  String(q || '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[？?！!。，,、；;：:“”"'（）()《》]/g, '')

/**
 * 在“已选中资料”内做检索式问答。
 * 返回 { found, kind, answer, citations, message, suggestions }
 */
export function answerLibraryQuestion(material, question) {
  if (!material) {
    return {
      found: false,
      kind: 'no-material',
      message: '请先在左侧选择一份已入库的资料，再提问。',
      citations: [],
    }
  }
  const q = normQuestion(question)
  if (!q) return { found: false, kind: 'empty', message: '请先输入问题。', citations: [] }

  // 1) 已收录问答：关键词分组全部命中
  for (const entry of material.qa) {
    const hit = entry.match.every((alts) => alts.some((a) => q.includes(normQuestion(a))))
    if (hit) {
      const citations = entry.citations.map((c) => cite(material, c.paragraphId, c.quote)).filter(Boolean)
      return {
        found: true,
        kind: 'qa',
        matchedQuestion: entry.question,
        answer: entry.answer,
        citations,
      }
    }
  }

  // 2) 关键词索引：给出“未直接命中问答，最相关段落”的真实原文（不编造结论）
  const scored = []
  for (const item of material.keywordIndex) {
    let score = 0
    for (const kw of item.keywords) {
      if (q.includes(normQuestion(kw))) score += 1
    }
    if (score > 0) scored.push({ paragraphId: item.paragraphId, score })
  }
  scored.sort((a, b) => b.score - a.score)
  if (scored.length) {
    const para = material.paragraphs.find((p) => p.id === scored[0].paragraphId)
    const citations = para
      ? [cite(material, para.id, para.text)].filter(Boolean)
      : []
    return {
      found: true,
      kind: 'related',
      answer:
        '资料中没有直接回答这句话的现成结论；以下是与你的问题最相关的原文段落，请以原文为准（未找到原文时请换一种问法）。',
      citations,
    }
  }

  // 3) 检索失败：明确提示未找到，不编造
  return {
    found: false,
    kind: 'not-found',
    message: '未在资料中找到可引用的段落。',
    suggestions: material.suggestedQuestions,
    citations: [],
  }
}
