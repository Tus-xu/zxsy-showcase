/**
 * 备课中心 · 编辑状态 / 发布快照 / 导出辅助（PROTOTYPE_ONLY，全部本地）。
 *
 * 数据契约（只读）：src/data/courseware.js 的 deck / plan / blueprint。
 * 编辑状态契约：store.ext.teacherPrep.sessions[sessionId] = {
 *   sessionId, deckId, slides: 覆盖后的完整 slides, plan: 覆盖后的完整 plan,
 *   design: { goals, examples }, params: {...}, activeSlide, savedAt, createdAt,
 *   publishedVersion, lastExport, lastSyncAt
 * }
 * 发布契约：store.teacher.publish.records 追加
 *   { id:'pub-<ts>', deckId, deckTitle, className, version, publishedAt, editor,
 *     slides:[深拷贝], meta:{ sessionId, textbook, grade, className, duration, subtitle,
 *     versionLabel, publishedAtText } }
 */
import { findBlueprint, findDeck, findDeckBySession, findPlan } from './courseware'
import { store } from '../state/demo'
import { plainMath } from '../lib/plainMath'

export const DEMO_TEACHER = '张老师'
/** 真实工作台 tab 键：classroom | ppt | plan（design 为 classroom 的历史别名） */
export const PREP_TABS = ['classroom', 'ppt', 'plan']
export const PREP_TAB_ALIASES = { design: 'classroom', classroom: 'classroom', ppt: 'ppt', plan: 'plan' }
export function normalizeTab(tab) {
  return PREP_TAB_ALIASES[tab] || 'classroom'
}
export const PREP_TAB_LABEL = { classroom: '课堂设计', design: '课堂设计', ppt: 'PPT', plan: '教案' }
export const PUBLISH_CLASSES = ['高二 (1) 班', '高一 (3) 班', '高一 (2) 班']

export function deepCopy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

/** ext.teacherPrep 命名空间（持久化；整场复位时随 ext 一起清空） */
export function prepStore() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  if (!store.ext.teacherPrep || typeof store.ext.teacherPrep !== 'object') {
    store.ext.teacherPrep = { sessions: {}, custom: {}, recent: [], lastSessionId: null }
  }
  const p = store.ext.teacherPrep
  if (!p.sessions || typeof p.sessions !== 'object') p.sessions = {}
  if (!p.custom || typeof p.custom !== 'object') p.custom = {}
  if (!Array.isArray(p.recent)) p.recent = []
  return p
}

/** 三份课时的默认参数（椭圆依据 math-baseline：a=5,b=3→c=4） */
export function defaultParams(deckId) {
  if (deckId === 'deck-ellipse') return { a: 5, b: 3 }
  if (deckId === 'deck-quadratic') return { a: 2, h: -2, k: -3 }
  if (deckId === 'deck-set') return { n: 3 }
  return {}
}

/** 默认停留的页：椭圆对齐 PPT-GOLDEN 的 3/6（椭圆的定义）；二次函数停配方例题页；集合停子集个数页 */
export function defaultSlideIndex(deckId) {
  if (deckId === 'deck-set') return 3
  return 2
}

/* ───────────────────────── 数值与格式化 ───────────────────────── */

export function fmtNum(n, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const r = Math.round(Number(n) * 10 ** digits) / 10 ** digits
  return String(r)
}

export function fmtOne(n) {
  return Number.isFinite(Number(n)) ? Number(n).toFixed(1) : '—'
}

function gcd(x, y) {
  let a = Math.abs(Math.round(x))
  let b = Math.abs(Math.round(y))
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a || 1
}

export function fraction(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return '—'
  const g = gcd(n, d)
  const num = Math.round(n) / g
  const den = Math.round(d) / g
  return den === 1 ? `${num}` : `${num}/${den}`
}

