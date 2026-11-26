/**
 * 示例错题本：用学生端演示仓库自己的本地数据记一条真实可查证的错题。
 *
 * 约束（方案 §3 S6 / §1）：
 *   - 不新增一级入口：记录进现役「错题本」页（`/errors`）读取的同一个历史响应里；
 *   - 同一示例重复收藏只更新同一条，不重复计数；
 *   - 示例由不同会话独立重播，正式采录状态不受影响（只写本地 store）。
 */
import { patch, store } from '../state'
import { HYP } from './bank'

const KEY = 'sc-hyp1'

export function showbookAdder({ convId } = {}) {
  const exist = (store.errorBook || []).find((e) => e.key === KEY)
  const rec = {
    key: KEY,
    record_id: `sc-err-${KEY}`,
    question_preview: `${HYP.question_text}（A √2，B 2，C √7，D 2√2）`,
    error_type: 'logic',
    kp_code: HYP.kp_code,
    kp_name: HYP.kp_name,
    created_at: exist?.created_at || new Date().toISOString(),
    entered_at: exist?.entered_at || new Date().toISOString(),
    review_count: 0,
    retrievability: 0.5,
    fsrs_level: 'new',
    stability: 'critical',
    // 示例自带的复盘信息（现役字段之外，页面不依赖）
    first_choice: 'C',
    fixed_choice: 'D',
    reason: '把两条轴的比当成了离心率：√7 = b/a，而 e = c/a。',
    from_conversation: convId || '',
  }
  patch((st) => {
    const list = Array.isArray(st.errorBook) ? st.errorBook : []
    const i = list.findIndex((e) => e.key === KEY)
    st.errorBook = i >= 0 ? list.map((e, j) => (j === i ? rec : e)) : [...list, rec]
  })
}

/** 把示例错题并进现役错题本列表响应（同 record_id 不重复） */
export function mergeIntoErrorRecords(text) {
  const list = Array.isArray(store.errorBook) ? store.errorBook : []
  if (!list.length) return text
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return text
  }
  const data = parsed?.data
  if (!data || !Array.isArray(data.items)) return text
  const have = new Set(data.items.map((x) => x?.record_id))
  const add = list.filter((e) => !have.has(e.record_id))
  if (!add.length) return text
  const out = { ...parsed, data: { ...data, items: [...add, ...data.items] } }
  return JSON.stringify(out)
}

const EXPERIENCE_ERRORS = {
  t1: {
    key: 'exp-err-t1',
    record_id: 'exp-err-t1',
    question_preview: '若双曲线 C 的虚轴长为实轴长的 √7 倍，则 C 的离心率为（ ）',
    error_type: 'logic',
    kp_code: HYP.kp_code,
    kp_name: HYP.kp_name,
    first_choice: 'C',
    fixed_choice: 'D',
    reason: '把两条轴的比当成了离心率：√7 = b/a，而 e = c/a。',
  },
  t2: {
    key: 'exp-err-t2',
    record_id: 'exp-err-t2',
    question_preview: '正三棱柱 ABC-A₁B₁C₁ 中，D 为 BC 中点，则（ ）',
    error_type: 'logic',
    kp_code: 'MATH-PEP-LITI',
    kp_name: '线面垂直的判定',
    first_choice: 'A',
    fixed_choice: 'B',
    reason: '把异面直线 AD 与 A₁C 当成相交直线；线面垂直要找平面内两条相交直线。',
  },
  t3: {
    key: 'exp-err-t3',
    record_id: 'exp-err-t3',
    question_preview: '5 个球有放回取三次，记至少取出一次的球的个数 X，则 E(X)=____。',
    error_type: 'concept',
    kp_code: 'MATH-PEP-PROB',
    kp_name: '离散型随机变量的期望',
    first_choice: '3/5',
    fixed_choice: '61/25',
    reason: '把“不同球数”当成了二项分布的成功次数。',
  },
}

/** 体验「错题本」走完时写一条真实记录；重复走只更新，不重复计数 */
export function addExperienceError(problemId, convId) {
  const base = EXPERIENCE_ERRORS[problemId]
  if (!base) return null
  const exist = (store.errorBook || []).find((e) => e && e.record_id === base.record_id)
  const rec = {
    ...base,
    created_at: exist?.created_at || new Date().toISOString(),
    entered_at: exist?.entered_at || new Date().toISOString(),
    review_count: exist?.review_count || 0,
    retrievability: 0.5,
    fsrs_level: 'new',
    stability: 'critical',
    source: 'experience',
    from_conversation: convId || '',
  }
  patch((st) => {
    const list = Array.isArray(st.errorBook) ? st.errorBook : []
    const i = list.findIndex((e) => e && e.record_id === base.record_id)
    st.errorBook = i >= 0 ? list.map((e, j) => (j === i ? rec : e)) : [...list, rec]
  })
  return rec
}

export function isErrorRecordsPath(path) {
  return String(path).split('?')[0].includes('/student/error-records')
}

export const SHOWCASE_ERROR_KEY = KEY
