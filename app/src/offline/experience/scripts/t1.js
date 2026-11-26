/**
 * 题1 · 双曲线离心率（答案 D，2√2）的四个体验脚本。
 * 脚本只描述「用户预填什么、AI 回什么、哪一步要判分」；渲染仍走真实 Socratic* 卡。
 */

const SID = 'exp-t1-guided'

const ix = (form, spec, extra = {}) => ({
  card_type: 'socratic_interaction',
  session_id: SID,
  form,
  spec,
  allow_text_fallback: true,
  allow_skip: true,
  ...extra,
})

const choice = (options, extra = {}) => ({
  card_type: 'socratic_step_choice',
  session_id: SID,
  options,
  single_issue: false,
  kind: 'choice',
  ...extra,
})

const complete = {
  card_type: 'socratic_complete',
  session_id: SID,
  outcome: 'guided',
  final_answer: '$e=2\\sqrt{2}$，选 D。',
  verified: true,
  difficulty: 'medium',
  steps: [
    { assertion: '由 $2b=\\sqrt7\\cdot2a$ 得 $\\frac{b}{a}=\\sqrt7$。', reason: '把两条轴的倍数关系先化成比值。' },
    { assertion: '$c^2=a^2+b^2=8a^2$。', reason: '双曲线中 $c$ 是焦点到中心的距离，满足勾股关系。' },
    { assertion: '$e=\\frac{c}{a}=2\\sqrt2$。', reason: '离心率是焦距与实轴长之比，$e>0$。' },
  ],
  hint_stats: { total: 0, answer_requests: 0 },
}

const trace = {
  card_type: 'knowledge_trace',
  session_id: SID,
  title: '知识追溯 · 这道题用了 4 个知识点',
  summary: '先把轴比化成 b/a，再用 c²=a²+b² 搭桥，最后回到 e=c/a。',
  nodes: [
    { id: 'given', label: '已知', detail: '2b=√7·2a', state: 'pass', action: '一次过' },
    { id: 'ratio', label: '化简', detail: 'b/a=√7', state: 'pass', action: '一次过' },
    { id: 'bridge', label: '桥梁', detail: 'c²=a²+b²', state: 'stuck', action: '提示 1 次' },
    { id: 'target', label: '目标', detail: 'e=c/a=2√2', state: 'pass', action: '订正后通过' },
  ],
}

