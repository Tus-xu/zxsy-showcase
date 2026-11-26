/**
 * 题3 · 有放回取球的期望（答案 61/25）。
 * X 是“至少取出一次的球的个数”，不是成功次数；用 5 个 0/1 指示变量求和。
 */

const SID = 'exp-t3-guided'

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
  final_answer: '$E(X)=\\frac{61}{25}$。',
  verified: true,
  difficulty: 'medium',
  steps: [
    { assertion: '设 $I_i$ 表示第 $i$ 个球至少出现一次，$X=I_1+\\cdots+I_5$。', reason: '把“不同球数”拆成 5 个 0/1 变量。' },
    { assertion: '$P(I_i=1)=1-\\left(\\frac45\\right)^3=\\frac{61}{125}$。', reason: '三次都没取到第 $i$ 个球的概率是 $(4/5)^3$。' },
    { assertion: '$E(X)=5\\times\\frac{61}{125}=\\frac{61}{25}$。', reason: '期望的线性性，逐个相加即可。' },
  ],
  hint_stats: { total: 0, answer_requests: 0 },
}

const trace = {
  card_type: 'knowledge_trace',
  session_id: SID,
  title: '知识追溯 · 这道题用了 4 个知识点',
  summary: '先定义 X 的指示变量，再算单个球至少出现一次的概率，最后用期望线性性求和。',
  nodes: [
    { id: 'define', label: '定义', detail: 'X=ΣI_i，5 个 0/1', state: 'pass', action: '一次过' },
    { id: 'single', label: '单个概率', detail: '1−(4/5)³=61/125', state: 'stuck', action: '提示 1 次' },
    { id: 'sum', label: '求和', detail: '5×61/125', state: 'pass', action: '一次过' },
    { id: 'answer', label: '结果', detail: '61/25', state: 'pass', action: '订正后通过' },
  ],
}

