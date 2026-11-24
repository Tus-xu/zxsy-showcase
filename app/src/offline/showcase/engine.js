/**
 * 引导式解题状态机（离线、可重放、纯函数）。
 *
 * 依据 `docs/superpowers/plans/2026-11-24-guided-solving-full-journey.md`：
 *   - 页面只有四个主阶段：读题 → 选方法 → 分步推导 → 订正；
 *   - 两条可完整运行的方法（A 导数变号 / B 比较附近函数值），换路保留共用已证事实；
 *   - 前置小课与极限支线都是「推导中的暂停」，不进主进度，返回原节点继续；
 *   - 学生提交一次只处理一次；开始小课、检验反馈、返回都可重复恢复。
 *
 * 纪律：
 *   - 只对已编排的节点与回复作匹配，不假装理解任意输入；无法判定时留在原步骤并请学生选一步。
 *   - 不新增一级入口；所有产出都是一条 AI 轮次（text + cards）。
 *   - 进度只存在 `session` 里，`step()` 不改外部状态。
 */

const STAGE = { read: '读题', method: '选方法', derive: '分步推导', fix: '订正', done: '已完成' }
const STAGE_NO = { read: 1, method: 2, derive: 3, fix: 4, done: 4 }

import { quizChain } from './bank'

/** 公共已证事实：两条路径数学意义相同，可以互相继承 */
export const FACT = {
  candidates: 'candidates', // g′(x)=0 的两处候选 −1、2
  maxAtMinus1: 'maxAtMinus1', // −1 处为局部极大
  minAtTwo: 'minAtTwo', // 2 处为局部极小
  answerC: 'answerC', // 局部极小横坐标为 2
}

const KP = '导数与函数单调性'

/* ───────────────── 文案（逐句对齐方案；改文案请同步 engine.test.js） ───────────────── */

