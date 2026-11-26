/**
 * 双师课堂 · 三套离线课件（来自指定 decks 目录的真实 PPT 选题）。
 *
 * 源：
 *  - ccc82257…pptx（11 页）直线的点斜式方程（苏教版选择性必修第一册）
 *  - f9cd57e9…pptx（11 页）等差数列的前 n 项和公式（人教A版2019 选择性必修第二册）
 *  - ad78f6ea…pptx（9 页）直线的点斜式方程（精简版）
 *
 * 说明：源目录只有两个课题（直线 10 份、等差 3 份），第三个只能是直线的精简版；
 * 这是如实选择，不是“三课题”。课件元素按原 PPT 的语义拆成 SlideElement，
 * 讲稿为纯中文口播（不含 $...$，避免 TTS 把公式读成“公式”）。
 */

const el = {
  def: (text, title) => ({ role: 'definition', ...(title ? { title } : {}), text }),
  bullets: (items) => ({ role: 'bullets', items }),
  steps: (items) => ({ role: 'steps', items }),
  formula: (latex) => ({ role: 'formula', latex }),
  note: (text) => ({ role: 'note', text }),
}

function slide(order, title, subtitle, elements, narration, keyPoints, opts = {}) {
  const isTitle = opts.type === 'title'
  return {
    order,
    title,
    subtitle,
    kp_code: '',
    minutes: 3,
    narration,
    blocks: [],
    key_points: keyPoints,
    deck_slide: {
      id: `slide-${order}`,
      type: opts.type || (isTitle ? 'title' : 'concept'),
      title,
      layout_hint: opts.layout || (isTitle ? 'title' : 'definition'),
      math_object: null,
      elements,
    },
    deck_meta: {
      title: opts.deckTitle || title,
      textbook_line: opts.textbookLine || '',
      theme: 'golden-b',
    },
    asset_urls: {},
    verification_result: { status: 'verified' },
    narration_source: 'authored',
  }
}

/* ───────────────── 1. 直线的点斜式方程（完整 11 页） ───────────────── */

const LINE_TITLE = '直线的点斜式方程'
const LINE_BOOK = '苏教版 · 选择性必修第一册'

