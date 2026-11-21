/**
 * 学生端「课堂 / 双师课堂」只读内容数据（课堂 tab、双师课堂播放页共用）。
 *
 * 设计边界：
 * - 老师发布的课件不在这里复制：学生端一律读 store.teacher.publish.records 中的发布快照（record.slides）。
 *   本文件只提供「records 为空」时的预置发布回退（deck-ellipse → 预置 v1，页面内标注，不写入 store）。
 * - 自主双师课堂 = 3 个课题（复用 src/data/courseware.js 的 3 套课件）+ 1 个「我上传的材料」课堂。
 * - AI 助教只能基于本文件/课件页面的讲稿作答：预置问答键值 + 关键词匹配；未命中必须明确说“当前页讲稿未包含”，不得编造。
 * - 数学结论与 evidence/solutions/sealed/math-baseline.json 对齐（椭圆 a=5、b=3 → c=4）。
 */
import { coursewareDecks } from './courseware'
import { submissions } from './submissions'
import materialImage from '../assets/questions/q2.png'

/** 当前学生（与 StudentShell 的演示身份一致） */
export const STUDENT_NAME = '林一川'
export const STUDENT_CLASS = '高二 (1) 班'

/** 学生上传材料课堂的演示素材（真实文件哈希匹配，改名也能识别） */
export const materialSource = {
  id: 'material-cubes',
  fileName: '正三棱柱线面关系·第9题.png',
  image: materialImage,
  sha256: '0bc14458a696c1caaa37d3b630113fd0f61c06fdda1b5da1c76caf314f392425',
  sourceLabel: '我上传的材料 · 第 9 题（演示素材：题库原图）',
  uploadedAtText: '2026-11-20 21:06',
}

const deckById = Object.fromEntries(coursewareDecks.map((d) => [d.id, d]))

/* ------------------------------------------------------------------ */
/* 预置发布回退（only when store.teacher.publish.records is empty）      */
/* ------------------------------------------------------------------ */

export const PRESET_RECORD_ID = 'preset-pub-ellipse-v1'
export const PRESET_PUBLISHED_AT = new Date('2026-11-20T20:10:00+08:00').getTime()

export function cloneSlides(slides) {
  return JSON.parse(JSON.stringify(Array.isArray(slides) ? slides : []))
}

/**
 * records 为空时的「预置发布 v1」：用 deck-ellipse 生成真实快照形状的发布记录。
 * 返回对象形状与 store.teacher.publish.records 元素完全一致（多一个 preset 标记），只在页面内回退，不写 store。
 */
export function buildPresetPublishedRecord() {
  const deck = deckById['deck-ellipse']
  if (!deck) return null
  return {
    id: PRESET_RECORD_ID,
    deckId: deck.id,
    deckTitle: deck.title,
    className: STUDENT_CLASS,
    version: 1,
    publishedAt: PRESET_PUBLISHED_AT,
    slides: cloneSlides(deck.slides),
    meta: {
      sessionId: deck.sessionId,
      textbook: deck.meta.textbook,
      grade: deck.meta.grade,
      className: deck.meta.className,
      duration: deck.meta.duration,
      subtitle: deck.subtitle,
      versionLabel: 'v1',
      publishedAtText: '2026-11-20 20:10',
    },
    editor: '张老师',
    preset: true,
  }
}

/* ------------------------------------------------------------------ */
/* 自主双师课堂：3 课题 + 1 上传材料课堂                                 */
/* ------------------------------------------------------------------ */

export const MATERIAL_CLASS_ID = 'self-material'

