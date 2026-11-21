/**
 * 举一反三 · 变式题库（仅供 student-practice 场景使用）
 *
 * 判分基准：evidence/solutions/sealed/math-baseline.json（2026-11-21 封存，2/2 独立解一致）
 *   A 题：D / 2√2                      （单选，唯一正确项）
 *   B 题：B、D 均对；只选一个 = 部分正确（多选）
 *   C 题：61/25 = 2.44                 （填空）
 * 原题条目直接沿用封存基准判分；变式由本展示项目自行设计，数学结论全部自洽，
 * 由 qa/student-practice/verify_math.py 独立复算（坐标/指示变量/有理数精确值）。
 * 每题均给出完整解析与可核对的错因反馈，不出现“只看选项对错不给理由”的空反馈。
 *
 * 数据只读：作答记录写入 store.ext.studentPractice，由页面持久化。
 */
const q1 = ''
const q2 = ''
const q3 = ''
const KNOWLEDGE = {
  A: '圆锥曲线',
  B: '立体几何',
  C: '概率统计',
}

/* ------------------------------------------------------------------ */
/* 判分工具                                                            */
/* ------------------------------------------------------------------ */

const FULLWIDTH = /[\uFF01-\uFF5E]/g

/** 归一化文本答案：全角转半角、去空白、统一符号，便于接受等价写法。 */
export function normalizeAnswer(input) {
  return String(input ?? '')
    .replace(FULLWIDTH, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
}

/** 解析“有理数或小数”，用于数值容差比较（如 61/25 与 2.44）。 */
function numericValue(normalized) {
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return Number(normalized)
  const m = normalized.match(/^(-?\d+)\/(\d+)$/)
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2])
  return null
}

function matchFill(item, raw) {
  const n = normalizeAnswer(raw)
  if (!n) return false
  for (const accept of item.accepts || []) {
    if (n === normalizeAnswer(accept)) return true
  }
  for (const pattern of item.acceptRegex || []) {
    try {
      if (new RegExp(pattern, 'i').test(n)) return true
    } catch {
      /* 忽略非法正则，不影响其它判分路径 */
    }
  }
  const v = numericValue(n)
  if (v !== null) {
    for (const accept of item.accepts || []) {
      const av = numericValue(normalizeAnswer(accept))
      if (av !== null && Math.abs(av - v) <= 1e-9) return true
    }
  }
  return false
}

function feedbackForChoice(item, chosenKeys) {
  const correct = item.answerKeys || []
  const out = []
  for (const key of chosenKeys) {
    if (correct.includes(key)) continue
    const specific = (item.wrongs || []).find((w) => (w.keys || []).includes(key))
    if (specific) out.push(specific.reason)
    else if (item.optionNotes && item.optionNotes[key]) out.push(item.optionNotes[key])
  }
  if (!out.length && item.optionNotes) {
    const missing = correct.filter((k) => !chosenKeys.includes(k))
    for (const key of missing) {
      if (item.optionNotes[key]) out.push(`还缺 ${key}：${item.optionNotes[key]}`)
    }
  }
  return out
}

/**
 * 判分。raw 形如：
 *   choice: { keys: ['B','D'] }
 *   fill:   { text: '61/25' }
 * 返回 { status: 'correct'|'partial'|'wrong', feedback: string[], solution, answerDisplay }
 */
