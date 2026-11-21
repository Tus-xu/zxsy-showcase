/**
 * 备课中心共享内容契约（被教师端工作台/发布、学生端课堂/双师课堂共同读取）。
 *
 * 结构约定（实现子代理请勿破坏字段名）：
 *  deck: { id, sessionId, title, subtitle, meta:{textbook,grade,className,duration}, slides:[slide] }
 *  slide: { id, layout:'title'|'content', kicker?, title, lead?, equation?, bullets?, figure?, note?, footer? }
 *  plan:  { deckId, title, meta:[...], sections:[{heading, items:[...]}] }
 *  blueprint: { sessionId, title, genre, goals:[...], focus:[...], difficulties:[...],
 *               path:[{phase, minutes, teacher, student, intent}], examples:[{title, question, answer, note}] }
 *
 * 数学结论必须与 evidence/solutions/sealed/math-baseline.json 一致（椭圆 a=5、b=3 → c=4）。
 * 原始来源：教师端备课中心 Golden（PPT-GOLDEN / LESSONPLAN-GOLDEN）+ 三题手册的可迁移教学结构。
 * 教材来源：本机未找到 D:\知识库\AC切片，故三份课时依据为「演示自撰素材（待授权切片替换）」，不冒充教材原文。
 */

export const coursewareDecks = [
  {
    id: 'deck-ellipse',
    sessionId: 'prep-ellipse',
    title: '椭圆及其标准方程',
    subtitle: '第一课时',
    meta: { textbook: '人教A版 · 选择性必修第二册', grade: '高二 (1) 班', className: '高二 (1) 班', duration: '45 分钟' },
    sourceLabel: '演示自撰课件（教材切片源缺失，按方案 §2 登记）',
    slides: [
      {
        id: 's1',
        layout: 'title',
        kicker: '第三章 · 圆锥曲线',
        title: '椭圆及其标准方程',
        subtitle: '第一课时 · 从轨迹到方程',
        lead: '用一条绳子、两个焦点，把“到两定点距离之和为定值”的轨迹变成可计算的方程。',
        note: '由生活情境与动手画图引入，不直接给定义。',
        footer: '用数学的眼光观察世界',
      },
      {
        id: 's2',
        layout: 'content',
        title: '动手观察：一条绳子画椭圆',
        lead: '把绳子的两端固定在 $F_1$、$F_2$，用笔尖拉紧绳子移动，画出的轨迹是什么？',
        bullets: ['两定点 $F_1$、$F_2$ 称为焦点', '绳长不变 ⇒ 到两焦点距离之和为定值 $2a$', '若 $2a>|F_1F_2|$，轨迹是椭圆'],
        note: '让学生先画，再归纳“距离之和为定值”这一本质。',
      },
      {
        id: 's3',
        layout: 'content',
        title: '椭圆的定义',
        lead: '平面内与两个定点 $F_1$、$F_2$ 的距离之和等于常数 $2a$（$2a>|F_1F_2|$）的点的轨迹叫做椭圆。',
        equation: '|PF₁| + |PF₂| = 2a  (2a > |F₁F₂|)',
        bullets: ['两定点叫焦点，两焦点间距离 $2c$ 叫焦距', '条件 $2a>2c$ 不可省略：等于时退化为线段，小于时无轨迹', '$a$ 为长半轴，$c$ 为半焦距'],
        figure: 'F₁(−c,0)、F₂(c,0)、动点 P',
        note: '强调“2a > 2c”是本定义成立的前提，为后续 a>b>0 埋伏笔。',
      },
      {
        id: 's4',
        layout: 'content',
        title: '椭圆的标准方程',
        lead: '以 $F_1F_2$ 所在直线为 $x$ 轴、中点为原点建系，由 |PF₁|+|PF₂|=2a 化简可得：',
        equation: 'x²/a² + y²/b² = 1   (a > b > 0)',
        bullets: ['其中 b² = a² − c²，焦点为 F₁(−c,0)、F₂(c,0)', '2a 是长轴长，2b 是短轴长，2c 是焦距', '$a$、$b$、$c$ 满足 a² = b² + c²（注意与双曲线 c²=a²+b² 区分）'],
        figure: '标准位置：焦点在 x 轴上',
        note: '板演化简关键一步：两次平方，注意 a²−c² 换元为 b²。',
      },
      {
        id: 's5',
        layout: 'content',
        title: '几何性质与参数联动',
        lead: '取 a=5、b=3，则 c = √(a²−b²) = √(25−9) = 4：焦点为 (±4,0)，长轴长 10、短轴长 6、焦距 8。',
        equation: 'a=5, b=3  ⇒  c=4,  e=c/a=4/5',
        bullets: ['改变 a、b 时，焦点、顶点、长短轴与离心率同步变化', '离心率 e=c/a ∈ (0,1)：e 越大越“扁”', '参数联动必须在图形、公式、标注三处一致'],
        figure: 'a、b 可调，c 与 e 实时更新',
        note: '现场拖动参数，让学生观察 e 的变化。',
      },
      {
        id: 's6',
        layout: 'content',
        title: '课堂小结',
        lead: '回看本节课的三件事：定义的条件、方程的结构、参数的关系。',
        bullets: ['定义：|PF₁|+|PF₂|=2a>|F₁F₂|', '方程：x²/a²+y²/b²=1 (a>b>0)，b²=a²−c²', '关系：a²=b²+c²；e=c/a∈(0,1)', '易错：把椭圆关系写成 c²=a²+b²（那是双曲线）'],
        note: '让学生用自己的话复述“2a>2c 为什么不能少”。',
        footer: '用数学的眼光观察世界',
      },
    ],
  },
  {
    id: 'deck-quadratic',
    sessionId: 'prep-quadratic',
    title: '二次函数与配方法',
    subtitle: '第一课时',
    meta: { textbook: '人教A版 · 必修第一册', grade: '高一 (3) 班', className: '高一 (3) 班', duration: '45 分钟' },
    sourceLabel: '演示自撰课件（教材切片源缺失，按方案 §2 登记）',
    slides: [
      {
        id: 's1',
        layout: 'title',
        kicker: '第二章 · 函数',
        title: '二次函数与配方法',
        subtitle: '第一课时 · 从一般式到顶点式',
        lead: '把一个二次函数整理成顶点式，开口、对称轴、最值就一起出现了。',
        note: '从“为什么配方”出发，而不是背步骤。',
        footer: '把结构看清楚，计算才不会乱',
      },
      {
        id: 's2',
        layout: 'content',
        title: '问题：抛物线从哪里看最值？',
        lead: '对于 y = ax² + bx + c，能不能把它写成 y = a(x−h)² + k，从而直接看出顶点 (h, k)？',
        bullets: ['目标：把一般式化成顶点式', '关键：凑完全平方', '注意 a≠0；后续讨论开口方向与最值'],
        note: '先给目标，再让学生尝试配方。',
      },
      {
        id: 's3',
        layout: 'content',
        title: '配方法的三步',
        lead: '把一般式 $y=ax^2+bx+c$ 化成顶点式：先提取、再配方、最后合并常数。右侧是当前参数对应的实时结果，可边调参数边核对。',
        bullets: ['① 提取二次项系数 a', '② 括号内配成完全平方，多加的项要按 a 倍减掉（多退少补）', '③ 合并常数，得到顶点 (h, k) 与最值'],
        note: '板演“多退少补”，强调减掉的项要乘回 a。',
      },
      {
        id: 's4',
        layout: 'content',
        title: '从顶点式读信息',
        lead: '一般地，y = a(x−h)² + k：',
        equation: '顶点 (h,k)，对称轴 x=h，最值 k（a>0 取最小，a<0 取最大）',
        bullets: ['a>0 开口向上，最小值 k', 'a<0 开口向下，最大值 k', '由顶点式可直接求单调区间'],
        figure: '顶点、对称轴随 h、k 移动',
        note: '把代数式与图象对应起来。',
      },
      {
        id: 's5',
        layout: 'content',
        title: '课堂小结',
        lead: '配方法不是“为了变形而变形”，它是把二次函数的结构显性化的工具。',
        bullets: ['一般式 → 顶点式：提取、配方、合并', '顶点式立刻读出顶点、对称轴、最值', '易错：提取系数后忘记乘回，或多加少减'],
        footer: '把结构看清楚，计算才不会乱',
      },
    ],
  },
  {
    id: 'deck-set',
    sessionId: 'prep-set',
    title: '集合间的基本关系',
    subtitle: '第一课时',
    meta: { textbook: '人教A版 · 必修第一册', grade: '高一 (2) 班', className: '高一 (2) 班', duration: '45 分钟' },
    sourceLabel: '演示自撰课件（教材切片源缺失，按方案 §2 登记）',
    slides: [
      {
        id: 's1',
        layout: 'title',
        kicker: '第一章 · 集合与常用逻辑用语',
        title: '集合间的基本关系',
        subtitle: '第一课时 · 子集、真子集与相等',
        lead: '两个集合之间能有什么关系？用符号把“包含”说清楚。',
        note: '从具体集合对出发，再抽象符号。',
        footer: '先看元素，再谈关系',
      },
      {
        id: 's2',
        layout: 'content',
        title: '子集：每个元素都在里面',
        lead: '如果集合 A 中任意一个元素都是集合 B 的元素，那么称 A 是 B 的子集，记作 A⊆B。',
        equation: 'A ⊆ B  ⇔  任意 x∈A 都有 x∈B',
        bullets: ['空集是任何集合的子集：∅⊆A', '任何集合是它自身的子集：A⊆A', '判断子集要从“任意元素”出发，不能只看个数'],
        note: '强调定义中的“任意”二字。',
      },
      {
        id: 's3',
        layout: 'content',
        title: '真子集与相等',
        lead: '若 A⊆B 且 A≠B，则称 A 是 B 的真子集，记作 A⊊B；若 A⊆B 且 B⊆A，则 A=B。',
        equation: 'A=B  ⇔  A⊆B 且 B⊆A',
        bullets: ['证明集合相等：互相包含两步走', '真子集要求“不相等”，容易漏条件', '元素互异性会影响相等判断'],
        note: '让学生举一个“A⊆B 但 A≠B”的例子。',
      },
      {
        id: 's4',
        layout: 'content',
        title: '子集个数与空集',
        lead: '含 n 个元素的集合有 2ⁿ 个子集、2ⁿ−1 个真子集（n≥1）。空集的情况要单独想清楚。',
        equation: '子集数 = 2ⁿ，真子集数 = 2ⁿ − 1',
        bullets: ['每个元素“选或不选”决定一个子集', '空集只有 0 个元素：子集 1 个、没有真子集', '易错：把 ∅ 与 {∅} 混为一谈'],
        note: '用“选或不选”讲清 2ⁿ 的来源。',
      },
      {
        id: 's5',
        layout: 'content',
        title: '课堂小结',
        lead: '关系要先分清“元素与集合”还是“集合与集合”。',
        bullets: ['元素与集合：∈ / ∉', '集合与集合：⊆ / ⊊ / =', '空集是任何集合的子集；A=B 用互相包含证明'],
        footer: '先看元素，再谈关系',
      },
    ],
  },
]

