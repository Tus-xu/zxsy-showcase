/**
 * 题2 · 正三棱柱线面关系。
 * 数学事实：B 成立；D 在当前条件下也成立。若原题是单选，命题有瑕疵——文案必须如实说明，
 * 不把 D 说成错。演示里用「B（D 亦成立）」而不是硬编一个错误答案。
 */

const SID = 'exp-t2-guided'

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
  final_answer: 'B（若为单选，D 也成立，原题可能有瑕疵）。',
  verified: true,
  difficulty: 'medium',
  steps: [
    { assertion: '平面 $AA_1D$ 内取两条相交直线 $AD$ 与 $AA_1$。', reason: '线面垂直判定需要平面内两条相交直线。' },
    { assertion: '$BC\\perp AD$，$BC\\perp AA_1$。', reason: '等边三角形中线垂直底边；正三棱柱侧棱垂直底面。' },
    { assertion: '所以 $BC\\perp$ 平面 $AA_1D$，选 B。', reason: '$BC$ 垂直于平面内两条相交直线。' },
  ],
  hint_stats: { total: 0, answer_requests: 0 },
}

const trace = {
  card_type: 'knowledge_trace',
  session_id: SID,
  title: '知识追溯 · 这道题用了 4 个知识点',
  summary: '先在平面内找两条相交线，再分别证垂直，最后回扣选项；D 也成立，是命题瑕疵。',
  nodes: [
    { id: 'plane', label: '找平面', detail: 'AA₁D 内取 AD、AA₁', state: 'pass', action: '一次过' },
    { id: 'median', label: '中线', detail: 'BC⊥AD', state: 'pass', action: '一次过' },
    { id: 'edge', label: '侧棱', detail: 'BC⊥AA₁', state: 'stuck', action: '提示 1 次' },
    { id: 'answer', label: '回扣', detail: 'B；D 亦成立', state: 'pass', action: '订正后通过' },
  ],
}

