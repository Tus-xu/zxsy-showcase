/**
 * 引导式答错后的「知识回溯」教学内容（离线、可重放）。
 *
 * 设计原则：
 * - 不从零讲一道新题，只回退到当前卡点的前置知识；
 * - 最多两层：第 1 层接定义与关系，第 2 层用具体数字再走一遍；
 * - 每层三步，每步一个可视化变化，讲完必须让学生自评「跟上了吗」；
 * - 第二层仍不懂就停在这里，不再无限下钻，直接给「回原题再试」的出口。
 */

import { experienceRefs } from './citations'

export const KNOWLEDGE_REWINDS = {
  'hyperbola-eccentricity': {
    id: 'hyperbola-eccentricity',
    kp: '双曲线的离心率',
    title: '离心率：把 b/a 变成 e',
    short: '约 2 分钟 · 2 层回溯',
    why: '这一步卡住，通常不是不会算，而是 e 的定义和 a、b、c 的关系没有接上。先退回去把这三条边认清楚。',
    citations: experienceRefs('t1', ['hyp-relation', 'hyp-ratio']),
    levels: [
      {
        level: 1,
        label: '先接上定义',
        title: 'e 从来不是 b/a',
        summary: 'e 是 c 与 a 的比；b/a 只是原料。',
        visual: 'three-sides',
        steps: [
          {
            kicker: '先认三条边',
            title: 'a、b、c 各管什么',
            text: 'a 是实半轴，b 是虚半轴，c 是焦点到中心的距离。图上这三条边，藏着一个直角三角形。',
            visual: 'three-sides',
          },
          {
            kicker: '再看关系',
            title: 'c² = a² + b²',
            text: '双曲线里 c 最长。把 a、b 当作两条直角边，c 就是斜边。这是双曲线的勾股关系，和椭圆的 a² = b² + c² 不一样。',
            visual: 'pythagoras',
          },
          {
            kicker: '回到 e',
            title: 'e = c/a，b/a 只是原料',
            text: '离心率只问一件事：焦点离中心有多远，和实半轴比是多少。b/a 描述的是两条轴的比，不是 e；但它能通过 e² = 1 + (b/a)² 把 e 算出来。',
            visual: 'formula',
          },
        ],
        checkpoint: {
          question: '这一层跟上了吗？',
          hint: '如果还卡，就再退一层，用具体数字看。',
        },
      },
      {
        level: 2,
        label: '再用数字走一遍',
        title: '把字母换成 1 和 √7',
        summary: '本题 a=1，b=√7，c=2√2，e=2√2。',
        visual: 'numbers',
        steps: [
          {
            kicker: '先代数字',
            title: 'a=1，b=√7',
            text: '题目给的是 2b = √7 · 2a，约掉 2，得到 b/a = √7。令 a=1，b 就是 √7。先别急着找 e。',
            visual: 'numbers',
          },
          {
            kicker: '再算斜边',
            title: 'c² = 1 + 7 = 8',
            text: '把 a=1、b=√7 放进 c² = a² + b²：c² = 1² + (√7)² = 1 + 7 = 8，所以 c = 2√2。',
            visual: 'square-sum',
          },
          {
            kicker: '最后回到 e',
            title: 'e = 2√2 / 1 = 2√2',
            text: 'e 是 c 除以 a：e = 2√2 ÷ 1 = 2√2。√7 在这里只是 b/a，不是答案。',
            visual: 'result',
          },
        ],
        checkpoint: {
          question: '这一次跟上了吗？',
          hint: '如果还差一点，我们就把这一层留在这里，先回原题试一次。',
        },
      },
    ],
    finish: {
      title: '把这三句话带回原题',
      text: 'e = c/a；c² = a² + b²；b/a 只是原料。回原题把这两个空再填一次，不要直接套 √7。',
      cta: '回原题再试',
    },
    stillStuck: {
      title: '最多就退到这里',
      text: '两层都走完还没完全通，很正常。先回原题把两个空再填一次；如果还卡，我再换一种讲法，不继续往下堆知识点了。',
      cta: '回原题试一次',
    },
  },
  'line-plane-perpendicular': {
    id: 'line-plane-perpendicular',
    kp: '线面垂直的判定',
    title: '线面垂直：先找两条相交线',
    short: '约 2 分钟 · 2 层回溯',
    why: '这一步卡住，往往不是不会找线，而是忘了判定定理要求平面内两条相交直线，而且两条都要和 BC 垂直。',
    citations: experienceRefs('t2', ['line-plane', 'line-plane-apply']),
    levels: [
      {
        level: 1,
        label: '先站稳判定定理',
        title: '一条线凭什么垂直于整个平面？',
        visual: 'path',
        pathLabels: ['判定定理', '两条相交线', '线面垂直'],
        pathDetails: ['平面内找线', '必须相交', '都⊥BC'],
        pathCaption: '先把定理说完整，再回原题。',
        steps: [
          { kicker: '先看定理', title: '不是一条，是两条', text: '要证 BC 垂直于平面 AA₁D，平面里至少要找两条和 BC 垂直的直线。一条不够。', visual: 'path' },
          { kicker: '再看位置', title: '两条线必须相交', text: '这两条线还必须相交；平行线不行。平面 AA₁D 里，AD 和 AA₁ 都过 A，正好相交。', visual: 'path' },
          { kicker: '回到图', title: 'BC 对两条线都垂直', text: 'BC⊥AD，因为等边三角形底边上的中线也是高；BC⊥AA₁，因为正三棱柱的侧棱垂直于底面。两条都满足，才有线面垂直。', visual: 'path' },
        ],
        checkpoint: { question: '这一层跟上了吗？', hint: '如果还卡，就再退一层，把两条线在图上标出来。' },
      },
      {
        level: 2,
        label: '再用图走一遍',
        title: '把两条线和 BC 标出来',
        visual: 'path',
        pathLabels: ['AD⊥BC', 'AA₁⊥BC', 'BC⊥平面'],
        pathDetails: ['中线也是高', '侧棱垂直底面', '两条相交线'],
        pathCaption: '一条在底面，一条是侧棱，它们在 A 点相交。',
        steps: [
          { kicker: '先看底面', title: 'AD 为什么垂直 BC', text: '正三角形 ABC 中，D 是 BC 中点，所以 AD 是中线，也是高；AD⊥BC。', visual: 'path' },
          { kicker: '再看侧棱', title: 'AA₁ 为什么垂直 BC', text: '正三棱柱的侧棱 AA₁ 垂直于底面 ABC，而 BC 在底面内，所以 AA₁⊥BC。', visual: 'path' },
          { kicker: '最后合起来', title: '两条相交线都在平面内', text: 'AD 和 AA₁ 都在平面 AA₁D 内，并且都过 A；BC 和它们都垂直，所以 BC⊥平面 AA₁D。', visual: 'path' },
        ],
        checkpoint: { question: '这一次跟上了吗？', hint: '如果还差一点，我们就把这一层留在这里，先回原题试一次。' },
      },
    ],
    finish: {
      title: '把判定定理带回原题',
      text: '先找平面内两条相交直线，再分别证 BC 和它们垂直。回原题把这两条线选出来。',
      cta: '回原题再试',
    },
    stillStuck: {
      title: '最多就退到这里',
      text: '两层都走完还没完全通，很正常。先回原题把两条线选出来；如果还卡，我再换一种讲法。',
      cta: '回原题试一次',
    },
  },

  'expected-value-indicator': {
    id: 'expected-value-indicator',
    kp: '离散型随机变量的期望',
    title: '期望：先把 X 拆成 0/1',
    short: '约 2 分钟 · 2 层回溯',
    why: '这一步卡住，通常是把“不同球数”直接当二项分布，或者忘了期望可以拆成 5 个指示变量相加。',
    citations: experienceRefs('t3', ['indicator', 'expectation-apply']),
    levels: [
      {
        level: 1,
        label: '先拆变量',
        title: 'X 不是一次试验的成功次数',
        visual: 'path',
        pathLabels: ['每只球 I_i', 'X=ΣI_i', '期望相加'],
        pathDetails: ['取到过=1', '5 个变量', '不要求独立'],
        pathCaption: '先把 X 拆成 5 个 0/1 变量，再谈期望。',
        steps: [
          { kicker: '先看每只球', title: '一只球一个 0/1 变量', text: '第 i 号球在三次中出现过，I_i=1；一次都没出现，I_i=0。X 数的是出现过的球的种数。', visual: 'path' },
          { kicker: '再看 X', title: 'X 是 5 个 I_i 的和', text: 'X=I₁+I₂+…+I₅，不是三次独立试验的成功次数；所以不能直接套二项分布。', visual: 'path' },
          { kicker: '最后看期望', title: '期望可以逐项相加', text: '期望有线性性：E(X)=E(I₁)+…+E(I₅)，不需要 I_i 之间独立。', visual: 'path' },
        ],
        checkpoint: { question: '这一层跟上了吗？', hint: '如果还卡，就再退一层，先算一个 I_i 的期望。' },
      },
      {
        level: 2,
        label: '再算一个概率',
        title: '一个 I_i 的期望是多少？',
        visual: 'path',
        pathLabels: ['三次避开', '(4/5)³', '1-64/125'],
        pathDetails: ['每次 4/5', '三次 64/125', '61/125'],
        pathCaption: '先算反面，再用 1 减。',
        steps: [
          { kicker: '先算反面', title: '三次都没取到它', text: '每次不取到第 i 号球的概率是 4/5；三次都避开，就是 (4/5)³=64/125。', visual: 'path' },
          { kicker: '再用 1 减', title: '至少出现一次', text: '所以 P(I_i=1)=1-64/125=61/125，也就是 E(I_i)=61/125。', visual: 'path' },
          { kicker: '最后相加', title: '5 个相同的期望', text: 'E(X)=5×61/125=305/125=61/25。', visual: 'path' },
        ],
        checkpoint: { question: '这一次跟上了吗？', hint: '如果还差一点，我们就把这一层留在这里，先回原题试一次。' },
      },
    ],
    finish: {
      title: '把 0/1 变量带回原题',
      text: 'X 是 5 个指示变量之和；先算一个 I_i 的期望，再用线性性相加。回原题把式子补完整。',
      cta: '回原题再试',
    },
    stillStuck: {
      title: '最多就退到这里',
      text: '两层都走完还没完全通，很正常。先回原题把“三次都没取到”的概率算出来；如果还卡，我再换一种讲法。',
      cta: '回原题试一次',
    },
  },

}

export function getKnowledgeRewind(id) {
  const key = String(id || '')
  return KNOWLEDGE_REWINDS[key] || null
}

export function hasKnowledgeRewind(id) {
  return !!getKnowledgeRewind(id)
}