/** 学生上传材料课堂：把材料里的第 9 题讲透（内容按材料原题复核） */
export function buildMaterialDeck() {
  return {
    id: 'deck-material-cubes',
    sessionId: MATERIAL_CLASS_ID,
    title: '正三棱柱中的线面关系',
    subtitle: '我上传的材料 · 精讲',
    kind: 'material',
    sourceLabel: '我上传的材料（演示素材，按原题复核）',
    meta: {
      textbook: '演示素材 · 学生上传材料',
      grade: STUDENT_CLASS,
      className: STUDENT_CLASS,
      duration: '18 分钟',
      material: materialSource.fileName,
    },
    slides: [
      {
        id: 'm1',
        layout: 'title',
        kicker: '我上传的材料 · 第 9 题',
        title: '正三棱柱中的线面关系',
        subtitle: '从“看图猜垂直”到“建系算数量积”',
        lead: '材料里的四个选项，两个对、两个错。这一节课把每个选项都算一遍，并写全判定定理的条件。',
        note: '先让学生说“看着像哪个”，再逐项计算，纠正凭图表判断的习惯。',
        footer: '看懂图，还要写得出条件',
      },
      {
        id: 'm2',
        layout: 'content',
        title: '读材料：题目与四个选项',
        lead: '在正三棱柱 $ABC-A_1B_1C_1$ 中，$D$ 为 $BC$ 中点，判断下列关系是否成立。',
        bullets: [
          'A. $AD \\perp A_1C$',
          'B. $BC \\perp$ 平面 $AA_1D$',
          'C. $AD \\parallel A_1B_1$',
          'D. $CC_1 \\parallel$ 平面 $AA_1D$',
        ],
        image: materialImage,
        imageCaption: '我上传的材料 · 第 9 题',
        note: '先读题，标出正三棱柱的“侧棱垂直底面”这一隐含条件。',
      },
      {
        id: 'm3',
        layout: 'content',
        title: '建系：把几何关系写成坐标',
        lead: '以 $D$ 为原点，$DC$ 为 $x$ 轴、$DA$ 为 $y$ 轴、过 $D$ 平行 $AA_1$ 的方向为 $z$ 轴。',
        equation: 'B(−1,0,0)、C(1,0,0)、D(0,0,0)、A(0,√3,0)、A₁(0,√3,2)',
        bullets: [
          '底面是边长 2 的正三角形，取侧棱 $AA_1=2$',
          '$D$ 是 $BC$ 中点 ⇒ $DC=DB=1$，$AD=\\sqrt3$',
          '建系后，垂直变成数量积为 0，平行变成方向向量成比例',
        ],
        note: '板演建系，强调“正三棱柱 ⇒ 侧棱垂直底面”。',
      },
      {
        id: 'm4',
        layout: 'content',
        title: '选项 A、C：看着像，要算',
        lead: 'A 项“看起来垂直”、C 项“看起来平行”，都要用坐标检验。',
        equation: 'AD·A₁C = 3 ≠ 0，且 AD 与 A₁B₁ 方向向量不成比例',
        bullets: [
          'A 项：$AD$ 与 $A_1C$ 的数量积为 3，不是 0 ⇒ 不垂直',
          'C 项：$AD=(0,-\\sqrt3,0)$，$A_1B_1=(-1,-\\sqrt3,-2)$，不成比例 ⇒ 不平行',
          '易错：凭图形“看起来垂直”判断，漏掉计算这一步',
        ],
        note: '重点讲 A 项：数量积为 3 是最有说服力的反例。',
      },
      {
        id: 'm5',
        layout: 'content',
        title: '选项 B、D：把定理条件写全',
        lead: '线面垂直要垂直于平面内两条相交直线；线面平行要“面内一条线 + 线在面外”。',
        equation: 'BC⊥AD，BC⊥AA₁ ⇒ BC⊥平面AA₁D',
        bullets: [
          'B 项：$AD$、$AA_1$ 是平面 $AA_1D$ 内两条相交直线，故 $BC\\perp$ 平面 $AA_1D$',
          'D 项：$CC_1\\parallel AA_1$，$AA_1\\subset$ 平面 $AA_1D$，$CC_1\\not\\subset$ 平面 $AA_1D$ ⇒ $CC_1\\parallel$ 平面 $AA_1D$',
          '所以正确选项是 B、D',
        ],
        note: '要求学生把 D 项的两个条件都写出来，缺一不可。',
      },
      {
        id: 'm6',
        layout: 'content',
        title: '小结：看图之后，还要写得出条件',
        bullets: [
          '线面垂直：垂直于平面内两条相交直线',
          '线面平行：面内一条线 + 线不在面内',
          '判选项先找反例（数量积、方向向量），再补定理条件',
        ],
        note: '让学生用自己的话复述 D 项的两个条件。',
        footer: '看懂图，还要写得出条件',
      },
    ],
  }
}

