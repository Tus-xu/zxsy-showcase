/**
 * 体验层的知识引用（自编讲义）。
 *
 * 纪律：不伪造出版社、页码、检索排名；每条都明确标注“自编讲义（本项目编写，非教材原文）”。
 * 两套形状：
 *  - refs: 消息级 SourceCard（n/title/snippet/source）
 *  - cite: 卡内 SocraticCitations（doc_title/chunk_id/kp_codes/quote）
 */

const BOOK = {
  t1: '自编讲义 · 圆锥曲线',
  t2: '自编讲义 · 立体几何',
  t3: '自编讲义 · 概率与统计',
}

const KP = {
  t1: 'MATH-CONIC-HYPERBOLA',
  t2: 'MATH-GEOM-LINE-PLANE',
  t3: 'MATH-PROB-EXPECTATION',
}

const SECTIONS = {
  t1: [
    {
      id: 'hyp-def',
      section: '§1',
      title: '双曲线的三条边',
      quote:
        '双曲线中，a 是实半轴，b 是虚半轴，c 是焦点到中心的距离。实轴长 2a，虚轴长 2b，焦距 2c。',
    },
    {
      id: 'hyp-relation',
      section: '§2',
      title: 'a、b、c 与离心率',
      quote:
        '双曲线满足 c 的平方等于 a 的平方加 b 的平方；离心率 e 等于 c 除以 a，且 e 大于 1。',
    },
    {
      id: 'hyp-ratio',
      section: '§3',
      title: '轴比不是离心率',
      quote:
        'b 除以 a 是两条半轴的比，不是离心率。由 c 的平方等于 a 的平方加 b 的平方，可推出 e 的平方等于 1 加 (b/a) 的平方。',
    },
  ],
  t2: [
    {
      id: 'line-plane',
      section: '§1',
      title: '线面垂直的判定',
      quote:
        '若一条直线与一个平面内的两条相交直线都垂直，则这条直线垂直于这个平面。',
    },
    {
      id: 'prism-context',
      section: '§2',
      title: '正三棱柱里的垂直',
      quote:
        '正三棱柱的侧棱垂直于底面；等边三角形底边上的中线也是高，所以 AD 垂直于 BC。',
    },
    {
      id: 'line-plane-apply',
      section: '§3',
      title: '把定理用在这道题',
      quote:
        'BC 垂直于 AD，BC 垂直于 AA1；AD 与 AA1 是平面 AA1D 内两条相交直线，所以 BC 垂直于平面 AA1D。',
    },
  ],
  t3: [
    {
      id: 'indicator',
      section: '§1',
      title: '指示变量',
      quote:
        '若事件 A 发生记 I 等于 1，否则记 I 等于 0，则 I 的期望等于事件 A 发生的概率。',
    },
    {
      id: 'linearity',
      section: '§2',
      title: '期望的线性性',
      quote:
        '期望具有线性性：E(X+Y) 等于 E(X) 加 E(Y)，不要求 X 与 Y 独立。',
    },
    {
      id: 'expectation-apply',
      section: '§3',
      title: '本题的算法',
      quote:
        '三次都没取到第 i 号球的概率是 (4/5) 的三次方；所以 I_i 的期望是 1 减 (4/5) 的三次方，等于 61/125。X 是 5 个指示变量之和，期望是 5 乘 61/125，等于 61/25。',
    },
  ],
}

function sectionsOf(problemId, keys) {
  const list = SECTIONS[problemId] || []
  const wanted = Array.isArray(keys) && keys.length ? keys : null
  return wanted ? list.filter((s) => wanted.includes(s.id)) : list
}

/** 消息级引用：默认取前两条最相关的自编讲义。 */
export function experienceRefs(problemId, keys) {
  return sectionsOf(problemId, keys)
    .slice(0, 3)
    .map((s, i) => ({
      n: i + 1,
      kind: '自编讲义',
      title: `${BOOK[problemId] || '自编讲义'} ${s.section} ${s.title}`,
      snippet: s.quote,
      source: '自编讲义（本项目编写，非教材原文）',
    }))
}

/** 卡内引用：SocraticCitations 使用的 doc_title/chunk_id 形状。 */
export function experienceCite(problemId, keys) {
  return sectionsOf(problemId, keys)
    .slice(0, 2)
    .map((s) => ({
      doc_title: `${BOOK[problemId] || '自编讲义'} ${s.section} ${s.title}`,
      chunk_id: s.id,
      kp_codes: [KP[problemId]].filter(Boolean),
      quote: s.quote,
    }))
}

const DEFAULT_KEYS = {
  t1: ['hyp-relation', 'hyp-ratio'],
  t2: ['line-plane', 'line-plane-apply'],
  t3: ['indicator', 'expectation-apply'],
}

/** 默认两条：本题最关键的关系 + 应用。 */
export function defaultRefs(problemId) {
  const keys = DEFAULT_KEYS[problemId] || null
  return experienceRefs(problemId, keys).slice(0, 1)
}

export function defaultCite(problemId) {
  const keys = DEFAULT_KEYS[problemId] || null
  return experienceCite(problemId, keys).slice(0, 1)
}
