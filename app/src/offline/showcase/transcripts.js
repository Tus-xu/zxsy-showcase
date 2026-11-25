/**
 * 七条教学示例会话的预置轮次与引擎起点。
 *
 * 纪律：
 *   - 开场只展示**已经发生的记录**（学生原话 + 真实题图 + 已给出的回答），不预演未发生的步骤；
 *   - 预置轮次与后续引擎轮次共用同一套轮次结构，刷新/切会话后由状态复原，不重新生成；
 *   - 题图是本地自编排版的 SVG（原采证里没有这道题的原图，见方案 §3「若缺少该题原图」）；
 *   - 出错提示、引导卡、答案判定都交给引擎，文案不写死在这里。
 */
import { FIG_S3_FRAMES } from './assets'
import { FLOW_IMAGE } from './flowAssets'
import { refs } from './knowledge'
import { hyperbolaChain, quizChain } from './bank'
import { getNode } from './engine'

// 起始节点开场卡的唯一来源是 engine，预置轮次直接取它，避免两处文案漂移
/** 起始节点的开场轮次（含 role，可直接放进 SEEDS 数组） */
const openTurn = (id) => ({ role: 'ai', ...getNode(id).build({}) })

export { V1, V2, V3 } from './bank'

/** 附件快照：AttachmentThumb 优先读 localUrl，因此断网也能显示 */
function img(asset, fileId) {
  return [
    {
      file_id: fileId,
      kind: 'image',
      name: asset.name,
      mime: asset.mime,
      size: 0,
      localUrl: asset.dataUri,
    },
  ]
}

// 题图使用随包的真实采证原图（题1.png），不再使用自编 SVG 题图
const REAL_T1 = { name: '题1.png', mime: 'image/png', dataUri: FLOW_IMAGE.A.url }
const PROBLEM_ATT = (id = 'sc-problem-f1') => img(REAL_T1, id)
const V1_ATT = (id = 'sc-v1-f1') => img(REAL_T1, id)

/** 「引导式解题」入口卡：始终可用（方案 §4：不必为进入引导而故意答错） */
function guideEntry() {
  return {
    type: 'showcase_stage',
    variant: 'entry',
    stage: '读题',
    title: '走一遍这道题',
    note: '把 V1 拆成读题、选方法、分步推导和订正四步，自己走一遍。',
    actions: [{ id: 'start_guide', label: '引导式解题', primary: true }],
  }
}

/* ───────────────── S1 · 拍照解题 · 三次函数极值 ───────────────── */

const S1 = [
  {
    role: 'user',
    text: '我能求出实轴和虚轴的关系，但不知道怎么用它求离心率。能把推导过程写出来吗？',
    attachments: PROBLEM_ATT('sc-s1-f1'),
  },
  {
    role: 'ai',
    text: [
      '你说「能求出实轴和虚轴的关系，但不知道怎么用它求离心率」——卡住的不是化简，是把「两条轴的比例」翻译成「离心率」。就按这道题走一遍。',
      '题目给的是 $2b=\\sqrt{7}\\cdot2a$，约掉 $2$ 得 $\\frac{b}{a}=\\sqrt{7}$。',
      '双曲线里 $c^2=a^2+b^2$。两边同除以 $a^2$：',
      '$$e^2=\\frac{c^2}{a^2}=1+\\left(\\frac{b}{a}\\right)^2=1+7=8$$',
      '所以 $e=2\\sqrt{2}$（$e>0$），选 D。',
      '| 量 | 表达式 | 本题 |\n|---|---|---|\n| 实轴长 | $2a$ | — |\n| 虚轴长 | $2b$ | $\\sqrt7\\cdot2a$ |\n| 关系 | $c^2=a^2+b^2$ | $c^2=8a^2$ |\n| 离心率 | $e=\\frac{c}{a}$ | $2\\sqrt2$ |',
      '回扣你的问题：求离心率不用分别求出 $a,b,c$，拿到 $\\frac{b}{a}$ 后用 $e=\\sqrt{1+(b/a)^2}$ 一步算出来。',
    ].join('\n\n'),
    citations: [],
  },
]

/* ───────────────── S2 · 知识问答 · 导数的几何意义 ───────────────── */

const S2 = [
  {
    role: 'user',
    text: '导数为零是不是就代表函数在这里转弯？还有，切线和割线我一直分不清。',
  },
  {
    role: 'ai',
    text: [
      '你说分不清切线和割线，先把这两个词分开：割线是曲线上两点连线的斜率；切线是这两点无限靠近时割线的极限。固定 $A(a,f(a))$，再取 $B(a+h,f(a+h))$，割线 $AB$ 的斜率是',
      '$$\\frac{f(a+h)-f(a)}{h}$$',
      '让 $h$ 趋近 $0$（$h\\ne0$），如果这个比值趋近一个有限值，它就是 $f\'(a)$，也就是 $A$ 点切线的斜率。',
      '你问「导数为零是不是就代表函数在这里转弯」——导数为零只说明切线水平，不说明函数在这里转弯。有没有极值，要看这一点左右两侧的导数符号有没有改变。',
    ].join('\n\n'),
    citations: refs('sec_tangent', 'sec_flat'),
  },
  {
    role: 'user',
    text: '那 f(x)=x³ 在原点切线也是水平的，为什么原点不是极值点？',
  },
  {
    role: 'ai',
    text: '你问「$x^3$ 在原点切线也水平，为什么不是极值」——因为两侧导数都是 $3x^2\\ge0$：左边上升，穿过原点后还在上升，没有先升后降或先降后升。符号没变，就不是极值。',
    citations: refs('sec_flat'),
  },
]