export const lessonPlans = [
  {
    deckId: 'deck-ellipse',
    sessionId: 'prep-ellipse',
    title: '《椭圆及其标准方程》第一课时 · 教案',
    meta: ['人教A版 · 选择性必修第二册', '高二 (1) 班', '45 分钟', '课型：新授'],
    sections: [
      { heading: '一、教学目标', items: ['## 知识与技能', '- 理解椭圆的定义，记住条件 2a > 2c 的作用', '- 掌握椭圆标准方程的两种形式与 a、b、c 的关系', '## 过程与方法', '- 通过“绳子画椭圆”的动手活动，经历从轨迹到方程的抽象过程', '- 通过参数联动，体会数形结合', '## 情感态度', '- 在动手与推理中体会数学的严谨与美感'] },
      { heading: '二、教学重点与难点', items: ['## 重点', '- 椭圆的定义与标准方程', '## 难点', '- 标准方程的化简（两次平方与 b² = a² − c² 的引入）', '- 条件 2a > 2c 的必要性'] },
      { heading: '三、教学准备', items: ['- 教具：细绳、图钉、画板；几何画板/参数演示', '- 学案：画图任务单、配方与化简练习', '- 课件：《椭圆及其标准方程》第一课时（6 页）'] },
      { heading: '四、教学过程', items: ['## 环节一 · 情境与动手（8 分钟）', '- 教师：展示绳画椭圆，提出问题：轨迹上的点满足什么条件？', '- 学生：动手画图，记录 |PF₁|+|PF₂| 的变化', '- 设计意图：让定义从操作中自然生长出来', '## 环节二 · 形成定义（8 分钟）', '- 教师：引导学生用符号表示“距离之和为定值”，强调 2a>2c', '- 学生：用自己的话复述定义，举出 2a=2c 的反例', '- 设计意图：抓住定义成立的条件', '## 环节三 · 推导方程（15 分钟）', '- 教师：建系、设点、列式、化简，板演关键两步', '- 学生：跟随化简，回答“为什么要设 b²=a²−c²”', '- 设计意图：经历完整的解析几何建模过程', '## 环节四 · 性质与联动（10 分钟）', '- 教师：取 a=5、b=3 演示 c=4，拖动参数观察 e', '- 学生：分组计算不同 a、b 下的 c 与 e', '- 设计意图：参数变化中把握不变量', '## 环节五 · 小结与作业（4 分钟）', '- 教师：三问收束（定义条件、方程结构、参数关系）', '- 学生：复述并记录易错点'] },
      { heading: '五、板书设计', items: ['- 左：定义 |PF₁|+|PF₂|=2a (2a>2c)', '- 中：标准方程 x²/a²+y²/b²=1 (a>b>0)', '- 右：参数关系 a²=b²+c² 与 a=5,b=3,c=4 的实例'] },
      { heading: '六、作业布置', items: ['- 基础：教材习题对应的定义判断题 3 道', '- 提升：已知椭圆上一点到两焦点距离之和为 10、焦距为 8，求标准方程', '- 实践：用绳子画一个椭圆，测量并估算 a、b、c'] },
      { heading: '七、教学反思（课后填写）', items: ['- 预设：学生可能忽略 2a>2c；化简中符号错误', '- 观察点：能否说出 b²=a²−c² 的由来', '- 调整预案：若时间不足，性质环节改为演示+提问'] },
    ],
  },
  {
    deckId: 'deck-quadratic',
    sessionId: 'prep-quadratic',
    title: '《二次函数与配方法》第一课时 · 教案',
    meta: ['人教A版 · 必修第一册', '高一 (3) 班', '45 分钟', '课型：新授'],
    sections: [
      { heading: '一、教学目标', items: ['## 知识与技能', '- 会用配方法把二次函数化为顶点式', '- 能从顶点式读出顶点、对称轴与最值', '## 过程与方法', '- 经历“一般式→顶点式”的变形过程，理解配方依据', '- 通过图象对照，建立代数式与图象的联系'] },
      { heading: '二、教学重点与难点', items: ['## 重点', '- 配方法的三步操作', '## 难点', '- 提取二次项系数后括号内的“多退少补”'] },
      { heading: '三、教学准备', items: ['- 教具：几何画板/函数图像演示', '- 学案：配方练习 4 题', '- 课件：《二次函数与配方法》第一课时（5 页）'] },
      { heading: '四、教学过程', items: ['## 环节一 · 提出问题（6 分钟）', '- 教师：为什么要配方？顶点式能多告诉我们什么？', '- 学生：尝试把 y=x²+4x+1 写成平方形式', '## 环节二 · 方法形成（12 分钟）', '- 教师：以 2x²+8x+5 为例示范三步', '- 学生：独立完成 3x²−6x+1 的配方并互相检查', '## 环节三 · 图象与性质（15 分钟）', '- 教师：用顶点式对应图象，标出顶点与对称轴', '- 学生：由顶点式直接写出开口、对称轴、最值', '## 环节四 · 变式与易错（8 分钟）', '- 教师：展示“漏乘 a”“多加少减”两类错解', '- 学生：纠错并说明理由', '## 环节五 · 小结（4 分钟）', '- 教师：三步口诀与结构图'] },
      { heading: '五、板书设计', items: ['- 一般式 y=ax²+bx+c → 顶点式 y=a(x−h)²+k', '- 示范：2x²+8x+5 = 2(x+2)²−3', '- 右侧：顶点、对称轴、最值对照表'] },
      { heading: '六、作业布置', items: ['- 基础：配方 4 题', '- 提升：已知顶点与一点求二次函数解析式', '- 反思：整理本节的两类易错'] },
      { heading: '七、教学反思（课后填写）', items: ['- 预设：提取系数后忘记乘回', '- 观察点：能否解释“为什么减 8”', '- 调整：增加一步“代入验证”'] },
    ],
  },
  {
    deckId: 'deck-set',
    sessionId: 'prep-set',
    title: '《集合间的基本关系》第一课时 · 教案',
    meta: ['人教A版 · 必修第一册', '高一 (2) 班', '45 分钟', '课型：新授'],
    sections: [
      { heading: '一、教学目标', items: ['## 知识与技能', '- 理解子集、真子集、集合相等的定义与符号', '- 会求有限集合的子集个数', '## 过程与方法', '- 从具体例子抽象出“包含”关系', '- 通过“任意元素”的表述训练严谨性'] },
      { heading: '二、教学重点与难点', items: ['## 重点', '- 子集与真子集的判断', '## 难点', '- 空集的特殊性；集合相等的双向包含证明'] },
      { heading: '三、教学准备', items: ['- 学案：集合关系判断题、子集枚举表', '- 课件：《集合间的基本关系》第一课时（5 页）'] },
      { heading: '四、教学过程', items: ['## 环节一 · 具体例子（8 分钟）', '- 教师：给出 A={1,2}、B={1,2,3}，问 A 的元素与 B 的关系', '- 学生：列举并归纳', '## 环节二 · 定义与符号（12 分钟）', '- 教师：给出子集、真子集、相等的定义与符号', '- 学生：用符号改写 3 个命题', '## 环节三 · 空集与个数（12 分钟）', '- 教师：讨论 ∅⊆A 与 2ⁿ 的来源', '- 学生：枚举 {a,b,c} 的全部子集', '## 环节四 · 相等证明（9 分钟）', '- 教师：示范“互相包含”两步法', '- 学生：完成一道证明', '## 环节五 · 小结（4 分钟）', '- 教师：元素关系 vs 集合关系对照表'] },
      { heading: '五、板书设计', items: ['- 左：元素与集合（∈、∉）', '- 中：集合与集合（⊆、⊊、=）', '- 右：2ⁿ 子集表（n=0,1,2,3）'] },
      { heading: '六、作业布置', items: ['- 基础：判断 6 个关系式', '- 提升：求满足条件的集合个数', '- 整理：∅ 与 {∅} 的区别'] },
      { heading: '七、教学反思（课后填写）', items: ['- 预设：把 ∅ 与 {∅} 混淆', '- 观察点：能否说明真子集的“不相等”', '- 调整：增加空集例子的辨析'] },
    ],
  },
]