export default {
  'exp-t2-qa': {
    exchanges: [
      {
        user: { text: '线面垂直到底要证几条线？为什么 BC 能垂直于整个平面 AA₁D？', attachment: 't2' },
        ai: {
          text: '判定定理只有一句：一条直线与平面内两条相交直线都垂直，它就垂直于这个平面。\n\n要证 $BC\\perp$ 平面 $AA_1D$，就在这个平面里找两条相交直线。最顺手的是 $AD$ 和 $AA_1$：它们都过点 $A$，是相交直线。',
        },
      },
      {
        user: { text: 'BC⊥AD 我懂，BC⊥AA₁ 为什么？' },
        ai: {
          text: '因为这是正三棱柱。正三棱柱的侧棱垂直于底面，所以 $AA_1\\perp$ 底面 $ABC$。$BC$ 在底面内，所以 $AA_1\\perp BC$。\n\n再加上等边三角形 $ABC$ 中 $D$ 是 $BC$ 中点，$AD$ 是中线也是高，所以 $AD\\perp BC$。两条都成立，$BC$ 就垂直于平面 $AA_1D$。',
        },
      },
      {
        user: { text: '那 D 选项 CC₁∥平面 AA₁D 呢？' },
        ai: {
          text: '这一项其实也成立：$CC_1\\parallel AA_1$，而 $AA_1$ 在平面 $AA_1D$ 内，$CC_1$ 又不在这个平面内，所以 $CC_1\\parallel$ 平面 $AA_1D$。\n\n所以如果原题是单选，B、D 都成立，命题本身可能有瑕疵。考试里遇到这种情况，优先选教材判定定理直接推出的 B；但不要把 D 说成错的。',
        },
      },
    ],
  },

  'exp-t2-error': {
    exchanges: [
      {
        user: { text: '我选了 A，觉得 AD 和 A₁C 看起来垂直。为什么不对？', attachment: 't2' },
        ai: {
          text: '问题在于 $AD$ 和 $A_1C$ 是异面直线：$AD$ 在底面内，$A_1C$ 是斜线，它们并不相交。“看起来垂直”不是证明，异面直线也不适用平面内两条相交直线的判定。\n\n要证线面垂直，得在平面 $AA_1D$ 里找两条相交直线，分别证 $BC$ 与它们垂直。',
        },
      },
      {
        user: { text: '所以应该找 BC？' },
        ai: {
          text: '对。$BC\\perp AD$（等边三角形中线），$BC\\perp AA_1$（侧棱垂直底面），且 $AD$ 与 $AA_1$ 相交于 $A$，所以 $BC\\perp$ 平面 $AA_1D$，选 B。\n\n顺带说一句：D 也成立（$CC_1\\parallel AA_1$），原题若为单选就有瑕疵。',
        },
      },
      {
        user: { text: '帮我记到错题本。' },
        ai: {
          text: '已记录：首答 A（把异面直线当成相交），订正 B；备注里保留“D 也成立、原题可能有瑕疵”。\n\n下次先问：这两条线在不在同一个平面里？不在，就不能直接用平面几何的“垂直”。',
          cards: [
            {
              card_type: 'showcase_stage',
              variant: 'summary',
              stage: '错题复盘',
              title: '记进错题本',
              question: '正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点，则（ ）',
              first: 'A',
              fixed: 'B',
              reason: '把异面直线 AD 与 A₁C 当成相交直线；线面垂直要找平面内两条相交直线。',
              options: [
                { id: 'a', label: 'AD⊥A₁C' },
                { id: 'b', label: 'BC⊥平面 AA₁D' },
                { id: 'c', label: 'AD∥A₁B₁' },
                { id: 'd', label: 'CC₁∥平面 AA₁D' },
              ],
              corrected: true,
              readonly: true,
              chosen: 'a',
            },
          ],
        },
      },
    ],
    onComplete: 'error:t2',
  },

  'exp-t2-variant': {
    exchanges: [
      {
        user: { text: '换中点、换棱柱、换结论，三种问法都练一遍。', attachment: 't2' },
        ai: {
          text: '第 1 问：在正三棱柱 $ABC-A_1B_1C_1$ 中，$D$ 为 $BC$ 中点，下列哪条直线垂直于平面 $AA_1D$？',
          cards: [choice(['BC', 'AD', 'CC₁', 'A₁B₁'])],
        },
      },
      {
        user: { text: 'BC' },
        ai: {
          text: '对。第 2 问：若 $E$ 为 $A_1C_1$ 中点，直线 $DE$ 与平面 $BCC_1B_1$ 是什么关系？',
          cards: [choice(['平行', '相交', '垂直', '在平面内'])],
        },
      },
      {
        user: { text: '相交' },
        ai: {
          text: '对，$DE$ 与平面 $BCC_1B_1$ 相交于点 $D$（$E$ 不在该平面内）。\n\n第 3 问：如果把“正三棱柱”改成“正三棱锥”，B 选项还成立吗？',
          cards: [choice(['仍成立', '不成立'])],
        },
      },
      {
        user: { text: '不成立' },
        ai: {
          text: '对。正三棱锥的侧棱不垂直于底面，$BC\\perp AA_1$ 这一步就断了。\n\n三问小结：线面垂直的关键是“平面内两条相交直线”；换几何体时，先检查侧棱是否还垂直底面。',
          cards: [complete],
        },
      },
    ],
  },

  'exp-t2-guided': {
    exchanges: [
      {
        user: { text: '这道正三棱柱的题，我知道要找线面垂直，但不知道从哪两条线下手。能一步一步带我吗？', attachment: 't2' },
        ai: {
          text: '第 1 步先找平面。要证 $BC\\perp$ 平面 $AA_1D$，就在这个平面里找两条相交直线。哪一组最适合用来和 $BC$ 证垂直？',
          figures: [
            {
              step_no: 1,
              caption: '正三棱柱 ABC-A₁B₁C₁，D 为 BC 中点；先看平面 AA₁D 内的两条相交直线',
              solid: {
                grid: true,
                axes: true,
                solids: [
                  {
                    kind: 'prism',
                    color: '#4f46e5',
                    opacity: 0.16,
                    bottom: [[-1.5, 0, -1], [1.5, 0, -1], [0, 0, 1.8]],
                    top: [[-1.5, 3, -1], [1.5, 3, -1], [0, 3, 1.8]],
                  },
                ],
              },
            },
          ],
          cards: [
            ix('binary', {
              question: '平面 $AA_1D$ 内，哪一组相交直线最适合与 $BC$ 证垂直？',
              options: [
                { id: 'a', label: '$AD$ 与 $AA_1$' },
                { id: 'b', label: '$AD$ 与 $A_1D$' },
                { id: 'c', label: '$AA_1$ 与 $A_1D$' },
              ],
            }, { step_no: 1, stage: 'planning', prompt_lead: '先看平面 $AA_1D$：要证 $BC\\perp$ 平面，平面里需要几条线？它们必须是什么位置关系？先想清楚再选。' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['a'],
            step: 1,
            progress: 1,
            total: 3,
            kpName: '线面垂直的判定',
            correctText: '对，$AD$ 与 $AA_1$ 都过点 $A$，是平面 $AA_1D$ 内的相交直线。',
            wrongText: '这三组都相交，但我们要找的是能和 $BC$ 直接证垂直的那一组。',
            bridgeText: '下一步先在心里过一遍判定定理：线面垂直需要平面内两条相交直线。下一句已经放在输入框里，想好再发送。',
            hintText: '$AD$ 在底面内，$AA_1$ 是侧棱；它们都过点 $A$。',
            misconception: 'concept',
            misconceptionZh: '判定定理条件不清',
          },
        },
      },
      {
        user: { text: '选 AD 与 AA₁。接下来分别证什么？我想先找等边三角形和侧棱的依据。' },
        ai: {
          text: '第 2 步分别证垂直。$BC\\perp AD$ 来自等边三角形的中线；$BC\\perp AA_1$ 来自正三棱柱的侧棱垂直底面。这两个结论都成立吗？',
          cards: [
            ix('binary', {
              question: '$BC\\perp AD$ 且 $BC\\perp AA_1$，这两个结论都成立吗？',
              options: [
                { id: 'a', label: '都成立' },
                { id: 'b', label: '只有 $BC\\perp AD$ 成立' },
                { id: 'c', label: '只有 $BC\\perp AA_1$ 成立' },
              ],
            }, { step_no: 2, stage: 'planning', prompt_lead: '你选了 $AD$ 和 $AA_1$。接下来分别找依据：等边三角形的中线为什么垂直底边？正三棱柱的侧棱和底面是什么关系？' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['a'],
            step: 2,
            progress: 2,
            total: 3,
            kpName: '线面垂直的判定',
            correctText: '对：等边三角形中线垂直底边；正三棱柱侧棱垂直底面，$BC$ 在底面内。',
            wrongText: '再想想正三棱柱的定义：侧棱和底面是什么关系？',
            bridgeText: '下一步把两个垂直的依据各用一句话说出来；下一句已经放在输入框里。',
            hintText: '正三棱柱的侧棱垂直于底面；等边三角形的中线也是高。',
            misconception: 'concept',
            misconceptionZh: '正棱柱性质不清',
            review: { id: 'line-plane-perpendicular', title: '回到「线面垂直」补一补', hint: '约 2 分钟 · 判定定理与两条相交直线' },
          },
        },
      },
      {
        user: { text: '两个都成立，所以 BC 垂直于平面 AA₁D，选 B。' },
        ai: {
          text: '最后一步回扣选项。$BC$ 垂直于平面内两条相交直线，所以 $BC\\perp$ 平面 $AA_1D$。选哪一项？',
          cards: [
            ix('binary', {
              question: '因此正确选项是？',
              options: [
                { id: 'a', label: 'A · $AD\\perp A_1C$' },
                { id: 'b', label: 'B · $BC\\perp$ 平面 $AA_1D$' },
                { id: 'c', label: 'C · $AD\\parallel A_1B_1$' },
                { id: 'd', label: 'D · $CC_1\\parallel$ 平面 $AA_1D$' },
              ],
            }, { step_no: 3, stage: 'reflecting', prompt_lead: '回扣判定定理：$BC$ 垂直于平面内两条相交直线，能直接推出哪一项？注意题目可能是多选/有瑕疵。' }),
          ],
          check: {
            form: 'binary',
            cardIndex: 0,
            accept: ['b'],
            step: 3,
            progress: 3,
            total: 3,
            kpName: '线面垂直的判定',
            correctText: '对，选 B。注意：D 也成立（$CC_1\\parallel AA_1$），所以这道题若为单选，命题本身可能有瑕疵。',
            wrongText: '再看判定定理：$BC$ 垂直于平面内两条相交直线，直接推出的是哪一项？',
            hintText: '$BC$ 垂直于 $AD$ 与 $AA_1$，这两条线都在平面 $AA_1D$ 内。',
            misconception: 'logic',
            misconceptionZh: '把异面直线当相交',
            correctCards: [complete, trace],
          },
        },
      },
    ],
  },
}
