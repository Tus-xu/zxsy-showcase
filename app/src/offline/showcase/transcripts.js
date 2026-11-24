/**
 * 七条教学示例会话的预置轮次与引擎起点。
 *
 * 纪律：
 *   - 开场只展示**已经发生的记录**（学生原话 + 真实题图 + 已给出的回答），不预演未发生的步骤；
 *   - 预置轮次与后续引擎轮次共用同一套轮次结构，刷新/切会话后由状态复原，不重新生成；
 *   - 题图是本地自编排版的 SVG（原采证里没有这道题的原图，见方案 §3「若缺少该题原图」）；
 *   - 出错提示、引导卡、答案判定都交给引擎，文案不写死在这里。
 */
import { PROBLEM_IMAGE, VARIANT_V1_IMAGE, FIG_S3_FRAMES } from './assets'
import { refs } from './knowledge'
import { V1, quizChain } from './bank'
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

const PROBLEM_ATT = (id = 'sc-problem-f1') => img(PROBLEM_IMAGE, id)
const V1_ATT = (id = 'sc-v1-f1') => img(VARIANT_V1_IMAGE, id)

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
    text: '老师布置了一道关于三次函数的题，我把题目拍下来了。我能求导，但不明白怎么从导数的结果判断单调区间。能把两个极值和判断理由都写出来吗？',
    attachments: PROBLEM_ATT('sc-s1-f1'),
  },
  {
    role: 'ai',
    text: [
      '**找候选点**。先求导，$f\'(x)=3x^2-3=3(x+1)(x-1)$。解 $f\'(x)=0$ 得 $x=-1,\\,1$。这两个点先记为候选。',
      '**看左右符号**。在 $(-\\infty,-1)$、$(-1,1)$、$(1,\\infty)$ 分别取 $-2$、$0$、$2$，导数分别为 $9$、$-3$、$9$，所以函数在这三段上依次递增、递减、递增。',
      '**判极值并代回原式**。在 $-1$ 处导数由正变负，取得局部极大值 $f(-1)=2$；在 $1$ 处由负变正，取得局部极小值 $f(1)=-2$。极值点的横坐标和极值本身分开写。',
      '**回扣你的问题**。对于这道多项式题，用导数零点划分区间，再观察每段的导数符号。零点本身只能找到候选。',
    ].join('\n\n'),
    cards: [
      {
        type: 'showcase_stage',
        variant: 'explain',
        stage: '分步推导',
        title: '看图解释',
        note: '整条曲线、两处候选点和两个水平切线。',
        figure: {
          caption: 'f(x)=x³−3x：在 (−1,2) 取局部极大，在 (1,−2) 取局部极小',
          frames: FIG_S3_FRAMES.map((f) => ({ data_uri: f.dataUri, label: f.label })),
        },
        actions: [{ id: 'toggle_fig', label: '展开图', primary: true }],
      },
    ],
  },
]

/* ───────────────── S2 · 知识问答 · 导数的几何意义 ───────────────── */

const S2 = [
  {
    role: 'user',
    text: '课上说导数是切线的斜率，我知道怎么求导，但看图的时候分不清切线和割线。导数为零是不是就代表函数在这里转弯？',
  },
  {
    role: 'ai',
    text: '在曲线上固定 $A=(a,f(a))$，再取 $B=(a+h,f(a+h))$。割线 $AB$ 的斜率是 $\\dfrac{f(a+h)-f(a)}{h}$。让 $B$ 沿曲线靠近 $A$，如果斜率趋于一个有限值，这个值就是导数 $f\'(a)$，也是 $A$ 点的切线斜率。切线可写成 $y=f(a)+f\'(a)(x-a)$。导数为零只告诉我们这一条切线是水平的；判断局部极值，还得看点两侧函数的走势。',
    citations: refs('sec_tangent', 'sec_flat'),
  },
  {
    role: 'user',
    text: '那 f(x)=x³ 在原点切线也是水平的，为什么原点不是极值点？',
  },
  {
    role: 'ai',
    text: '它的导数是 $3x^2$，在 $0$ 的两侧都为正。曲线在左边往上走，穿过原点之后还是往上走，所以 $0$ 不是极值点。对照 $x^3-3x$ 在 $x=-1$ 处，导数左正右负，曲线才出现从上升到下降的变化。遇到类似题，先圈出 $f\'(x)=0$ 的位置，再给左右两侧标符号。',
    citations: refs('sec_flat', 'sec_monotone'),
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
    text: '刚才那题我会求导了，但还是容易把极大和极小搞反。能出三道变式，第一题换系数，第二题改变函数走势，最后一道弄个容易误判的？',
  },
  {
    role: 'ai',
    text: '可以。每题都先看导数零点，再判断两侧有没有变号。你可以一题一题作答，提交后我告诉你哪一步值得重看。',
    cards: [quizChain(), guideEntry()],
  },
]

/* ───────────────── S5 · 引导式解题 · 为什么不是极小值 ───────────────── */

const S5 = [
  {
    role: 'user',
    text: '我选 A。x=−1 能让导数等于零，所以我觉得这里是极小值。',
    attachments: V1_ATT('sc-s5-f1'),
  },
  {
    role: 'ai',
    text: '先把题面放在这里。你选了 A，我们先不急着改口，把这道题拆开看一遍。',
    cards: [
      {
        type: 'showcase_stage',
        variant: 'retry',
        stage: '读题',
        title: '题面与你的首答',
        question: 'g(x)=2x³−3x²−12x+1 在哪个 x 取得局部极小值？',
        readonly: true,
        chosen: 'A',
        options: [
          { id: 'A', label: '−1' },
          { id: 'B', label: '1' },
          { id: 'C', label: '2' },
          { id: 'D', label: '−2' },
        ],
      },
    ],
  },
  // 读题阶段：直接回应学生的错因（不再题型三选），给出题眼关系与确认
  openTurn('r_read'),
]

/* ───────────────── S6 · 错题复盘 · 把极大看成极小 ───────────────── */

const S6 = [
  {
    role: 'user',
    text: '刚才第一道变式我第一次选了 A，现在知道应该选 C。能把我为什么做错、下次怎么检查记下来吗？',
  },
  {
    role: 'ai',
    text: '你把会让导数等于零的点直接当成极小值点了。看 −1 两侧，导数由正变负，那里是极大；看 2 两侧，导数由负变正，那里才是极小。下次先写候选点，再按「左侧符号 → 右侧符号 → 极值类型」检查一遍。',
    cards: [
      {
        type: 'showcase_stage',
        variant: 'errorbook',
        stage: '订正',
        title: '记进错题本',
        question: V1.question_text,
        options: V1.options,
        first: 'A',
        fixed: 'C',
        reason: '把局部极大当成了局部极小：只看导数等于零，没看两侧符号。',
        actions: [{ id: 'add_error', label: '加入错题本', primary: true }],
      },
    ],
    citations: refs('sec_monotone'),
  },
]

/* ───────────────── 组合会话 · 导数学习 · 从提问到改错 ───────────────── */

const COMBO = [
  {
    role: 'user',
    text: '我知道导数可以看切线的斜率，但怎么用它判断函数在哪儿上升、在哪儿有极值？就用图片里这道三次函数题讲讲吧。',
    attachments: PROBLEM_ATT('sc-combo-f1'),
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
  s1: { start: null },
  s2: { start: null },
  s3: { start: null },
  s4: { start: 's4_entry' },
  s5: { start: 'r_read', firstAnswer: 'A', fixLabel: '返回题卡订正' },
  s6: { start: 's6_entry' },
  combo: { start: 'c1_invite', fixLabel: '回到这题' },
}
