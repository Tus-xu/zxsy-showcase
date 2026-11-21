/**
 * 学生引导解题 · 三题脚本（A/B/C）
 * 依据：evidence/solutions/sealed/math-baseline.json（2026-11-21 封存）
 * 教学稿来源：docs/superpowers/plans/2026-11-21-guided-solving-cases.md（供展示版选用）
 * 平台实测后按 evidence/curation 增补修订；数学结论不得改动。
 */
import q1 from '../assets/questions/q1.png'
import q2 from '../assets/questions/q2.png'
import q3 from '../assets/questions/q3.png'

export const guidanceCases = [
  {
    id: 'A',
    code: '题1',
    printedNumber: 3,
    title: '双曲线的离心率',
    chip: '单选 · 圆锥曲线',
    sourceLabel: '演示题库原题 · 印刷题号第 3 题（原图 题1.png）',
    image: q1,
    sha256: 'CD2F518F8B705680EEF74056F6C23C114EA51899378A00E2198464B3AA4AD9E7',
    type: 'single',
    questionText: '若双曲线 $C$ 的虚轴长为实轴长的 $\\sqrt{7}$ 倍，则 $C$ 的离心率为',
    options: [
      { key: 'A', text: '$\\sqrt{2}$' },
      { key: 'B', text: '$2$' },
      { key: 'C', text: '$\\sqrt{7}$' },
      { key: 'D', text: '$2\\sqrt{2}$' },
    ],
    ocrText:
      '3. 若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为\nA. √2　　B. 2　　C. √7　　D. 2√2',
    opening: [
      '看到题了：第 3 题，双曲线，问离心率。选项里有 √2、2、√7、2√2。',
      '我们先不猜答案。离心率 $e=\\dfrac{c}{a}$，先看清楚题目给的是哪两条轴的关系。',
    ],
    steps: [
      {
        id: 's1',
        ask: '如果设实半轴为 $a$、虚半轴为 $b$，那么“实轴长”“虚轴长”分别怎么写？题目说它们是什么关系？',
        ui: 'text',
        placeholder: '写出轴长的关系式（例如：2b = …）',
        accept: [
          {
            kind: 'correct',
            regex: '(2b\\s*=\\s*(√7|sqrt7)\\s*[·*×]?\\s*2a)|(2b\\s*=\\s*2\\s*[·*×]?\\s*(√7|sqrt7)\\s*a)|(b\\s*/\\s*a\\s*=\\s*(√7|sqrt7))|(b\\s*=\\s*(√7|sqrt7)\\s*[·*×]?\\s*a)',
            reply: [
              '对——实轴长 $2a$、虚轴长 $2b$，由“虚轴长是实轴长的 $\\sqrt{7}$ 倍”得 $2b=\\sqrt{7}\\cdot 2a$，约去 2：$\\dfrac{b}{a}=\\sqrt{7}$。',
            ],
            next: 's2',
          },
          {
            kind: 'wrong',
            regex: '(选\\s*c|答案.{0,4}c$|比值.{0,6}e|e\\s*=?\\s*√7|e=√7)',
            reply: [
              '先别急着定选项。你读出的 $\\sqrt{7}$ 是哪两条线的比？离心率定义里的分子又是哪个量？',
              '把“实轴长、虚轴长”先写成 $2a$、$2b$，再写出它们的关系式给我看看。',
            ],
            next: null,
          },
        ],
        partial: [
          {
            regex: '(^|[^a-z])(a|b)([^a-z]|$)',
            reply: [
              '方向是对的，但还差“轴长”这一层：实轴长是 $2a$、虚轴长是 $2b$。把 $\\sqrt{7}$ 倍落到这两个整条轴上，写成等式。',
            ],
          },
        ],
        hint: '实轴长 = $2a$，虚轴长 = $2b$；“$\\sqrt{7}$ 倍”说的是整条轴，不是半轴。先写 $2b=\\sqrt{7}\\cdot 2a$。',
      },
      {
        id: 's2',
        ask: '要求的是 $e=\\dfrac{c}{a}$，现在手上有 $\\dfrac{b}{a}$。双曲线里 $a$、$b$、$c$ 满足哪个等式？',
        ui: 'text',
        placeholder: '写出 a、b、c 的关系式',
        accept: [
          {
            kind: 'correct',
            regex: 'c\\s*\\^?2?\\s*=\\s*a\\s*\\^?2?\\s*\\+\\s*b\\s*\\^?2?|c²\\s*=\\s*a²\\s*\\+\\s*b²|c\\s*\\^?2?\\s*=\\s*b\\s*\\^?2?\\s*\\+\\s*a\\s*\\^?2?|a\\^2\\s*\\+\\s*b\\^2\\s*=\\s*c\\^2|b\\^2\\s*\\+\\s*a\\^2\\s*=\\s*c\\^2',
            reply: [
              '对，双曲线是 $c^2=a^2+b^2$（注意别和椭圆的 $a^2=b^2+c^2$ 混了）。',
            ],
            next: 's3',
          },
          {
            kind: 'wrong',
            regex: 'c\\s*\\^?2?\\s*=\\s*a\\s*\\^?2?\\s*[-−]\\s*b\\s*\\^?2?|c²\\s*=\\s*a²\\s*[-−]\\s*b²',
            reply: [
              '这个式子是错的：$c^2=a^2-b^2$ 会让 $c^2$ 变成负数。椭圆才是 $a^2=b^2+c^2$；双曲线由定义得 $c^2=a^2+b^2$。改正后再继续。',
            ],
            next: null,
          },
        ],
        hint: '双曲线的半焦距最大：$c^2=a^2+b^2$（椭圆才是 $a^2=b^2+c^2$）。',
      },
      {
        id: 's3',
        ask: '把 $\\dfrac{b}{a}=\\sqrt{7}$ 代入，并同除以 $a^2$：$e^2=1+\\left(\\dfrac{b}{a}\\right)^2$ 等于多少？',
        ui: 'text',
        placeholder: '只填 e² 的数值',
        accept: [
          {
            kind: 'correct',
            regex: '^\\s*(e\\s*=\\s*)?(2√2|2\\s*sqrt\\s*\\(?\\s*2\\s*\\)?|√8|sqrt8|2\\.828|2\\.83)\\s*$',
            reply: ['对，$e=2\\sqrt{2}$。'],
            next: 's4',
          },
          {
            kind: 'correct',
            regex: '(^|[^0-9])8([^0-9]|$)',
            reply: ['$e^2=1+7=8$。注意 $e>0$，开方后 $e$ 本身是多少？'],
            next: null,
            stay: true,
          },
        ],
        partial: [
          {
            regex: '1\\s*\\+\\s*7|e\\s*\\^?2?\\s*=\\s*8',
            reply: ['就是这个数：$e^2=8$。那么 $e$ 本身是多少？'],
          },
        ],
        hint: '$e^2=1+\\left(\\dfrac{b}{a}\\right)^2=1+7=8$，先求出 $e^2$。',
      },
      {
        id: 's4',
        ask: '那么 $e$ 对应哪个选项？',
        ui: 'single',
        optionKeys: ['A', 'B', 'C', 'D'],
        accept: [
          { kind: 'correct', keys: ['D'], reply: ['正确：$e=2\\sqrt{2}$，选 **D**。'], next: 'final' },
          {
            kind: 'wrong',
            keys: ['C'],
            reply: [
              'C 项的 $\\sqrt{7}$ 是 $\\dfrac{b}{a}$，不是离心率。离心率 $e=\\dfrac{c}{a}=\\sqrt{1+\\left(\\dfrac{b}{a}\\right)^2}$，再算一次。',
            ],
            next: null,
          },
          {
            kind: 'wrong',
            keys: ['A'],
            reply: ['A 项 $\\sqrt{2}$ 相当于默认 $b=a$（等轴双曲线），但题目给的是 $\\sqrt{7}$ 倍。用 $e^2=1+7$ 重算。'],
            next: null,
          },
          {
            kind: 'wrong',
            keys: ['B'],
            reply: ['$\\sqrt{8}$ 不是 2：$\\sqrt{8}=2\\sqrt{2}\\approx 2.83$。选 B 可能把 7 当成了 3。'],
            next: null,
          },
        ],
        hint: '回忆 $e^2=8$ 且 $e>0$：先开方，再把 $\\sqrt{8}$ 化简成 $a\\sqrt{b}$ 的形式。',
      },
    ],
    final: {
      title: 'A · 结论：$e=2\\sqrt{2}$，选 D',
      lines: [
        '① 由 $2b=\\sqrt{7}\\cdot 2a$ 得 $\\dfrac{b}{a}=\\sqrt{7}$；',
        '② 双曲线 $c^2=a^2+b^2$；',
        '③ $e^2=\\dfrac{c^2}{a^2}=1+\\left(\\dfrac{b}{a}\\right)^2=1+7=8$；',
        '④ $e>0$，故 $e=\\sqrt{8}=2\\sqrt{2}$，选 **D**。',
      ],
      keyPoint: '轴长比 → 用到 $c^2=a^2+b^2$ → 平方后开正根。离心率与 $\\dfrac{b}{a}$ 不是同一个量。',
    },
    variants: [
      {
        id: 'A-v1',
        title: '变式：离心率反推轴长比',
        question: '若双曲线 $C$ 的离心率为 $2$，则它的虚轴长是实轴长的多少倍？',
        type: 'fill',
        answer: '\\sqrt{3}',
        accepts: ['√3', '\\sqrt{3}', 'sqrt3', '1.732'],
        solution: '由 $e^2=1+\\left(\\dfrac{b}{a}\\right)^2=4$，得 $\\left(\\dfrac{b}{a}\\right)^2=3$，故 $\\dfrac{b}{a}=\\sqrt{3}$，即虚轴长是实轴长的 $\\sqrt{3}$ 倍。',
      },
      {
        id: 'A-v2',
        title: '变式：等轴双曲线',
        question: '等轴双曲线的离心率为（　）',
        type: 'single',
        options: [
          { key: 'A', text: '$\\sqrt{2}$' },
          { key: 'B', text: '$2$' },
          { key: 'C', text: '$\\sqrt{3}$' },
          { key: 'D', text: '$2\\sqrt{2}$' },
        ],
        answer: 'A',
        solution: '等轴双曲线 $a=b$，$e^2=1+1=2$，故 $e=\\sqrt{2}$，选 A。',
      },
    ],
  },

  {
    id: 'B',
    code: '题2',
    printedNumber: 9,
    title: '正三棱柱中的线面关系',
    chip: '多选 · 立体几何',
    sourceLabel: '演示题库原题 · 印刷题号第 9 题（原图 题2.png）',
    image: q2,
    sha256: '0BC14458A696C1CAAA37D3B630113FD0F61C06FDDA1B5DA1C76CAF314F392425',
    type: 'multi',
    questionText: '在正三棱柱 $ABC\\text{-}A_1B_1C_1$ 中，$D$ 为 $BC$ 中点，则',
    options: [
      { key: 'A', text: '$AD\\perp A_1C$' },
      { key: 'B', text: '$BC\\perp$ 平面 $AA_1D$' },
      { key: 'C', text: '$AD\\parallel A_1B_1$' },
      { key: 'D', text: '$CC_1\\parallel$ 平面 $AA_1D$' },
    ],
    ocrText:
      '9. 在正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点，则\nA. AD⊥A₁C　　B. BC⊥平面 AA₁D\nC. AD∥A₁B₁　　D. CC₁∥平面 AA₁D',
    opening: [
      '这道题是正三棱柱里的线面关系，四个选项分别判断。',
      '原图没有印单选/多选说明，我们按“找出全部成立的关系”来做——最后允许组合提交。',
      '先把底面画清楚：正三角形、$D$ 是 $BC$ 中点。',
    ],
    steps: [
      {
        id: 's1',
        ask: '底面 $ABC$ 是什么三角形？$D$ 是 $BC$ 中点，那么 $AD$ 与 $BC$ 是什么关系？',
        ui: 'text',
        placeholder: '描述 AD 与 BC 的关系',
        accept: [
          {
            kind: 'wrong',
            regex: '(不|非|没|无)\\s*[^，。；,;]{0,6}(垂直|⊥)',
            reply: ['再想一下：正三角形的中线也是高线，所以 $AD\\perp BC$，不是不垂直。'],
            next: null,
          },
          {
            kind: 'correct',
            regex: '垂直|⊥',
            reply: ['对：正三角形中 $AD$ 是中线，也是高，所以 $AD\\perp BC$。'],
            next: 's2',
          },
        ],
        partial: [
          {
            regex: '(平分|中线|中点)',
            reply: ['是的，$AD$ 是中线；正三角形的中线同时是高，所以它与 $BC$ 的位置关系是？'],
          },
        ],
        hint: '正三角形的中线也是高线：$AD\\perp BC$。',
      },
      {
        id: 's2',
        ask: '要在平面 $AA_1D$ 内再找一条与 $BC$ 垂直的直线。过 $D$ 作一条与侧棱 $AA_1$ 平行的直线，它和底面是什么关系？',
        ui: 'text',
        placeholder: '描述这条线与底面的关系',
        accept: [
          {
            kind: 'wrong',
            regex: '(不|非|没|无)\\s*[^，。；,;]{0,6}(垂直|⊥)',
            reply: ['注意：正棱柱的侧棱垂直于底面，所以平行于侧棱的直线也垂直于底面，从而垂直于底面上的 $BC$。'],
            next: null,
          },
          {
            kind: 'correct',
            regex: '垂直|⊥',
            reply: [
              '对：侧棱 $AA_1\\perp$ 底面，所以过 $D$ 平行于 $AA_1$ 的直线也垂直于底面，自然垂直于底面上的 $BC$。',
            ],
            next: 's3',
          },
        ],
        hint: '正棱柱的侧棱垂直于底面；平行于侧棱的直线也垂直于底面。',
      },
      {
        id: 's3',
        ask: '（单选）由“$BC$ 垂直于平面内两条相交直线”可以直接得到哪个选项成立？',
        ui: 'single',
        optionKeys: ['A', 'B', 'C', 'D'],
        accept: [
          { kind: 'correct', keys: ['B'], reply: ['对，$BC\\perp$ 平面 $AA_1D$，**B 项成立**。'], next: 's4' },
          {
            kind: 'wrong',
            keys: ['A'],
            reply: ['A 项不能由这个判定得到。提醒：$A_1C$ 在底面的投影是 $AC$，而 $AD$ 与 $AC$ 成 $30^\\circ$，方向点积不为 0。先聚焦 B。'],
            next: null,
          },
          {
            kind: 'wrong',
            keys: ['C'],
            reply: ['C 项说的是平行，与刚才的垂直判定无关：$A_1B_1\\parallel AB$，而 $AD$ 与 $AB$ 成 $30^\\circ$。先聚焦 B。'],
            next: null,
          },
          {
            kind: 'wrong',
            keys: ['D'],
            reply: ['D 项不是由“线面垂直判定”直接得到的。先回答 B：$BC\\perp$ 平面 $AA_1D$。'],
            next: null,
          },
        ],
        hint: '线面垂直的判定：一条直线垂直于平面内两条相交直线，就垂直于该平面。',
      },
      {
        id: 's4',
        ask: '再检查 D：$CC_1$ 与平面 $AA_1D$ 内的哪条直线平行？$C$ 在这平面内吗？把最终成立的选项全部选上并提交。',
        ui: 'multi',
        optionKeys: ['A', 'B', 'C', 'D'],
        accept: [
          {
            kind: 'correct',
            keys: ['B', 'D'],
            reply: ['完整集合是 **B、D**。B 由线面垂直判定；D 由 $CC_1\\parallel AA_1$ 且 $C\\notin$ 平面 $AA_1D$（线面平行判定）。'],
            next: 'final',
          },
          {
            kind: 'partial',
            keys: ['B'],
            reply: [
              'B 已经保留。再检查 D：$CC_1\\parallel AA_1$，而 $AA_1$ 在平面 $AA_1D$ 内；关键是 $C$ 在不在这个平面里？',
              '平面 $AA_1D$ 与底面的交线是 $AD$，$C$ 不在 $AD$ 上，所以 $CC_1$ 不在平面内 ⇒ $CC_1\\parallel$ 平面 $AA_1D$。把 D 补上再提交。',
            ],
            next: null,
          },
          {
            kind: 'partial',
            keys: ['D'],
            reply: ['D 是对的，但漏了 B：$BC\\perp AD$ 且 $BC\\perp AA_1$，两条相交直线都在平面 $AA_1D$ 内，所以 $BC\\perp$ 平面 $AA_1D$。补上 B 再提交。'],
            next: null,
          },
          {
            kind: 'wrong',
            keys: ['A', 'B', 'C', 'D'],
            reply: ['A、C 都不成立：$AD\\cdot A_1C=3\\ne 0$（不垂直）；$A_1B_1\\parallel AB$ 而 $AD$ 与 $AB$ 成 $30^\\circ$（不平行）。保留 B、D 再提交。'],
            next: null,
          },
        ],
        hint: 'D 项要同时满足：$CC_1\\parallel AA_1$（面内直线）且 $CC_1$ 不在平面内。C 不在交线 AD 上，所以它不在平面内。',
      },
    ],
    final: {
      title: 'B · 结论：B、D 均成立（多选）',
      lines: [
        '① 正三角形中 $AD\\perp BC$；侧棱 $AA_1\\perp$ 底面 ⇒ $AA_1\\perp BC$；',
        '② $BC\\perp AD$、$BC\\perp AA_1$，且两线相交 ⇒ $BC\\perp$ 平面 $AA_1D$，**B 对**；',
        '③ $CC_1\\parallel AA_1\\subset$ 平面 $AA_1D$，且 $C\\notin$ 平面 ⇒ $CC_1\\parallel$ 平面 $AA_1D$，**D 对**；',
        '④ $AD$ 与 $A_1C$ 不垂直（点积 $3\\ne 0$）；$AD$ 与 $A_1B_1$ 不平行 ⇒ A、C 错。',
      ],
      keyPoint: '线面垂直找“面内两条相交直线”；线面平行要“面内一条平行线 + 直线不在面内”。只选 B 或只选 D 都只是部分正确。',
    },
    variants: [
      {
        id: 'B-v1',
        title: '变式：中点换成三等分点后 B 项还成立吗',
        question: '在正三棱柱 $ABC\\text{-}A_1B_1C_1$ 中，$D$ 是 $BC$ 上一点且 $BD=\\dfrac{1}{3}BC$。此时 $BC\\perp$ 平面 $AA_1D$ 是否成立？（填“成立”或“不成立”）',
        type: 'fill',
        answer: '不成立',
        accepts: ['不成立', '错'],
        solution: 'B 项成立的根源是“正三角形的中线也是高”：只有 $D$ 为 $BC$ 中点时才有 $AD\\perp BC$。三等分点时 $AD$ 与 $BC$ 不垂直，线面垂直的判定失效，故 **不成立**。',
      },
      {
        id: 'B-v2',
        title: '变式：判断另一条侧棱与中线的关系',
        question: '同上正三棱柱，$CC_1\\perp AD$ 是否成立？（填“成立”或“不成立”）',
        type: 'fill',
        answer: '成立',
        accepts: ['成立', '对'],
        solution: '侧棱 $CC_1\\parallel AA_1$，而 $AA_1\\perp$ 底面 $ABC$，所以 $CC_1\\perp$ 底面内的任意直线，包括 $AD$。故 **成立**。',
      },
    ],
  },

  {
    id: 'C',
    code: '题3',
    printedNumber: 14,
    title: '有放回取球的期望',
    chip: '填空 · 概率统计',
    sourceLabel: '演示题库原题 · 印刷题号第 14 题（原图 题3.png）',
    image: q3,
    sha256: 'CD9DB0CCF25BFE7C64889A5BE5E50A5807D58A7F8BB3BDC0F4BB88A93AE5D676',
    type: 'fill',
    questionText: '一个箱子里有 5 个球，分别以 $1\\sim 5$ 标号，若有放回取三次，记至少取出一次的球的个数为 $X$，则 $E(X)=$ ______。',
    ocrText:
      '14. 一个箱子里有 5 个球，分别以 1～5 标号，若有放回取三次，记至少取出一次的球的个数为 X，则 E(X)= ______。',
    opening: [
      '第 14 题，概率填空。关键词是“**有放回**”和“至少取出一次的球的个数”。',
      '先弄清 $X$ 到底数的是什么，再想怎么求期望——不要一上来就套公式。',
    ],
    steps: [
      {
        id: 's1',
        ask: '如果三次抽到的是 $2、2、5$，这次 $X$ 是多少？',
        ui: 'text',
        placeholder: '填一个整数',
        accept: [
          {
            kind: 'correct',
            regex: '(^|[^0-9])2([^0-9]|$)',
            reply: ['对，出现过的号码是 2 和 5，共 2 种，所以 $X=2$。$X$ 数的是“出现过的不同号码种数”。'],
            next: 's2',
          },
          {
            kind: 'wrong',
            regex: '(^|[^0-9])3([^0-9]|$)',
            reply: [
              '数一下“出现过的号码”：2 和 5，一共两种，重复的 2 不重复计数。所以 $X=2$，不是 3。',
              '$X$ 表示至少取出一次的球的个数（不同号码的种数），不是抽取次数。',
            ],
            next: 's2',
          },
        ],
        hint: '把三次结果里出现过的号码列出来，去重后数个数。$2、2、5$ 只出现了 $\\{2,5\\}$ 两种。',
      },
      {
        id: 's2',
        ask: '固定观察 1 号球。一次没有取到 1 号的概率是多少？三次都没有取到呢？',
        ui: 'text',
        placeholder: '写出概率（可写分数）',
        accept: [
          {
            kind: 'correct',
            regex: '64\\s*/\\s*125|0\\.512|\\(4/5\\)\\s*\\^?3|\\^3.*4/5',
            reply: ['对：一次不取 1 号的概率是 $\\dfrac{4}{5}$，三次都没有是 $\\left(\\dfrac{4}{5}\\right)^3=\\dfrac{64}{125}$。'],
            next: 's3',
          },
        ],
        partial: [
          { regex: '^\\s*4\\s*/\\s*5', reply: ['一次是 $\\dfrac{4}{5}$，对的。那么“三次都没有取到”呢？三个独立事件同时发生，概率相乘。'] },
        ],
        hint: '每次取到 1 号的概率是 $\\dfrac{1}{5}$，没取到是 $\\dfrac{4}{5}$；三次都没取到就是 $\\left(\\dfrac{4}{5}\\right)^3$。',
      },
      {
        id: 's3',
        ask: '那么 1 号球“至少出现一次”的概率是多少？另外四个号码和它一样吗？',
        ui: 'text',
        placeholder: '写出概率（可写分数）',
        accept: [
          {
            kind: 'correct',
            regex: '1\\s*[-−]\\s*64\\s*/\\s*125',
            reply: ['对：$1-\\dfrac{64}{125}=\\dfrac{61}{125}$。每个号码地位相同，“至少出现一次”的概率都是 $\\dfrac{61}{125}$。'],
            next: 's4',
          },
          {
            kind: 'correct',
            regex: '61\\s*/\\s*125|0\\.488',
            reply: ['对，$1-\\dfrac{64}{125}=\\dfrac{61}{125}$。每个号码地位相同，“至少出现一次”的概率都是 $\\dfrac{61}{125}$。'],
            next: 's4',
          },
        ],
        partial: [
          { regex: '^64\\s*/\\s*125$', reply: ['$\\dfrac{64}{125}$ 是“一次都没出现”的概率；题目要的是“至少出现一次”，用补事件 $1-\\dfrac{64}{125}$。'] },
        ],
        hint: '补事件：$P(\\text{至少一次})=1-P(\\text{一次都没有})=1-\\dfrac{64}{125}$。',
      },
      {
        id: 's4',
        ask: '设 $I_i$ 表示第 $i$ 号球“至少出现一次”，则 $E(I_i)=\\dfrac{61}{125}$。$X$ 与这些 $I_i$ 是什么关系？$E(X)=$？',
        ui: 'fill',
        placeholder: '写出 E(X) 的最终值（分数或小数）',
        accept: [
          {
            kind: 'correct',
            regex: '61\\s*/\\s*25|2\\.44|305\\s*/\\s*125|5\\s*\\*?\\s*\\(?\\s*1\\s*-\\s*\\(?\\s*4/5',
            reply: ['完全正确：$X=\\sum_{i=1}^{5}I_i$，由期望线性性 $E(X)=5\\times\\dfrac{61}{125}=\\dfrac{61}{25}=2.44$。'],
            next: 'final',
          },
          {
            kind: 'wrong',
            regex: '^\\s*3\\s*$',
            reply: ['$3$ 是“无放回”的答案（那样三次必取到三个不同号码）。本题是**有放回**，三次可能重复，$X$ 可以是 1、2、3。回到期望的计算。'],
            next: null,
          },
          {
            kind: 'wrong',
            regex: '61\\s*/\\s*125',
            reply: ['$\\dfrac{61}{125}$ 只是一个号码的期望 $E(I_i)$。$X$ 是 5 个号码的指示变量之和，要把 5 个期望加起来。'],
            next: null,
          },
          {
            kind: 'wrong',
            regex: '183\\s*/\\s*125',
            reply: ['系数用错了：指示变量的个数是 5 个球，不是抽取次数 3 次。$E(X)=5\\times\\dfrac{61}{125}$。'],
            next: null,
          },
          {
            kind: 'wrong',
            regex: '69\\s*/\\s*25',
            reply: ['$\\dfrac{69}{25}$ 常见于把 $P(X=2)$ 算成 $C_5^2\\cdot 2^3/125=80/125$：那会把三次全同（如 2、2、2）重复算进 X=2，实际这些属于 $X=1$，应扣掉 2 种。正确值 $\\dfrac{61}{25}$。'],
            next: null,
          },
        ],
        hint: '$X=I_1+I_2+\\cdots+I_5$，期望有线性性：$E(X)=5E(I_1)=5\\times\\dfrac{61}{125}$。',
      },
    ],
    final: {
      title: 'C · 结论：$E(X)=\\dfrac{61}{25}=2.44$',
      lines: [
        '① 设 $I_i$ 表示第 $i$ 号球在三次中至少出现一次；',
        '② $P(I_i=1)=1-\\left(\\dfrac{4}{5}\\right)^3=1-\\dfrac{64}{125}=\\dfrac{61}{125}$；',
        '③ $X=\\sum_{i=1}^{5}I_i$，由期望线性性（不要求独立）：',
        '④ $E(X)=5\\times\\dfrac{61}{125}=\\dfrac{61}{25}=2.44$。',
      ],
      keyPoint: '指示变量 + 期望线性性。$X$ 是不同号码种数（1~3），期望可以有小数；别把“一个号码的概率”当成最终答案。',
    },
    variants: [
      {
        id: 'C-v1',
        title: '变式：无放回取三次',
        question: '同箱子中**无放回**取三次，记至少取出一次的球的个数为 $X$，则 $E(X)=$？',
        type: 'fill',
        answer: '3',
        accepts: ['3'],
        solution: '无放回取三次必然取到三个不同号码，$X\\equiv 3$，故 $E(X)=3$。',
      },
      {
        id: 'C-v2',
        title: '变式：放宽到至少取 4 次',
        question: '同箱子中有放回取 4 次，记至少取出一次的球的个数为 $X$，则 $E(X)=$？',
        type: 'fill',
        answer: '\\dfrac{369}{125}',
        accepts: ['369/125', '2.952', '2.95'],
        solution: '$P(I_i=1)=1-\\left(\\dfrac{4}{5}\\right)^4=1-\\dfrac{256}{625}=\\dfrac{369}{625}$，故 $E(X)=5\\cdot\\dfrac{369}{625}=\\dfrac{369}{125}=2.952$。',
      },
    ],
  },
]

export function findGuidanceCase(id) {
  return guidanceCases.find((c) => c.id === id) || null
}