export const selfClassTopics = [
  {
    id: 'self-ellipse',
    deckId: 'deck-ellipse',
    kind: 'topic',
    title: '椭圆及其标准方程',
    kicker: '课题 · 圆锥曲线',
    icon: '🥚',
    reason: '课堂刚发布《椭圆》第一课时，可自主回看定义与推导',
    duration: '约 12 分钟',
  },
  {
    id: 'self-quadratic',
    deckId: 'deck-quadratic',
    kind: 'topic',
    title: '二次函数与配方法',
    kicker: '课题 · 函数',
    icon: '📈',
    reason: '配方法三步与“多退少补”容易错，适合再听一遍',
    duration: '约 10 分钟',
  },
  {
    id: 'self-set',
    deckId: 'deck-set',
    kind: 'topic',
    title: '集合间的基本关系',
    kicker: '课题 · 集合',
    icon: '🔗',
    reason: '子集、真子集与 2ⁿ 个数的来源，用一节课说清楚',
    duration: '约 10 分钟',
  },
  {
    id: MATERIAL_CLASS_ID,
    deckId: 'deck-material-cubes',
    kind: 'material',
    title: '我上传的材料 · 正三棱柱线面关系',
    kicker: '上传材料 · 第 9 题',
    icon: '📷',
    reason: '按我上传的材料生成针对性讲解：建系、判选项、写条件',
    duration: '约 8 分钟',
  },
]

export function findSelfClass(sessionId) {
  return selfClassTopics.find((t) => t.id === sessionId) || null
}

/** 自主课题 → 可直接播放的 deck（上传材料课堂按材料生成） */
export function deckForSelfClass(topic) {
  if (!topic) return null
  if (topic.kind === 'material') return buildMaterialDeck()
  return deckById[topic.deckId] || null
}

/* ------------------------------------------------------------------ */
/* 我的班级（演示数据，页面标注“演示数据”，字段来自真实批改/提交）        */
/* ------------------------------------------------------------------ */

const subById = Object.fromEntries(submissions.map((s) => [s.id, s]))

export const classInfo = {
  name: '高二 (1) 班 · 数学 · 学习共同体',
  grade: STUDENT_CLASS,
  subject: '数学',
  teacher: '张老师',
  myRole: '学生',
  memberCount: 6,
  members: [
    { name: '张老师', role: '任课老师', avatar: '张', tone: 'brand' },
    { name: '林一川', role: '我', avatar: '林', tone: 'cyan', me: true },
    { name: '周子墨', role: '同学', avatar: '周', tone: 'violet' },
    { name: '陈可欣', role: '同学', avatar: '陈', tone: 'ok' },
    { name: '许亦舟', role: '同学', avatar: '许', tone: 'warn' },
    { name: '苏晚晴', role: '同学', avatar: '苏', tone: 'brand' },
  ],
  dynamic: [],
  sharedErrors: [
    { id: 'sub-A', label: '双曲线离心率', count: 1, note: '轴长与半轴区分清楚，本题全班正确率较高', level: 'ok' },
    { id: 'sub-B', label: '有放回取球的期望', count: 1, note: subById['sub-B']?.defect || '把期望误当抽取次数', level: 'warn' },
    { id: 'sub-C', label: '正三棱柱中的线面关系', count: 1, note: subById['sub-C']?.defect || '线面平行漏“面外”条件', level: 'warn' },
  ],
  sourceLabel: '演示数据 · 班级成员与错题共享按本次演示样例生成',
}

