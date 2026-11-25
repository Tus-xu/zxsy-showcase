/**
 * 离线演示的本地状态：只在「服务边界」承接业务对象，UI 仍由现役组件渲染。
 *
 * - session：当前离线登录身份（学生/教师/科研），刷新后保留
 * - published：教师发布快照（学生课堂/作业可见性以它为准）
 * - uploads：学生上传的题图（按 SHA-256 绑定，保留文件名与采证结果）
 * - conversations：学生会话与消息（本地追加）
 * - showcase：教学示例会话的进度（主阶段 / 解法路径 / 已证事实 / 轮次）
 * - quizLog：题目作答记录（首答与订正，用于小结的真实计数）
 * - errorBook：示例错题本（并进现役「错题本」页读取的同一个响应）
 *
 * 纪律：这里只存「现役采证过的业务对象形状」，不自造字段。
 *   showcase / quizLog / errorBook 是本轮教学示例专用的本地分支，
 *   只在 `src/offline/showcase/` 内读写，不进入任何现役业务对象。
 */
const KEY = 'ma_offline_demo_v1'

const EMPTY = {
  session: null,
  published: [],
  uploads: [],
  conversations: [],
  grading: [],
  showcase: {},
  free: {},
  quizLog: [],
  errorBook: [],
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw)
    return { ...EMPTY, ...parsed }
  } catch {
    return { ...EMPTY }
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 配额/隐私模式：仅内存 */
  }
  return state
}

export const store = read()

export function getState() {
  return store
}

export function patch(mutator) {
  const next = { ...store }
  mutator(next)
  Object.assign(store, next)
  write(store)
  return store
}

export function setSession(session) {
  return patch((s) => { s.session = session })
}

export function getSession() {
  return store.session
}

export function resetAll() {
  for (const k of Object.keys(store)) delete store[k]
  Object.assign(store, JSON.parse(JSON.stringify(EMPTY)))
  write(store)
}