export function formatClock(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDateTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatWhen(ts) {
  if (!ts) return '尚未编辑'
  const d = new Date(ts)
  const pad = (v) => String(v).padStart(2, '0')
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ───────────────────────── 派生量（参数 → 图形/公式/标注） ───────────────────────── */

/** 参数改动后：c=√(a²−b²)、e=c/a 等所有派生值都从这里出，保证图形/公式/标注三处同源 */
export function computeDerived(deckId, params = {}) {
  if (deckId === 'deck-ellipse') {
    const a = Number(params.a)
    const b = Number(params.b)
    const valid = Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 && a > b
    const c = valid ? Math.sqrt(a * a - b * b) : null
    const e = valid ? c / a : null
    const cInteger = valid ? Math.abs(c - Math.round(c)) < 1e-9 : false
    return {
      kind: 'ellipse',
      valid,
      error: valid ? '' : '需满足 a > b > 0，图形与 c/e 才能成立',
      a: Number.isFinite(a) ? a : 0,
      b: Number.isFinite(b) ? b : 0,
      c,
      e,
      cText: valid ? fmtNum(c, 3) : '—',
      cFixed1: valid ? Number(c).toFixed(1) : '—',
      eText: valid ? fmtNum(e, 3) : '—',
      eFraction: valid && cInteger ? fraction(c, a) : '',
      axisLong: valid ? fmtNum(2 * a) : '—',
      axisShort: valid ? fmtNum(2 * b) : '—',
      focal: valid ? fmtNum(2 * c) : '—',
      focus1: valid ? `F₁(−${fmtNum(c, 3)}, 0)` : 'F₁',
      focus2: valid ? `F₂(${fmtNum(c, 3)}, 0)` : 'F₂',
      numericEquation: valid ? `x²/${fmtNum(a * a, 2)} + y²/${fmtNum(b * b, 2)} = 1` : '',
      cFormula: valid ? `c = √(a² − b²) = √(${fmtNum(a)}² − ${fmtNum(b)}²) = ${fmtNum(c, 3)}` : 'c = √(a² − b²)',
      eFormula: valid
        ? cInteger
          ? `e = c/a = ${fraction(c, a)} ≈ ${fmtNum(e, 3)}`
          : `e = c/a = ${fmtNum(c, 3)}/${fmtNum(a)} ≈ ${fmtNum(e, 3)}`
        : 'e = c/a',
      sumText: valid ? `|PF₁| + |PF₂| = 2a = ${fmtNum(2 * a)} > |F₁F₂| = 2c = ${fmtNum(2 * c)}` : '',
    }
  }
  if (deckId === 'deck-quadratic') {
    const a = Number(params.a)
    const h = Number(params.h)
    const k = Number(params.k)
    const valid = Number.isFinite(a) && Number.isFinite(h) && Number.isFinite(k) && a !== 0
    const hText = h >= 0 ? `− ${fmtNum(h)}` : `+ ${fmtNum(Math.abs(h))}`
    const kText = k >= 0 ? `+ ${fmtNum(k)}` : `− ${fmtNum(Math.abs(k))}`
    return {
      kind: 'quadratic',
      valid,
      error: valid ? '' : '二次项系数 a 不能为 0',
      a: valid ? a : 0,
      h: valid ? h : 0,
      k: valid ? k : 0,
      vertex: valid ? `(${fmtNum(h)}, ${fmtNum(k)})` : '—',
      axis: valid ? `x = ${fmtNum(h)}` : '—',
      extremum: valid ? (a > 0 ? `最小值 ${fmtNum(k)}` : `最大值 ${fmtNum(k)}`) : '—',
      opening: valid ? (a > 0 ? '开口向上' : '开口向下') : '—',
      vertexForm: valid ? `y = ${fmtNum(a)}(x ${hText})² ${kText}` : '—',
      numericEquation: valid
        ? `y = ${fmtNum(a)}x² ${-2 * a * h >= 0 ? '+' : '−'} ${fmtNum(Math.abs(-2 * a * h))}x ${a * h * h + k >= 0 ? '+' : '−'} ${fmtNum(Math.abs(a * h * h + k))}`
        : '',
    }
  }
  if (deckId === 'deck-set') {
    let n = Math.round(Number(params.n))
    if (!Number.isFinite(n)) n = 1
    n = Math.min(8, Math.max(1, n))
    const subsets = 2 ** n
    return {
      kind: 'set',
      valid: true,
      error: '',
      n,
      subsets,
      proper: subsets - 1,
      subsetFormula: `子集数 = 2^${n} = ${subsets}`,
      properFormula: `真子集数 = 2^${n} − 1 = ${subsets - 1}`,
      elementText: `B = {1, 2, …, ${n}}`,
    }
  }
  return { kind: 'none', valid: true, error: '' }
}

/* ───────────────────────── 会话解析 / 初始化 ───────────────────────── */

/**
 * 解析 sessionId → 课程目标。
 * 内置三节课：prep-ellipse / prep-quadratic / prep-set。
 * 「新建备课」会产生 prep-<ts> 自定义会话（custom），复用同一 deckId，班级可不同。
 */
export function resolvePrepTarget(sessionId) {
  if (!sessionId) return null
  const p = prepStore()
  const custom = p.custom[sessionId] || null
  const deck = custom ? findDeck(custom.deckId) : findDeckBySession(sessionId)
  if (!deck) return null
  const baseSessionId = custom ? custom.baseSessionId || deck.sessionId : sessionId
  const plan = findPlan(deck.id)
  const blueprint = findBlueprint(baseSessionId)
  const className = (custom && custom.className) || deck.meta.className
  return {
    sessionId,
    deckId: deck.id,
    deck,
    plan,
    blueprint,
    custom,
    isCustom: !!custom,
    title: deck.title,
    subtitle: deck.subtitle,
    className,
    meta: { ...deck.meta, className, grade: className },
  }
}

export function ensurePrepSession(sessionId) {
  const target = resolvePrepTarget(sessionId)
  if (!target) return null
  const p = prepStore()
  let sess = p.sessions[sessionId]
  if (!sess) {
    sess = {
      sessionId,
      deckId: target.deckId,
      tab: 'classroom',
      slides: deepCopy(target.deck.slides),
      plan: target.plan ? deepCopy(target.plan) : null,
      design: target.blueprint
        ? { goals: deepCopy(target.blueprint.goals || []), examples: deepCopy(target.blueprint.examples || []) }
        : { goals: [], examples: [] },
      params: defaultParams(target.deckId),
      style: {
        showFocus: true,
        showAxes: true,
        showAux: true,
        showLabels: true,
        color: '#2563eb',
        strokeWidth: 2.4,
      },
      activeSlide: defaultSlideIndex(target.deckId),
      savedAt: null,
      createdAt: target.custom?.createdAt || Date.now(),
      publishedVersion: 0,
      lastExport: null,
      lastSyncAt: null,
    }
    p.sessions[sessionId] = sess
  }
  // 兼容旧持久化数据：补齐字段，避免读取 undefined
  if (!Array.isArray(sess.slides) || !sess.slides.length) sess.slides = deepCopy(target.deck.slides)
  if (!sess.plan) sess.plan = target.plan ? deepCopy(target.plan) : null
  if (!sess.design) sess.design = { goals: deepCopy(target.blueprint?.goals || []), examples: [] }
  if (!sess.params || typeof sess.params !== 'object') sess.params = defaultParams(target.deckId)
  if (!sess.style || typeof sess.style !== 'object') {
    sess.style = { showFocus: true, showAxes: true, showAux: true, showLabels: true, color: '#2563eb', strokeWidth: 2.4 }
  }
  if (typeof sess.activeSlide !== 'number') sess.activeSlide = defaultSlideIndex(target.deckId)
  if (typeof sess.publishedVersion !== 'number') sess.publishedVersion = 0
  if (sess.deckId !== target.deckId) sess.deckId = target.deckId
  return sess
}

/** 任何编辑后调用：写入 savedAt（顶栏“已保存 HH:MM”与历史更新时间同源） */
export function touchPrepSession(sessionId) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return null
  sess.savedAt = Date.now()
  const p = prepStore()
  p.lastSessionId = sessionId
  const list = p.recent.filter((id) => id !== sessionId)
  list.unshift(sessionId)
  p.recent = list.slice(0, 12)
  return sess
}

/** 新建备课：创建自定义会话（同一课时、可指定班级，产生独立编辑状态） */
export function createPrepSession({ deckId, className, tab = 'classroom' } = {}) {
  const deck = findDeck(deckId)
  if (!deck) return null
  const p = prepStore()
  const now = Date.now()
  let sessionId = `prep-${now}`
  let n = 1
  while (p.custom[sessionId] || p.sessions[sessionId]) {
    sessionId = `prep-${now}-${n++}`
  }
  p.custom[sessionId] = {
    sessionId,
    deckId: deck.id,
    baseSessionId: deck.sessionId,
    className: className || deck.meta.className,
    createdAt: now,
  }
  const sess = ensurePrepSession(sessionId)
  sess.tab = normalizeTab(tab)
  sess.createdAt = now
  p.lastSessionId = sessionId
  p.recent = [sessionId, ...p.recent.filter((id) => id !== sessionId)].slice(0, 12)
  return resolvePrepTarget(sessionId)
}

/** 重置本课时编辑（可观察的恢复动作；不影响发布历史） */
export function resetPrepSessionEdits(sessionId) {
  const p = prepStore()
  const target = resolvePrepTarget(sessionId)
  if (!target) return null
  delete p.sessions[sessionId]
  p.recent = p.recent.filter((id) => id !== sessionId)
  return ensurePrepSession(sessionId)
}

/* ───────────────────────── 列表 / 状态 ───────────────────────── */

function effectivePublishedVersion(sessionId, deckId) {
  const sess = prepStore().sessions[sessionId]
  const records = store.teacher?.publish?.records || []
  if (!sess || !sess.publishedVersion) return 0
  const hit = records.some((r) => r.deckId === deckId && r.version === sess.publishedVersion)
  return hit ? sess.publishedVersion : 0
}

/** 一节课的摘要（首页卡片 / 历史列表 / 最近会话共用） */
export function sessionSummary(sessionId) {
  const target = resolvePrepTarget(sessionId)
  if (!target) return null
  const sess = prepStore().sessions[sessionId] || null
  const publishedVersion = effectivePublishedVersion(sessionId, target.deckId)
  const status = publishedVersion > 0 ? 'published' : sess?.savedAt ? 'editing' : 'todo'
  return {
    sessionId,
    deckId: target.deckId,
    title: target.deck.title,
    subtitle: target.deck.subtitle,
    isCustom: target.isCustom,
    className: target.className,
    meta: target.meta,
    status,
    publishedVersion,
    savedAt: sess?.savedAt || null,
    createdAt: sess?.createdAt || target.custom?.createdAt || null,
    updatedAt: sess?.savedAt || null,
    tab: normalizeTab(sess?.tab),
    slideCount: sess?.slides?.length || target.deck.slides.length,
  }
}

/** 内置三节课的摘要（按内容契约顺序） */
export function builtinSummaries() {
  return ['prep-ellipse', 'prep-quadratic', 'prep-set'].map((id) => sessionSummary(id))
}

/** 全部会话（内置 + 自定义），最近编辑优先 */
export function allSessionSummaries() {
  const p = prepStore()
  const ids = new Set(['prep-ellipse', 'prep-quadratic', 'prep-set', ...Object.keys(p.custom)])
  return [...ids]
    .map((id) => sessionSummary(id))
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0) || a.title.localeCompare(b.title, 'zh'))
}