export const T = {
  diagnose:
    '你找到的 $-1$ 确实让导数为零，这一步是对的。不过导数等于零只说明这一点的切线是水平的；它是极大、极小还是都不是，要看曲线经过这个点时先升后降，还是先降后升。',
  localAnswer:
    '只和足够靠近它的点比较，像站在一个小山谷的谷底。局部极小一定是整个定义域的最低值吗？',
  localNo: '嗯。局部只看附近，全局才要跟所有点比。',

  methodAsk: '现在知道要找什么了。你想先从哪一种方法试？',
  methodHelp: '这题是多项式，导数容易分解，可以先试变号法。你也可以直接试另一路，两种方法都解释得通。',

  a1Ask: '先找导数可能变号的位置。$g\'(x)=6(x+1)(x-2)$。这两个因子分别在什么位置等于零？',
  a1Right: '对。−1 和 2 就是导数可能变号的两个位置，先记下来。',
  a1Wrong: '把两个因子分别令零：$x+1=0$ 得 $x=-1$，$x-2=0$ 得 $x=2$。',
  a1Hint: '两个因子相乘等于零，只要其中一个因子为零。分别令它们等于零就行。',

  a2AskPick:
    '先看你选的 $-1$。它左边可以取 $-2$，右边、另一个候选点之前可以取 $0$。先看 $g\'(0)=-12$。这告诉我们什么？',
  a2AskCheck:
    '先检查候选点 $-1$。它左边可以取 $-2$，右边、另一个候选点之前可以取 $0$。先看 $g\'(0)=-12$。这告诉我们什么？',
  a2Right: '对。检查整个 $(-1,\\,2)$ 区间的因子符号后，我们就能判断这段曲线的升降。',
  a2Misread:
    '你正确读出了 g′(0) 是负数。它说的是切线的斜率。图像在轴的哪一侧，要看 g(0) 的正负。我们先用一个小例子分清这两件事，再回来。',
  a2Clarify: '你说的负，是函数值 g(0) 为负，还是导数 g′(0) 为负？',
  a2Hint: '先只看 x=0 时两个因子各是什么符号：(0+1) 和 (0−2)。',

  d1Lead:
    '看这段 y=1−x。在 0<x<1，它画在 x 轴上方，所以函数值为正。但向右走时线往下，斜率为 −1。「在上面」讲位置，「往下走」讲变化方向。这两件事可以同时成立。',
  d2Ask: '现在你来判断。r(x)=5−2x 在 0<x<2 上的位置和走向是什么？',
  d2Right: '对。这个区间内 r(x)>1，而斜率是 −2，所以它在上方，同时下降。',
  d2WrongBelow: '位置看的是 r(x) 的正负。取 x=1 试试：r(1)=5−2=3，是正数，所以在上方。',
  d2WrongInc: '位置对了。走向要看斜率：r(x)=5−2x 的一次项系数是 −2，所以向右走是下降。',
  d2Stuck: '先算 r(1)=3，它在 x 轴上方；再看 x 变大时 r 变大还是变小。',
  d2Explained:
    '完整解析：r(x)=5−2x。x=1 时 r(1)=3>0，所以在 x 轴上方；一次项系数是 −2，所以向右下降。',

  resume: '回到 g。刚才已经找到候选点 −1 和 2。先看 −1 两侧，分别判断 g′(−2) 和 g′(0) 的符号。',

  a3Ask: '$-1$ 左右两侧的导数符号分别是什么？',
  a3Right:
    '对。$g\'(-2)=24$ 是正，$g\'(0)=-12$ 是负，所以 $-1$ 左边增、右边减。每个区间内两个因子的符号都不变，所以三段依次是 $+$、$-$、$+$；$g\'(3)=24$ 也对得上。',
  a3Wrong:
    '分别代入两个因子：$-2+1=-1$、$-2-2=-4$，两个都为负，乘积为正；$0$ 处是 $1$ 和 $-2$，乘积为负。',
  a3Hint: '只看符号：−2 时两个因子都负，负乘负得正；0 时一正一负，得负。',

  a3c1Ask: '$-1$ 左边正、右边负，函数先增后减，它是哪一类？',
  a3c1Right: '对，这里是局部极大。到了 $2$ 呢？左负右正对应什么？',
  a3c1Wrong: '先增后减，曲线在这一点从上升转到下降，最高点就在这儿——所以是局部极大。',
  a3c2Ask: '到了 2 呢？左负右正对应什么？',
  a3c2Right: '对。到这里两个候选都分清了。',
  a3c2Wrong: '左负右正：左边还在下降，过了这一点开始上升，所以它是这一段的低点——局部极小。',

  a4Ask: '现在两个候选都能区分了。请选出取得局部极小值的横坐标。',
  a4Right: '对。$g(2)=-19$，比附近的 $g(-1)=8$ 小。你原来那一步只让导数等于零，没有看它两侧的符号变化。',
  a4Wrong: 'g(−1)=8 是局部极大。回到刚才两句：哪一边是左负右正？',

  whyAsk: '现在用一句话说明：为什么 −1 这里不能选它。',
  whyRight: '对。左侧在上升、右侧在下降，说明它是这一段里的最高点，不是最低点。',
  whyWrong: '导数为零只是候选。要看它两侧的符号：左正右负是极大，左负右正才是极小。',
  whyHint: '用「左侧…，右侧…」的说法描述一下 −1 两边的走势。',

  fixAsk: '导学和原题是同一道题。回到题卡重选一次，原来的答案会留着。',
  fixRetryLead: '题目重新放在这里了。这一次先写出候选点，再看两边符号，最后才选。',
  fixDone: '已订正。首答 A 与改答 C 都留在上面，随时能回看。',
  fixWrongA: '还是把它当成极大了。−1 两侧是左正右负，那里是高点。再看 2。',
  fixWrongOther: '先算 g′(x)=6(x+1)(x−2)，两处候选是 −1 和 2；再看哪一处左负右正。',

  b1Ask:
    '我们检查两个候选附近的函数值。若 $g(x)-g(a)>0$ 对 $a$ 附近所有 $x\\neq a$ 都成立，那么 $g(a)$ 比这些值大还是小？',
  b1Right: '对，差值恒正说明 g(a) 更小，是局部极小；反过来差值恒负就是局部极大。',
  b1Wrong: '式子是 g(x)−g(a)。它大于零，说明 g(x) 更大，也就是 g(a) 更小。',
  b2Ask:
    '把函数值作差并整理，有 $g(x)-g(-1)=(x+1)^2(2x-7)$。当 $x$ 靠近 $-1$ 且不等于它，平方因子为正。$2x-7$ 在 $-1$ 附近是正还是负？',
  b2Right:
    '对，取 x=−1 得 −9，所以在这个邻域里 2x−7 为负。平方因子为正、它取负，差值就为负——附近的值都比 g(−1) 小，所以 −1 是局部极大。',
  b2Wrong: '代 x=−1 看看：2×(−1)−7=−9。在 −1 附近它一直是负的。',
  b2Hint: '平方因子 (x+1)² 一定非负。所以差值的符号由 2x−7 决定。',
  b3Ask: '在 $2$ 附近，$g(x)-g(2)=(x-2)^2(2x+5)$。若 $1<x<3$ 且 $x\\neq 2$，它是什么符号？',
  b3Right:
    '对。平方因子为正，2x+5 在这个区间最小是 7，也是正的，所以差值恒正——附近的值都比 g(2) 大，2 是局部极小。',
  b3Wrong: '代 x=2：2×2+5=9，是正数；而 1<x<3 时 2x+5 最小也有 7，所以恒正。',
  b4Ask: '两种候选的邻域表现已经分清了。请选出取得局部极小值的横坐标。',
  b4Right: '对，是 2，对应点 (2,−19)。两种方法指向同一个结论。',
  b4Wrong: 'x=−1 那里差值恒负，是局部极大。再看一看：哪一个让差值恒正？',
  switchLead: '好，换一条思路。已经确认的结论都留着，我们只补另一条路的证据。',

  limitAsk:
    '极限可以解释导数是怎么定义的。这一步也可以先用已经给出的导数公式继续。要用一个小例子先看极限吗？',
  limitGraph: '极限说的是靠近时的趋势：附近的变化 → 用极限描述趋近 → 割线斜率的极限定义导数。',
  limitExample:
    '用 y=x² 在 x=1 附近看。h≠0 时，差商 ((1+h)²−1)/h = 2+h。h=−0.1 时是 1.9，h=0.1 时是 2.1。h 越靠近 0，割线斜率越靠近 2。',
  limitCheckAsk: '换到 y=x² 在 x=2 的差商，它等于 4+h。h 趋近 0 时，差商靠近什么？',
  limitCheckRight: '对。h 在趋近 0，而整个 4+h 趋近 4，这就是 x=2 处的导数。',
  limitCheckWrong: '看清楚是谁在趋近 0：是 h。整个 4+h 会趋近 4。',
  limitBack: '回到刚才停下的地方。',
  limitSkip: '好，先用已经给出的导数公式继续。',

  unknown: '这条练习里你可以先选一个步骤，我会照这个思路继续。',
  noop: '这一步可以选上面的一个动作，我照这个思路继续。',
}

/* ───────────────── 卡片构造 ───────────────── */

function progress(stage) {
  return {
    type: 'socratic_progress',
    current_step: STAGE_NO[stage] || 1,
    steps_count: 4,
    stage_label: STAGE[stage] || '',
    kp_name: KP,
  }
}

function cardRead({ relation = false } = {}) {
  return {
    type: 'showcase_stage',
    variant: 'read',
    stage: STAGE.read,
    title: '题目看懂了',
    relation: relation
      ? { chain: '函数的变化 → 单调性与极值', focus: '局部极小', note: '只和足够靠近它的点比较' }
      : null,
    clues: [
      { left: 'g(x)=2x³−3x²−12x+1', right: '已知函数式，可以求导或作差' },
      { left: '「局部极小值」', right: '比较这个位置附近的高低' },
      { left: '「在哪个 x」', right: '最后要交的是横坐标' },
    ],
    actions: [
      { id: 'read_ok', label: '题目看懂了', primary: true },
      { id: 'read_local', label: '「局部」是什么意思？' },
    ],
  }
}

function cardLocal() {
  return {
    type: 'showcase_stage',
    variant: 'derive',
    stage: STAGE.read,
    title: '局部只看附近',
    note: '局部极小一定是整个定义域的最低值吗？',
    options: [
      { id: 'yes', label: '一定' },
      { id: 'no', label: '不一定' },
      { id: 'depends', label: '要看函数' },
    ],
  }
}

