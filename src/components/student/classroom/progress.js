/**
 * 学生端「课堂 / 双师课堂」状态助手。
 *
 * 跨端只读契约（教师端发布 / 批改写入，本文件只读或按契约写学生侧）：
 * - 发布记录：store.teacher.publish.records[{ id, deckId, deckTitle, className, version, publishedAt, slides, meta, editor }]
 *   slides 是发布瞬间的深拷贝快照；学生端只按 record.slides 渲染，不读教师未发布的后续修改。
 * - 学生进度：store.student.classroom.progress[deckId] = { page, total, pct, updatedAt, openedAt, recordId, title, status }
 * - 打开记录：store.student.classroom.opened 对象数组（最新在最后，上限 30）
 * - 批改结果：store.teacher.grading.grades[submissionId] = { score, comment, confirmed, gradedAt }；仅 confirmed===true 才展示分数
 * - 本场景扩展状态：store.ext.studentClassroom（播放位置 / 助教问答 / 上传材料），整场复位会一起清空
 */
import { store } from '../../../state/demo'
import {
  STUDENT_CLASS,
  PRESET_RECORD_ID,
  buildPresetPublishedRecord,
  findSelfClass,
  deckForSelfClass,
  selfClassTopics,
  materialSource,
  cloneSlides,
} from '../../../data/classroom'
import { submissions } from '../../../data/submissions'

const EXT_KEY = 'studentClassroom'
const EMPTY = Object.freeze([])

/* ------------------------------------------------------------------ */
/* 扩展命名空间                                                         */
/* ------------------------------------------------------------------ */

export function ensureExt() {
  if (!store.ext || typeof store.ext !== 'object') store.ext = {}
  if (!store.ext[EXT_KEY] || typeof store.ext[EXT_KEY] !== 'object') {
    store.ext[EXT_KEY] = { playback: {}, qa: {}, material: null }
  }
  const ext = store.ext[EXT_KEY]
  if (!ext.playback || typeof ext.playback !== 'object') ext.playback = {}
  if (!ext.qa || typeof ext.qa !== 'object') ext.qa = {}
  if (!('material' in ext)) ext.material = null
  return ext
}

/* ------------------------------------------------------------------ */
/* 发布记录（只读 store.teacher.publish.records）                        */
/* ------------------------------------------------------------------ */

