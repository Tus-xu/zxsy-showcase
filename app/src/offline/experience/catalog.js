/**
 * 体验目录：三道真实题图 × 四种体验。
 *
 * 只放元数据（侧栏、封面、页头用），不放大段脚本；脚本在 ./scripts/ 下按题分文件，
 * 由 ./scripts/index.js 合并。12 个 exp-* 不进入 SHOWCASE_CONVS / 最近对话，
 * 避免把历史记录淹没；它们的唯一入口是侧栏「体验分类」rail。
 */
import { FLOW_IMAGE } from '../showcase/flowAssets'

export const EXPERIENCE_PROBLEMS = [
  {
    id: 't1',
    no: '题1',
    title: '双曲线离心率',
    tag: '圆锥曲线',
    summary: '虚轴长是实轴长的 √7 倍，求离心率',
    answerText: 'D · 2√2',
    note: '',
    image: FLOW_IMAGE.A.url,
    thumb: FLOW_IMAGE.A.url,
    mime: FLOW_IMAGE.A.mime,
    name: FLOW_IMAGE.A.name,
  },
  {
    id: 't2',
    no: '题2',
    title: '正三棱柱线面关系',
    tag: '立体几何',
    summary: 'D 为 BC 中点，判断线面关系',
    answerText: 'B；D 亦成立',
    note: '若本题为单选，B、D 均成立，原题可能有瑕疵；演示会如实说明。',
    image: FLOW_IMAGE.B.url,
    thumb: FLOW_IMAGE.B.url,
    mime: FLOW_IMAGE.B.mime,
    name: FLOW_IMAGE.B.name,
  },
  {
    id: 't3',
    no: '题3',
    title: '有放回取球的期望',
    tag: '概率',
    summary: '5 个球有放回取三次，求 E(X)',
    answerText: '61/25',
    note: 'X 是不同球数，不是成功次数；用指示变量求和。',
    image: FLOW_IMAGE.C.url,
    thumb: FLOW_IMAGE.C.url,
    mime: FLOW_IMAGE.C.mime,
    name: FLOW_IMAGE.C.name,
  },
]

export const EXPERIENCE_MODES = [
  { id: 'qa', name: '知识问答', short: '问答', icon: '💬', blurb: '把题背后的概念讲透' },
  { id: 'error', name: '错题本', short: '错题', icon: '📕', blurb: '看一次真实错答与订正' },
  { id: 'variant', name: '举一反三', short: '变式', icon: '🔁', blurb: '同一方法换条件再练' },
  { id: 'guided', name: '引导式解题', short: '引导', icon: '🧭', blurb: '三步走完整推导' },
]

const COVERS = {
  't1-qa': {
    title: '离心率为什么是 c/a，而不是 b/a？',
    bullets: ['从 a、b、c 的直角三角形关系出发', '把两条轴的比例翻译成 e', '回扣题1 的 √7 与 2√2'],
  },
  't1-error': {
    title: '选了 C（√7），错在哪？',
    bullets: ['保留你的首答，不直接改答案', '指出 √7 是 b/a，不是 e', '订正 D（2√2）并写入错题本'],
  },
  't1-variant': {
    title: '同一道题，三种问法',
    bullets: ['先求轴比 b/a', '再求离心率 e', '最后看换轴后 e 怎么变'],
  },
  't1-guided': {
    title: '从「虚轴是实轴的 √7 倍」走到 e=2√2',
    bullets: ['第 1 步：观察两条轴的比例', '第 2 步：把 b/a 翻译成 e', '第 3 步：回扣选项，确认 2√2'],
  },
  't2-qa': {
    title: '线面垂直到底要证几条线？',
    bullets: ['判定定理：平面内两条相交直线', 'BC⊥AD 与 BC⊥AA₁ 各自为什么成立', '顺带说清 D 选项为什么也成立'],
  },
  't2-error': {
    title: '把异面直线当成了相交',
    bullets: ['AD 与 A₁C 并不相交', '「看起来垂直」不是证明', '改用 BC⊥平面 AA₁D'],
  },
  't2-variant': {
    title: '换中点、换棱柱、换结论',
    bullets: ['D 为 BC 中点时怎么判', '换成 A₁C₁ 中点还成立吗', '正三棱柱改成正三棱锥呢'],
  },
  't2-guided': {
    title: '三步证明 BC⊥平面 AA₁D',
    bullets: ['第 1 步：找平面内的两条相交线', '第 2 步：分别证明 BC⊥AD、BC⊥AA₁', '第 3 步：回扣选项与命题瑕疵'],
  },
  't3-qa': {
    title: '为什么不能直接用二项分布？',
    bullets: ['X 数的是不同的球，不是成功次数', '给每个球设 0/1 指示变量', '用期望线性性求和'],
  },
  't3-error': {
    title: '3/5 这个答案错在哪？',
    bullets: ['3/5 是「某一次取到指定球」的期望', 'X 的取值范围是 1 到 3', '正确值 61/25 ≈ 2.44'],
  },
  't3-variant': {
    title: '有放回、无放回、再求方差',
    bullets: ['恰好两个不同球的概率', '无放回时 X 恒为 3', '有放回时 Var(X) 的拓展'],
  },
  't3-guided': {
    title: '三步把 E(X) 算出来',
    bullets: ['第 1 步：把 X 拆成 5 个指示变量', '第 2 步：算单个球至少出现一次的概率', '第 3 步：求和得到 61/25'],
  },
}