function cardMethod() {
  return {
    type: 'showcase_stage',
    variant: 'method',
    stage: STAGE.method,
    title: '你想先从哪一种方法试？',
    methods: [
      { id: 'A', label: '看导数变号', sub: '先找候选点，再看左右是增还是减' },
      { id: 'B', label: '比较附近的函数值', sub: '固定一个点，比较附近函数值的高低' },
    ],
    hint: { id: 'help', label: '帮我选' },
  }
}

function cardDerive(o) {
  return { type: 'showcase_stage', variant: 'derive', stage: STAGE.derive, ...o }
}

function cardLesson(checkState) {
  return {
    type: 'showcase_stage',
    variant: 'lesson',
    stage: STAGE.derive,
    pauseAt: '判断导数符号',
    title: '先分清高度和斜率',
    relations: [
      { left: '函数值 y', right: '在轴上方或下方', legend: '位置' },
      { left: '导数 y′', right: '切线斜率', legend: '方向' },
    ],
    figureKey: 'lesson_line',
    checkState: checkState || null,
    actions: [
      { id: 'lesson_check', label: '试一小题', primary: true },
      { id: 'lesson_back', label: '先回原题' },
    ],
  }
}

function cardCheck(o) {
  return { type: 'showcase_stage', variant: 'check', stage: STAGE.derive, ...o }
}

function cardResume() {
  return {
    type: 'showcase_stage',
    variant: 'resume',
    stage: STAGE.derive,
    pauseAt: '判断导数符号',
    note: '小课结束，回到刚才那一步。',
    actions: [{ id: 'resume_back', label: '回到看导数符号', primary: true }],
  }
}

function cardConclusion() {
  return cardDerive({
    title: '两个候选的结论',
    note: '横坐标和极值本身分开写。',
    pairs: [
      { at: 'x=−1', value: 'g(−1)=8', kind: '局部极大' },
      { at: 'x=2', value: 'g(2)=−19', kind: '局部极小' },
    ],
  })
}

function cardFix(label) {
  return {
    type: 'showcase_stage',
    variant: 'fix',
    stage: STAGE.fix,
    title: '回到题卡',
    note: '原题在上方，首答的作答记录保留。',
    actions: [{ id: 'fix_go', label: label || '回到这题', primary: true }],
  }
}

function cardRetry() {
  return {
    type: 'showcase_stage',
    variant: 'retry',
    stage: STAGE.fix,
    title: '重选一次',
    question: 'g(x)=2x³−3x²−12x+1 在哪个 x 取得局部极小值？',
    options: [
      { id: 'A', label: '−1' },
      { id: 'B', label: '1' },
      { id: 'C', label: '2' },
      { id: 'D', label: '−2' },
    ],
  }
}

function cardSummary(summary) {
  return {
    type: 'showcase_stage',
    variant: 'summary',
    stage: STAGE.done,
    title: '这一轮实际发生了什么',
    corrected: !!summary?.corrected,
    lines: summary?.lines || [],
  }
}

function cardLimit() {
  return {
    type: 'showcase_stage',
    variant: 'limit',
    stage: STAGE.derive,
    pauseAt: '极限支线',
    title: '极限说的是靠近时的趋势',
    chain: ['附近的变化', '用极限描述趋近', '割线斜率的极限定义导数'],
    figureKey: 'limit_secant',
    example: [
      { h: 'h = −0.1', q: '差商 = 1.9' },
      { h: 'h = 0.1', q: '差商 = 2.1' },
    ],
    actions: [
      { id: 'limit_check', label: '做一个小检验', primary: true },
      { id: 'limit_back', label: '先继续原题' },
    ],
  }
}

/* ───────────────── 文本归一化（只做本题安全归一化，绝不 eval） ───────────────── */

const DASH = { '−': '-', '–': '-', '—': '-', '－': '-', '﹣': '-' }

export function norm(s) {
  let t = String(s ?? '')
  for (const [k, v] of Object.entries(DASH)) t = t.split(k).join(v)
  return t
    .replace(/\s+/g, '')
    .replace(/[，。？！、；：,\.\?!;:]/g, '')
    .replace(/[（）()「」『』“”"']/g, '')
    .toLowerCase()
}

function has(t, ...keys) {
  return keys.some((k) => t.includes(norm(k)))
}

/** 选项匹配：先按选项原文 / id，再按同义短句 */
export function matchOption(options, raw) {
  const t = norm(raw)
  if (!t) return null
  const direct = options.find((o) => norm(o.label) === t || norm(o.id) === t)
  if (direct) return direct
  const alias = options.filter((o) => Array.isArray(o.aliases) && o.aliases.some((a) => norm(a) === t))
  return alias.length === 1 ? alias[0] : null
}

/** 取卡片组里最后一个带 options 的卡（结论卡也可能在前，不能写死下标） */
function optionsOf(cards) {
  for (let i = (cards || []).length - 1; i >= 0; i--) {
    if (Array.isArray(cards[i]?.options) && cards[i].options.length) return cards[i].options
  }
  return []
}

/** 明确表达的术语追问（只建立支线，不按误解分流） */
function isLimitAsk(raw) {
  return has(norm(raw), '极限', '无限靠近', '趋近', '怎么定义')
}

/* ───────────────── 转移辅助 ───────────────── */

function retry(s, text, cards) {
  return { next: s.node, session: s, reply: { text, cards } }
}

function addFact(s, f) {
  const facts = Array.isArray(s.facts) ? s.facts : []
  return facts.includes(f) ? s : { ...s, facts: [...facts, f] }
}

function startLesson(s, returnNode, lead) {
  return {
    next: 'd1_lesson',
    session: {
      ...s,
      lesson: { concept: 'value_vs_derivative', returnNode, check: 'pending' },
      lessonPending: true,
    },
    reply: { text: lead, cards: [progress('derive'), cardLesson('pending')] },
  }
}

function startLimit(s, returnNode) {
  return {
    next: 'limit_intro',
    session: { ...s, limitReturn: returnNode, limitDone: false },
    reply: { text: T.limitAsk, cards: [progress('derive'), cardLimit()] },
  }
}

/**
 * 换路：保留已独立证实的共用事实（候选点、已判定的极值类型、订正结果），
 * 各路径自己的局部证据不互相冒充（A 的导数符号不等于 B 的差值符号）。
 */
function switchPath(s, to) {
  const target = to === 'B' ? 'b1_standard' : 'a1_candidates'
  const next = { ...s, path: to, switched: true, stage: 'derive', lessonPending: false }
  return { next: target, session: next, reply: { ...get(target).build(next), text: T.switchLead } }
}

function backToPaused(s, returnNode, text) {
  const target = returnNode || 'a2_diagnose'
  const nextS = { ...s, limitReturn: null }
  return { next: target, session: nextS, reply: { ...NODES[target].build(nextS), text } }
}

/* ───────────────── 节点图 ───────────────── */

const NODES = {}

/** 注册节点（只写） */
function node(id, def) {
  NODES[id] = def
}

/** 读取节点（只读；缺注册时返回 null，调用方必须容错） */
function get(id) {
  return NODES[id] || null
}

/* ===== 读题 ===== */

node('r_read', {
  build: () => ({ text: T.diagnose, cards: [progress('read'), cardRead({ relation: true })] }),
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'r_read')
    const t = norm(a.text)
    const picked = matchOption(cardRead().actions, a.text)
    if (picked?.id === 'read_ok' || has(t, '看懂了', '明白了', '懂了', '继续')) {
      return { next: 'm_method', session: { ...s, stage: 'method' }, reply: null }
    }
    if (picked?.id === 'read_local' || has(t, '局部是什么意思', '什么叫局部', '局部')) {
      return {
        next: 'r_read_local',
        session: { ...s, stage: 'read' },
        reply: { text: T.localAnswer, cards: [progress('read'), cardLocal()] },
      }
    }
    return retry(s, T.unknown, [progress('read'), cardRead({ relation: true })])
  },
})