function timeValue(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Date.parse(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

export function normalizeRecord(record) {
  if (!record || typeof record !== 'object') return null
  const meta = record.meta && typeof record.meta === 'object' ? record.meta : {}
  const slides = cloneSlides(record.slides || record.snapshot?.slides || record.deck?.slides || [])
  const id = String(record.id || '')
  if (!id || !slides.length) return null
  return {
    id,
    deckId: String(record.deckId || record.deck?.id || meta.deckId || ''),
    deckTitle: String(record.deckTitle || record.title || record.deck?.title || meta.title || '未命名课件'),
    className: String(record.className || meta.className || ''),
    version: record.version ?? meta.versionLabel ?? 1,
    publishedAt: record.publishedAt ?? record.at ?? meta.publishedAt ?? null,
    slides,
    meta,
    editor: record.editor || '张老师',
    preset: !!record.preset,
  }
}

/** 全部老师的发布记录（按发布时间倒序，最近发布的在前） */
export function allPublishedRecords() {
  const raw = store.teacher?.publish?.records
  if (!Array.isArray(raw)) return []
  return raw
    .map(normalizeRecord)
    .filter(Boolean)
    .sort((a, b) => timeValue(b.publishedAt) - timeValue(a.publishedAt))
}

/**
 * 学生可见的课件：records 为空 → 预置发布 v1 回退（页面内标注，不写入 store）；
 * 否则只显示本班（高二 (1) 班）或未标班级的发布记录，并为同一 deck 标出最新版本。
 */
export function visiblePublishedRecords() {
  const all = allPublishedRecords()
  if (!all.length) {
    const preset = normalizeRecord(buildPresetPublishedRecord())
    return { records: preset ? [{ ...preset, isLatest: true }] : [], presetUsed: !!preset, allCount: 0 }
  }
  const mine = all.filter((r) => !r.className || r.className === STUDENT_CLASS)
  const latestByDeck = new Map()
  for (const r of mine) {
    const cur = latestByDeck.get(r.deckId)
    if (!cur || timeValue(r.publishedAt) > timeValue(cur.publishedAt)) latestByDeck.set(r.deckId, r)
  }
  return {
    records: mine.map((r) => ({ ...r, isLatest: latestByDeck.get(r.deckId)?.id === r.id })),
    presetUsed: false,
    allCount: all.length,
  }
}

export function findRecordById(recordId) {
  const id = String(recordId || '')
  if (!id) return null
  const found = allPublishedRecords().find((r) => r.id === id)
  if (found) return { ...found, isLatest: true }
  if (id === PRESET_RECORD_ID) {
    const preset = normalizeRecord(buildPresetPublishedRecord())
    return preset ? { ...preset, isLatest: true } : null
  }
  return null
}

/** 发布记录 id 即播放页的 :sessionId（prepub / 预置回退均适用） */
export function recordSessionId(record) {
  return record ? record.id : ''
}

/* ------------------------------------------------------------------ */
/* 播放页 session 解析：发布记录 / 自主课题 / 上传材料                    */
/* ------------------------------------------------------------------ */

function publishedSession(record) {
  return {
    kind: 'published',
    sessionId: record.id,
    recordId: record.id,
    deckId: record.deckId,
    title: record.deckTitle,
    slides: record.slides,
    className: record.className || STUDENT_CLASS,
    version: record.version,
    editor: record.editor,
    publishedAt: record.publishedAt,
    isPreset: record.preset,
    meta: record.meta || {},
    sourceLabel: `${record.editor || '老师'} · 发布 ${versionLabel(record.version)}`,
    presetLabel: record.preset ? '预置发布版本（教师端尚未发布真实记录）' : '',
    material: null,
  }
}

function selfSession(topic) {
  const deck = deckForSelfClass(topic)
  if (!deck) return null
  return {
    kind: 'self',
    sessionId: topic.id,
    recordId: null,
    deckId: deck.id,
    title: deck.title,
    slides: cloneSlides(deck.slides),
    className: STUDENT_CLASS,
    version: null,
    editor: null,
    publishedAt: null,
    isPreset: false,
    meta: deck.meta || {},
    sourceLabel: topic.kind === 'material' ? '我上传的材料 · 自主双师课堂' : `自主双师课堂 · ${topic.kicker.replace('课题 · ', '')}`,
    presetLabel: '',
    material: topic.kind === 'material' ? materialSource : null,
    topic,
  }
}

export function resolveDualSession(sessionId) {
  const id = String(sessionId || '')
  if (!id) return null
  const record = findRecordById(id)
  if (record) return publishedSession(record)
  const topic = findSelfClass(id)
  if (topic) return selfSession(topic)
  // 兼容主持人工具/旧链接的双师检查点：dual-deck-0/1/2 → 三个自主课题
  const alias = /^dual-deck-(\d+)$/.exec(id)
  if (alias) {
    const t = selfClassTopics.filter((x) => x.kind === 'topic')[Number(alias[1])]
    if (t) return selfSession(t)
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 进度 / 打开记录（跨端契约写入）                                       */
/* ------------------------------------------------------------------ */

export function versionLabel(v) {
  if (v === null || v === undefined || v === '') return 'v1'
  const s = String(v)
  return s.startsWith('v') ? s : `v${s}`
}

export function formatTime(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' && !/^\d+$/.test(v)) return v
  const d = new Date(Number(v))
  if (Number.isNaN(d.getTime())) return String(v)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function pctOf(page, total) {
  const t = Math.max(1, Number(total) || 1)
  const p = Math.min(Math.max(1, Number(page) || 1), t)
  return Math.min(100, Math.max(0, Math.round((p / t) * 100)))
}

export function getProgress(deckId) {
  const progress = store.student?.classroom?.progress
  return progress && deckId && progress[deckId] ? progress[deckId] : null
}

/** 写 store.student.classroom.progress[deckId]（跨端契约） */
export function writeProgress({ deckId, title, page, total, recordId = null }) {
  if (!deckId) return null
  ensureExt()
  const classroom = store.student.classroom
  if (!classroom.progress || typeof classroom.progress !== 'object') classroom.progress = {}
  const prev = classroom.progress[deckId] || null
  const now = Date.now()
  const t = Math.max(1, Number(total) || 1)
  const p = Math.min(Math.max(1, Number(page) || 1), t)
  const pct = pctOf(p, t)
  const next = {
    page: p,
    total: t,
    pct,
    updatedAt: now,
    openedAt: prev?.openedAt || now,
    recordId: recordId || null,
    title: title || prev?.title || '',
    status: pct >= 100 ? 'completed' : 'opened',
  }
  classroom.progress[deckId] = next
  // 兼容现有 demo 状态：镜像当前页，便于其它端/旧逻辑读取
  if (!store.student.dual || typeof store.student.dual !== 'object') store.student.dual = { sessions: {}, currentPage: {} }
  if (!store.student.dual.currentPage || typeof store.student.dual.currentPage !== 'object') {
    store.student.dual.currentPage = {}
  }
  store.student.dual.currentPage[deckId] = p
  return next
}

/** 打开课件：push store.student.classroom.opened + 建立/恢复进度 */
export function recordOpen({
  recordId = null,
  deckId,
  deckTitle,
  className = STUDENT_CLASS,
  version = null,
  source = 'published',
  total = 1,
  page = null,
}) {
  if (!deckId) return null
  ensureExt()
  const classroom = store.student.classroom
  if (!Array.isArray(classroom.opened)) classroom.opened = []
  const now = Date.now()
  const entry = {
    recordId: recordId || null,
    deckId,
    deckTitle: deckTitle || '',
    className,
    version,
    source,
    at: now,
  }
  const last = classroom.opened[classroom.opened.length - 1]
  if (last && last.recordId === entry.recordId && last.deckId === entry.deckId && last.source === entry.source) {
    Object.assign(last, entry)
  } else {
    classroom.opened.push(entry)
  }
  while (classroom.opened.length > 30) classroom.opened.shift()
  const prev = classroom.progress?.[deckId]
  writeProgress({
    deckId,
    title: deckTitle,
    page: page || prev?.page || 1,
    total,
    recordId,
  })
  return entry
}

/** 最近打开的课堂（按进度更新时间倒序；页面据此渲染“最近课堂”） */
export function recentClassrooms(limit = 3) {
  const progress = store.student?.classroom?.progress || {}
  return Object.keys(progress)
    .map((deckId) => ({ deckId, ...progress[deckId] }))
    .filter((x) => x && x.title)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
}

/* ------------------------------------------------------------------ */
/* 双师课堂播放状态（ext.studentClassroom.playback）                    */
/* ------------------------------------------------------------------ */

export function getPlayback(deckId) {
  const ext = ensureExt()
  return deckId && ext.playback[deckId] ? ext.playback[deckId] : null
}

export function savePlayback(deckId, patch) {
  if (!deckId) return null
  const ext = ensureExt()
  const prev = ext.playback[deckId] || {}
  ext.playback[deckId] = { ...prev, ...patch, updatedAt: Date.now() }
  return ext.playback[deckId]
}

/* ------------------------------------------------------------------ */
/* AI 助教问答（ext.studentClassroom.qa，按 deck + 页持久化）            */
/* ------------------------------------------------------------------ */

export function qaKey(deckId, page) {
  return `${deckId}::${Number(page) || 1}`
}

export function qaMessages(deckId, page) {
  const ext = ensureExt()
  const list = ext.qa[qaKey(deckId, page)]
  return Array.isArray(list) ? list : EMPTY
}

export function pushQaMessage(deckId, page, message) {
  if (!deckId) return null
  const ext = ensureExt()
  const key = qaKey(deckId, page)
  if (!Array.isArray(ext.qa[key])) ext.qa[key] = []
  const entry = { ...message, at: Date.now() }
  ext.qa[key].push(entry)
  return entry
}

/* ------------------------------------------------------------------ */
/* 上传材料（ext.studentClassroom.material）                            */
/* ------------------------------------------------------------------ */

export function materialUpload() {
  const ext = ensureExt()
  const m = ext.material
  return m && typeof m === 'object' ? m : null
}

export function setMaterialUpload(data) {
  const ext = ensureExt()
  ext.material = data
    ? { ...data, at: data.at || Date.now() }
    : null
  return ext.material
}

/* ------------------------------------------------------------------ */
/* 作业（学生林一川 = sub-A）与批改结果（只读 grades）                   */
/* ------------------------------------------------------------------ */

export function studentSubmission() {
  return submissions.find((s) => s.id === 'sub-A') || null
}

/**
 * 已确认的批改结果；未批改/未确认 → null（学生端显示“待批改”，不得编造分数）。
 */
export function confirmedGrade(submissionId) {
  const grades = store.teacher?.grading?.grades
  const g = grades && typeof grades === 'object' ? grades[submissionId] : null
  if (!g || typeof g !== 'object') return null
  if (g.confirmed !== true) return null
  const score = typeof g.score === 'number' ? g.score : Number(g.score)
  if (!Number.isFinite(score)) return null
  return {
    score,
    comment: typeof g.comment === 'string' ? g.comment : '',
    gradedAt: g.gradedAt ?? null,
    confirmed: true,
  }
}

export function homeworkState() {
  const submission = studentSubmission()
  if (!submission) return null
  const grade = confirmedGrade(submission.id)
  return {
    submission,
    grade,
    graded: !!grade,
    statusLabel: grade ? `已批改 · ${grade.score}/${submission.fullScore}` : '待批改',
  }
}