/* ───────────────── S3 · 看图讲解 · 导数与极值 ───────────────── */

const S3 = [
  {
    role: 'user',
    text: 'f(x)=x³−3x 的极大值为什么出现在 x=−1，极小值为什么出现在 x=1？我看导数表还不太直观，想看曲线和切线怎么变化。',
  },
  {
    role: 'ai',
    text: '先看曲线从左往右走的方向。到 (−1,2) 之前，切线斜率为正，曲线在上升。过这一点后，斜率变负，曲线开始下降。到 (1,−2) 后，斜率又从负变正，曲线重新上升。两个点的切线都是水平的，决定极大和极小的是两侧符号分别怎样变化。',
    figures: [{ step_no: 1, caption: '三帧依次为：整条曲线与候选点 → 聚焦 (−1,2) → 聚焦 (1,−2)', frames: FIG_S3_FRAMES.map((f) => ({ data_uri: f.dataUri, label: f.label })) }],
    cards: [
      {
        type: 'showcase_stage',
        variant: 'mini',
        stage: '分步推导',
        title: '如果两侧同号呢？',
        actions: [{ id: 'same_sign', label: '看看反例' }],
        reveal:
          'x³ 在 x=0 的导数是 3x²，两侧都为正。曲线左边往上走，过原点之后还是往上走——所以切线水平，却没有极值。驻点只说明切线水平，极值要看两侧符号是否变号。',
      },
    ],
  },
]

/* ───────────────── S4 · 举一反三 · 三次函数变式 ───────────────── */

const S4 = [
  {
    role: 'user',
    text: '就这道双曲线题，我想把「轴比、离心率、换轴」三种问法都练一遍。',
    attachments: PROBLEM_ATT('sc-s4-f1'),
  },
  {
    role: 'ai',
    text: '好，三道都围绕这道题，先看第一问：由 $2b=\\sqrt7\\cdot2a$ 化简，$\\frac{b}{a}$ 是多少？',
    cards: [hyperbolaChain()],
  },
]

/* ───────────────── S5 · 引导式解题 · 为什么不是极小值 ───────────────── */

const S5 = [
  {
    role: 'user',
    text: '我选 C，因为比值就是 √7。',
    attachments: V1_ATT('sc-s5-f1'),
  },
  openTurn('s5_signs'),
]

/* ───────────────── S6 · 错题复盘 · 把极大看成极小 ───────────────── */

const S6 = [
  {
    role: 'user',
    text: '刚才这道双曲线题，我第一遍选了 C（√7），现在知道应该选 D（2√2）。能把我为什么错、下次怎么检查记下来吗？',
    attachments: PROBLEM_ATT('sc-s6-f1'),
  },
  {
    role: 'ai',
    text: '你把「两条轴的比」当成了离心率。$\\sqrt7=\\frac{b}{a}$，而 $e=\\frac{c}{a}$；再用 $c^2=a^2+b^2$ 得 $e=\\sqrt8=2\\sqrt2$。下次先写两条轴的关系，再套 $e=\\sqrt{1+(b/a)^2}$。',
    cards: getNode('s6_entry').build().cards,
    citations: refs('sec_monotone'),
  },
]

/* ───────────────── 组合会话 · 导数学习 · 从提问到改错 ───────────────── */

const COMBO = [
  {
    role: 'user',
    text: '我知道导数可以看切线的斜率，但怎么用它判断函数在哪儿上升、在哪儿有极值？就用一道三次函数题讲讲吧。',
  },
  {
    role: 'ai',
    text: [
      '先给判据。函数在一个区间内可导且导数始终为正时严格递增，始终为负时严格递减；检查驻点两侧，左正右负是局部极大，左负右正是局部极小。',
      '再用这道题走一遍。$f(x)=x^3-3x$，$f\'(x)=3x^2-3=3(x+1)(x-1)$，候选点 $-1$ 和 $1$。三段区间 $(-\\infty,-1)$、$(-1,1)$、$(1,\\infty)$ 上导数符号依次为 $+$、$-$、$+$。',
      '所以在 $-1$ 处先增后减，$f(-1)=2$ 是局部极大；在 $1$ 处先减后增，$f(1)=-2$ 是局部极小。两个点的切线都水平，区别只在两侧符号怎么变。',
    ].join('\n\n'),
    citations: refs('sec_monotone', 'sec_tangent'),
    cards: [
      {
        type: 'showcase_stage',
        variant: 'explain',
        stage: '读题',
        title: '三段符号与结论',
        note: '已知函数式、候选点和每段的增减，结论可以直接对照。',
        triples: [
          { seg: '(−∞,−1)', sign: '+', move: '递增' },
          { seg: '(−1,1)', sign: '−', move: '递减' },
          { seg: '(1,∞)', sign: '+', move: '递增' },
        ],
        figure: {
          caption: 'f(x)=x³−3x：两处候选点与对应切线',
          frames: FIG_S3_FRAMES.map((f) => ({ data_uri: f.dataUri, label: f.label })),
        },
      },
    ],
  },
  // C3：练习邀请（点「可以，出三题」后由引擎下发三题变式卡）
  openTurn('c1_invite'),
]

export const SEEDS = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, combo: COMBO }

/** 每条会话的引擎起点与已发生的首答 */
export const META = {
  s1: { start: 's1_follow' },
  s2: { start: null },
  s3: { start: null },
  s4: { start: null },
  s5: { start: 's5_signs', firstAnswer: 'C', fixLabel: '返回题卡订正', s5Reason: 'ratio' },
  s6: { start: 's6_entry' },
  combo: { start: 'c1_invite', fixLabel: '回到这题' },
}