node('r_read_local', {
  build: () => ({ text: T.localAnswer, cards: [progress('read'), cardLocal()] }),
  accept(s, a) {
    const picked = matchOption(cardLocal().options, a.text)
    if (picked?.id === 'no') {
      return {
        next: 'm_method',
        session: { ...s, stage: 'method' },
        reply: {
          text: `${T.localNo}那我们挑一种方法试。`,
          cards: [progress('method'), cardMethod()],
        },
      }
    }
    if (picked) {
      return retry(
        s,
        '反例：g(x) 在 x=2 附近是最低的，但整条曲线还能一直往下走。所以局部极小不一定是全局最低。',
        [progress('read'), cardLocal()],
      )
    }
    return retry(s, T.unknown, [progress('read'), cardLocal()])
  },
})

/* ===== 选方法 ===== */

node('m_method', {
  build: () => ({ text: T.methodAsk, cards: [progress('method'), cardMethod()] }),
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'm_method')
    const t = norm(a.text)
    const cm = cardMethod()
    const picked = matchOption([...cm.methods, cm.hint], a.text)
    if (picked?.id === 'A' || has(t, '变号', '求导', '导数')) {
      return { next: 'a1_candidates', session: { ...s, path: 'A', stage: 'derive' }, reply: null }
    }
    if (picked?.id === 'B' || has(t, '比较', '函数值', '作差')) {
      return { next: 'b1_standard', session: { ...s, path: 'B', stage: 'derive' }, reply: null }
    }
    if (picked?.id === 'help') return retry(s, T.methodHelp, [progress('method'), cardMethod()])
    return retry(s, '这两种方法都能做这题。选一个先试，另一条随时可以再看。', [
      progress('method'),
      cardMethod(),
    ])
  },
})

/* ===== A 路径：导数变号 ===== */

node('a1_candidates', {
  build: () => ({
    text: T.a1Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '先找候选点',
        options: [
          { id: 'right', label: '−1 和 2', aliases: ['x=-1，x=2', '-1,2', '-1、2'] },
          { id: 'wrong', label: '−2 和 1', aliases: ['-2,1'] },
        ],
        hint: { id: 'hint', label: '提示' },
        footer: { id: 'switch_b', label: '换一种方法' },
      }),
    ],
  }),
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'a1_candidates')
    const t = norm(a.text)
    const cards = get('a1_candidates').build().cards
    if (has(t, '换一种方法', '比较附近', '作差')) return switchPath(s, 'B')
    const picked = matchOption(optionsOf(cards), a.text)
    const wroteZeros = has(t, '-1') && has(t, '2') && (has(t, 'x') || has(t, '零点', '候选'))
    if (picked?.id === 'right' || (!picked && wroteZeros)) {
      const next = { ...addFact(s, FACT.candidates), stage: 'derive' }
      return { next: 'a2_diagnose', session: next, reply: { text: T.a1Right, ...get('a2_diagnose').build(next) } }
    }
    if (picked?.id === 'hint') return retry(s, T.a1Hint, cards)
    if (picked?.id === 'wrong') return retry(s, T.a1Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('a2_diagnose', {
  build: (s) => {
    const firstA = s?.firstAnswer === 'A'
    return {
      text: firstA ? T.a2AskPick : T.a2AskCheck,
      cards: [
        progress('derive'),
        cardDerive({
          title: '从解释里看卡点',
          candidates: firstA ? ['−1（你选的）', '2'] : ['−1', '2'],
          basis: 'g′(0) = 6(0+1)(0−2) = −12',
          note: firstA ? '你原来的作答：−1 能让导数等于零。' : '这一步先只看导数本身。',
          options: [
            { id: 'slope', label: 'x=0 处的切线斜率为负' },
            { id: 'misread', label: 'g′(0)<0，所以图像在 x 轴下方' },
            { id: 'vague', label: '应该是负的吧' },
            { id: 'unsure', label: '我不确定' },
          ],
          footer: { id: 'switch_b', label: '换一种方法' },
        }),
      ],
    }
  },
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'a2_diagnose')
    const t = norm(a.text)
    const cards = get('a2_diagnose').build(s).cards
    if (has(t, '换一种方法', '比较附近', '作差')) return switchPath(s, 'B')
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'slope') {
      return { next: 'a3_signs', session: s, reply: { text: T.a2Right, ...get('a3_signs').build(s) } }
    }
    if (picked?.id === 'misread') return startLesson(s, 'a2_diagnose', T.a2Misread)
    if (picked?.id === 'vague' || has(t, '负', '小于0', '小于零')) {
      return {
        next: 'a2_clarify',
        session: s,
        reply: {
          text: T.a2Clarify,
          cards: [progress('derive'), clarifyCard()],
        },
      }
    }
    if (picked?.id === 'unsure' || has(t, '不会', '不懂', '没思路', '卡住')) {
      return retry(s, T.a2Hint, cards)
    }
    return retry(s, T.unknown, cards)
  },
})

