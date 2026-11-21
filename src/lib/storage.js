/** 本地持久化：独立命名空间，支持单案复位与整场复位；不触碰原系统或其它浏览器数据。 */
const KEY = 'mathesis-showcase-v1'

export function loadPersisted() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

let timer = null
export function persist(state) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* 存储满/被禁用时静默：不影响演示主流程 */
    }
  }, 120)
}

export function clearPersisted() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