export function judgePracticeItem(item, raw) {
  const solution = item.solution
  const answerDisplay = item.answerDisplay || (item.answerKeys || []).join('、')

  if (item.type === 'single' || item.type === 'multi') {
    const chosen = (raw.keys || []).slice().sort()
    const correct = (item.answerKeys || []).slice().sort()
    const extra = chosen.filter((k) => !correct.includes(k))
    const missing = correct.filter((k) => !chosen.includes(k))
    let status
    if (!extra.length && !missing.length) status = 'correct'
    else if (!extra.length && chosen.length > 0 && item.type === 'multi') status = 'partial'
    else status = 'wrong'

    const feedback = []
    if (status === 'partial') {
      feedback.push(`部分正确：你保留了正确的 ${chosen.join('、')}，但还缺 ${missing.join('、')}。`)
    }
    if (status === 'wrong' && !extra.length && item.type === 'multi' && chosen.length) {
      feedback.push('这些选项都成立，但组合并不完整；多选题要把成立的结论全部选上。')
    }
    feedback.push(...feedbackForChoice(item, chosen))
    if (!feedback.length) feedback.push('再对照解析逐项核对一次。')
    return { status, feedback, solution, answerDisplay }
  }

  // fill
  const text = String(raw.text ?? '').trim()
  if (matchFill(item, text)) {
    return { status: 'correct', feedback: [], solution, answerDisplay }
  }
  const n = normalizeAnswer(text)
  const feedback = []
  for (const pitfall of item.pitfalls || []) {
    try {
      if (pitfall.pattern && new RegExp(pitfall.pattern, 'i').test(n)) {
        feedback.push(pitfall.reason)
        break
      }
    } catch {
      /* ignore */
    }
  }
  if (!feedback.length) {
    feedback.push('这个结果与标准答案不一致：请对照下面解析，检查代入的数值与关键一步。')
  }
  return { status: 'wrong', feedback, solution, answerDisplay }
}

/** 记录里展示“学生答了什么”。 */
export function describePracticeAnswer(item, raw) {
  if (item.type === 'single' || item.type === 'multi') return (raw.keys || []).join('、')
  return String(raw.text ?? '').trim()
}

/* ------------------------------------------------------------------ */
/* 三道原题 + 变式                                                      */
/* ------------------------------------------------------------------ */