const TITLES = {
  't1-qa': '知识问答 · 离心率为什么是 c/a',
  't1-error': '错题本 · 把轴比当成了离心率',
  't1-variant': '举一反三 · 轴比 / 离心率 / 换轴',
  't1-guided': '引导式解题 · 双曲线离心率',
  't2-qa': '知识问答 · 线面垂直怎么判',
  't2-error': '错题本 · 把异面直线当相交',
  't2-variant': '举一反三 · 线面关系变式',
  't2-guided': '引导式解题 · 正三棱柱',
  't3-qa': '知识问答 · 为什么要用指示变量',
  't3-error': '错题本 · 把 X 当二项分布',
  't3-variant': '举一反三 · 有放回 / 无放回',
  't3-guided': '引导式解题 · 有放回取球期望',
}

export const EXPERIENCES = EXPERIENCE_PROBLEMS.flatMap((problem) =>
  EXPERIENCE_MODES.map((mode) => {
    const key = `${problem.id}-${mode.id}`
    const cover = COVERS[key] || { title: TITLES[key], bullets: [] }
    return {
      id: `exp-${key}`,
      problemId: problem.id,
      modeId: mode.id,
      title: TITLES[key],
      subtitle: `${problem.no} · ${mode.name}`,
      cover: {
        eyebrow: `${problem.no} · ${mode.name}`,
        title: cover.title,
        bullets: cover.bullets,
        image: problem.image,
      },
    }
  }),
)

export const EXPERIENCE_BY_ID = Object.fromEntries(EXPERIENCES.map((e) => [e.id, e]))
export const EXPERIENCE_PROBLEM_BY_ID = Object.fromEntries(EXPERIENCE_PROBLEMS.map((p) => [p.id, p]))
export const EXPERIENCE_MODE_BY_ID = Object.fromEntries(EXPERIENCE_MODES.map((m) => [m.id, m]))

export function isExperienceId(id) {
  return typeof id === 'string' && id.startsWith('exp-') && !!EXPERIENCE_BY_ID[id]
}

export function experienceMeta(id) {
  return EXPERIENCE_BY_ID[id] || null
}

export function experienceTitle(id) {
  return EXPERIENCE_BY_ID[id]?.title || ''
}

export function experienceProblem(id) {
  const meta = EXPERIENCE_BY_ID[id]
  return meta ? EXPERIENCE_PROBLEM_BY_ID[meta.problemId] : null
}

export const EXPERIENCE_CATEGORY_ORDER = ['知识问答', '引导式', '举一反三', '错题本', '拍照解题', '看图讲解', '专题']

/** 最近对话类型标签：体验/示例/采证/free 都能落到一个稳定分类 */
export function classifyConversation(item) {
  if (!item) return '对话'
  const id = String(item.id || '')
  if (isExperienceId(id)) return EXPERIENCE_MODE_BY_ID[EXPERIENCE_BY_ID[id].modeId]?.name || '体验'
  if (id.startsWith('sc-')) {
    const t = String(item.title || '')
    if (t.includes('引导')) return '引导式'
    if (t.includes('举一反三')) return '举一反三'
    if (t.includes('错题')) return '错题本'
  if (t.includes('可视化讲解') || t.includes('看图讲解')) return '看图讲解'
    if (t.includes('知识问答')) return '知识问答'
    if (t.includes('拍照')) return '拍照解题'
    return '专题'
  }
  const t = String(item.title || '')
  // 具体类型优先，最后才用「题」这种泛词；否则「错题本录入」会被误标成拍照解题
  if (t.includes('错题')) return '错题本'
  if (t.includes('可视化讲解') || t.includes('看图讲解')) return '看图讲解'
  if (t.includes('引导')) return '引导式'
  if (t.includes('举一反三') || t.includes('变式')) return '举一反三'
  if (t.includes('知识问答') || t.includes('为什么') || t.includes('怎么理解')) return '知识问答'
  if (t.includes('拍照') || t.includes('题目图片') || t.includes('上传')) return '拍照解题'
  if (t.includes('函数') || t.includes('导数') || t.includes('向量') || t.includes('几何')) return '专题'
  return '对话'
}
