/**
 * 双师课堂 · 三套离线课件（来自指定 decks 目录的真实 PPT 选题）。
 *
 * 源（按视觉优先原则选带真实图象的 8996 / f9cd）：
 *  - 8996e848…pptx（11 页）直线的点斜式方程（苏教版选择性必修第一册，含坐标图）
 *  - f9cd57e9…pptx（11 页）等差数列的前 n 项和公式（人教A版2019 选择性必修第二册，含数列图）
 *  - ad78f6ea…pptx（9 页）直线的点斜式方程（精简版，含坐标图）
 *
 * 说明：源目录只有两个课题（直线 10 份、等差 3 份），第三个只能是直线的精简版；
 * 这是如实选择，不是“三课题”。课件元素按原 PPT 的语义拆成 SlideElement，
 * 原 PPT 的真实图象通过 `assets` 资产 id 进入 SlideCanvas；讲稿为纯中文口播
 * （不含 $...$，避免 TTS 把公式读成“公式”），按真人老师的语气重新写过。
 */

const el = {
  def: (text, title) => ({ role: 'definition', ...(title ? { title } : {}), text }),
  bullets: (items) => ({ role: 'bullets', items }),
  steps: (items) => ({ role: 'steps', items }),
  formula: (latex) => ({ role: 'formula', latex }),
  note: (text) => ({ role: 'note', text }),
  /** 占位图形元素：真实图片由 DualView 的 asset_urls 映射到本页 assets。 */
  fig: () => ({ role: 'figure', figure_ref: 'math_object' }),
  card: (title, items) => ({ role: 'knowledge_card', title, items }),
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
      assets: Array.isArray(opts.assets) ? opts.assets : [],
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
  ], '同学们好，今天我们把一条直线说清楚：只给你一个点和它的斜率，你能不能写出整条直线的方程？这就是点斜式。', ['课题', '教材版本'], { type: 'title', layout: 'title', deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(2, '学习目标', '', [
    el.formula('y-y_1=k(x-x_1)'),
    el.bullets(['理解点斜式方程的推导过程与适用条件', '能运用点斜式和斜截式求直线方程', '学习重点：点斜式与斜截式']),
  ], '先看目标。你要会推导点斜式，知道它什么时候不能用；还要能把点斜式变成斜截式。重点不是背公式，而是看懂斜率 k 在图上做了什么。', ['推导', '形式', '适用条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(3, '课程引入', '', [
    el.fig(),
    el.card('一点 + 斜率，方向就锁死了', ['过 P₁ 的直线可以有很多条', '斜率 k 决定倾斜程度', '已知一点和 k，直线唯一']),
    el.note('关键：用斜率公式把动点 P 和定点 P₁ 连起来。'),
  ], '看这张图，过 P₁ 的几条线方向不同，斜率也不同。一个点能确定一条直线吗？不能，过这个点可以转出无数条；再加上斜率 k，方向就锁死了，直线也就唯一了。接下来，我们用斜率公式把动点 P 和定点 P₁ 连起来。', ['斜率公式', '一点 + 斜率'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-bundle'] }),
  slide(4, '点斜式方程推导', '', [
    el.fig(),
    el.card('看图时盯住三件事', ['k 必须存在，直线不垂直于 x 轴', 'P₁(x₁,y₁) 是定点，k 是已知斜率', 'x=x₁ 时 y=y₁，P₁ 自己也在线上']),
    el.note('从斜率公式出发：k=(y−y₁)/(x−x₁)，两边同乘 x−x₁。'),
  ], '看左边这张图，蓝色直线穿过定点 P₁，红色点就是 P₁。从 P₁ 向右走一格、向上 k 格，就得到直线上的另一点 P，这就是斜率的几何含义。把这段变化写成式子，就是点斜式。注意 k 必须存在，直线不能竖着；当 x 取 x₁ 时，式子正好给出 y 等于 y₁，说明定点自己也在这条线上。', ['斜率公式', 'k 存在'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-point-slope'] }),
  slide(5, '点斜式方程推导（续）', '', [
    el.formula('y-y_1=k(x-x_1)'),
    el.steps(['设动点 P(x,y)，x≠x₁', 'k=(y−y₁)/(x−x₁)', '两边乘 x−x₁', '验证 P₁']),
  ], '把刚才的动作写成式子。设 P 是直线上异于 P₁ 的任意一点，斜率公式给出 k 等于 y 减 y₁ 除以 x 减 x₁。两边同乘 x 减 x₁，就得到 y 减 y₁ 等于 k 乘 x 减 x₁。最后别忘了验证 P₁ 也满足方程，否则你只证明了 P₁ 以外的点。', ['点斜式', '推导'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(6, '探究与思考', '斜截式', [
    el.fig(),
    el.card('y=kx+2 这一族直线', ['k 决定倾斜程度', 'b 是纵截距，不是长度', 'b=0 时过原点', 'k 相同，两直线平行']),
    el.note('所有 y=kx+2 都绕 (0,2) 旋转。'),
  ], '再看斜截式。y 等于 kx 加 b 里，k 还是斜率，b 是直线和 y 轴交点的纵坐标，不是长度。b 等于 0 时，直线过原点；k 相同，两条直线平行；而 y 等于 kx 加 2 这一族直线，无论 k 怎么变，都经过 0、2 这个点。', ['斜截式', '纵截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-intercept'] }),
  slide(7, '探究与思考（续）', '由点斜式到斜截式', [
    el.steps(['令 x₁=0，定点落在 y 轴上', 'y−y₁=kx', '记 b=y₁', '得 y=kx+b']),
  ], '斜截式其实是点斜式的特例。把定点挪到 y 轴上，令 x₁ 等于 0，y₁ 就是 b，方程立刻变成 y 等于 kx 加 b。所以不需要另背一个公式，只要把点斜式里的定点换个位置。', ['斜截式是特例', 'b 为截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(8, '推导与论证', '', [
    el.formula('y-y_1=k(x-x_1)'),
    el.steps(['设定点 P₁ 与动点 P', '由斜率公式导出方程', '说明 k 存在的条件', '定点取 (0,b) 得斜截式']),
  ], '把推导收一下：定点、动点、斜率公式、去分母、验证定点。五步里最关键的是最后一步，确认 P₁ 也满足方程。还要记住适用条件：斜率 k 必须存在。定点取 0、b 时，方程就化成斜截式。', ['推导', '适用条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(9, '例题精讲', '例1', [
    el.fig(),
    el.card('例1：先写点斜式，再整理', ['已知：过 (1,2)，k=−3', '点斜式：$y-2=-3(x-1)$', '斜截式：$y=-3x+5$']),
    el.note('先确定已知条件：点 (1,2)，k=−3。'),
  ], '看例一。过点 1、2，斜率负 3。直接代入点斜式，得到 y 减 2 等于负 3 乘 x 减 1；展开就是 y 等于负 3x 加 5。先写点斜式，再整理，不容易漏符号。', ['点斜式', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-example1'] }),
  slide(10, '练一练', '例2', [
    el.fig(),
    el.card('例2：看到截距，先设斜截式', ['已知：b=4，过 (2,−2)', '设 $y=kx+4$，代入求 k', '得到 $y=-3x+4$，再写点斜式']),
    el.note('解答：k=−3；y=−3x+4；点斜式 y+2=−3(x−2)。'),
  ], '例二反过来：已知 y 轴截距是 4，还经过点 2、负 2。先设 y 等于 kx 加 4，代入点求出 k 等于负 3；再回到点斜式，得到 y 加 2 等于负 3 乘 x 减 2。先设斜截式求 k，再写点斜式，思路更顺。', ['截距', '待定系数'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-example2'] }),
  slide(11, '课堂小结', '', [
    el.bullets(['点斜式：y−y₁=k(x−x₁)', '斜截式：y=kx+b', '两者都不能表示斜率不存在的直线', '作业：教材习题 1.2 第 1–5 题']),
  ], '最后留一句话：点斜式和斜截式都要求斜率存在。遇到垂直于 x 轴的直线，别硬套，直接写 x 等于常数。课后把例一、例二各重做一遍，比背十遍公式有用。', ['两式', '适用条件', '作业'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
]

/* ───────────────── 2. 等差数列的前 n 项和公式（完整 11 页） ───────────────── */

const SEQ_TITLE = '等差数列的前 n 项和公式'
const SEQ_BOOK = '人教A版2019 · 选择性必修第二册'

const seqSlides = [
  slide(1, SEQ_TITLE, '第一课时', [
    el.def('人教A版2019 选择性必修第二册 · 第一课时', '等差数列的前 n 项和公式'),
  ], '同学们好，今天我们来算一列数的总和：1 加到 100，你会怎么算？高斯没有硬加，他先找了一个更聪明的办法。', ['课题', '教材版本'], { type: 'title', layout: 'title', deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(2, '学习目标', '', [
    el.formula('S_n=\\frac{n(a_1+a_n)}{2}'),
    el.formula('S_n=na_1+\\frac{n(n-1)}{2}d'),
    el.bullets(['经历高斯求和与倒序相加的探究过程', '掌握两个前 n 项和公式', '了解前 n 项和的二次型与最值']),
  ], '先看目标：理解高斯配对和倒序相加，掌握两个前 n 项和公式，还要知道它们什么时候取最值。', ['高斯求和', '倒序相加', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(3, '高斯求和故事引入', '', [
    el.fig(),
    el.card('高斯没有从头加到尾', ['1+100=101，2+99=101', '每一对的和都相等', '100 个数 → 50 对']),
    el.note('先把配对方式记住，下一页再算总和。'),
  ], '看这张图，它画的是等差数列前 6 项的样子，点排成一条直线。高斯没有从头加到尾，他把第 1 项和第 100 项配成一对，第 2 项和第 99 项配成一对，每一对的和都是 101。100 个数正好配成 50 对。先记住这个配对方式，下一页我们再算总和。', ['首末配对', '50 对'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK, assets: ['seq-sum'] }),
  slide(4, '高斯求和故事引入（续）', '', [
    el.fig(),
    el.card('把 100 个加数变成 50 对', ['首项 + 末项 = 101', '第二项 + 倒数第二项 = 101', '100 ÷ 2 = 50 对', '101 × 50 = 5050']),
    el.note('100 个不同加数 → 50 个相同加数。'),
  ], '有了 50 对，总和就是 101 乘 50，等于 5050。把这个动作一般化：首项加末项，第二项加倒数第二项，每一对都相等。100 个不同的加数，变成了 50 个相同的加数，计算量一下就下来了。', ['一般化', '配对'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK, assets: ['seq-pairing'] }),
  slide(5, '倒序相加推导前 n 项和公式', '', [
    el.formula('2S_n=n(a_1+a_n)'),
    el.formula('S_n=\\frac{n(a_1+a_n)}{2}'),
    el.steps(['正序写 Sₙ', '倒序写 Sₙ', '两式相加', '代入通项得第二式']),
  ], '把同样的思路搬到等差数列。正着写一遍 Sn，倒着写一遍 Sn，两式相加，每一对都是 a1 加 an，所以 2Sn 等于 n 乘 a1 加 an。第一个公式就出来了。', ['倒序相加', '两个公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(6, '探究 Sₙ 的二次结构与最值', '', [
    el.fig(),
    el.card('二次结构与最值', ['$S_n=pn^2+qn+r$，r=0 才是等差数列', 'd<0：先增后减', '在通项变号处取最大值', 'a₁=14、d=−3.5：n=4 或 5 最大']),
    el.note('用 $a_n\\ge0$ 且 $a_{n+1}\\le0$ 锁定 n。'),
  ], '再看 Sn 的二次结构。把 Sn 写成 pn² 加 qn 加 r，r 等于 0 时它才是等差数列的和；公差小于 0 时，Sn 先增后减，最大值在通项变号的地方。教材这里用 d 等于负 3.5 的例子，还要看首项：取 a1 等于 14，第 4 项和第 5 项正好在零附近，Sn 就在 n 等于 4 或 5 时最大。', ['二次型', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK, assets: ['seq-parabola'] }),
  slide(7, '探究 Sₙ 的二次结构与最值（续）', '', [
    el.fig(),
    el.card('倒序相加：把阶梯拼成矩形', ['正序写 $S=1+2+\\cdots+n$', '倒序写 $S=n+\\cdots+2+1$', '两式相加：$2S=n(n+1)$', '所以 $S=\\frac{n(n+1)}{2}$']),
    el.note('想一想：高斯求和用了什么性质？怎么推广到一般等差数列？'),
  ], '这一页用 1 加到 n 的例子，把倒序相加再走一遍。设 S 等于 1 加 2 一直加到 n，倒着写一遍，两式相加得到 2S 等于 n 乘 n 加 1，所以 S 等于 n 乘 n 加 1 除以 2。这样做不用分 n 奇偶讨论；最后想一想，高斯求和用了什么性质，又怎么推广到一般等差数列？', ['倒序相加', '避免奇偶讨论'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK, assets: ['seq-stair'] }),
  slide(8, '推导与论证', '', [
    el.formula('2S_n=n(a_1+a_n)'),
    el.steps(['正序、倒序写 Sₙ', '配对和相等', '2Sₙ=n(a₁+aₙ)', '代入通项得第二式']),
  ], '这一页是完整推导。正序、倒序、相加、代入通项，四步得到两个公式。考试时先看已知的是 a1、an 还是 a1、d，再选公式。', ['推导', '两个公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(9, '例6与基本量运算', '', [
    el.def('五个基本量：a₁、aₙ、d、n、Sₙ；知三求二。'),
    el.formula('S_n=n(a_1+a_n)/2'),
    el.bullets(['先定已知量和待求量', '选含这三个量的公式', '缺 aₙ 或 d 先用通项补齐']),
  ], '看例六。等差数列有五个基本量：a1、an、d、n、Sn。知道其中三个，就能求另外两个；缺 an 或 d，先用通项补齐。', ['基本量', '知三求二'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(10, '例题精讲', '', [
    el.formula('S_n=na_1+n(n-1)d/2'),
    el.steps(['已知 a₁、a₅₀，求 S₅₀', '已知 a₁、a₂，先求 d，再求 S₁₀', '已知 a₁、d、Sₙ，解关于 n 的方程']),
  ], '三种常见情形：已知首项和末项，直接求 Sn；已知首项和第二项，先求公差；已知首项、公差和 Sn，解关于 n 的方程。先判断，再动笔。', ['三种情形', '选公式'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
  slide(11, '课堂小结', '', [
    el.formula('S_n=n(a_1+a_n)/2'),
    el.formula('S_n=na_1+n(n-1)d/2'),
    el.bullets(['方法：倒序相加', 'Sₙ 的二次型与正整数最值']),
  ], '最后收个尾：两个公式，一个方法倒序相加，一个注意点——Sn 是缺常数项的二次函数，最值要在正整数范围内讨论。', ['两公式', '倒序相加', '最值'], { deckTitle: SEQ_TITLE, textbookLine: SEQ_BOOK }),
]

/* ───────────────── 3. 直线点斜式（精简 9 页） ───────────────── */

const lineConcise = [
  slide(1, LINE_TITLE, '精简版', [
    el.def('苏教版选择性必修第一册 · 第一课时', '直线的点斜式方程'),
  ], '同学们好，这节课只做一件事：用一个点和斜率，把一条直线的方程写出来。最后再认识它的特殊形式，斜截式。', ['课题', '精简版'], { type: 'title', layout: 'title', deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(2, '学习目标', '', [
    el.bullets(['理解点斜式的推导、形式与条件', '能运用点斜式和斜截式求方程', '重点：两个公式']),
  ], '先看目标：理解点斜式怎么来，知道它什么时候不能用；会用点斜式和斜截式求方程。重点是两个公式，不是死记。', ['推导', '两式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(3, '课程引入', '', [
    el.def('已知一点和斜率，怎样写出直线方程？'),
    el.bullets(['斜率刻画倾斜程度', '一点 + 斜率定一条直线']),
  ], '先想：一个点能确定一条直线吗？不能，方向还能转。再给一个斜率，方向就固定了，直线也就唯一了。', ['斜率', '一点 + 斜率'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(4, '点斜式方程推导', '', [
    el.fig(),
    el.card('只做一件事：把图翻译成式子', ['P₁ 是定点，P 是动点', '每向右 1 格，向上 k 格', 'k 必须存在，直线不能竖着']),
    el.note('y−y₁=k(x−x₁)：点斜式的全部信息都在这张图里。'),
  ], '看图。P₁ 是定点，P 是动点。斜率 k 告诉你：每向右 1 格，向上多少格。把这件事写成式子，就是 y 减 y₁ 等于 k 乘 x 减 x₁。前提是 k 存在。', ['点斜式', '条件'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK, assets: ['line-point-slope-concise'] }),
  slide(5, '探究与思考', '斜截式', [
    el.def('y=kx+b，b 为纵截距。'),
    el.bullets(['b=0 时过原点', 'y=kx+2 恒过 (0,2)']),
  ], '再看斜截式。b 是直线和 y 轴交点的纵坐标，不是长度。b 等于 0 时过原点；y 等于 kx 加 2 这一族直线，无论 k 怎么变，都经过 0、2。', ['斜截式', '截距'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(6, '推导与论证', '', [
    el.steps(['设点', '斜率公式', '去分母', '验证 P₁', '定点取 (0,b) 得斜截式']),
  ], '把推导走一遍：设点、斜率公式、去分母、验证 P₁。最后一步别省，否则你只证明了 P₁ 以外的点。定点取 0、b 时，方程就变成斜截式。', ['推导', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(7, '例题精讲', '例1', [
    el.def('过点 (1,2)，斜率 k=−3。'),
    el.steps(['y−2=−3(x−1)', 'y=−3x+5']),
  ], '例一：过 1、2，斜率负 3。代入点斜式得 y 减 2 等于负 3 乘 x 减 1，整理就是 y 等于负 3x 加 5。先写点斜式，再整理。', ['点斜式', '斜截式'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(8, '练一练', '例2', [
    el.def('截距 b=4，过点 (2,−2)。'),
    el.steps(['设 y=kx+4', '−2=2k+4', 'k=−3', 'y=−3x+4；y+2=−3(x−2)']),
  ], '例二：截距 4，过 2、负 2。先设 y 等于 kx 加 4，代入求出 k 等于负 3；再写点斜式 y 加 2 等于负 3 乘 x 减 2。', ['截距', '待定系数'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
  slide(9, '课堂小结', '', [
    el.bullets(['点斜式：y−y₁=k(x−x₁)', '斜截式：y=kx+b', '斜率不存在时两式都不适用', '作业：教材习题 1.2 第 1–5 题']),
  ], '最后记住：两个公式都要求斜率存在；垂直于 x 轴的直线，直接写 x 等于常数。课后把推导过程自己写一遍。', ['两式', '条件', '作业'], { deckTitle: LINE_TITLE, textbookLine: LINE_BOOK }),
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
      question: '$1+2+\\cdots+100$ 等于（ ）',
      options: ['5050', '5000', '10100', '4950'],
      answer: 0,
      analysis: '首末配对：$1+100=101$，共 50 对，$101×50=5050$。',
    },
  ],
  advanced: [
    {
      question: '等差数列 $a_1=1$，$d=2$，前 10 项和 $S_{10}$ 等于（ ）',
      options: ['100', '90', '110', '55'],
      answer: 0,
      analysis: '$S_{10}=10a_1+45d=10+90=100$。',
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
  { key: 'line-full', topic: '直线的点斜式方程', label: '直线 · 含坐标图', pages: lineSlides.length },
  { key: 'sequence-sum', topic: '等差数列的前 n 项和公式', label: '等差 · 含数列图', pages: seqSlides.length },
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
