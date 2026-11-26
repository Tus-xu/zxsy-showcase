/**
 * 双师课堂离线服务：创建 → 生成中（SSE）→ 播放器；列表/详情/进度/笔记/问答/练习。
 *
 * session_id 编码 deckKey + 创建时间：刷新后仍能由 id 恢复；未知 id 返回 null 交给 fixture。
 * 三套课件来自 classroomDecks.js（真实 PPT 选题），页面仍由现役 DualView/DeckSlideStage 渲染。
 */
import { patch, store } from '../state'
import { CLASSROOM_DECKS, PRESET_TOPICS, deckByKey, pickDeckByTopic, sessionOf, outlinesOf } from '../showcase/classroomDecks'

const ok = (data) => ({ status: 200, body: { code: 0, message: 'ok', data } })
const fail = (message, status = 404, code = 40401) => ({ status, body: { code, message, data: null } })
const GENERATING_MS = 3500
/** 课堂页「老师课堂」入口使用的真实课件会话（不伪造生成；deck 来自 8996） */
const TEACHER_SESSION_ID = 'sc-dual-teacher-line'
const TEACHER_COURSEWARE_ID = 'demo-courseware-line-8996'
const TEACHER_DECK_SOURCE = '8996e8480303266cfc895a3068b559a26fbdbb34a26e655a4a850d3c3d0b948d'

function teacherSession() {
  const deck = deckByKey('line-full')
  const s = sessionOf(deck, TEACHER_SESSION_ID, 'ready')
  return {
    ...s,
    source_type: 'teacher_deck',
    source_ref: {
      deck_key: 'line-full',
      deck_id: TEACHER_DECK_SOURCE,
      teacher_name: '张老师',
      class_name: '高一(3)班 · 数学',
    },
    deck_meta: { ...(s.deck_meta || {}), title: deck.title, textbook_line: deck.textbookLine, deck_key: 'line-full' },
  }
}

function teacherCourseware() {
  const deck = deckByKey('line-full')
  const progress = store.classrooms?.progress?.[TEACHER_SESSION_ID] || {}
  const idx = Number(progress.slide_index)
  const pageCount = deck.slides.length
  const pct = Number.isInteger(idx) && idx >= 0 && pageCount
    ? Math.max(0, Math.min(100, Math.round((idx / pageCount) * 100)))
    : 0
  const stat = store.classrooms?.stats?.[TEACHER_SESSION_ID] || {}
  const answered = Number(stat.answered) || 0
  return {
    courseware_id: TEACHER_COURSEWARE_ID,
    title: deck.title,
    deck_id: TEACHER_DECK_SOURCE,
    deck_revision: 1,
    class_id: 'demo-class-g1-3',
    class_name: '高一(3)班 · 数学',
    teacher_name: '张老师',
    page_count: pageCount,
    published_at: '2026-11-20T08:00:00.000Z',
    opened: true,
    progress_pct: pct,
    practice_accuracy: answered ? Math.round((Number(stat.correct) || 0) / answered * 100) : null,
    last_session_id: TEACHER_SESSION_ID,
  }
}

function ensureClassrooms() {
  if (!store.classrooms || typeof store.classrooms !== 'object') {
    patch((s) => { s.classrooms = { created: {}, progress: {}, notes: {}, qa: {}, stats: {} } })
  }
  if (!store.classrooms.created) store.classrooms.created = {}
  if (!store.classrooms.progress) store.classrooms.progress = {}
  if (!store.classrooms.notes) store.classrooms.notes = {}
  if (!store.classrooms.qa) store.classrooms.qa = {}
  if (!store.classrooms.stats) store.classrooms.stats = {}
  return store.classrooms
}

function parseId(id) {
  const s = String(id || '')
  const m = s.match(/^sc-dual-(line-full|sequence-sum|line-concise)(?:-([a-z0-9]+))?$/)
  if (m) return { key: m[1], stamp: m[2] || '', seeded: !m[2] }
  // 兼容无 key 的固定演示 id
  if (s === 'sc-dual-demo') return { key: 'line-full', stamp: '', seeded: true }
  return null
}

function sessionById(id) {
  if (String(id) === TEACHER_SESSION_ID) {
    const s = teacherSession()
    s.progress = store.classrooms?.progress?.[id] || s.progress
    s.notes = store.classrooms?.notes?.[id] || ''
    s.qa_summary = store.classrooms?.qa?.[id] || {}
    s.practice_stats = store.classrooms?.stats?.[id] || {}
    return s
  }
  const parsed = parseId(id)
  if (!parsed) return null
  const deck = deckByKey(parsed.key)
  if (!deck) return null
  const made = store.classrooms?.created?.[id]
  const createdAt = made?.createdAt || (parsed.stamp ? parseInt(parsed.stamp, 36) : 0)
  const age = createdAt ? Date.now() - createdAt : Infinity
  const status = parsed.seeded || age >= GENERATING_MS ? 'ready' : 'generating'
  const session = sessionOf(deck, id, status)
  // 生成中只给大纲，逐页 slide 由 SSE 推送；已生成/预置给全量，刷新可恢复
  if (status === 'generating') {
    session.slides = []
    session.slide_count = deck.slides.length
    session.generated_at = null
  }
  session.progress = store.classrooms?.progress?.[id] || session.progress
  session.notes = store.classrooms?.notes?.[id] || ''
  session.qa_summary = store.classrooms?.qa?.[id] || {}
  session.practice_stats = store.classrooms?.stats?.[id] || {}
  return session
}