export function recentPublishRecords(limit = 8) {
  const records = store.teacher?.publish?.records || []
  return records.slice(-limit).reverse()
}

/* ───────────────────────── 发布 ───────────────────────── */

export function publishVersionFor(deckId) {
  const records = store.teacher?.publish?.records || []
  return records.filter((r) => r.deckId === deckId).length + 1
}

/** 发布：把当前编辑后的 slides 深拷贝快照追加进 store.teacher.publish.records（不覆盖历史） */
export function publishPrepSession(sessionId, className) {
  const target = resolvePrepTarget(sessionId)
  const sess = ensurePrepSession(sessionId)
  if (!target || !sess) throw new Error('备课会话不存在，无法发布')
  const cls = className || target.className
  if (!cls) throw new Error('请选择要发布的班级')
  if (!Array.isArray(sess.slides) || !sess.slides.length) throw new Error('当前课件没有可发布的页面')
  if (!store.teacher.publish || typeof store.teacher.publish !== 'object') store.teacher.publish = { records: [] }
  if (!Array.isArray(store.teacher.publish.records)) store.teacher.publish.records = []
  const now = Date.now()
  let id = `pub-${now}`
  let seq = 1
  while (store.teacher.publish.records.some((r) => r.id === id)) id = `pub-${now}-${seq++}`
  const version = publishVersionFor(target.deckId)
  const slides = withDerivedSlides(target.deckId, sess.params, sess.slides)
  const record = {
    id,
    deckId: target.deckId,
    deckTitle: target.deck.title,
    className: cls,
    version,
    publishedAt: now,
    editor: DEMO_TEACHER,
    slides,
    meta: {
      sessionId,
      textbook: target.meta.textbook,
      grade: target.meta.grade || cls,
      className: cls,
      duration: target.meta.duration,
      subtitle: target.deck.subtitle,
      versionLabel: `v${version}`,
      publishedAtText: formatDateTime(now),
    },
  }
  store.teacher.publish.records.push(record)
  sess.publishedVersion = version
  sess.savedAt = now
  // 兼容 demo.js 既有结构：teacher.prep.sessions 里也登记发布态（其它教师端页面只读）
  if (!store.teacher.prep || typeof store.teacher.prep !== 'object') {
    store.teacher.prep = { sessions: {}, activeSessionId: null, deckEdits: {}, planEdits: {} }
  }
  if (!store.teacher.prep.sessions) store.teacher.prep.sessions = {}
  const prepSession = store.teacher.prep.sessions[sessionId] || {}
  Object.assign(prepSession, {
    id: sessionId,
    deckId: target.deckId,
    tab: prepSession.tab || 'classroom',
    updatedAt: now,
    published: true,
    publishedVersion: version,
    publishedAt: now,
    publishedClass: cls,
    deckEdits: prepSession.deckEdits || {},
    planEdits: prepSession.planEdits || {},
  })
  store.teacher.prep.sessions[sessionId] = prepSession
  store.teacher.prep.activeSessionId = sessionId
  return record
}