export const blueprints = [
  {
    sessionId: 'prep-ellipse',
    title: '椭圆及其标准方程 · 第一课时',
    genre: '新授课',
    goals: ['理解椭圆定义及 2a>2c 的条件', '掌握标准方程与 a、b、c 关系', '经历从轨迹到方程的建模过程'],
    focus: ['椭圆的定义', '标准方程的推导'],
    difficulties: ['方程的化简与 b²=a²−c² 的引入', '条件 2a>2c 的必要性'],
    path: [
      { phase: '情境与动手', minutes: 8, teacher: '展示绳画椭圆，提出条件问题', student: '动手画图，记录距离之和', intent: '让定义从操作中生长' },
      { phase: '形成定义', minutes: 8, teacher: '引导符号化，强调 2a>2c', student: '复述定义并举反例', intent: '抓住定义成立条件' },
      { phase: '推导方程', minutes: 15, teacher: '建系、列式、化简并板演', student: '跟随化简，回答换元理由', intent: '经历解析几何建模' },
      { phase: '性质与联动', minutes: 10, teacher: 'a=5,b=3 演示 c=4 与 e', student: '分组计算不同参数', intent: '参数变化中把握不变量' },
      { phase: '小结与作业', minutes: 4, teacher: '三问收束', student: '复述与记录易错', intent: '结构化收束' },
    ],
    examples: [
      {
        title: '例题 1 · 由定义求标准方程',
        question: '椭圆上一点 P 到两焦点 F₁、F₂ 的距离之和为 10，焦距为 8，焦点在 x 轴上，求椭圆的标准方程。',
        answer: '2a=10 ⇒ a=5；2c=8 ⇒ c=4；b²=a²−c²=25−16=9，故 x²/25 + y²/9 = 1。',
        note: '对应 Golden 中的 a=5、b=3、c=4 参数组。',
      },
    ],
  },
  {
    sessionId: 'prep-quadratic',
    title: '二次函数与配方法 · 第一课时',
    genre: '新授课',
    goals: ['会用配方法化顶点式', '能从顶点式读性质'],
    focus: ['配方法三步'],
    difficulties: ['提取系数后的多退少补'],
    path: [
      { phase: '提出问题', minutes: 6, teacher: '问“为什么要配方”', student: '尝试写平方形式', intent: '产生配方需求' },
      { phase: '方法形成', minutes: 12, teacher: '示范三步', student: '独立配方并互检', intent: '形成操作程序' },
      { phase: '图象与性质', minutes: 15, teacher: '顶点式对应图象', student: '读出性质', intent: '数形结合' },
      { phase: '变式与易错', minutes: 8, teacher: '展示两类错解', student: '纠错说明理由', intent: '预防典型错误' },
      { phase: '小结', minutes: 4, teacher: '三步口诀', student: '记录结构图', intent: '结构化' },
    ],
    examples: [
      {
        title: '例题 1 · 配方',
        question: '把 y = 2x² + 8x + 5 化为顶点式，并写出顶点与最小值。',
        answer: 'y = 2(x²+4x)+5 = 2(x+2)²−8+5 = 2(x+2)²−3，顶点 (−2,−3)，最小值 −3。',
        note: '重点讲“减 8”的来历。',
      },
    ],
  },
  {
    sessionId: 'prep-set',
    title: '集合间的基本关系 · 第一课时',
    genre: '新授课',
    goals: ['理解子集、真子集、相等', '会求子集个数'],
    focus: ['子集与真子集判断'],
    difficulties: ['空集特殊性', '相等证明的双向包含'],
    path: [
      { phase: '具体例子', minutes: 8, teacher: '给出 A⊆B 的例子', student: '列举归纳', intent: '从具体到抽象' },
      { phase: '定义符号', minutes: 12, teacher: '给出定义与符号', student: '符号改写命题', intent: '掌握符号语言' },
      { phase: '空集与个数', minutes: 12, teacher: '讨论 ∅ 与 2ⁿ', student: '枚举子集', intent: '突破难点' },
      { phase: '相等证明', minutes: 9, teacher: '示范互相包含', student: '完成证明', intent: '掌握证明范式' },
      { phase: '小结', minutes: 4, teacher: '对照表收束', student: '记录对照表', intent: '概念结构化' },
    ],
    examples: [
      {
        title: '例题 1 · 子集个数',
        question: '集合 {a,b,c} 有多少个子集？多少个真子集？',
        answer: '2³=8 个子集；8−1=7 个真子集（去掉自身）。',
        note: '空集计入子集数，但不是真子集（自身不是真子集）。',
      },
    ],
  },
]

export function findDeck(deckId) {
  return coursewareDecks.find((d) => d.id === deckId) || null
}
export function findDeckBySession(sessionId) {
  return coursewareDecks.find((d) => d.sessionId === sessionId) || null
}
export function findPlan(deckId) {
  return lessonPlans.find((p) => p.deckId === deckId) || null
}
export function findBlueprint(sessionId) {
  return blueprints.find((b) => b.sessionId === sessionId) || null
}