function summaryOf(session) {
  return {
    session_id: session.session_id,
    title: session.title,
    mode: session.mode,
    slide_count: session.slide_count,
    status: session.status,
    error: null,
    source_type: session.source_type,
    source_ref: session.source_ref,
    knowledge_points: [],
    slides_generated: session.slides.length,
    verification_overall: 'verified',
    progress: session.progress,
    created_at: session.created_at,
  }
}

function allSessions() {
  const out = PRESET_TOPICS.map((p) => summaryOf(sessionById(`sc-dual-${p.key}`)))
  for (const id of Object.keys(store.classrooms?.created || {})) {
    const s = sessionById(id)
    if (s) out.push(summaryOf(s))
  }
  return out
}

/** 课堂 SSE：title → outlines → slide×N → status ready → practice → done */
export function classroomEvents(id) {
  const parsed = parseId(id)
  if (!parsed) return null
  const deck = deckByKey(parsed.key)
  if (!deck) return null
  const evs = [
    { event: 'title', data: { title: deck.title }, delay: 260 },
    { event: 'outlines', data: { outlines: outlinesOf(deck), slide_count: deck.slides.length }, delay: 420 },
  ]
  deck.slides.forEach((s, i) => {
    evs.push({
      event: 'slide',
      data: { index: i, order: s.order, completed: i + 1, total: deck.slides.length, slide: s },
      delay: 620,
    })
  })
  evs.push({ event: 'status', data: { status: 'ready', stage: 'content' }, delay: 420 })
  evs.push({ event: 'practice', data: { practice: deck.practice, status: 'ready', error: null }, delay: 340 })
  evs.push({ event: 'done', data: {}, delay: 80 })
  return evs
}

/** 返回 {status, body} 或 {sse: events}；非课堂域返回 null */
export function handleClassroom(method, path, body = {}) {
  const st = ensureClassrooms()
  const p = String(path).split('?')[0]

  // 课堂页「老师课堂」：用本仓库真实课件替换旧 fixture 的单调性 5 页 deck
  if (method === 'GET' && p === '/api/student/classroom-coursewares') {
    return ok({ items: [teacherCourseware()], total: 1 })
  }
  if (method === 'POST' && /^\/api\/student\/classroom-coursewares\/[^/]+\/open$/.test(p)) {
    return ok({ session_id: TEACHER_SESSION_ID, title: '直线的点斜式方程' })
  }

  if (method === 'POST' && p === '/api/classroom/sessions') {
    const deck = pickDeckByTopic(body.topic)
    const id = `sc-dual-${deck.key}-${Date.now().toString(36)}`
    st.created[id] = { deckKey: deck.key, topic: String(body.topic || deck.topic), createdAt: Date.now() }
    patch((s) => { s.classrooms = st })
    return ok({ session_id: id, title: deck.title })
  }

  if (method === 'GET' && p === '/api/classroom/sessions') {
    const qs = new URLSearchParams(String(path).split('?')[1] || '')
    let items = allSessions()
    const status = qs.get('status')
    if (status) items = items.filter((x) => x.status === status)
    const source = qs.get('source_type')
    if (source) items = items.filter((x) => x.source_type === source)
    const limit = Math.max(1, Math.min(Number(qs.get('limit')) || 50, 50))
    return ok({ total: items.length, items: items.slice(0, limit) })
  }

  const eventM = p.match(/^\/api\/classroom\/sessions\/([^/]+)\/events$/)
  if (method === 'GET' && eventM) {
    const evs = classroomEvents(eventM[1])
    return evs ? { sse: evs } : null
  }

  const detailM = p.match(/^\/api\/classroom\/sessions\/([^/]+)$/)
  if (method === 'GET' && detailM) {
    const s = sessionById(detailM[1])
    return s ? ok(s) : null
  }

  const progressM = p.match(/^\/api\/classroom\/sessions\/([^/]+)\/progress$/)
  if (method === 'PATCH' && progressM) {
    st.progress[progressM[1]] = body?.progress || body || { slide_index: 0 }
    patch((s) => { s.classrooms = st })
    return ok({ ok: true, progress: st.progress[progressM[1]] })
  }

  const notesM = p.match(/^\/api\/classroom\/sessions\/([^/]+)\/notes$/)
  if (method === 'POST' && notesM) {
    st.notes[notesM[1]] = String(body?.notes || body?.content || '')
    patch((s) => { s.classrooms = st })
    return ok({ ok: true })
  }

  const qaM = p.match(/^\/api\/classroom\/sessions\/([^/]+)\/qa$/)
  if (method === 'POST' && qaM) {
    const list = Array.isArray(st.qa[qaM[1]]) ? st.qa[qaM[1]] : []
    list.push({ question: body?.question || '', answer: '离线课堂：先跟着本页讲稿走一遍，再回到练习检验。', at: Date.now() })
    st.qa[qaM[1]] = list
    patch((s) => { s.classrooms = st })
    return ok({ answer: list[list.length - 1].answer })
  }

  const answerM = p.match(/^\/api\/classroom\/sessions\/([^/]+)\/practice-answer$/)
  if (method === 'POST' && answerM) {
    const sid = answerM[1]
    const stat = st.stats[sid] || { answered: 0, correct: 0 }
    stat.answered += 1
    if (body?.correct) stat.correct += 1
    st.stats[sid] = stat
    patch((s) => { s.classrooms = st })
    return ok({ ok: true, stats: stat })
  }

  return null
}