export default {
  'exp-t1-qa': {
    exchanges: [
      {
        user: { text: '我知道 e=c/a，但为什么不是 b/a？这两条轴的比例和离心率到底什么关系？', attachment: 't1' },
        ai: {
          text: '先把 $e$ 的定义放稳：$e=\\frac{c}{a}$，其中 $c$ 是焦点到中心的距离，$a$ 是实半轴长。$b$ 是虚半轴长，$\\frac{b}{a}$ 描述的是两条轴的比，不是焦距与实轴长的比。\n\n双曲线里 $a,b,c$ 满足 $c^2=a^2+b^2$。两边同除以 $a^2$，就得到 $e^2=1+\\left(\\frac{b}{a}\\right)^2$。所以 $\\frac{b}{a}$ 不是 $e$，它是 $e$ 的“原料”。',
        },
      },
      {
        user: { text: '所以 b/a 越大，e 越大？b/a=√7 时 e 是多少？' },
        ai: {
          text: '对。$e^2=1+\\left(\\frac{b}{a}\\right)^2$，$\\frac{b}{a}$ 越大，$e$ 越大，双曲线的开口也越“张”。\n\n本题 $\\frac{b}{a}=\\sqrt7$，所以 $e^2=1+7=8$，$e=2\\sqrt2$。注意 $e>1$ 恒成立；如果算出来小于 1，一定是把椭圆和双曲线的 $a,b,c$ 关系弄反了。',
        },
      },
      {
        user: { text: '那椭圆的 e 为什么小于 1？' },
        ai: {
          text: '椭圆里 $a$ 最长，满足 $a^2=b^2+c^2$，所以 $e=\\frac{c}{a}<1$。双曲线里 $c$ 最长，满足 $c^2=a^2+b^2$，所以 $e>1$。\n\n一句话：看谁最长。椭圆 $a$ 最长，双曲线 $c$ 最长。',
        },
      },
    ],
  },

  'exp-t1-error': {
    exchanges: [
      {
        user: { text: '这道题我选了 C（√7），但答案是 D。帮我看看错在哪。', attachment: 't1' },
        ai: {
          text: '你的首答是 C（√7）。$\\sqrt7$ 在这道题里是 $\\frac{b}{a}$，不是 $e$。\n\n题目给的是“虚轴长是实轴长的 $\\sqrt7$ 倍”，即 $2b=\\sqrt7\\cdot2a$，约掉 2 得 $\\frac{b}{a}=\\sqrt7$。离心率是 $e=\\frac{c}{a}$，还要经过 $c^2=a^2+b^2$ 这一步。',
        },
      },
      {
        user: { text: '所以应该先平方再加 1？' },
        ai: {
          text: '对。$e^2=1+\\left(\\frac{b}{a}\\right)^2=1+7=8$，所以 $e=2\\sqrt2$，选 D。\n\n你错在把“两条轴的比例”直接当成了“焦距与实轴的比例”。这两个比长得很像，但定义不同。',
        },
      },
      {
        user: { text: '帮我记到错题本，下次别再犯。' },
        ai: {
          text: '已记录：首答 C（√7），订正 D（$2\\sqrt2$），错因是“把 $\\frac{b}{a}$ 当成了 $e$”。\n\n下次看到轴长倍数，先写成 $\\frac{b}{a}$，再问自己一句：这是 $e$ 还是 $e$ 的原料？',
          cards: [
            {
              card_type: 'showcase_stage',
              variant: 'summary',
              stage: '错题复盘',
              title: '记进错题本',
              question: '若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为（ ）',
              first: 'C',
              fixed: 'D',
              reason: '把两条轴的比当成了离心率：√7 = b/a，而 e = c/a。',
              options: [
                { id: 'a', label: '√2' },
                { id: 'b', label: '2' },
                { id: 'c', label: '√7' },
                { id: 'd', label: '2√2' },
              ],
              corrected: true,
              readonly: true,
              chosen: 'c',
            },
          ],
        },
      },
    ],
    onComplete: 'error:t1',
  },

  'exp-t1-variant': {
    exchanges: [
      {
        user: { text: '就这道双曲线题，我想把“轴比、离心率、换轴”三种问法都练一遍。', attachment: 't1' },
        ai: {
          text: '好，三问都围绕同一道题。\n\n第 1 问：由 $2b=\\sqrt7\\cdot2a$，$\\frac{b}{a}$ 等于多少？',
          cards: [choice(['√7', '7', '1/√7'])],
        },
      },
      {
        user: { text: 'b/a = √7' },
        ai: {
          text: '对，约掉 2 就得到 $\\frac{b}{a}=\\sqrt7$。\n\n第 2 问：这条双曲线的离心率 $e$ 等于多少？',
          cards: [choice(['√2', '2', '√7', '2√2'])],
        },
      },
      {
        user: { text: '2√2' },
        ai: {
          text: '对，$e^2=1+7=8$，$e=2\\sqrt2$。\n\n第 3 问：如果把实轴和虚轴对调，$\\frac{b}{a}$ 变成 $\\frac{1}{\\sqrt7}$，离心率会变大还是变小？',
          cards: [choice(['变大', '变小', '不变'])],
        },
      },
      {
        user: { text: '变小' },
        ai: {
          text: '对。对调后 $\\frac{b}{a}=\\frac{1}{\\sqrt7}$，$e=\\sqrt{1+\\frac17}=\\frac{2\\sqrt{14}}{7}<2\\sqrt2$。\n\n三问小结：轴比先化成 $\\frac{b}{a}$，再用 $e^2=1+\\left(\\frac{b}{a}\\right)^2$；换轴时 $\\frac{b}{a}$ 取倒数，$e$ 随之变小。',
          cards: [complete],
        },
      },
    ],
  },

  'exp-t1-guided': {
    exchanges: [
      {
        user: { text: '这道双曲线的题，我知道虚轴长是实轴长的 √7 倍，但不知道怎么用它求离心率。能一步一步带我吗？', attachment: 't1' },
        ai: {
          text: '先别急着套公式。第 1 步只看两条轴：题目说“虚轴长是实轴长的 $\\sqrt7$ 倍”，也就是 $2b=\\sqrt7\\cdot2a$。把 2 约掉，能得到什么？',
          figures: [
            {
              step_no: 1,
              caption: '双曲线的实轴、虚轴与渐近线；观察 2a 与 2b 的比例',
              figure_params: {
                type: 'conic',
                params: {
                  curve: 'hyperbola',
                  axis: 'x',
                  a: 1,
                  b: Math.sqrt(7),
                  focal: Math.sqrt(8),
                  points: [{ label: 'M', _t: 55 }],
                },
              },
            },
          ],
          cards: [
            ix('binary', {
              question: '由 $2b=\\sqrt7\\cdot2a$，下列哪个关系成立？',
              options: [
                { id: 'a', label: '$\\frac{b}{a}=\\sqrt7$' },
                { id: 'b', label: '$\\frac{b}{a}=7$' },
                { id: 'c', label: '$\\frac{a}{b}=\\sqrt7$' },
              ],
            }, { step_no: 1, stage: 'planning', prompt_lead: '先看两轴的比例：把 2 约掉。' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['a'],
            step: 1,
            progress: 1,
            total: 3,
            kpName: '双曲线的离心率',
            correctText: '对，$2b=\\sqrt7\\cdot2a$，约掉 2 得 $\\frac{b}{a}=\\sqrt7$。第 1 步完成。',
            wrongText: '再把 2 约掉看看：$2b$ 和 $\\sqrt7\\cdot2a$ 里的 2 可以先消掉。',
            hintText: '两边同时除以 $2a$，左边就是 $\\frac{b}{a}$。',
            misconception: 'calculation',
            misconceptionZh: '计算错误',
          },
        },
      },
      {
        user: { text: 'b/a = √7。接下来怎么把它变成 e？' },
        ai: {
          text: '第 2 步搭桥。双曲线里 $c^2=a^2+b^2$；把 $b^2=7a^2$ 代进去，就能把 $c$ 写成 $a$ 的倍数。\n\n把下面两个空补上。',
          cards: [
            ix('cloze', {
              body_latex: '双曲线中 $c^2=$ $□_1$；代入 $b^2=7a^2$，得到 $c^2=$ $□_2$。',
              blanks: [{ id: 'b1', answer_kind: 'formula' }, { id: 'b2', answer_kind: 'formula' }],
              palette_by_blank: {
                b1: ['$a^2+b^2$', '$a^2-b^2$', '$b^2-a^2$'],
                b2: ['$8a^2$', '$7a^2$', '$6a^2$'],
              },
            }, { step_no: 2, stage: 'planning', prompt_lead: '用面板填空，把 c² 写成 a² 的倍数。' }),
          ],
          check: {
            form: 'cloze',
            cardIndex: 0,
            accept: { b1: ['$a^2+b^2$', 'a^2+b^2'], b2: ['$8a^2$', '8a^2'] },
            step: 2,
            progress: 2,
            total: 3,
            kpName: '双曲线的离心率',
            correctText: '对：$c^2=a^2+b^2=a^2+7a^2=8a^2$。第 2 步完成。',
            wrongText: '先确认用的是双曲线的关系：$c^2=a^2+b^2$，不是减号。',
            hintText: '$b^2=7a^2$，所以 $a^2+b^2=a^2+7a^2$。',
            misconception: 'formula',
            misconceptionZh: '公式混淆',
          },
        },
      },
      {
        user: { text: 'c²=8a²，所以 e=c/a=2√2。' },
        ai: {
          text: '最后一步回扣选项。由 $c^2=8a^2$，$e=\\frac{c}{a}=\\sqrt8=2\\sqrt2$。四个选项里应该选哪一个？',
          cards: [
            ix('binary', {
              question: '这条双曲线的离心率是？',
              options: [
                { id: 'a', label: '$\\sqrt2$' },
                { id: 'b', label: '$2$' },
                { id: 'c', label: '$\\sqrt7$' },
                { id: 'd', label: '$2\\sqrt2$' },
              ],
            }, { step_no: 3, stage: 'reflecting', prompt_lead: '回扣题目：e 等于 c/a，别再把 b/a 当成 e。' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['d'],
            step: 3,
            progress: 3,
            total: 3,
            kpName: '双曲线的离心率',
            correctText: '对，选 D（$2\\sqrt2$）。这道题的关键不是算 $a,b,c$ 的具体值，而是把 $\\frac{b}{a}$ 翻译成 $e$。',
            wrongText: '再回到定义：$e=\\frac{c}{a}$，而 $\\frac{b}{a}=\\sqrt7$ 只是原料。',
            hintText: '$c^2=8a^2$，所以 $c=2\\sqrt2\\,a$。',
            misconception: 'concept',
            misconceptionZh: '把轴比当离心率',
            correctCards: [complete, trace],
          },
        },
      },
    ],
  },
}