/* ───────────────────────── 编辑动作 ───────────────────────── */

export function setActiveSlide(sessionId, index) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return
  sess.activeSlide = Math.max(0, Math.min(index, sess.slides.length - 1))
}

export function setSlideTitle(sessionId, index, title) {
  const sess = ensurePrepSession(sessionId)
  const slide = sess?.slides?.[index]
  if (!slide) return
  slide.title = String(title ?? '')
  touchPrepSession(sessionId)
}

export function setSlideField(sessionId, index, field, value) {
  const sess = ensurePrepSession(sessionId)
  const slide = sess?.slides?.[index]
  if (!slide) return
  slide[field] = value
  touchPrepSession(sessionId)
}

export function moveSlide(sessionId, index, dir) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return sess
  const to = index + dir
  if (to < 0 || to >= sess.slides.length) return sess
  const [row] = sess.slides.splice(index, 1)
  sess.slides.splice(to, 0, row)
  sess.activeSlide = to
  touchPrepSession(sessionId)
  return sess
}

export function addSlide(sessionId) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return null
  const n = sess.slides.length + 1
  const now = Date.now()
  sess.slides.push({
    id: `s${now}`,
    layout: 'content',
    title: `新的一页 ${n}`,
    lead: '在这里补充本页的教学要点，或使用底部 AI 改页指令修改标题与要点。',
    bullets: ['要点一：可由底部 AI 改页输入框真实修改'],
    note: '新增页（本课时编辑状态内保存）',
  })
  sess.activeSlide = sess.slides.length - 1
  touchPrepSession(sessionId)
  return sess.slides[sess.activeSlide]
}

