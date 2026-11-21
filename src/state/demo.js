import { reactive, watch } from 'vue'
import { loadPersisted, persist } from '../lib/storage'

/**
 * 展示版本地状态：全部业务对象都从这份本地状态派生。
 * 拆分原则：内容数据（src/data/**）只读；本文件只保存“演示过程中真实发生的状态变化”，
 * 刷新后恢复，主持人可单案/整场复位。
 */
const VERSION = 1

export function blankState() {
  return {
    version: VERSION,
    role: null,
    student: {
      guidance: {
        A: blankGuidanceSession('A'),
        B: blankGuidanceSession('B'),
        C: blankGuidanceSession('C'),
      },
      errors: [], // 错题本条目：{ caseId, wrongInput, at, mastered }
      practice: { caseId: null, answers: {}, done: false },
      library: { materials: ['导数符号', '椭圆焦距', '配方法'], selected: [], chat: [] },
      classroom: { opened: [], progress: {} },
      dual: { sessions: {}, currentPage: {} },
    },
    teacher: {
      prep: {
        sessions: {}, // sessionId -> { title, tab, blueprint, deck, plan, updatedAt, published }
        activeSessionId: null,
        deckEdits: {},
        planEdits: {},
      },
      publish: {
        records: [], // { deckId, className, snapshot, at }
      },
      grading: {
        grades: {}, // submissionId -> { score, comment, confirmed }
      },
      lastJob: null,
    },
    research: {
      projectId: 'p-fem',
      read: { paperId: 'p-fem', page: 8, selectedPara: null, notes: [] },
      write: { activeFile: 'main.tex', files: {}, compiled: null, log: [] },
    },
    host: {
      lastResetAt: null,
      guestMode: false,
    },
    // 扩展命名空间：各场景实现可写 store.ext.<场景键>，同样被持久化并可整场复位
    ext: {},
  }
}

function blankGuidanceSession(id) {
  return {
    caseId: id,
    uploaded: false,
    fileHash: null,
    fileName: null,
    startedAt: null,
    stepIndex: 0,
    finished: false,
    messages: [], // { role: 'ai'|'student', text?, kind?, at }
    selected: [],
    wrongCount: 0,
    helpCount: 0,
    variantIndex: -1,
    variantAnswer: null,
    variantCorrect: null,
    lastHint: null,
  }
}

function mergeDeep(base, patch) {
  if (!patch || typeof patch !== 'object') return base
  const out = Array.isArray(base) ? base.slice() : { ...base }
  for (const key of Object.keys(patch)) {
    const pv = patch[key]
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && base && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = mergeDeep(base[key], pv)
    } else {
      out[key] = pv
    }
  }
  return out
}

const persisted = loadPersisted()
export const store = reactive(mergeDeep(blankState(), persisted))

watch(
  store,
  (s) => persist(s),
  { deep: true },
)

export function resetGuidance(caseId) {
  store.student.guidance[caseId] = blankGuidanceSession(caseId)
  store.student.errors = store.student.errors.filter((e) => e.caseId !== caseId)
}

export function resetStudent() {
  store.student = blankState().student
}

export function resetTeacher() {
  store.teacher = blankState().teacher
}

export function resetResearch() {
  store.research = blankState().research
}

export function resetAll() {
  const fresh = blankState()
  fresh.host.lastResetAt = Date.now()
  Object.assign(store, fresh)
}

export function switchRole(role) {
  store.role = role
}

export function caseGuidance(id) {
  if (!store.student.guidance[id]) store.student.guidance[id] = blankGuidanceSession(id)
  return store.student.guidance[id]
}

export function addErrorRecord(caseId, wrongInput, stepId) {
  const exists = store.student.errors.some((e) => e.caseId === caseId && e.wrongInput === wrongInput)
  if (exists) return
  store.student.errors.push({ caseId, wrongInput, stepId, at: Date.now(), mastered: false })
}

export function teacherPrepSession(sessionId) {
  const sessions = store.teacher.prep.sessions
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      id: sessionId,
      tab: 'design',
      updatedAt: Date.now(),
      published: false,
      deckEdits: {},
      planEdits: {},
    }
  }
  return sessions[sessionId]
}