const lineSlides = [
  slide(1, LINE_TITLE, '第一课时', [
    el.def('苏教版选择性必修第一册 · 第一课时', '直线的点斜式方程'),
  ], '同学们好，今天我们一起学习直线的点斜式方程。这是苏教版选择性必修第一册的第一课时。学完这节课，我们要能从直线上的一点和斜率，写出这条直线的方程。', ['课题', '教材版本'], { type: 'title', layout: 'title', deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(2, '学习目标', '', [
    el.bullets(['理解点斜式方程的推导过程与适用条件', '能运用点斜式和斜截式求直线方程', '学习重点：点斜式与斜截式']),
  ], '先看本节课的学习目标。第一，理解点斜式方程的推导过程，明确它的形式和适用条件。第二，能运用点斜式和斜截式求直线方程，解决相关问题。学习重点是点斜式方程与斜截式方程。', ['推导', '形式', '适用条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(3, '课程引入', '', [
    el.def('已知直线上一点 P₁(x₁,y₁) 和斜率 k，怎样写出这条直线的方程？'),
    el.bullets(['斜率刻画直线的倾斜程度', '一点 + 斜率确定一条直线']),
  ], '我们回顾一下，直线上任意两点确定的斜率，刻画了直线的倾斜程度。现在已知直线上一点 P 一，坐标是 x 一、y 一，又知道斜率 k。能不能写出直线上任意一点 P 的坐标满足的关系式呢？关键是用斜率公式把点 P 和点 P 一联系起来。', ['斜率公式', '一点 + 斜率'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(4, '点斜式方程推导', '', [
    el.formula('k=\\frac{y-y_1}{x-x_1}'),
    el.steps(['设 P(x,y) 是直线上异于 P₁ 的任意一点', '由斜率公式列式', '两边同乘 x−x₁', '验证 P₁ 也满足']),
    el.note('适用条件：斜率 k 存在，直线不垂直于 x 轴。'),
  ], '请看这幅图。直线上有一个定点 P 一，还有一个动点 P。当动点沿直线移动时，纵坐标的增量与横坐标的增量之比始终等于斜率 k。要特别注意，这个推导要求斜率 k 存在，也就是直线不能垂直于 x 轴。当 x 等于 x 一时，方程给出 y 等于 y 一，正好是定点 P 一本身。', ['斜率公式', 'k 存在'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(5, '点斜式方程推导（续）', '', [
    el.steps(['设动点 P(x,y)', 'k=(y−y₁)/(x−x₁)', '两边乘 x−x₁', '验证 P₁']),
    el.formula('y-y_1=k(x-x_1)'),
  ], '下面把刚才的思路写成完整步骤。设点 P 是直线上异于 P 一的任意一点，由斜率公式得到 k 等于 y 减 y 一，除以 x 减 x 一。两边同乘 x 减 x 一，就得到 y 减 y 一等于 k 乘 x 减 x 一。最后验证定点 P 一的坐标也满足这个方程，所以它对直线上所有点都成立。', ['点斜式', '推导'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(6, '探究与思考', '斜截式', [
    el.def('y = kx + b 中，k 是斜率，b 是纵截距。'),
    el.bullets(['b=0 时直线过原点', 'k 相同则两直线平行', 'y=kx+2 恒过 (0,2)']),
  ], '接着看斜截式。在 y 等于 k x 加 b 中，k 是直线的斜率，b 是直线与 y 轴交点的纵坐标，也就是纵截距。当 b 等于零时，直线过原点，方程变成 y 等于 k x。如果 k 相同，两条直线互相平行；而 y 等于 k x 加 2 这样的直线，无论 k 取什么值，都经过点零、二。', ['斜截式', '纵截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(7, '探究与思考（续）', '由点斜式到斜截式', [
    el.steps(['令 x₁=0，定点落在 y 轴上', 'y−y₁=kx', '记 b=y₁', '得 y=kx+b']),
  ], '我们来推导斜截式。在点斜式方程中，令 x 一等于零，定点就落在 y 轴上。这时方程变成 y 减 y 一等于 k x，整理得 y 等于 k x 加 y 一。记 b 等于 y 一，就得到斜截式 y 等于 k x 加 b。可见，斜截式是点斜式在已知点为 y 轴截距点时的特殊形式。', ['斜截式是特例', 'b 为截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(8, '推导与论证', '', [
    el.steps(['设定点 P₁ 与动点 P', '由斜率公式导出方程', '说明 k 存在的条件', '定点取 (0,b) 得斜截式']),
  ], '这一页把点斜式的要点再梳理一遍。设直线上定点 P 一的坐标是 x 一、y 一，动点 P 的坐标是 x、y，且 x 不等于 x 一。由斜率公式导出方程后，还要说明适用条件：斜率 k 必须存在，直线不能与 x 轴垂直。当定点取零、b 时，方程化为 y 等于 k x 加 b，这就是斜截式，b 是直线在 y 轴上的截距。', ['推导', '适用条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(9, '例题精讲', '例1', [
    el.def('已知直线经过点 (1,2)，斜率 k=−3，求点斜式与斜截式方程。'),
    el.steps(['代入点斜式：y−2=−3(x−1)', '展开整理：y=−3x+5']),
  ], '看例一。已知直线经过点一、二，斜率 k 等于负三，求点斜式方程和斜截式方程。把点的坐标和斜率直接代入点斜式，得到 y 减二等于负三乘 x 减一。展开并整理，得到斜截式 y 等于负三 x 加五。', ['点斜式', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(10, '练一练', '例2', [
    el.def('直线在 y 轴上的截距为 4，且经过点 (2,−2)，求直线方程。'),
    el.steps(['设 y=kx+4', '代入 (2,−2)：−2=2k+4', '解得 k=−3', 'y=−3x+4；y+2=−3(x−2)']),
  ], '再看例二。已知直线在 y 轴上的截距是四，并且经过点二、负二。先设斜截式为 y 等于 k x 加四，把点二、负二代入，解得 k 等于负三。所以斜截式是 y 等于负三 x 加四，再取截距点零、四，就可以写出点斜式 y 加二等于负三乘 x 减二。写完再对照页面给出的两条提示。', ['截距', '待定系数'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(11, '课堂小结', '', [
    el.bullets(['点斜式：y−y₁=k(x−x₁)', '斜截式：y=kx+b', '两者都不能表示斜率不存在的直线', '作业：教材习题 1.2 第 1–5 题']),
  ], '最后小结。点斜式方程是 y 减 y 一等于 k 乘 x 减 x 一，已知一点和斜率就可以写出直线方程。斜截式是 y 等于 k x 加 b，b 是 y 轴上的截距。要注意，点斜式和斜截式都不能表示斜率不存在的直线，也就是垂直于 x 轴的直线。课后请完成教材习题，巩固今天的方法。', ['两式', '适用条件', '作业'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
]

/* ───────────────── 2. 等差数列的前 n 项和公式（完整 11 页） ───────────────── */

const SEQ_TITLE = '等差数列的前 n 项和公式'
const SEQ_BOOK = '人教A版2019 · 选择性必修第二册'

const seqSlides = [
  slide(1, SEQ_TITLE, '第一课时', [
    el.def('人教A版2019 选择性必修第二册 · 第一课时', '等差数列的前 n 项和公式'),
  ], '同学们好，今天我们一起学习等差数列的前 n 项和公式。这是人教 A 版选择性必修第二册的内容。我们将从高斯求和的故事出发，推导出两个求和公式，并学会根据已知量选择合适的公式。', ['课题', '教材版本'], { type: 'title', layout: 'title', deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(2, '学习目标', '', [
    el.bullets(['经历高斯求和与倒序相加的探究过程', '掌握两个前 n 项和公式', '了解前 n 项和的二次型与最值']),
  ], '先看学习目标。第一，经历高斯求和与倒序相加的探究过程，理解前 n 项和公式的推导思路。第二，掌握两个前 n 项和公式，能根据已知量求前 n 项和或基本量。第三，了解前 n 项和是关于 n 的二次型函数，能讨论最值问题。', ['高斯求和', '倒序相加', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(3, '高斯求和故事引入', '', [
    el.def('1 + 2 + … + 100 = ?'),
    el.bullets(['首末配对：1+100=101，2+99=101', '100 个数 → 50 对', '101 × 50 = 5050']),
  ], '先讲一个著名的故事。求一加到一百的和，高斯没有逐项相加，而是把首项和末项配对。一加一百等于一百零一，二加九十九也等于一百零一，每一对的和都相等。一百个数一共可以配成五十对，所以总和是一百零一乘五十，等于五千零五十。', ['首末配对', '5050'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(4, '高斯求和故事引入（续）', '', [
    el.bullets(['a₁+aₙ = a₂+aₙ₋₁ = …', '把 100 个不同加数变成 50 个相同加数', '计算量减少']),
  ], '把这个方法一般化。把首项与末项配对相加，每一对的和都相等，于是把一百个不同加数的求和，转化为五十个相同加数的求和。一般地，a 一加 a n 等于 a 二加 a n 减一，都等于同一个和。这样计算量就大大减少了。', ['一般化', '配对'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(5, '倒序相加推导前 n 项和公式', '', [
    el.formula('2S_n=n(a_1+a_n)'),
    el.formula('S_n=\\frac{n(a_1+a_n)}{2}'),
    el.steps(['正序写 Sₙ', '倒序写 Sₙ', '两式相加', '代入通项得第二式']),
  ], '下面用倒序相加法推导公式。把前 n 项和按正序写一遍，再按倒序写一遍，然后把两式相加。每一对对应项的和都等于首项与末项之和，所以两倍的前 n 项和等于 n 乘 a 一加 a n。于是得到第一个公式：S n 等于 n 乘 a 一加 a n，再除以二。', ['倒序相加', '两个公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(6, '探究 Sₙ 的二次结构与最值', '', [
    el.bullets(['Sₙ=pn²+qn+r，r=0 时才是等差数列', 'd<0 时 Sₙ 先增后减', '在通项变号处取最大值']),
    el.note('例：d=−3.5 时，前 4 项和与前 5 项和并列最大。'),
  ], '再来看前 n 项和的二次结构。如果前 n 项和可以写成 p n 平方加 q n 加 r，那么 r 等于零时，这个数列才是等差数列。当公差小于零时，前 n 项和先增后减，在通项变号的地方取得最大值；例如公差为负三点五时，前四项和与前五项和并列最大。也可以用不等式组，让 a n 大于等于零且 a n 加一小于等于零，来确定 n 的取值。', ['二次型', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(7, '探究 Sₙ 的二次结构与最值（续）', '', [
    el.steps(['S=1+2+…+n', '倒序写 S=n+(n−1)+…+1', '2S=n(n+1)', 'S=n(n+1)/2']),
  ], '这一页用高斯求和说明倒序相加的本质。设 S 等于一加二一直加到 n，再倒序写成 n 加 n 减一一直加到一。两式相加得到二 S 等于 n 乘 n 加一，所以 S 等于 n 乘 n 加一除以二。这样做避免了对 n 分奇偶讨论，也提示我们：等差数列的求和可以利用首末配对的性质。', ['倒序相加', '避免奇偶讨论'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(8, '推导与论证', '', [
    el.steps(['正序、倒序写 Sₙ', '配对和相等', '2Sₙ=n(a₁+aₙ)', '代入通项得第二式']),
  ], '这是完整的推导过程。设等差数列前 n 项和为 S n，先正序写出，再倒序写出。两式相加，每一对首末项的和都相等，所以二 S n 等于 n 乘 a 一加 a n，得到第一个公式。再把通项 a n 等于 a 一加 n 减一倍的 d 代入，就得到第二个公式：S n 等于 n 倍 a 一加 n 乘 n 减一除以二倍的 d。', ['推导', '两个公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(9, '例6与基本量运算', '', [
    el.def('五个基本量：a₁、aₙ、d、n、Sₙ；知三求二。'),
    el.bullets(['先定已知量和待求量', '选含这三个量的公式', '缺 aₙ 或 d 先用通项补齐']),
  ], '看例六。等差数列有五个基本量：首项、末项、公差、项数和前 n 项和。已知其中任意三个，就可以求出其余两个。解题时先确定已知量和待求量，选出含有这三个量的公式；如果公式里缺少末项或公差，就先用通项公式补齐。', ['基本量', '知三求二'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(10, '例题精讲', '', [
    el.steps(['已知 a₁、a₅₀，求 S₅₀', '已知 a₁、a₂，先求 d，再求 S₁₀', '已知 a₁、d、Sₙ，解关于 n 的方程']),
  ], '这一页给出例六的三种情形。第一种，已知首项和第 50 项，求前 50 项和，可以直接用第一个公式。第二种，已知首项和第 2 项，先求出公差，再求前 10 项和。第三种，已知首项、公差和前 n 项和，则解关于 n 的方程。做题前先判断属于哪一种，再选择公式。', ['三种情形', '选公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(11, '课堂小结', '', [
    el.bullets(['Sₙ=n(a₁+aₙ)/2', 'Sₙ=na₁+n(n−1)d/2', '方法：倒序相加', 'Sₙ 的二次型与正整数最值']),
  ], '最后小结。核心公式有两个：已知首项、末项和项数，用 S n 等于 n 乘 a 一加 a n 除以二；已知首项、公差和项数，用 S n 等于 n 倍 a 一加 n 乘 n 减一除以二倍的 d。方法是倒序相加法。还要记住，公差不为零时，前 n 项和是缺常数项的二次函数，求最值要在正整数范围内讨论。', ['两公式', '倒序相加', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
]

/* ───────────────── 3. 直线点斜式（精简 9 页） ───────────────── */

const lineConcise = [
  slide(1, LINE_TITLE, '精简版', [
    el.def('苏教版选择性必修第一册 · 第一课时', '直线的点斜式方程'),
  ], '同学们好，今天学习直线的点斜式方程。这节课用一个点和斜率，建立直线的方程。我们还会认识它的特殊形式——斜截式。', ['课题', '精简版'], { type: 'title', layout: 'title', deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(2, '学习目标', '', [
    el.bullets(['理解点斜式的推导、形式与条件', '能运用点斜式和斜截式求方程', '重点：两个公式']),
  ], '先看学习目标。理解点斜式方程的推导过程，明确它的形式和适用条件。能运用点斜式和斜截式求直线方程，解决相关问题。学习重点是点斜式方程和斜截式方程。', ['推导', '两式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(3, '课程引入', '', [
    el.def('已知一点和斜率，怎样写出直线方程？'),
    el.bullets(['斜率刻画倾斜程度', '一点 + 斜率定一条直线']),
  ], '我们已经学过直线的斜率。直线上任意两点确定的斜率，刻画了直线的倾斜程度。现在已知直线上一点和斜率，怎样写出这条直线的方程呢？这就是本节课要解决的问题。', ['斜率', '一点 + 斜率'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(4, '点斜式方程推导', '', [
    el.formula('y-y_1=k(x-x_1)'),
    el.note('适用条件：斜率 k 存在。'),
  ], '请看图。设直线上一个定点 P 一，坐标是 x 一、y 一，斜率为 k。直线上任意一点 P 的坐标满足 y 减 y 一等于 k 乘 x 减 x 一。这就是点斜式方程，它的适用条件是斜率必须存在。', ['点斜式', '条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(5, '探究与思考', '斜截式', [
    el.def('y=kx+b，b 为纵截距。'),
    el.bullets(['b=0 时过原点', 'y=kx+2 恒过 (0,2)']),
  ], '再看斜截式。y 等于 k x 加 b 中，k 是斜率，b 是直线在 y 轴上的截距。当 b 等于零时，直线过原点，方程变成 y 等于 k x。想一想，y 等于 k x 加 2 这些直线有什么共同特点？它们都经过点零、二，只是斜率不同。', ['斜截式', '截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(6, '推导与论证', '', [
    el.steps(['设点', '斜率公式', '去分母', '验证 P₁', '定点取 (0,b) 得斜截式']),
  ], '这一页给出完整推导。设 P 是直线上异于 P 一的任意一点，由斜率公式得到 k 等于 y 减 y 一，除以 x 减 x 一。去分母整理，得到 y 减 y 一等于 k 乘 x 减 x 一。验证定点 P 一也满足方程，所以直线上每个点都满足它。当定点取零、b 时，方程化为 y 等于 k x 加 b，这就是斜截式。', ['推导', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(7, '例题精讲', '例1', [
    el.def('过点 (1,2)，斜率 k=−3。'),
    el.steps(['y−2=−3(x−1)', 'y=−3x+5']),
  ], '看例一。已知直线经过点一、二，斜率 k 等于负三。把点和斜率代入点斜式，得到 y 减二等于负三乘 x 减一。整理得斜截式 y 等于负三 x 加五。', ['点斜式', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(8, '练一练', '例2', [
    el.def('截距 b=4，过点 (2,−2)。'),
    el.steps(['设 y=kx+4', '−2=2k+4', 'k=−3', 'y=−3x+4；y+2=−3(x−2)']),
  ], '再看例二。直线在 y 轴上的截距是四，并且经过点二、负二。由截距设斜截式为 y 等于 k x 加四，代入点二、负二，解得 k 等于负三。所以斜截式是 y 等于负三 x 加四；代回点斜式，得到 y 加二等于负三乘 x 减二。', ['截距', '待定系数'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(9, '课堂小结', '', [
    el.bullets(['点斜式：y−y₁=k(x−x₁)', '斜截式：y=kx+b', '斜率不存在时两式都不适用', '作业：教材习题 1.2 第 1–5 题']),
  ], '最后小结。点斜式方程是 y 减 y 一等于 k 乘 x 减 x 一，需要已知一点和斜率。斜截式是 y 等于 k x 加 b，b 是 y 轴上的截距。注意，斜率不存在时，这两种形式都不能表示垂直于 x 轴的直线。课后完成教材习题，整理推导过程。', ['两式', '条件', '作业'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
]

const practiceLine = {
  basic: [
    {
      question: '直线 $y-2=-3(x-1)$ 的斜率是（ ）',
      options: ['−3', '3', '−1/3', '2'],
      answer: 0,
      analysis: '点斜式 $y-y_1=k(x-x_1)$ 中，$x$ 前的系数就是斜率 $k=-3$。',
    },
  ],
  advanced: [
    {
      question: '过点 $(1,2)$、斜率为 $-3$ 的直线斜截式是（ ）',
      options: ['$y=-3x+5$', '$y=3x-1$', '$y=-3x-1$', '$y=-x+3$'],
      answer: 0,
      analysis: '先写点斜式 $y-2=-3(x-1)$，展开得 $y=-3x+5$。',
    },
  ],
  challenge: [
    {
      question: '直线在 $y$ 轴上的截距为 4，且经过 $(2,-2)$，它的方程是（ ）',
      options: ['$y=-3x+4$', '$y=3x+4$', '$y=-3x-4$', '$y=-x+4$'],
      answer: 0,
      analysis: '设 $y=kx+4$，代入 $(2,-2)$ 得 $-2=2k+4$，所以 $k=-3$。',
    },
  ],
}

const practiceSeq = {
  basic: [
    {
      question: '$1+2+\cdots+100$ 等于（ ）',
      options: ['5050', '5000', '10100', '4950'],
      answer: 0,
      analysis: '首末配对：$1+100=101$，共 50 对，$101	imes50=5050$。',
    },
  ],
  advanced: [
    {
      question: '等差数列 $a_1=1$，$d=2$，前 10 项和 $S_{10}$ 等于（ ）',
      options: ['100', '90', '110', '55'],
      answer: 0,
      analysis: '$S_{10}=10a_1+rac{10	imes9}{2}d=10+90=100$。',
    },
  ],
  challenge: [
    {
      question: '公差 $d<0$ 时，前 $n$ 项和 $S_n$ 通常在何处取得最大值？',
      options: ['通项变号的位置', '总是 $n=1$', '$n$ 越大越大', '无法确定'],
      answer: 0,
      analysis: '$d<0$ 时 $S_n$ 先增后减，在 $a_n$ 由正变负的位置取得最大值。',
    },
  ],
}

const practiceLineConcise = {
  basic: [
    {
      question: '点斜式 $y-y_1=k(x-x_1)$ 的适用条件是（ ）',
      options: ['斜率 $k$ 存在', '斜率不存在', '$x_1=0$', '$y_1=0$'],
      answer: 0,
      analysis: '点斜式依赖斜率 $k$；斜率不存在时不能写成这个形式。',
    },
  ],
  advanced: [
    {
      question: '过点 $(1,2)$、斜率 $-3$ 的直线方程是（ ）',
      options: ['$y-2=-3(x-1)$', '$y+2=-3(x-1)$', '$y-2=3(x-1)$', '$y=-3x-1$'],
      answer: 0,
      analysis: '直接把点和斜率代入点斜式。',
    },
  ],
  challenge: [
    {
      question: '直线 $y=kx+b$ 中，$b$ 的几何意义是（ ）',
      options: ['纵截距', '斜率', '横截距', '到原点的距离'],
      answer: 0,
      analysis: '令 $x=0$ 得 $y=b$，所以 $b$ 是直线与 $y$ 轴交点的纵坐标。',
    },
  ],
}

export const CLASSROOM_DECKS = {
  'line-full': {
    key: 'line-full',
    topic: '直线的点斜式方程',
    title: LINE_TITLE,
    slideCount: lineSlides.length,
    textbookLine: LINE_BOOK,
    slides: lineSlides,
    practice: practiceLine,
  },
  'sequence-sum': {
    key: 'sequence-sum',
    topic: '等差数列的前 n 项和公式',
    title: SEQ_TITLE,
    slideCount: seqSlides.length,
    textbookLine: SEQ_BOOK,
    slides: seqSlides,
    practice: practiceSeq,
  },
  'line-concise': {
    key: 'line-concise',
    topic: '直线的点斜式方程（精简版）',
    title: `${LINE_TITLE}（精简版）`,
    slideCount: lineConcise.length,
    textbookLine: LINE_BOOK,
    slides: lineConcise,
    practice: practiceLineConcise,
  },
}

export const PRESET_TOPICS = [
  { key: 'line-full', topic: '直线的点斜式方程', label: '直线 · 完整版', pages: lineSlides.length },
  { key: 'sequence-sum', topic: '等差数列的前 n 项和公式', label: '等差 · 前 n 项和', pages: seqSlides.length },
  { key: 'line-concise', topic: '直线的点斜式方程（精简版）', label: '直线 · 精简版', pages: lineConcise.length },
]

export function deckByKey(key) {
  return CLASSROOM_DECKS[key] || null
}

export function pickDeckByTopic(topic) {
  const t = String(topic || '')
  if (t.includes('等差') || t.includes('数列') || t.includes('前 n 项')) return CLASSROOM_DECKS['sequence-sum']
  if (t.includes('精简')) return CLASSROOM_DECKS['line-concise']
  return CLASSROOM_DECKS['line-full']
}

export function outlinesOf(deck) {
  return deck.slides.map((s) => ({
    order: s.order,
    type: s.deck_slide.type,
    title: s.title,
    subtitle: s.subtitle,
    kp_code: s.kp_code,
    key_points: s.key_points,
    narration: s.narration,
    minutes: s.minutes,
  }))
}

export function sessionOf(deck, sessionId, status = 'ready') {
  const outlines = outlinesOf(deck)
  return {
    session_id: sessionId,
    title: deck.title,
    mode: 'sync',
    slide_count: deck.slides.length,
    status,
    engine: 'offline-deck',
    error: null,
    outlines,
    slides: deck.slides,
    verification: {
      overall: 'verified',
      per_slide: deck.slides.map((s) => ({ idx: s.order, status: 'verified' })),
      practice_generation: { status: 'ready', error: null },
    },
    practice: deck.practice,
    practice_stats: {},
    progress: { slide_index: 0, page_check: {} },
    notes: '',
    qa_summary: {},
    knowledge_points: [],
    source_type: 'topic',
    source_ref: { deck_key: deck.key },
    content_version: 'offline-v2',
    created_at: new Date().toISOString(),
    generated_at: new Date().toISOString(),
  }
}