/** 双师课堂页的“讲稿/助手”可用文字：去掉 $ 标记并把常用 LaTeX 视觉化，便于字幕与摘要显示 */
const LATEX_PLAIN = [
  [/\\sqrt\{([^}]*)\}/g, '√($1)'],
  [/\\perp/g, '⊥'],
  [/\\parallel/g, '∥'],
  [/\\not\\subset/g, '⊄'],
  [/\\subsetneq/g, '⊊'],
  [/\\subseteq/g, '⊆'],
  [/\\subset/g, '⊂'],
  [/\\notin/g, '∉'],
  [/\\in(?![a-zA-Z])/g, '∈'],
  [/\\neq/g, '≠'],
  [/\\times/g, '×'],
  [/\\pm/g, '±'],
  [/\\cdot/g, '·'],
  [/\\varnothing|\\emptyset/g, '∅'],
  [/\\Rightarrow|\\rightarrow/g, '⇒'],
  [/\\leq|\\le(?![a-zA-Z])/g, '≤'],
  [/\\geq|\\ge(?![a-zA-Z])/g, '≥'],
  [/\\infty/g, '∞'],
  [/\\pi/g, 'π'],
  [/\\angle/g, '∠'],
  [/\\triangle/g, '△'],
  [/\\circ/g, '°'],
  [/\\dots|\\ldots/g, '…'],
  [/\\quad|\\qquad/g, ' '],
  [/\\[,;:]/g, ' '],
  [/\\left|\\right/g, ''],
  [/\\text\{([^}]*)\}/g, '$1'],
  [/\\[a-zA-Z]+/g, ''],
]
const SUB_DIGITS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }
const SUP_DIGITS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const mapDigits = (digits, table) =>
  String(digits)
    .split('')
    .map((c) => table[c] || c)
    .join('')

export function plainText(text) {
  let s = String(text ?? '')
  s = s.replace(/\$+/g, '').replace(/\*\*/g, '')
  for (const [re, rep] of LATEX_PLAIN) s = s.replace(re, rep)
  s = s.replace(/_\{?(\d+)\}?/g, (_, d) => mapDigits(d, SUB_DIGITS))
  s = s.replace(/\^\{?(\d+)\}?/g, (_, d) => mapDigits(d, SUP_DIGITS))
  s = s.replace(/[{}\\]/g, '')
  return s.replace(/\s+/g, ' ').trim()
}

/* ------------------------------------------------------------------ */
/* AI 助教问答库：预置键值 + 关键词匹配（只基于课件讲稿/页面内容）        */
/* ------------------------------------------------------------------ */