function clarifyCard() {
  return cardDerive({
    title: '先把词说清楚',
    options: [
      { id: 'value', label: '函数值 g(0)' },
      { id: 'deriv', label: '导数 g′(0)' },
    ],
  })
}

node('a2_clarify', {
  build: () => ({ text: T.a2Clarify, cards: [progress('derive'), clarifyCard()] }),
  accept(s, a) {
    const picked = matchOption(clarifyCard().options, a.text)
    if (picked?.id === 'deriv') {
      return {
        next: 'a3_signs',
        session: s,
        reply: { text: `对，它说的是切线斜率。${T.a2Right}`, ...get('a3_signs').build(s) },
      }
    }
    if (picked?.id === 'value') return startLesson(s, 'a2_clarify', T.a2Misread)
    if (has(norm(a.text), '负')) {
      return retry(s, '先把「谁为负」说清楚：是 g(0) 这个数值，还是 g′(0) 这个斜率？', [
        progress('derive'),
        clarifyCard(),
      ])
    }
    return retry(s, T.unknown, [progress('derive'), clarifyCard()])
  },
})

node('a3_signs', {
  build: (s) => ({
    text: s?.lessonPending ? T.resume : T.a3Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '判断 −1 两侧的符号',
        candidates: ['−1', '2'],
        basis: '当前依据 · 导数符号与变化方向',
        options: [
          { id: 'pos_neg', label: '左正右负', aliases: ['先正后负', '左边正右边负'] },
          { id: 'neg_pos', label: '左负右正', aliases: ['先负后正', '左边负右边正'] },
          { id: 'unsure', label: '我不确定' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'a3_signs')
    const t = norm(a.text)
    const cards = get('a3_signs').build(s).cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'pos_neg') {
      return {
        next: 'a3_classify',
        session: { ...s, lessonPending: false },
        reply: { text: T.a3Right, ...get('a3_classify').build(s) },
      }
    }
    if (picked?.id === 'neg_pos') return retry(s, T.a3Wrong, cards)
    if (picked?.id === 'unsure' || has(t, '不确定', '不会')) return retry(s, T.a3Hint, cards)
    return retry(s, T.unknown, cards)
  },
})

node('a3_classify', {
  build: () => ({
    text: T.a3c1Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '先看 −1',
        candidates: ['−1', '2'],
        options: [
          { id: 'max', label: '局部极大' },
          { id: 'min', label: '局部极小' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('a3_classify').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'max') {
      const next = addFact(s, FACT.maxAtMinus1)
      return { next: 'a3_classify2', session: next, reply: { text: T.a3c1Right, ...get('a3_classify2').build(next) } }
    }
    if (picked?.id === 'min') return retry(s, T.a3c1Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('a3_classify2', {
  build: () => ({
    text: T.a3c2Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '再看 2',
        candidates: ['−1 局部极大 ✓', '2'],
        options: [
          { id: 'max', label: '局部极大' },
          { id: 'min', label: '局部极小' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('a3_classify2').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'min') {
      const next = { ...addFact(s, FACT.minAtTwo), stage: 'derive' }
      return { next: 'a4_correct', session: next, reply: { text: T.a3c2Right, ...get('a4_correct').build(next) } }
    }
    if (picked?.id === 'max') return retry(s, T.a3c2Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('a4_correct', {
  build: (s) => ({
    text: T.a4Ask,
    cards: [
      progress('derive'),
      cardConclusion(),
      cardDerive({
        title: '选出局部极小的横坐标',
        candidates: ['−1 局部极大', '2 局部极小'],
        ...(s?.firstAnswer === 'A' ? { note: '你原来选的是 −1。' } : {}),
        options: [
          { id: 'm1', label: 'x=−1' },
          { id: 'm2', label: 'x=2' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('a4_correct').build(s).cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'm2') {
      const next = { ...addFact(s, FACT.answerC), stage: 'fix' }
      return s.firstAnswer === 'A'
        ? { next: 'a4_why', session: next, reply: { text: T.a4Right, ...get('a4_why').build(next) } }
        : { next: 'fix_return', session: next, reply: { text: T.a4Right, ...get('fix_return').build(next) } }
    }
    if (picked?.id === 'm1') return retry(s, T.a4Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('a4_why', {
  build: () => ({
    text: T.whyAsk,
    cards: [
      progress('fix'),
      cardDerive({
        title: '说清原来那一步',
        options: [
          { id: 'right', label: '它左侧在上升，右侧在下降', aliases: ['左边上升右边下降', '先增后减'] },
          { id: 'wrong', label: '它的导数为零，所以是极小值' },
          { id: 'unsure', label: '我不确定' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('a4_why').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    const t = norm(a.text)
    const freeOk =
      t.includes('左') && t.includes('右') && (t.includes('升') || t.includes('增')) && (t.includes('降') || t.includes('减'))
    if (picked?.id === 'right' || (!picked && freeOk)) {
      const next = { ...s, stage: 'fix' }
      return { next: 'fix_return', session: next, reply: { text: T.whyRight, ...get('fix_return').build(next) } }
    }
    if (picked?.id === 'wrong') return retry(s, T.whyWrong, cards)
    if (picked?.id === 'unsure' || has(t, '不会', '不懂')) return retry(s, T.whyHint, cards)
    return retry(s, T.unknown, cards)
  },
})

/* ===== B 路径：比较附近函数值 ===== */

node('b1_standard', {
  build: () => ({
    text: T.b1Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '先说清判据',
        basis: '当前依据 · 差值符号定义局部极值',
        options: [
          { id: 'min', label: '更小，局部极小' },
          { id: 'max', label: '更大，局部极大' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    if (isLimitAsk(a.text)) return startLimit(s, 'b1_standard')
    const cards = get('b1_standard').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'min') {
      const next = addFact(s, FACT.candidates)
      return { next: 'b2_minus1', session: next, reply: { text: T.b1Right, ...get('b2_minus1').build(next) } }
    }
    if (picked?.id === 'max') return retry(s, T.b1Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('b2_minus1', {
  build: () => ({
    text: T.b2Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '回看 −1',
        basis: 'g(x) − g(−1) = (x+1)²(2x−7)',
        note: '−2<x<0 且 x≠−1 时，平方因子为正。',
        options: [
          { id: 'neg', label: '负' },
          { id: 'pos', label: '正' },
          { id: 'hint', label: '给个提示' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('b2_minus1').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'neg') {
      const next = addFact(s, FACT.maxAtMinus1)
      return { next: 'b3_two', session: next, reply: { text: T.b2Right, ...get('b3_two').build(next) } }
    }
    if (picked?.id === 'pos') return retry(s, T.b2Wrong, cards)
    if (picked?.id === 'hint') return retry(s, T.b2Hint, cards)
    return retry(s, T.unknown, cards)
  },
})

node('b3_two', {
  build: () => ({
    text: T.b3Ask,
    cards: [
      progress('derive'),
      cardDerive({
        title: '验证 2',
        basis: 'g(x) − g(2) = (x−2)²(2x+5)',
        note: '1<x<3 且 x≠2。',
        options: [
          { id: 'pos', label: '正' },
          { id: 'neg', label: '负' },
        ],
      }),
    ],
  }),
  accept(s, a) {
    const cards = get('b3_two').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'pos') {
      const next = { ...addFact(s, FACT.minAtTwo), stage: 'derive' }
      return { next: 'b4_correct', session: next, reply: { text: T.b3Right, ...get('b4_correct').build(next) } }
    }
    if (picked?.id === 'neg') return retry(s, T.b3Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

node('b4_correct', {
  build: (s) => ({
    text: T.b4Ask,
    cards: [
      progress('derive'),
      cardConclusion(),
      cardDerive({
        title: '选出局部极小的横坐标',
        candidates: ['−1 局部极大', '2 局部极小'],
        ...(s?.firstAnswer === 'A' ? { note: '你原来选的是 −1。' } : {}),
        options: [
          { id: 'm1', label: 'x=−1' },
          { id: 'm2', label: 'x=2' },
        ],
        hint: { id: 'peek_a', label: '看看另一种方法' },
      }),
    ],
  }),
  accept(s, a) {
    const t = norm(a.text)
    if (has(t, '另一种方法', '换一种方法')) return switchPath(s, s.path === 'B' ? 'A' : 'B')
    const cards = get('b4_correct').build(s).cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'm2') {
      const next = { ...addFact(s, FACT.answerC), stage: 'fix' }
      return { next: 'fix_return', session: next, reply: { text: T.b4Right, ...get('fix_return').build(next) } }
    }
    if (picked?.id === 'm1') return retry(s, T.b4Wrong, cards)
    return retry(s, T.unknown, cards)
  },
})

/* ===== 订正 ===== */

node('fix_return', {
  build: (s) => ({
    text: T.fixAsk,
    cards: [progress('fix'), cardFix(s?.fixLabel || (s?.firstAnswer ? '返回题卡订正' : '回到这题'))],
  }),
  accept(s, a) {
    if (has(norm(a.text), '返回题卡', '回到这题', '回到原题', '订正')) {
      return {
        next: 'fix_retry',
        session: { ...s, stage: 'fix' },
        reply: { text: T.fixRetryLead, cards: [progress('fix'), cardRetry()] },
      }
    }
    return retry(s, T.noop, get('fix_return').build(s).cards)
  },
})

node('fix_retry', {
  build: () => ({ text: '重选一次这道题。', cards: [progress('fix'), cardRetry()] }),
  accept(s, a) {
    const picked = matchOption(cardRetry().options, a.text)
    if (picked?.id === 'C') {
      const fixed = { ...addFact(s, FACT.answerC), corrected: true, stage: 'done' }
      return {
        next: 'done',
        session: fixed,
        reply: { text: T.fixDone, cards: [progress('done'), cardSummary(summaryOf(fixed))] },
      }
    }
    if (picked) {
      return retry(s, picked.id === 'A' ? T.fixWrongA : T.fixWrongOther, [progress('fix'), cardRetry()])
    }
    return retry(s, T.unknown, [progress('fix'), cardRetry()])
  },
})

/* ===== 示例会话入口（S4 主动讲解入口 / S6 错题本 / 组合会话 C3–C7） ===== */

function cardEntry() {
  return {
    type: 'showcase_stage',
    variant: 'entry',
    stage: STAGE.read,
    title: '走一遍这道题',
    note: '把 V1 拆成读题、选方法、分步推导和订正四步，自己走一遍。',
    actions: [{ id: 'start_guide', label: '引导式解题', primary: true }],
  }
}

node('s4_entry', {
  build: () => ({
    text: '想自己走一遍这道题就点下面；也可以直接在上面改选。',
    cards: [progress('read'), cardEntry()],
  }),
  accept(s, a) {
    if (has(norm(a.text), '引导式解题', '走一遍')) {
      return { next: 'r_read', session: { ...s, stage: 'read' }, reply: null }
    }
    return retry(s, T.noop, get('s4_entry').build().cards)
  },
})

node('s6_entry', {
  build: () => ({ text: '', cards: [] }),
  accept(s, a) {
    if (has(norm(a.text), '加入错题本', '记下来')) {
      const next = { ...s, errorSaved: true, stage: 'done' }
      return {
        next: 's6_done',
        session: next,
        reply: {
          text: next.alreadySaved
            ? '这一条已经在错题本里了，同一个示例不会重复计数。'
            : '已加入错题本。打开左侧「错题本」就能找到这一条；同一条重复添加只会更新，不会多出一条。',
          cards: [progress('done')],
        },
      }
    }
    return retry(s, '点「加入错题本」就会把这道题和这条错因记下来。', get('s6_entry').build().cards)
  },
})

node('s6_done', {
  build: () => ({ text: '这一条已经记下了。', cards: [progress('done')] }),
  accept(s, a) {
    if (has(norm(a.text), '加入错题本', '再记一次')) {
      return retry({ ...s, alreadySaved: true }, '这一条已经在错题本里了，同一个示例不会重复计数。', [progress('done')])
    }
    return retry(s, T.noop, [progress('done')])
  },
})

const INVITE = '要不要做三题？先换系数，再把曲线的走势反过来，最后试试切线水平却没有极值的情况。'

function cardInvite() {
  return {
    type: 'showcase_stage',
    variant: 'entry',
    stage: STAGE.method,
    title: '做三题巩固',
    note: '一题一题作答，提交后我告诉你哪一步值得重看。',
    actions: [
      { id: 'accept_practice', label: '可以，出三题', primary: true },
      { id: 'decline_practice', label: '先不练' },
    ],
  }
}

function cardTally() {
  return {
    type: 'showcase_stage',
    variant: 'entry',
    stage: STAGE.fix,
    title: '小结',
    note: '做完三题后，可以让我把这次的过程小结一下。',
    actions: [{ id: 'show_tally', label: '看这次的小结' }],
  }
}

node('c1_invite', {
  build: () => ({ text: INVITE, cards: [progress('method'), cardInvite()] }),
  accept(s, a) {
    const t = norm(a.text)
    if (has(t, '出三题', '可以', '好', '练')) {
      return {
        next: 'c_quiz',
        session: { ...s, stage: 'fix' },
        reply: {
          text: '三道题按难度排好了。第一题换系数，第二题改变走势，第三题容易误判。先从第一题开始。',
          cards: [progress('fix'), quizChain(), cardEntry(), cardTally()],
        },
      }
    }
    if (has(t, '先不练', '不用', '不练')) {
      return retry(s, '好，想练的时候再说一声，这两段讲解都留在上面。', [progress('method'), cardInvite()])
    }
    return retry(s, T.noop, [progress('method'), cardInvite()])
  },
})

/** C3 的变式卡与小结入口同一条消息下发；变式卡由 session 层按题库注入 */
function tallyPlaceholder() {
  return cardTally()
}

node('c_quiz', {
  build: () => ({ text: '', cards: [tallyPlaceholder()] }),
  accept(s, a) {
    if (has(norm(a.text), '引导式解题', '走一遍')) {
      return { next: 'r_read', session: { ...s, stage: 'read' }, reply: null }
    }
    if (has(norm(a.text), '小结')) {
      const tally = s.quizTally || { total: 3, answered: 0, firstCorrect: 0, finalCorrect: 0, corrected: 0 }
      const lines = []
      if (!tally.answered) {
        lines.push('还没有记录到作答。三道题都在上面，选一个选项就会记下来。')
      } else {
        lines.push(`已经作答 ${tally.answered}/{tally.total} 题。`)
        lines.push(`首答正确 ${tally.firstCorrect}/${tally.total}，订正后 ${tally.finalCorrect}/${tally.total}。`)
        if (tally.corrected) lines.push(`其中 ${tally.corrected} 题是看过引导后改对的。`)
      }
      return {
        next: 'c_quiz',
        session: s,
        reply: { text: lines.join('\n\n'), cards: [progress('fix'), cardSummary(summaryOf(s))] },
      }
    }
    return retry(s, '做完一题就点选项，交完可以让我「看这次的小结」。', [progress('fix'), tallyPlaceholder()])
  },
})

/* ===== 极限支线 ===== */

node('limit_intro', {
  build: (s, text) => ({
    text: text || `${T.limitGraph}\n\n${T.limitExample}`,
    cards: [progress((s && s.stage) || 'derive'), cardLimit()],
  }),
  accept(s, a) {
    if (has(norm(a.text), '先继续', '先回原题', '不用', '跳过')) {
      return backToPaused(s, s.limitReturn, T.limitSkip)
    }
    if (has(norm(a.text), '检验', '试试', '做一个小检验')) {
      return {
        next: 'limit_check',
        session: s,
        reply: { text: T.limitCheckAsk, cards: get('limit_check').build(s).cards },
      }
    }
    return retry(s, '看完这一页，可以「做一个小检验」，也可以直接回原题。', get('limit_intro').build(s).cards)
  },
})

node('limit_check', {
  build: () => ({
    text: T.limitCheckAsk,
    cards: [
      progress('derive'),
      cardCheck({
        title: '换一个点试试',
        pauseAt: '极限支线',
        options: [
          { id: 'zero', label: '0' },
          { id: 'two', label: '2' },
          { id: 'four', label: '4' },
        ],
        hint: { id: 'limit_back', label: '回到原题' },
      }),
    ],
  }),
  accept(s, a) {
    if (has(norm(a.text), '回到原题', '回原题', '回去')) return backToPaused(s, s.limitReturn, T.limitBack)
    const cards = get('limit_check').build().cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'four') {
      return backToPaused({ ...s, limitDone: true }, s.limitReturn, `${T.limitCheckRight}我们回到刚才停下的地方。`)
    }
    if (picked) return retry(s, T.limitCheckWrong, cards)
    return retry(s, T.unknown, cards)
  },
})

/* ===== 前置小课 ===== */

node('d1_lesson', {
  build: (s) => ({
    text: T.d1Lead,
    cards: [progress('derive'), cardLesson(s?.lesson?.check || 'pending')],
  }),
  accept(s, a) {
    if (has(norm(a.text), '试一小题', '检验', '试试')) {
      return {
        next: 'd2_check',
        session: { ...s, lesson: { ...(s.lesson || {}), check: 'in_progress' } },
        reply: { text: T.d2Ask, cards: get('d2_check').build({ ...s, lesson: { ...(s.lesson || {}), check: 'in_progress' } }).cards },
      }
    }
    if (has(norm(a.text), '先回原题', '回原题', '回去')) {
      const next = { ...s, lessonPending: true, lesson: { ...(s.lesson || {}), check: 'skipped' } }
      return { next: 'a3_signs', session: next, reply: { ...get("a3_signs").build(next), text: T.resume } }
    }
    return retry(s, '小课里可以先「试一小题」，也可以「先回原题」。', get('d1_lesson').build(s).cards)
  },
})

node('d2_check', {
  build: (s) => ({
    text: T.d2Ask,
    cards: [
      progress('derive'),
      cardCheck({
        title: '换一个例子判断',
        pauseAt: '判断导数符号',
        checkState: s?.lesson?.check || 'in_progress',
        options: [
          { id: 'up_dec', label: '在 x 轴上方，且递减' },
          { id: 'down_dec', label: '在 x 轴下方，且递减' },
          { id: 'up_inc', label: '在 x 轴上方，且递增' },
        ],
        hint: { id: 'd2_show', label: '看完整解析' },
      }),
    ],
  }),
  accept(s, a) {
    const t = norm(a.text)
    if (has(t, '看完整解析', '解析')) {
      const next = { ...s, lesson: { ...(s.lesson || {}), check: 'explained' } }
      return retry(next, T.d2Explained, get('d2_check').build(next).cards)
    }
    if (has(t, '带着提示回原题', '回原题')) {
      const next = { ...s, lessonPending: true, lesson: { ...(s.lesson || {}), check: 'skipped' } }
      return { next: 'a3_signs', session: next, reply: { ...get("a3_signs").build(next), text: T.resume } }
    }
    const cards = get('d2_check').build(s).cards
    const picked = matchOption(optionsOf(cards), a.text)
    if (picked?.id === 'up_dec') {
      const next = { ...s, lesson: { ...(s.lesson || {}), check: 'passed' }, stage: 'derive' }
      return {
        next: 'd3_resume',
        session: next,
        reply: { text: T.d2Right, cards: [progress('derive'), cardResume()] },
      }
    }
    if (picked?.id === 'down_dec') return retry(s, T.d2WrongBelow, cards)
    if (picked?.id === 'up_inc') return retry(s, T.d2WrongInc, cards)
    if (has(t, '不会', '不懂', '不确定')) return retry(s, T.d2Stuck, cards)
    return retry(s, T.unknown, cards)
  },
})

node('d3_resume', {
  build: () => ({
    text: '理解检查通过了。回到原题，主进度还在「分步推导」。',
    cards: [progress('derive'), cardResume()],
  }),
  accept(s, a) {
    if (has(norm(a.text), '回到看导数符号', '回到原题', '回原题', '继续')) {
      const next = { ...s, lesson: null, lessonPending: false }
      return { next: 'a3_signs', session: next, reply: { ...get("a3_signs").build(next), text: T.resume } }
    }
    return retry(s, '点「回到看导数符号」就接着做题。', get('d3_resume').build().cards)
  },
})

/* ───────────────── 小结（只回顾实际发生的事件） ───────────────── */

export function summaryOf(s) {
  const lines = []
  const facts = Array.isArray(s?.facts) ? s.facts : []
  if (facts.includes(FACT.candidates)) lines.push('你先把导数分解成 6(x+1)(x−2)，找出了候选点 −1 和 2。')
  if (s?.lesson?.check === 'passed') lines.push('你用一条直线分清了「位置」和「方向」，也就是函数值和导数。')
  else if (s?.lesson?.check === 'explained') lines.push('你看了「函数值与导数符号」的完整解析。')
  else if (s?.lesson?.check === 'skipped') lines.push('小课的检验先留着，你直接回了原题。')
  if (s?.path === 'A' && facts.includes(FACT.maxAtMinus1)) lines.push('按导数符号判断：−1 左正右负，是局部极大。')
  if (s?.path === 'A' && facts.includes(FACT.minAtTwo)) lines.push('2 左负右正，是局部极小。')
  if (s?.path === 'B' && facts.includes(FACT.maxAtMinus1)) lines.push('用作差比较：−1 附近的函数值都更小，所以它是局部极大。')
  if (s?.path === 'B' && facts.includes(FACT.minAtTwo)) lines.push('2 附近的函数值都更大，所以它是局部极小。')
  if (s?.switched) lines.push('中途换过一次方法，已经确认的结论都留着。')
  if (s?.limitDone) lines.push('你顺手看了极限怎样定义导数。')
  if (s?.corrected) lines.push('最后回到题卡改选了 C，首答 A 仍然保留。')
  const t = s?.quizTally
  if (t && t.answered) {
    lines.push(`这三题已经作答 ${t.answered}/${t.total} 题。`)
    lines.push(`首答正确 ${t.firstCorrect}/${t.total}，订正后 ${t.finalCorrect}/${t.total}。`)
    if (t.corrected) lines.push('其中至少 1 题是看过引导之后改对的。')
  }
  return { corrected: !!s?.corrected, lines: lines.length ? lines : ['这一轮还没有留下可回顾的步骤。'] }
}

/* ───────────────── 对外 ───────────────── */

export function newNodeState(convKey, overrides = {}) {
  return {
    convKey,
    node: 'r_read',
    stage: 'read',
    path: null,
    facts: [],
    firstAnswer: null,
    corrected: false,
    switched: false,
    lesson: null,
    lessonPending: false,
    limitReturn: null,
    limitDone: false,
    turns: [],
    ...overrides,
  }
}

export function getNode(id) {
  return NODES[id] || null
}

export function stageLabel(stage) {
  return STAGE[stage] || ''
}

/** 取当前节点的开场（用于直接进入 / 恢复） */
export function opening(s) {
  const def = NODES[s.node]
  return def ? def.build(s) : null
}

/**
 * 推进一步。
 * @param {object} s 当前会话状态
 * @param {{text:string, tutorAction?:string}} action
 * @returns {{state:object, reply:{text:string, cards:any[]}|null}}
 */
export function step(s, action) {
  const cur = s.node && NODES[s.node] ? s.node : 'r_read'
  const def = NODES[cur]
  const a = { text: String(action?.text ?? ''), tutorAction: action?.tutorAction || '' }
  const base = { ...s, node: cur }
  const out = def.accept(base, a)
  const nextState = { ...out.session, node: out.next }
  let reply = out.reply
  if (!reply) {
    const nd = NODES[out.next]
    reply = nd ? nd.build(nextState) : null
  }
  return { state: nextState, reply }
}

export { STAGE }