export default {
  'exp-t3-qa': {
    exchanges: [
      {
        user: { text: 'X 是“至少取出一次的球的个数”，为什么不能直接用二项分布？', attachment: 't3' },
        ai: {
          text: '二项分布数的是“同一种结果出现了几次”，比如三次里取到 1 号球几次。这里 $X$ 数的是“有多少个不同的球至少出现一次”，每只球只贡献 0 或 1，不是三次独立试验的成功次数。\n\n所以不能直接套 $B(3,1/5)$。更稳的办法是给每只球设一个指示变量。',
        },
      },
      {
        user: { text: '那怎么算？' },
        ai: {
          text: '设 $I_i$ 表示第 $i$ 个球至少出现一次，$I_i\\in\\{0,1\\}$。那么\n\n$$X=I_1+I_2+\\cdots+I_5$$\n\n期望有线性性，所以 $E(X)=E(I_1)+\\cdots+E(I_5)$，只要求出一个 $E(I_i)$ 就行。',
        },
      },
      {
        user: { text: '每个 I_i 的概率是多少？' },
        ai: {
          text: '第 $i$ 个球三次都没被取到的概率是 $\\left(\\frac45\\right)^3=\\frac{64}{125}$，所以至少出现一次的概率是 $1-\\frac{64}{125}=\\frac{61}{125}$。\n\n于是 $E(X)=5\\times\\frac{61}{125}=\\frac{61}{25}\\approx2.44$。这个数在 1 到 3 之间，合理。',
        },
      },
    ],
  },

  'exp-t3-error': {
    exchanges: [
      {
        user: { text: '我算的是 3×1/5=3/5，为什么不对？', attachment: 't3' },
        ai: {
          text: '$3\\times\\frac15=\\frac35$ 算的是“三次里取到某一个指定球”的期望次数，不是“不同球的个数”。$X$ 最小是 1（三次都取同一个球），最大是 3（三次都不同），$\\frac35$ 连范围都不对。\n\n你把它当成了成功次数，而不是不同球数。',
        },
      },
      {
        user: { text: '所以要用指示变量？' },
        ai: {
          text: '对。每只球“至少出现一次”的概率是 $1-\\left(\\frac45\\right)^3=\\frac{61}{125}$，5 只球相加就是 $\\frac{61}{25}$。\n\n关键区别：二项分布数“同一结果出现几次”，指示变量数“每只球有没有出现”。',
        },
      },
      {
        user: { text: '帮我记到错题本。' },
        ai: {
          text: '已记录：首答 $\\frac35$，订正 $\\frac{61}{25}$，错因是“把不同球数当成了成功次数”。\n\n下次先看 $X$ 的取值范围：如果答案不在合理范围内，公式一定用错了。',
          cards: [
            {
              card_type: 'showcase_stage',
              variant: 'summary',
              stage: '错题复盘',
              title: '记进错题本',
              question: '箱子里有 5 个球，标号 1–5，有放回取三次，记至少取出一次的球的个数 X，则 E(X)=____。',
              first: '3/5',
              fixed: '61/25',
              reason: '把“不同球数”当成了二项分布的成功次数。',
              options: [],
              corrected: true,
              readonly: true,
            },
          ],
        },
      },
    ],
    onComplete: 'error:t3',
  },

  'exp-t3-variant': {
    exchanges: [
      {
        user: { text: '有放回、无放回、方差，三种问法都练一遍。', attachment: 't3' },
        ai: {
          text: '第 1 问：有放回取三次，恰好取出两个不同球的概率是多少？',
          cards: [choice(['12/25', '3/5', '6/25', '1/5'])],
        },
      },
      {
        user: { text: '12/25' },
        ai: {
          text: '对。先选两个球 $\\binom52=10$，三次里两个都出现有 $2^3-2=6$ 种，所以 $\\frac{10\\times6}{125}=\\frac{12}{25}$。\n\n第 2 问：无放回取三次，$X$ 等于多少？',
          cards: [choice(['1', '2', '3', '3.5'])],
        },
      },
      {
        user: { text: '3' },
        ai: {
          text: '对，无放回时三次一定取出三个不同的球，$X=3$ 是常数。\n\n第 3 问：有放回时，$\\operatorname{Var}(X)$ 与 $E(X)$ 相等吗？',
          cards: [choice(['相等', '不相等', '无法判断'])],
        },
      },
      {
        user: { text: '不相等' },
        ai: {
          text: '对。$X$ 不是二项分布，方差不能套 $np(1-p)$。这题 $E(X)=\\frac{61}{25}$，$\\operatorname{Var}(X)=\\frac{204}{625}$，并不相等（拓展，不要求背）。\n\n三问小结：先判断“数什么”，再决定用二项分布还是指示变量。',
          cards: [complete],
        },
      },
    ],
  },

  'exp-t3-guided': {
    exchanges: [
      {
        user: { text: '这道期望题我知道答案大概在 2 到 3 之间，但不知道怎么列式。能一步一步带我吗？', attachment: 't3' },
        ai: {
          text: '第 1 步先把 $X$ 拆开。$X$ 是“至少取出一次的球的个数”，对每只球设一个指示变量 $I_i$（出现记 1，不出现记 0）。5 只球一共要设几个指示变量？',
          cards: [
            ix('binary', {
              question: '$X$ 可以拆成几个 0/1 指示变量相加？',
              options: [
                { id: 'a', label: '3 个' },
                { id: 'b', label: '5 个' },
                { id: 'c', label: '15 个' },
              ],
            }, { step_no: 1, stage: 'planning', prompt_lead: '每只球一个 0/1 变量。' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['b'],
            step: 1,
            progress: 1,
            total: 3,
            kpName: '离散型随机变量的期望',
            correctText: '对，5 只球对应 5 个指示变量：$X=I_1+\\cdots+I_5$。',
            wrongText: '再数一数：箱子里有几只球，每只球对应一个 0/1 变量。',
            hintText: '球标号 1–5，一共 5 只。',
            misconception: 'concept',
            misconceptionZh: '指示变量含义不清',
          },
        },
      },
      {
        user: { text: '5 个。接下来算每个 I_i 的概率？' },
        ai: {
          text: '第 2 步算单个概率。三次都没取到第 $i$ 只球的概率是 $\\left(\\frac{4}{5}\\right)^3$，所以至少出现一次的概率是 $1-\\left(\\frac{4}{5}\\right)^3$。\n\n把式子补完整：$P(I_i=1)=1-\\left(\\frac{□}{5}\\right)^3$。',
          cards: [
            ix('cloze', {
              body_latex: '三次都没取到第 $i$ 个球：$P(I_i=1)=1-\\left(\\frac{□_1}{5}\\right)^3$。',
              blanks: [{ id: 'b1', answer_kind: 'number' }],
              palette_by_blank: { b1: ['4', '5', '3'] },
            }, { step_no: 2, stage: 'planning', prompt_lead: '用面板填“没取到这个球”的可能数。' }),
          ],
          check: {
            form: 'cloze',
            cardIndex: 0,
            accept: { b1: ['4', '4/5'] },
            step: 2,
            progress: 2,
            total: 3,
            kpName: '离散型随机变量的期望',
            correctText: '对：每次没取到它的概率是 $\\frac45$，三次都避开就是 $\\left(\\frac45\\right)^3=\\frac{64}{125}$，所以 $P(I_i=1)=\\frac{61}{125}$。',
            wrongText: '注意分子：没取到第 $i$ 个球时，可取的是另外几只？',
            hintText: '5 只球里，避开 1 只，还剩 4 只。',
            misconception: 'calculation',
            misconceptionZh: '对立事件概率算错',
          },
        },
      },
      {
        user: { text: '所以每个概率是 61/125，5 个相加就是 61/25。' },
        ai: {
          text: '最后一步求和。$E(X)=5\\times P(I_i=1)=5\\times\\frac{61}{125}$。分子上的数是？',
          cards: [
            ix('cloze', {
              body_latex: '$E(X)=5\\times\\frac{□_1}{125}=\\frac{61}{25}$。',
              blanks: [{ id: 'b1', answer_kind: 'number' }],
              palette_by_blank: { b1: ['61', '64', '125'] },
            }, { step_no: 3, stage: 'reflecting', prompt_lead: '把 5×61 算出来。' }),
          ],
          check: {
            form: 'cloze',
            cardIndex: 0,
            accept: { b1: ['61'] },
            step: 3,
            progress: 3,
            total: 3,
            kpName: '离散型随机变量的期望',
            correctText: '对，$5\\times61=305$，$\\frac{305}{125}=\\frac{61}{25}\\approx2.44$。',
            wrongText: '这里要填的是 $5\\times61$ 的分子，不是 $125$。',
            hintText: '先算 $5\\times61$，再约分。',
            misconception: 'calculation',
            misconceptionZh: '计算错误',
            correctCards: [complete, trace],
          },
        },
      },
    ],
  },
}