/** qaBank[deckId] = [{ slide: 1-based, q, keys: [关键词], a }] */
export const qaBank = {
  'deck-ellipse': [
    {
      slide: 1,
      q: '这节课要学什么？',
      keys: ['学什么', '这节课', '学习目标', '要学', '讲什么'],
      a: '本课时从“绳子画椭圆”的动手活动出发，先把“到两定点距离之和为定值”的轨迹说清楚，再建系推导标准方程 $x^2/a^2+y^2/b^2=1\\ (a>b>0)$。',
    },
    {
      slide: 1,
      q: '为什么要用绳子画图？',
      keys: ['绳子', '画图', '为什么画', '动手'],
      a: '绳长固定 ⇒ $|PF_1|+|PF_2|=2a$ 为定值，这正是椭圆的本质；先动手画，定义就从操作里自然生长出来。',
    },
    {
      slide: 2,
      q: '两个焦点在哪里？',
      keys: ['焦点', 'f1', 'f2', '定点', '图钉'],
      a: '绳子两端固定的两个点就是焦点 $F_1$、$F_2$，两焦点间距离 $2c$ 叫焦距。',
    },
    {
      slide: 2,
      q: '为什么必须 2a > |F₁F₂|？',
      keys: ['2a', '大于', '为什么必须', '条件', '绳长'],
      a: '绳长 $2a$ 必须大于两定点间距离 $2c$ 才能画出椭圆：等于时轨迹退化成线段，小于时无轨迹。',
    },
    {
      slide: 3,
      q: '椭圆的定义是什么？',
      keys: ['定义', '什么叫椭圆', '是什么', '怎么定义'],
      a: '平面内与两个定点 $F_1$、$F_2$ 的距离之和等于常数 $2a$（$2a>|F_1F_2|$）的点的轨迹叫做椭圆。',
    },
    {
      slide: 3,
      q: 'a、b、c 分别是什么？',
      keys: ['a', 'b', 'c', '半轴', '焦距', '长轴', '短轴'],
      a: '$a$ 是长半轴，$2a$ 是长轴长；$b$ 是短半轴，$2b$ 是短轴长；$c$ 是半焦距，两焦点间距离是 $2c$。',
    },
    {
      slide: 4,
      q: '标准方程是怎么推出来的？',
      keys: ['标准方程', '推导', '方程怎么', '化简', '建系'],
      a: '以 $F_1F_2$ 所在直线为 $x$ 轴、中点为原点建系，由 $|PF_1|+|PF_2|=2a$ 两次平方化简，并令 $b^2=a^2-c^2$，得到 $x^2/a^2+y^2/b^2=1$（$a>b>0$）。',
    },
    {
      slide: 4,
      q: '为什么令 b² = a² − c²？',
      keys: ['b²', 'b2', '换元', '为什么', 'a²-c²'],
      a: '化简过程中 $a^2-c^2$ 反复出现，为了方程形式最简，把它记作 $b^2$；于是得到 $a^2=b^2+c^2$。',
    },
    {
      slide: 5,
      q: 'a=5、b=3 时 c 和 e 是多少？',
      keys: ['a=5', '等于5', 'b=3', 'c=', '离心率', 'e=', '焦点坐标'],
      a: '$a=5$、$b=3$ ⇒ $c=\\sqrt{25-9}=4$，焦点为 $(\\pm4,0)$，离心率 $e=c/a=4/5$，长轴长 10、短轴长 6、焦距 8。',
    },
    {
      slide: 5,
      q: '离心率 e 说明什么？',
      keys: ['离心率', 'e', '扁', '形状'],
      a: '$e=c/a\\in(0,1)$：$e$ 越大椭圆越“扁”，$e$ 越小越接近圆。',
    },
    {
      slide: 6,
      q: '本节最需要注意的易错点？',
      keys: ['易错', '注意', '小结', '错点'],
      a: '最典型的易错是把椭圆的关系写成 $c^2=a^2+b^2$——那是双曲线；椭圆是 $a^2=b^2+c^2$，且 $a$ 最大。',
    },
    {
      slide: 6,
      q: '椭圆和双曲线的关系式有什么区别？',
      keys: ['双曲线', '区别', '椭圆和双曲线'],
      a: '椭圆：$a^2=b^2+c^2$（$a$ 最长）；双曲线：$c^2=a^2+b^2$（$c$ 最长）。记错就会把离心率算反。',
    },
  ],
  'deck-quadratic': [
    {
      slide: 1,
      q: '这节课要学什么？',
      keys: ['学什么', '这节课', '学习目标', '讲什么'],
      a: '把二次函数的一般式 $y=ax^2+bx+c$ 化成顶点式 $y=a(x-h)^2+k$，从顶点式直接读出顶点、对称轴与最值。',
    },
    {
      slide: 2,
      q: '为什么要配方？',
      keys: ['为什么', '配方', '目的', '有什么用'],
      a: '一般式看不出顶点在哪里；配成顶点式后 $h$、$k$ 显性化，开口方向、对称轴、最值都能直接读出来。',
    },
    {
      slide: 2,
      q: '顶点式长什么样？',
      keys: ['顶点式', '长什么样', '形式'] ,
      a: '顶点式为 $y=a(x-h)^2+k$：顶点 $(h,k)$，对称轴 $x=h$；$a>0$ 时 $k$ 是最小值，$a<0$ 时 $k$ 是最大值。',
    },
    {
      slide: 3,
      q: 'y = 2x² + 8x + 5 怎么配方？',
      keys: ['2x²', '2x2', '8x', '例题', '怎么配'],
      a: '$y=2(x^2+4x)+5=2(x+2)^2-8+5=2(x+2)^2-3$，所以顶点是 $(-2,-3)$。',
    },
    {
      slide: 3,
      q: '为什么括号里加 4 之后要减 8？',
      keys: ['减8', '减 8', '为什么减', '多加少减', '乘回'],
      a: '括号内把 $x^2+4x$ 配成 $(x+2)^2$ 等于多加了 4，而括号外乘着 2，所以整体多加了 $2\\times4=8$，必须减掉。',
    },
    {
      slide: 4,
      q: '最值怎么从顶点式读出来？',
      keys: ['最值', '最大', '最小', '开口'],
      a: '顶点式 $y=a(x-h)^2+k$：$a>0$ 开口向上，最小值是 $k$；$a<0$ 开口向下，最大值是 $k$。',
    },
    {
      slide: 4,
      q: '对称轴是哪条直线？',
      keys: ['对称轴'],
      a: '对称轴是直线 $x=h$，其中 $(h,k)$ 是顶点。',
    },
    {
      slide: 5,
      q: '这一节的易错点是什么？',
      keys: ['易错', '注意', '小结', '错点'],
      a: '两类高频错误：① 提取二次项系数后忘了乘回；② 括号内配方“多加少减”。算完代一个点回去验证最稳。',
    },
  ],
  'deck-set': [
    {
      slide: 1,
      q: '这节课要学什么？',
      keys: ['学什么', '这节课', '学习目标', '讲什么'],
      a: '学习集合间的基本关系：子集、真子集、集合相等，以及有限集合的子集个数 $2^n$。',
    },
    {
      slide: 2,
      q: '什么是子集？',
      keys: ['子集', '包含', 'A⊆B', '怎么判断'],
      a: '如果集合 $A$ 中任意一个元素都是集合 $B$ 的元素，就称 $A$ 是 $B$ 的子集，记作 $A\\subseteq B$。判断要从“任意元素”出发，不能只看个数。',
    },
    {
      slide: 2,
      q: '空集是任何集合的子集吗？',
      keys: ['空集', '∅', '空', '任何集合'],
      a: '是。$\\varnothing\\subseteq A$ 对任何集合 $A$ 都成立；同时任何集合都是它自身的子集。',
    },
    {
      slide: 3,
      q: '怎么证明两个集合相等？',
      keys: ['相等', '证明', '怎么证', '互相包含'],
      a: '用“互相包含”两步法：先证 $A\\subseteq B$，再证 $B\\subseteq A$，则 $A=B$。',
    },
    {
      slide: 3,
      q: '真子集和子集有什么区别？',
      keys: ['真子集', '区别', '⊊'],
      a: '若 $A\\subseteq B$ 且 $A\\neq B$，则 $A$ 是 $B$ 的真子集，记作 $A\\subsetneq B$。“不相等”这个条件容易漏。',
    },
    {
      slide: 4,
      q: '子集个数的公式怎么来的？',
      keys: ['子集个数', '2ⁿ', '2n', '公式', '几个子集'],
      a: '每个元素都有“选或不选”两种可能，所以 $n$ 个元素的集合有 $2^n$ 个子集；去掉自身，真子集有 $2^n-1$ 个（$n\\ge1$）。',
    },
    {
      slide: 4,
      q: '∅ 和 {∅} 有什么区别？',
      keys: ['{∅}', '∅和', '区别', '空集和'],
      a: '$\\varnothing$ 没有元素；$\\{\\varnothing\\}$ 有 1 个元素（这个元素是空集）。前者子集数 1、没有真子集，后者子集数 2。',
    },
    {
      slide: 5,
      q: '元素与集合、集合与集合分别用什么符号？',
      keys: ['符号', '∈', '⊆', '小结', '关系'],
      a: '元素与集合用 $\\in$ / $\\notin$；集合与集合用 $\\subseteq$ / $\\subsetneq$ / $=$。先把“谁和谁”分清，再选符号。',
    },
  ],
  'deck-material-cubes': [
    {
      slide: 1,
      q: '这个材料课堂讲什么？',
      keys: ['讲什么', '这节课', '材料', '学什么'],
      a: '讲我上传材料里的第 9 题：正三棱柱中的线面关系，用建系和数量积逐个判断四个选项。',
    },
    {
      slide: 2,
      q: '这道题的正确答案是什么？',
      keys: ['答案', '正确选项', '选什么', 'bd', '哪个对'],
      a: '正确选项是 B、D：B 由 $BC\\perp AD$、$BC\\perp AA_1$ 得到 $BC\\perp$ 平面 $AA_1D$；D 由 $CC_1\\parallel AA_1$ 且 $CC_1$ 不在平面 $AA_1D$ 内得到线面平行。',
    },
    {
      slide: 2,
      q: '题目里的隐含条件是什么？',
      keys: ['隐含', '条件', '正三棱柱', '垂直底面'],
      a: '“正三棱柱”给出两条关键信息：底面是正三角形，侧棱垂直于底面。这两条是后面所有推理的前提。',
    },
    {
      slide: 3,
      q: '为什么要建系？怎么建？',
      keys: ['建系', '坐标', '怎么想', '原点'],
      a: '正三棱柱侧棱垂直底面，所以可以取 $D$ 为原点，$DC$ 为 $x$ 轴、$DA$ 为 $y$ 轴、过 $D$ 平行 $AA_1$ 的方向为 $z$ 轴，把垂直、平行都化成数量积和方向向量。',
    },
    {
      slide: 4,
      q: 'A 项为什么错？',
      keys: ['a项', 'a 项', '为什么错', '垂直', '数量积'],
      a: 'A 项 $AD\\perp A_1C$ 不成立：建系后 $AD=(0,-\\sqrt3,0)$、$A_1C=(1,-\\sqrt3,-2)$，数量积为 3，不是 0。不能凭“图形看起来垂直”判断。',
    },
    {
      slide: 4,
      q: 'C 项为什么错？',
      keys: ['c项', 'c 项', '平行', 'a₁b₁'],
      a: 'C 项 $AD\\parallel A_1B_1$ 不成立：$AD=(0,-\\sqrt3,0)$，$A_1B_1=(-1,-\\sqrt3,-2)$，两个方向向量不成比例。',
    },
    {
      slide: 5,
      q: 'D 项怎么完整判断？',
      keys: ['d项', 'd 项', 'cc₁', 'cc1', '怎么判断'],
      a: '先用线面平行判定：$CC_1\\parallel AA_1$，$AA_1\\subset$ 平面 $AA_1D$，且 $CC_1\\not\\subset$ 平面 $AA_1D$，所以 $CC_1\\parallel$ 平面 $AA_1D$。两个条件缺一不可。',
    },
    {
      slide: 5,
      q: 'B 项用了哪条判定定理？',
      keys: ['b项', 'b 项', '判定定理', '线面垂直', 'bc'],
      a: '线面垂直的判定：$AD$、$AA_1$ 是平面 $AA_1D$ 内两条相交直线，$BC$ 垂直于它们，所以 $BC\\perp$ 平面 $AA_1D$。',
    },
    {
      slide: 6,
      q: '这一节的易错点是什么？',
      keys: ['易错', '注意', '小结', '错点'],
      a: '两个易错：① 凭图形“看起来垂直/平行”直接判断，不写定理条件；② 线面平行漏掉“线不在平面内”这一条。',
    },
  ],
}

