/**
 * 离线 fixture 装载：把 run-02 采集到的现役真实响应打包进构建产物。
 *
 * 目录约定（由 .work/scripts/r02-harvest.py 生产）：
 *   src/offline/fixtures/<role>/index.json   { "<METHOD> <path>": { file, status, ... } }
 *   src/offline/fixtures/<role>/<slug>.json  原始响应文本（现役真实返回）
 *
 * 运行时只读；不做任何改写（除 token 脱敏），保证「回放的就是采证到的」。
 */
const RAW = import.meta.glob('./fixtures/*/*.json', { eager: true, query: '?raw', import: 'default' })

const ROLES = ['student', 'teacher', 'researcher']

function baseName(p) {
  const parts = p.split('/')
  return parts[parts.length - 1]
}

function dirName(p) {
  const parts = p.split('/')
  return parts[parts.length - 2]
}

/** { role: { '<METHOD> <path>': { key, text, status } } } */
export const FIXTURES = (() => {
  const byRole = {}
  for (const role of ROLES) byRole[role] = {}

  const indexes = {}
  for (const [p, text] of Object.entries(RAW)) {
    if (baseName(p) !== 'index.json') continue
    try {
      indexes[dirName(p)] = JSON.parse(text)
    } catch {
      /* 忽略坏索引 */
    }
  }

  for (const [p, text] of Object.entries(RAW)) {
    const role = dirName(p)
    const base = baseName(p)
    if (base === 'index.json') continue
    if (!byRole[role]) continue
    const idx = indexes[role] || {}
    // 找到引用本文件的端点 key
    for (const [key, meta] of Object.entries(idx)) {
      if (meta && meta.file === base) {
        byRole[role][key] = { key, text: String(text), status: meta.status || 200 }
        break
      }
    }
    // 兜底：文件名反推（slug 不可逆，仅用于脱索引场景）
  }
  return byRole
})()

export function listKeys(role) {
  return Object.keys(FIXTURES[role] || {})
}

/** 精确 key 查询 */
export function fixtureText(role, key) {
  const hit = FIXTURES[role]?.[key]
  return hit ? hit.text : null
}

/**
 * 按 (method, path) 查询，允许查询串差异：
 * 1) 完全一致；2) 忽略 query；3) 前缀匹配（路径参数化端点，如 /teacher-v3/prep/sessions/{id}）
 */
export function findFixture(role, method, path) {
  const bucket = FIXTURES[role]
  if (!bucket) return null
  const exact = `${method} ${path}`
  if (bucket[exact]) return bucket[exact]
  const noQuery = path.split('?')[0]
  const sameNoQuery = `${method} ${noQuery}`
  if (bucket[sameNoQuery]) return bucket[sameNoQuery]
  // 忽略 query 后逐个比较
  for (const [key, val] of Object.entries(bucket)) {
    const [m, kp] = key.split(' ')
    if (m !== method) continue
    if (!kp) continue
    if (kp.split('?')[0] === noQuery) return val
  }
  // 前缀匹配：把路径末段当作 id
  const segs = noQuery.split('/')
  for (let cut = segs.length - 1; cut >= 2; cut--) {
    const prefix = segs.slice(0, cut).join('/')
    for (const [key, val] of Object.entries(bucket)) {
      const [m, kp] = key.split(' ')
      if (m !== method || !kp) continue
      const kpNoQuery = kp.split('?')[0]
      if (kpNoQuery.startsWith(prefix + '/')) return val
    }
  }
  return null
}