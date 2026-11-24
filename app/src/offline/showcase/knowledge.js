/**
 * 本轮离线教学示例的四段自编讲义。
 *
 * 纪律（总方案 §6）：
 *   - 现有采证材料未核得匹配的教材原文，因此**不引用任何出版社/页码/检索排名**；
 *   - 每段都清楚标注「自编讲义」，段落用稳定 ID 绑定，学生看到的是可读标题；
 *   - 卡片只连到这里的真实段落，能展开也能收起，不做联网检索动画。
 *
 * 字段：id / section / title / quote（真实显示的摘录）
 */

export const LECTURE_TITLE = '自编讲义 · 导数与函数单调性'

export const LECTURE = {
  sec_tangent: {
    id: 'sec_tangent',
    section: '§1',
    title: '切线斜率',
    quote:
      '割线的斜率是函数的平均变化率。让割线的一端沿曲线趋近另一端，若斜率趋于有限值，该极限就是该点的导数。',
  },
  sec_monotone: {
    id: 'sec_monotone',
    section: '§2',
    title: '单调性与极值',
    quote:
      '当函数在一个区间内可导，且导数在该区间内始终为正时，函数严格递增。导数始终为负时，函数严格递减。检查驻点附近两侧区间，左正右负对应局部极大，左负右正对应局部极小。',
  },
  sec_flat: {
    id: 'sec_flat',
    section: '§3',
    title: '水平切线',
    quote:
      'f′(a)=0 表示切线水平。x³ 的导数在 0 的两侧均为正，它穿过原点时继续严格递增。',
  },
  sec_value: {
    id: 'sec_value',
    section: '§4',
    title: '比较附近函数值',
    quote:
      '在 a 附近，如果对所有 x≠a 都有 f(x)>f(a)，则 f(a) 是局部极小值。若附近函数值都小于 f(a)，则 f(a) 是局部极大值。',
  },
  // 导学链路细化版新增的两段（§6 末）
  sec_height_slope: {
    id: 'sec_height_slope',
    section: '§5',
    title: '函数值与导数符号',
    quote:
      '函数值的符号表示该点在 x 轴上方、下方或轴上。导数表示该点切线的斜率；若导数在一个区间内处处为负，函数在这段区间严格递减。',
  },
  sec_limit: {
    id: 'sec_limit',
    section: '§6',
    title: '极限与切线斜率',
    quote:
      '极限描述变量靠近某个值时，表达式趋近怎样的结果。导数可以用割线斜率的极限定义；此时差商中的自变量增量在计算时非零，并趋近零。',
  },
}

/**
 * 讲义条目 → SocraticCitations 的数据形状。
 * 现役组件只保留 doc_title 非空的项，字段为 doc_title / chunk_id / kp_codes / quote。
 */
export function cite(...keys) {
  return keys
    .map((k) => LECTURE[k])
    .filter(Boolean)
    .map((s) => ({
      doc_title: `${LECTURE_TITLE} ${s.section} ${s.title}`,
      chunk_id: s.id,
      kp_codes: ['MATH.DERIVATIVE.APPLICATION'],
      quote: s.quote,
    }))
}

/**
 * 消息级引用（渲染走 SourceCard，字段是 n / title / snippet / source）。
 * 卡内引用（SocraticCitations）用的是 doc_title / chunk_id / quote，两套不能混用——
 * 混用会让现役组件渲染出「未知来源」，评审已把这列为可信度问题。
 *
 * 来源一律标注「自编讲义（本项目编写）」，不伪造出版社、页码或检索排名。
 */
export function refs(...keys) {
  return keys
    .map((k) => LECTURE[k])
    .filter(Boolean)
    .map((s, i) => ({
      n: i + 1,
      kind: '自编讲义',
      title: `${LECTURE_TITLE} ${s.section} ${s.title}`,
      snippet: s.quote,
      source: '自编讲义（本项目编写，非教材原文）',
    }))
}