/**
 * AI 助教回答：只允许基于当前课件页面/讲稿的结构化回答。
 * @param {{id:string, slides:Array}} deck 当前播放课件（发布快照或自主课题 deck）
 * @param {number} page 1-based 当前页
 * @param {string} question 学生输入
 * @returns {{hit:'current'|'other'|'miss', text:string, slide?:number, cite?:string}}
 *   - current：命中的是本页预置问答/本页内容
 *   - other：问题属于其他页 → 明确说明“当前页讲稿未包含”，并给出可跳转页
 *   - miss：未命中 → 明确说明，不编造
 */
export function answerQuestion(deck, page, question) {
  const slides = deck && Array.isArray(deck.slides) ? deck.slides : []
  const pageSafe = Math.min(Math.max(1, Number(page) || 1), Math.max(1, slides.length))
  const slide = slides[pageSafe - 1] || null
  const raw = String(question ?? '').trim()
  const qn = normalize(raw)

  if (!qn) {
    return { hit: 'miss', text: '先输入一个问题，例如“这一页的要点是什么？”。' }
  }
  if (!slide) {
    return { hit: 'miss', text: '当前没有可讲解的页面，请先返回课堂选择课件。' }
  }

  const bank = qaBank[deck.id] || []
  const matched = bank.filter((entry) => entry.keys.some((k) => qn.includes(normalize(k))))

  // 1) 命中本页预置问答
  const current = matched.find((entry) => entry.slide === pageSafe)
  if (current) {
    return { hit: 'current', text: current.a, cite: `第 ${pageSafe} 页讲稿 · ${current.q}` }
  }

  // 2) 命中其他页 → 明确说当前页没有，并给出可跳转的页
  const other = matched.find((entry) => entry.slide !== pageSafe)
  if (other) {
    return {
      hit: 'other',
      text: `当前页讲稿未包含这个问题。第 ${other.slide} 页「${plainText(slides[other.slide - 1]?.title) || '对应页'}」讲过：${other.a}`,
      slide: other.slide,
      cite: `第 ${other.slide} 页讲稿 · ${other.q}`,
    }
  }

  // 3) 通用页面诉求：本页讲什么 / 要点 / 总结 → 用当前页真实内容回答
  if (['这页', '本页', '讲什么', '内容', '要点', '总结', '小结', '重点'].some((k) => qn.includes(normalize(k)))) {
    return { hit: 'current', text: summarizeSlide(slide), cite: `第 ${pageSafe} 页 · ${plainText(slide.title)}` }
  }

  // 4) 未命中：明确说明，不编造
  return {
    hit: 'miss',
    text: `当前页讲稿未包含这个问题。本页讲的是「${plainText(slide.title)}」：${summarizeSlide(slide)}。可以换一种问法，或回到对应页再问。`,
    cite: `第 ${pageSafe} 页 · ${plainText(slide.title)}`,
  }
}

/** 当前页推荐问题（本页预置问答的第一条），用于助教快捷提问 */
export function recommendedQuestions(deck, page) {
  const bank = qaBank[deck && deck.id] || []
  const list = bank.filter((e) => e.slide === page).map((e) => e.q)
  if (list.length) return list.slice(0, 3)
  return ['这一页的要点是什么？', '本页讲了什么内容？']
}

/** 把页面内容拼成一段真实摘要（不含编造内容） */
export function summarizeSlide(slide) {
  if (!slide) return ''
  const parts = []
  if (slide.lead) parts.push(plainText(slide.lead))
  if (slide.equation) parts.push(`板书：${plainText(slide.equation)}`)
  if (Array.isArray(slide.bullets) && slide.bullets.length) {
    parts.push(`要点：${slide.bullets.map((b) => plainText(b)).join('；')}`)
  }
  return parts.join(' ')
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[\s\u3000，。？！,.?!、；;：:'"“”‘’（）()【】\[\]—\-_/]/g, '')
}