export const practiceGroups = [
  {
    caseId: 'A',
    code: '题1',
    title: '双曲线的离心率',
    chip: '单选 · 圆锥曲线',
    knowledge: KNOWLEDGE.A,
    image: q1,
    sealedAnswer: 'D · 2√2',
    sealedNote: '判分依据封存基准 A（D / 2√2）',
    items: [
      {
        id: 'A-orig',
        caseId: 'A',
        kind: 'original',
        title: '原题 · 虚轴长是实轴长的 √7 倍',
        shortTitle: '原题',
        type: 'single',
        stem: '若双曲线 $C$ 的虚轴长为实轴长的 $\\sqrt{7}$ 倍，则 $C$ 的离心率为（　）',
        options: [
          { key: 'A', text: '$\\sqrt{2}$' },
          { key: 'B', text: '$2$' },
          { key: 'C', text: '$\\sqrt{7}$' },
          { key: 'D', text: '$2\\sqrt{2}$' },
        ],
        answerKeys: ['D'],
        answerDisplay: 'D · 2√2',
        wrongs: [
          {
            keys: ['C'],
            reason:
              '选 C 是把 $\\dfrac{b}{a}=\\sqrt{7}$ 直接当成了离心率：漏掉 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2$ 里的“1”。',
          },
          { keys: ['A'], reason: 'A 相当于默认 $b=a$（等轴双曲线，$e=\\sqrt{2}$），忽略了题给的 $\\sqrt{7}$ 倍条件。' },
          { keys: ['B'], reason: 'B 是 $\\sqrt{8}$ 的误化简：$\\sqrt{8}=2\\sqrt{2}\\approx 2.83$，不是 2。' },
        ],
        solution:
          '① 设实半轴为 $a$、虚半轴为 $b$，则实轴长 $2a$、虚轴长 $2b$。由“虚轴长是实轴长的 $\\sqrt{7}$ 倍”得 $2b=\\sqrt{7}\\cdot 2a$，即 $\\dfrac{b}{a}=\\sqrt{7}$。\n② 双曲线满足 $c^2=a^2+b^2$，所以 $e^2=\\dfrac{c^2}{a^2}=1+\\left(\\dfrac{b}{a}\\right)^2=1+7=8$。\n③ 因为 $e>0$，所以 $e=\\sqrt{8}=2\\sqrt{2}$，选 **D**。',
        keyPoint: '轴长比 $\\dfrac{b}{a}$ → 用 $c^2=a^2+b^2$ → 平方后取正根。离心率不是 $\\dfrac{b}{a}$。',
        sourceNote: '原题 · 判分依据封存基准',
      },
      {
        id: 'A-v1',
        caseId: 'A',
        kind: 'variant',
        title: '变式一 · 由离心率反推轴长比',
        shortTitle: '变式一',
        type: 'single',
        stem: '若双曲线 $C$ 的离心率为 $2$，则它的虚轴长是实轴长的（　）',
        options: [
          { key: 'A', text: '等长（$1$ 倍）' },
          { key: 'B', text: '$\\sqrt{2}$ 倍' },
          { key: 'C', text: '$\\sqrt{3}$ 倍' },
          { key: 'D', text: '$2$ 倍' },
        ],
        answerKeys: ['C'],
        answerDisplay: 'C · √3 倍',
        wrongs: [
          {
            keys: ['D'],
            reason: '选 D 是把离心率 $e=2$ 误当成 $\\dfrac{b}{a}$：$e=\\dfrac{c}{a}$，要先用 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2$ 换算。',
          },
          { keys: ['A'], reason: '等轴双曲线（$b=a$）的离心率是 $\\sqrt{2}$，不是 2。' },
          { keys: ['B'], reason: '这是把 $\\dfrac{b}{a}$ 算成了 $\\sqrt{e}$。正确方程是 $1+\\left(\\dfrac{b}{a}\\right)^2=e^2=4$。' },
        ],
        solution:
          '① 由 $e=2$ 得 $e^2=4$，而双曲线 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2$。\n② 所以 $\\left(\\dfrac{b}{a}\\right)^2=3$，$\\dfrac{b}{a}=\\sqrt{3}$（取正）。\n③ 虚轴长 $2b$ 是实轴长 $2a$ 的 $\\sqrt{3}$ 倍，选 **C**。',
        keyPoint: '已知 $e$ 求轴长比：先平方，再减 1，最后开正根。',
        sourceNote: '变式 · 由题1反推（本题库自撰）',
      },
      {
        id: 'A-v2',
        caseId: 'A',
        kind: 'variant',
        title: '变式二 · 由轴长比求离心率（填空）',
        shortTitle: '变式二',
        type: 'fill',
        stem: '已知双曲线 $\\dfrac{x^2}{a^2}-\\dfrac{y^2}{b^2}=1\\ (a>0,\\ b>0)$ 的虚轴长是实轴长的 $2$ 倍，则离心率 $e=$ ______。',
        accepts: ['√5', 'sqrt5', '\\sqrt{5}', 'e=√5', '2.236', '2.24'],
        answerDisplay: '√5',
        pitfalls: [
          {
            pattern: '^2$',
            reason: '填 2 是把轴长比 $\\dfrac{b}{a}=2$ 直接当成离心率。离心率 $e=\\dfrac{c}{a}=\\sqrt{1+\\left(\\dfrac{b}{a}\\right)^2}$。',
          },
          {
            pattern: '√3|sqrt3',
            reason: '$\\sqrt{3}$ 是“离心率为 2”那一问的轴长比，不是本题的离心率。本题 $\\dfrac{b}{a}=2$，$e^2=1+4=5$。',
          },
          {
            pattern: '√7|sqrt7',
            reason: '$\\sqrt{7}$ 是原题里的轴长比；本题条件换成了 $2$ 倍，离心率要重新算。',
          },
        ],
        solution:
          '① 由“虚轴长是实轴长的 2 倍”得 $2b=2\\cdot 2a$，即 $\\dfrac{b}{a}=2$。\n② $e^2=1+\\left(\\dfrac{b}{a}\\right)^2=1+4=5$。\n③ $e>0$，故 $e=\\sqrt{5}\\approx 2.236$。',
        keyPoint: '轴长比与半轴比是同一个数 $\\dfrac{b}{a}$；代回 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2$。',
        sourceNote: '变式 · 由题1反推（本题库自撰）',
      },
    ],
  },

  {
    caseId: 'B',
    code: '题2',
    title: '正三棱柱中的线面关系',
    chip: '多选 · 立体几何',
    knowledge: KNOWLEDGE.B,
    image: q2,
    sealedAnswer: 'B、D',
    sealedNote: '判分依据封存基准 B（B、D 均对；只选一个 = 部分正确）',
    items: [
      {
        id: 'B-orig',
        caseId: 'B',
        kind: 'original',
        title: '原题 · 正三棱柱中的四个判断',
        shortTitle: '原题',
        type: 'multi',
        stem: '在正三棱柱 $ABC\\text{-}A_1B_1C_1$ 中，$D$ 为 $BC$ 的中点，则下列结论成立的是（　）（多选）',
        options: [
          { key: 'A', text: '$AD\\perp A_1C$' },
          { key: 'B', text: '$BC\\perp$ 平面 $AA_1D$' },
          { key: 'C', text: '$AD\\parallel A_1B_1$' },
          { key: 'D', text: '$CC_1\\parallel$ 平面 $AA_1D$' },
        ],
        answerKeys: ['B', 'D'],
        answerDisplay: 'B、D',
        optionNotes: {
          A: 'A 不成立：$AD\\cdot A_1C=3\\ne 0$，两线不垂直（$A_1C$ 的底面投影是 $AC$，与 $AD$ 成 $30^\\circ$）。',
          B: 'B 成立：$BC\\perp AD$、$BC\\perp AA_1$，两条相交直线都在平面 $AA_1D$ 内，故 $BC\\perp$ 平面 $AA_1D$。',
          C: 'C 不成立：$A_1B_1\\parallel AB$，而 $AD$ 与 $AB$ 成 $30^\\circ$，二者不平行。',
          D: 'D 成立：$CC_1\\parallel AA_1\\subset$ 平面 $AA_1D$，且 $C\\notin$ 平面 $AA_1D$（交线是 $AD$），故 $CC_1\\parallel$ 平面 $AA_1D$。',
        },
        solution:
          '① 正三角形中 $AD$ 是中线也是高，故 $AD\\perp BC$；正棱柱的侧棱 $AA_1\\perp$ 底面，故 $AA_1\\perp BC$。\n② $BC\\perp AD$、$BC\\perp AA_1$，且 $AD$ 与 $AA_1$ 相交于 $A$，所以 $BC\\perp$ 平面 $AA_1D$ —— **B 对**。\n③ $CC_1\\parallel AA_1$，而 $AA_1\\subset$ 平面 $AA_1D$；平面 $AA_1D$ 与底面的交线是 $AD$，$C\\notin AD$，即 $C\\notin$ 平面 $AA_1D$，故 $CC_1\\parallel$ 平面 $AA_1D$ —— **D 对**。\n④ 取坐标 $D=(0,0,0)$、$B=(-1,0,0)$、$C=(1,0,0)$、$A=(0,\\sqrt{3},0)$、$A_1=(0,\\sqrt{3},h)$：$\\overrightarrow{AD}\\cdot\\overrightarrow{A_1C}=3\\ne 0$（A 错）；$\\overrightarrow{AD}$ 与 $\\overrightarrow{A_1B_1}=(-1,-\\sqrt{3},0)$ 不平行（C 错）。',
        keyPoint:
          '线面垂直要找“面内两条相交直线”；线面平行要“面内一条平行线 + 直线不在面内”。只选 B 或只选 D 都只是部分正确。',
        sourceNote: '原题 · 判分依据封存基准（只选一个 = 部分正确）',
      },
      {
        id: 'B-v1',
        caseId: 'B',
        kind: 'variant',
        title: '变式一 · 换一组线面判断',
        shortTitle: '变式一',
        type: 'multi',
        stem: '在正三棱柱 $ABC\\text{-}A_1B_1C_1$ 中，$D$ 为 $BC$ 的中点，下列结论成立的是（　）（多选）',
        options: [
          { key: 'A', text: '$AD\\perp BB_1$' },
          { key: 'B', text: '$AD\\parallel$ 平面 $BCC_1B_1$' },
          { key: 'C', text: '$BC\\perp AA_1$' },
          { key: 'D', text: '$BC\\perp A_1D$' },
        ],
        answerKeys: ['A', 'C', 'D'],
        answerDisplay: 'A、C、D',
        optionNotes: {
          A: 'A 成立：侧棱 $BB_1\\perp$ 底面，$AD$ 在底面内，故 $AD\\perp BB_1$。',
          B: 'B 不成立：$AD$ 与平面 $BCC_1B_1$ 在 $D$ 点相交（$D\\in BC\\subset$ 平面），线面平行要求没有公共点。',
          C: 'C 成立：正棱柱侧棱 $AA_1\\perp$ 底面，$BC$ 在底面内，故 $AA_1\\perp BC$。',
          D: 'D 成立：由原题已证 $BC\\perp$ 平面 $AA_1D$，而 $A_1D$ 在该平面内，所以 $BC\\perp A_1D$。',
        },
        solution:
          '① $BB_1\\parallel AA_1$，而 $AA_1\\perp$ 底面，所以 $BB_1\\perp$ 底面；$AD$ 在底面内 ⇒ $AD\\perp BB_1$，**A 对**。\n② $AD$ 与平面 $BCC_1B_1$ 有公共点 $D$（$D$ 在 $BC$ 上），线面平行要求“无公共点”⇒ **B 错**。\n③ $AA_1\\perp$ 底面 ⇒ $AA_1\\perp BC$，**C 对**。\n④ $AD\\perp BC$、$AA_1\\perp BC$，且 $AD$ 与 $AA_1$ 相交于 $A$，所以 $BC\\perp$ 平面 $AA_1D$；又 $A_1D\\subset$ 平面 $AA_1D$，线面垂直的性质给出 $BC\\perp A_1D$，**D 对**。',
        keyPoint: '判断线面平行先看“有没有公共点”；线面垂直时平面内任意直线都与该直线垂直。',
        sourceNote: '变式 · 由题2换项（本题库自撰）',
      },
      {
        id: 'B-v2',
        caseId: 'B',
        kind: 'variant',
        title: '变式二 · 判定 AD 与 A₁C 的位置关系',
        shortTitle: '变式二',
        type: 'single',
        stem: '在正三棱柱 $ABC\\text{-}A_1B_1C_1$ 中，$D$ 为 $BC$ 的中点。直线 $AD$ 与直线 $A_1C$ 的位置关系是（　）',
        options: [
          { key: 'A', text: '垂直' },
          { key: 'B', text: '平行' },
          { key: 'C', text: '既不垂直也不平行（异面）' },
          { key: 'D', text: '无法判断' },
        ],
        answerKeys: ['C'],
        answerDisplay: 'C · 异面且不垂直',
        wrongs: [
          {
            keys: ['A'],
            reason:
              'A 凭图形“看着像垂直”。用坐标算：$\\overrightarrow{AD}\\cdot\\overrightarrow{A_1C}=0\\cdot 1+(-\\sqrt{3})(-\\sqrt{3})+0\\cdot(-h)=3\\ne 0$，所以不垂直。',
          },
          {
            keys: ['B'],
            reason:
              'B 忽略了方向：$AD$ 的底面方向与 $A_1C$ 在底面的投影 $AC$ 成 $30^\\circ$，两直线方向不平行。',
          },
          {
            keys: ['D'],
            reason: 'D 过于保守：建立坐标系后方向向量与点积都能算出来，位置关系可以确定。',
          },
        ],
        solution:
          '① 取 $D=(0,0,0)$、$B=(-1,0,0)$、$C=(1,0,0)$、$A=(0,\\sqrt{3},0)$、$A_1=(0,\\sqrt{3},h)\\ (h>0)$。\n② $\\overrightarrow{AD}=(0,-\\sqrt{3},0)$，$\\overrightarrow{A_1C}=(1,-\\sqrt{3},-h)$。\n③ 点积 $=0\\cdot 1+(-\\sqrt{3})(-\\sqrt{3})+0\\cdot(-h)=3\\ne 0$ ⇒ 不垂直。\n④ 若平行，则存在 $\\lambda$ 使 $\\overrightarrow{AD}=\\lambda\\overrightarrow{A_1C}$：由 $z$ 分量 $0=-\\lambda h$ 得 $\\lambda=0$；再由 $y$ 分量 $-\\sqrt{3}=-\\lambda\\sqrt{3}$ 得 $\\lambda=1$，矛盾 ⇒ 不平行。两线也无公共点，故为异面且不垂直，选 **C**。',
        keyPoint: '空间两直线“不垂直”用点积判断；投影只能辅助看夹角，竖直分量会影响点积结果。',
        sourceNote: '变式 · 由题2排除项深挖（本题库自撰）',
      },
    ],
  },

  {
    caseId: 'C',
    code: '题3',
    title: '有放回取球的期望',
    chip: '填空 · 概率统计',
    knowledge: KNOWLEDGE.C,
    image: q3,
    sealedAnswer: '61/25 = 2.44',
    sealedNote: '判分依据封存基准 C（61/25 = 2.44）',
    items: [
      {
        id: 'C-orig',
        caseId: 'C',
        kind: 'original',
        title: '原题 · 有放回取三次的不同号码个数期望',
        shortTitle: '原题',
        type: 'fill',
        stem: '一个箱子里有 5 个球，分别以 $1\\sim 5$ 标号，若有放回地取三次，记至少取出一次的球的个数为 $X$，则 $E(X)=$ ______。',
        accepts: ['61/25', '2.44', '305/125', '5*(1-(4/5)^3)', '5×(1−(4/5)³)', '61/25=2.44'],
        acceptRegex: ['^5\\*?\\(?1-\\(?4/5\\)?\\^?3\\)?$'],
        answerDisplay: '61/25 = 2.44',
        pitfalls: [
          {
            pattern: '^3$',
            reason:
              '填 3 是按“无放回”处理：无放回取三次必取到三个不同号码，$X\\equiv 3$。本题**有放回**，三次可能重复，$X$ 可取 1、2、3。',
          },
          {
            pattern: '61/125',
            reason:
              '这是单个号码“至少出现一次”的概率 $P(I_i=1)=\\dfrac{61}{125}$，但 $X$ 是 5 个指示变量之和，期望要再乘 5。',
          },
          {
            pattern: '183/125',
            reason: '系数用错：指示变量是 5 个（5 个号码），不是抽取次数 3。$E(X)=5\\times\\dfrac{61}{125}$。',
          },
          {
            pattern: '69/25',
            reason: '按 $X=1,2,3$ 分类计数时漏扣了“三次全同”的情况，导致 $P(X=2)$ 偏大。',
          },
          {
            pattern: '64/125',
            reason: '$\\dfrac{64}{125}$ 是“某个号码三次都没出现”的概率；题目要的是它“至少出现一次”，应取补事件。',
          },
        ],
        solution:
          '① 设 $I_i$ 表示第 $i$ 号球在三次抽取中至少出现一次（$i=1,\\dots,5$），则 $X=I_1+\\cdots+I_5$。\n② 一次取不到 $i$ 号的概率是 $\\dfrac{4}{5}$，三次都取不到是 $\\left(\\dfrac{4}{5}\\right)^3=\\dfrac{64}{125}$，故 $P(I_i=1)=1-\\dfrac{64}{125}=\\dfrac{61}{125}$。\n③ 由期望的线性性（不要求各 $I_i$ 独立）：$E(X)=\\sum E(I_i)=5\\times\\dfrac{61}{125}=\\dfrac{61}{25}=2.44$。\n④ 计数验算：125 个等可能有序结果中，只出现一种球 5 个、恰出现两种 60 个、三种互异 60 个，加权得 $\\dfrac{5\\times1+60\\times2+60\\times3}{125}=\\dfrac{305}{125}=\\dfrac{61}{25}$。',
        keyPoint:
          '指示变量 + 期望线性性。$X$ 是不同号码种数（1~3），期望可以是小数；别把“一个号码的概率”当成最终答案。',
        sourceNote: '原题 · 判分依据封存基准（61/25 = 2.44）',
      },
      {
        id: 'C-v1',
        caseId: 'C',
        kind: 'variant',
        title: '变式一 · 改成无放回抽取',
        shortTitle: '变式一',
        type: 'fill',
        stem: '同一个箱子（5 个球，编号 $1\\sim 5$）中**无放回**地取三次，记至少取出一次的球的个数为 $X$，则 $E(X)=$ ______。',
        accepts: ['3', '三'],
        answerDisplay: '3',
        pitfalls: [
          {
            pattern: '61/25|2\\.44',
            reason: '这是“有放回取三次”的答案。无放回抽三次，三个号码互不相同，$X$ 恒等于 3。',
          },
          {
            pattern: '183/125',
            reason: '无放回时每个号码出现与否高度相关，不能沿用有放回的 $\\dfrac{61}{125}$；直接由 $X\\equiv 3$ 得 $E(X)=3$。',
          },
        ],
        solution:
          '① 无放回地取三次，每次取出的号码都不相同，所以三次共取出 3 个不同号码。\n② 因此 $X$ 恒等于 3（是常数随机变量），$E(X)=3$。\n③ 对比：有放回时可能出现重复，$X$ 才需要按指示变量求和（$\\dfrac{61}{25}=2.44$）。',
        keyPoint: '先判断 $X$ 是不是常数：无放回三次 ⇒ 三个不同号码 ⇒ $E(X)=3$。',
        sourceNote: '变式 · 由题3改条件（本题库自撰）',
      },
      {
        id: 'C-v2',
        caseId: 'C',
        kind: 'variant',
        title: '变式二 · 有放回取四次',
        shortTitle: '变式二',
        type: 'fill',
        stem: '同一个箱子（5 个球，编号 $1\\sim 5$）中**有放回**地取四次，记至少取出一次的球的个数为 $X$，则 $E(X)=$ ______。',
        accepts: ['369/125', '2.952', '2.95', '5*(1-(4/5)^4)', '5×(1−(4/5)⁴)'],
        acceptRegex: ['^5\\*?\\(?1-\\(?4/5\\)?\\^?4\\)?$'],
        answerDisplay: '369/125 ≈ 2.952',
        pitfalls: [
          {
            pattern: '61/25|2\\.44',
            reason: '这是取三次的答案。本题取四次：$P(\\text{某号一次都没出现})=\\left(\\dfrac{4}{5}\\right)^4=\\dfrac{256}{625}$。',
          },
          {
            pattern: '256/625|0\\.4096',
            reason: '这是“某个号码一次都没出现”的概率；要求“至少出现一次”，应取补事件 $1-\\dfrac{256}{625}$，再乘 5。',
          },
          {
            pattern: '^4$|^3$',
            reason: '$X$ 是出现过的不同号码个数（最多 5 个），期望不是抽取次数；请回到指示变量计算。',
          },
          {
            pattern: '64/625',
            reason: '$64/625$ 不是本题的中间量：取四次时 $\\left(\\dfrac{4}{5}\\right)^4=\\dfrac{256}{625}$（$64/125$ 是取三次的值）。请按四次的补事件重算。',
          },
        ],
        solution:
          '① 取四次时，$P(I_i=1)=1-\\left(\\dfrac{4}{5}\\right)^4=1-\\dfrac{256}{625}=\\dfrac{369}{625}$。\n② $X=I_1+\\cdots+I_5$，由期望线性性：$E(X)=5\\times\\dfrac{369}{625}=\\dfrac{369}{125}=2.952$。\n③ 直观检验：取四次比取三次更可能覆盖更多号码，$2.952>2.44$，方向一致。',
        keyPoint: '换次数只改补事件里的指数：$P(I_i=1)=1-\\left(\\dfrac45\\right)^n$，再乘 5。',
        sourceNote: '变式 · 由题3改次数（本题库自撰）',
      },
    ],
  },
]

export const practiceItems = practiceGroups.flatMap((g) => g.items)

export function findPracticeGroup(caseId) {
  return practiceGroups.find((g) => g.caseId === String(caseId)) || null
}

export function findPracticeItem(itemId) {
  return practiceItems.find((it) => it.id === itemId) || null
}

/** 每个案例的分组统计（供我的页掌握度使用，纯函数）。 */
export function groupStats(caseId, records) {
  const group = findPracticeGroup(caseId)
  if (!group) return { total: 0, answered: 0, correct: 0, partial: 0, wrong: 0, score: 0 }
  let answered = 0
  let correct = 0
  let partial = 0
  let wrong = 0
  for (const item of group.items) {
    const rec = records[item.id]
    if (!rec || !rec.status) continue
    answered += 1
    if (rec.status === 'correct') correct += 1
    else if (rec.status === 'partial') partial += 1
    else wrong += 1
  }
  const score = group.items.length ? Math.round(((correct + 0.5 * partial) / group.items.length) * 100) : 0
  return { total: group.items.length, answered, correct, partial, wrong, score }
}