export function deleteSlide(sessionId, index) {
  const sess = ensurePrepSession(sessionId)
  if (!sess || sess.slides.length <= 1) return false
  sess.slides.splice(index, 1)
  sess.activeSlide = Math.min(index, sess.slides.length - 1)
  touchPrepSession(sessionId)
  return true
}

export function setParams(sessionId, patch) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return
  for (const [key, value] of Object.entries(patch || {})) {
    const num = Number(value)
    if (!Number.isFinite(num)) continue
    sess.params[key] = num
  }
  touchPrepSession(sessionId)
}

/** PPT → 教案：把当前页标题/讲稿写入教案「教学过程」并去重（真实改动 plan 覆盖） */
export function syncSlideToPlan(sessionId, index) {
  const sess = ensurePrepSession(sessionId)
  if (!sess || !sess.plan) return null
  const slide = sess.slides[index]
  if (!slide) return null
  const marker = `【课件 p${index + 1}】`
  const line = `- ${marker}${slide.title}${slide.note ? ` · 讲稿：${slide.note}` : ''}`
  const sections = sess.plan.sections || []
  let section = sections.find((s) => /教学过程/.test(s.heading))
  if (!section) {
    section = { heading: '四、教学过程', items: [] }
    sections.splice(3, 0, section)
  }
  section.items = (section.items || []).filter(
    (item) => !String(item).startsWith(marker) && !String(item).startsWith(`- ${marker}`),
  )
  section.items.push(line)
  sess.lastSyncAt = Date.now()
  touchPrepSession(sessionId)
  return line
}

/** 教案 → 设计目标：把教案里的教学目标同步回课堂设计（可观察） */
export function syncPlanToDesign(sessionId) {
  const sess = ensurePrepSession(sessionId)
  if (!sess || !sess.plan) return 0
  const goalSection = (sess.plan.sections || []).find((s) => /教学目标/.test(s.heading))
  const goals = (goalSection?.items || [])
    .map((item) => String(item).replace(/^[-#\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4)
  if (!goals.length) return 0
  sess.design.goals = goals
  touchPrepSession(sessionId)
  return goals.length
}

/* ───────────────────────── AI 改页（本地确定性，非固定假回复） ───────────────────────── */

function firstSentence(text) {
  const t = String(text || '').trim()
  if (!t) return t
  const m = t.match(/^[^。！？!?]*[。！？!?]/)
  return m ? m[0] : t
}

/**
 * 解析底部 AI 改页输入，真实改当前页并返回可观察的修改说明。
 * 支持：标题：X · 添加要点：X · a=6 b=4 · 精简/更简洁 · 恢复本页
 * 未识别的指令返回 ok:false（明确说明，不假装成功）。
 */
export function applyPageAi(sessionId, index, text) {
  const sess = ensurePrepSession(sessionId)
  const slide = sess?.slides?.[index]
  const raw = String(text || '').trim()
  if (!slide) return { ok: false, message: '当前页不存在' }
  if (!raw) return { ok: false, message: '请输入修改要求' }

  const target = resolvePrepTarget(sessionId)
  const deckId = target?.deckId

  let m =
    raw.match(/标题[：:]\s*(.+)/) ||
    raw.match(/(?:把|将)?标题(?:改为|改成|换成|写作)[「“"]?([^」”"]+)/)
  if (m) {
    const next = m[1].trim().replace(/[「」“”"]/g, '')
    if (!next) return { ok: false, message: '标题不能为空' }
    slide.title = next
    touchPrepSession(sessionId)
    return { ok: true, message: `已修改第 ${index + 1} 页标题：「${next}」` }
  }

  if (/(恢复|还原)(本页|当前页|标题)/.test(raw)) {
    const origin = target?.deck?.slides?.[index]
    if (!origin) return { ok: false, message: '找不到本页原始内容' }
    slide.title = origin.title
    if (origin.lead !== undefined) slide.lead = origin.lead
    if (origin.bullets !== undefined) slide.bullets = deepCopy(origin.bullets)
    touchPrepSession(sessionId)
    return { ok: true, message: `已把第 ${index + 1} 页恢复为原始内容` }
  }

  if (deckId === 'deck-ellipse' || deckId === 'deck-quadratic') {
    const a = raw.match(/(?:^|[^a-zA-Z])a\s*=\s*(\d+(?:\.\d+)?)/i)
    const b = raw.match(/b\s*=\s*(\d+(?:\.\d+)?)/i)
    const h = raw.match(/h\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const k = raw.match(/k\s*=\s*(-?\d+(?:\.\d+)?)/i)
    if (a || b || h || k) {
      const patch = {}
      if (a) patch.a = Number(a[1])
      if (b) patch.b = Number(b[1])
      if (h) patch.h = Number(h[1])
      if (k) patch.k = Number(k[1])
      setParams(sessionId, patch)
      const d = computeDerived(deckId, sess.params)
      const bits = []
      if (patch.a !== undefined) bits.push(`a=${fmtNum(patch.a)}`)
      if (patch.b !== undefined) bits.push(`b=${fmtNum(patch.b)}`)
      if (patch.h !== undefined) bits.push(`h=${fmtNum(patch.h)}`)
      if (patch.k !== undefined) bits.push(`k=${fmtNum(patch.k)}`)
      if (deckId === 'deck-ellipse') {
        return {
          ok: d.valid,
          message: d.valid
            ? `已更新 ${bits.join('、')}：c=${d.cText}，e=${d.eText}，图形与公式同步`
            : `参数无效：${d.error}`,
        }
      }
      return { ok: d.valid, message: d.valid ? `已更新 ${bits.join('、')}：顶点 ${d.vertex}，图形与公式同步` : d.error }
    }
  }

  m =
    raw.match(/(?:添加|新增|加上)?(?:一条)?要点[：:]\s*(.+)/) ||
    raw.match(/(?:添加|新增|加上)(?:一条)?要点[「“"]?([^」”"]+)/)
  if (m) {
    const item = m[1].trim().replace(/[「」“”"]/g, '')
    if (!item) return { ok: false, message: '要点内容不能为空' }
    if (!Array.isArray(slide.bullets)) slide.bullets = []
    slide.bullets.push(item)
    touchPrepSession(sessionId)
    return { ok: true, message: `已在第 ${index + 1} 页添加要点：「${item}」` }
  }

  if (/(精简|简洁|简短|压缩)/.test(raw)) {
    const before = slide.lead || ''
    slide.lead = firstSentence(before)
    if (!slide.lead) slide.lead = slide.title
    if (Array.isArray(slide.bullets) && slide.bullets.length > 2) slide.bullets = slide.bullets.slice(0, 2)
    touchPrepSession(sessionId)
    return { ok: true, message: `已精简第 ${index + 1} 页表述（导语取首句，要点保留前 2 条）` }
  }

  // 未识别的指令：不伪造成“已修改”，保留原页并明确列出可执行动作
  return {
    ok: false,
    message:
      '未识别的改页指令。可试试「标题：椭圆及其标准方程」「添加要点：…」「a=6 b=4」「让本页更简洁」「恢复本页」',
  }
}

/* ───────────────────────── 导出辅助 ───────────────────────── */

/** 当前编辑后的课件（导出用；改过的标题/要点会进入文件） */
/** 把“当前参数”的派生结果写入 slides（导出/发布共用），保证 画布=发布快照=导出物 同源。 */
export function withDerivedSlides(deckId, params, rawSlides) {
  const derived = computeDerived(deckId, params || {})
  const slides = deepCopy(rawSlides)
  for (const s of slides) {
    if (deckId === 'deck-ellipse' && ['s3', 's4', 's5'].includes(s.id) && derived.valid) {
      s.equation = [derived.numericEquation, derived.cFormula, derived.eFormula].filter(Boolean).join('；')
      s.lead = `${s.lead ? s.lead + ' ' : ''}当前参数：焦点 ${derived.focus1}、${derived.focus2}，长轴长 ${derived.axisLong}，短轴长 ${derived.axisShort}，焦距 ${derived.focal}，e = ${derived.eText}。`
    }
    if (deckId === 'deck-quadratic' && ['s2', 's3', 's4'].includes(s.id) && derived.valid) {
      s.equation = derived.vertexForm
      s.lead = `${s.lead ? s.lead + ' ' : ''}当前参数：顶点 ${derived.vertex}，对称轴 ${derived.axis}，${derived.extremum}。`
    }
    if (deckId === 'deck-set' && derived.valid && derived.subsetFormula) {
      s.equation = derived.subsetFormula
    }
  }
  return slides
}

export function deckForExport(sessionId) {
  const target = resolvePrepTarget(sessionId)
  const sess = ensurePrepSession(sessionId)
  if (!target || !sess) return null
  return {
    id: target.deckId,
    sessionId,
    title: target.deck.title,
    subtitle: target.deck.subtitle,
    meta: { ...target.meta },
    sourceLabel: target.deck.sourceLabel,
    slides: withDerivedSlides(target.deckId, sess.params, sess.slides),
  }
}

/** 当前编辑后的教案（导出用） */
export function planForExport(sessionId) {
  const sess = ensurePrepSession(sessionId)
  return sess?.plan ? deepCopy(sess.plan) : null
}

/** 教案 → PDF doc 结构（exportPdf.buildPdf 消费） */
export function planToPdfDoc(plan, deckMeta = {}) {
  if (!plan) return null
  const blocks = []
  for (const sec of plan.sections || []) {
    blocks.push({ type: 'h', text: sec.heading })
    for (const item of sec.items || []) {
      const text = String(item)
      if (text.startsWith('## ')) blocks.push({ type: 'h', text: text.slice(3) })
      else if (text.startsWith('- ')) blocks.push({ type: 'list', text: text.slice(2) })
      else blocks.push({ type: 'p', text })
    }
  }
  return {
    title: plan.title,
    meta: [...(plan.meta || []), deckMeta.className || ''].filter(Boolean),
    blocks,
  }
}

/** 课件 → PDF doc 结构（PPT 页逐页转文本块，PDF 可翻页阅读） */
export function deckToPdfDoc(deck) {
  if (!deck) return null
  const blocks = []
  for (const [i, s] of (deck.slides || []).entries()) {
    blocks.push({ type: 'h', text: plainMath(`${i + 1}. ${s.title || ''}`) })
    if (s.lead) blocks.push({ type: 'p', text: plainMath(s.lead) })
    if (s.equation) blocks.push({ type: 'formula', text: plainMath(s.equation) })
    for (const b of s.bullets || []) blocks.push({ type: 'list', text: plainMath(b) })
    if (s.figure) blocks.push({ type: 'quote', text: plainMath(`图形：${s.figure}`) })
    if (s.note) blocks.push({ type: 'quote', text: plainMath(`讲稿：${s.note}`) })
  }
  return {
    title: plainMath(deck.title),
    meta: [deck.subtitle, deck.meta?.textbook, deck.meta?.className, deck.meta?.duration].filter(Boolean).map(plainMath),
    blocks,
  }
}

export function rememberExport(sessionId, info) {
  const sess = ensurePrepSession(sessionId)
  if (!sess) return
  sess.lastExport = { ...info, at: Date.now() }
}
