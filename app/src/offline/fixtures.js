/**
 * 离线 fixture 装载与匹配。
 *
 * 数据来源（现役真机采证，逐响应原文）：
 *   run-02：`fixtures/<role>/index.json` + `<slug>.json`（角色级基线）
 *   run-03：`fixtures/student/run03/<slug>.json`（学生端列表参数补采，见 evidence/live/run-03/data）
 *
 * 匹配原则（`findFixture`）：
 *   1) 同 method 下**按 query 语义匹配**：逐参数比较，采证时见过的参数组合才命中；
 *   2) 不做前缀退化——未知端点返回 null，由回放层给现役 UI 自己的错误态；
 *   3) 无 query 的请求回退到同路径采证项（如 /auth/me）。
 */
const RAW = import.meta.glob('./fixtures/**/*.json', { eager: true, query: '?raw', import: 'default' })

const ROLES = ['student', 'teacher', 'researcher']

function baseName(p) {
  const parts = p.split('/')
  return parts[parts.length - 1]
}

function dirName(p) {
  const parts = p.split('/')
  return parts[parts.length - 2]
}

/** 角色名 = 路径中第一个 fixtures/ 之后的段（兼容 student/run03/… 的嵌套采集目录） */
function roleName(p) {
  const parts = p.split('/')
  const i = parts.indexOf('fixtures')
  if (i >= 0 && parts[i + 1]) return parts[i + 1]
  return parts[parts.length - 2]
}

/** 解析 index.json → [key, meta] */
function readIndex(p, text) {
  try {
    return Object.entries(JSON.parse(text))
  } catch {
    return []
  }
}

function parseQuery(urlOrPath) {
  const i = urlOrPath.indexOf('?')
  if (i < 0) return {}
  const qs = new URLSearchParams(urlOrPath.slice(i + 1))
  const out = {}
  for (const [k, v] of qs.entries()) out[k] = v
  return out
}

/** { role: { '<METHOD> <path>': { key, text, status, binary?, query? } } } */
export const FIXTURES = (() => {
  const byRole = {}
  for (const role of ROLES) byRole[role] = {}

  // 1) 收集所有 index 里的端点元数据
  //    文件名允许 index.json / index.txt.json（run-03 导入器把响应体统一改成 .json 后缀时
  //    会与 index 本身撞名，故导入器把 index 记为 index.txt.json）
  const metas = [] // { role, key, meta, dir }
  for (const [p, text] of Object.entries(RAW)) {
    const bn = baseName(p)
    if (bn !== 'index.json' && bn !== 'index.txt.json') continue
    const role = roleName(p)
    if (!byRole[role]) continue
    for (const [key, meta] of readIndex(p, text)) {
      metas.push({ role, key, meta: meta || {}, dir: p.split('/').slice(-2, -1)[0] })
    }
  }

  // 2) 文件内容按文件名挂到对应端点（按目录区分，避免跨目录同名覆盖）
  const byFile = {}
  for (const m of metas) {
    if (m.meta?.file) byFile[`${m.role}/${m.dir}/${m.meta.file}`] = m
    if (m.meta?.sseFiles) byFile[`${m.role}/${m.dir}/${m.meta.sseFiles}`] = m
  }
  for (const [p, text] of Object.entries(RAW)) {
    const role = roleName(p)
    const base = baseName(p)
    if (base === 'index.json' || base === 'index.txt.json' || !byRole[role]) continue
    const dir = p.slice(0, p.length - base.length - 1).split('/').pop()
    const holder = byFile[`${role}/${dir}/${base}`]
    if (!holder) continue
    const isBinary = base.endsWith('.b64.json')
    let payload = String(text)
    if (isBinary) {
      try {
        const parsed = JSON.parse(text)
        payload = { ct: parsed.ct || 'application/octet-stream', b64: parsed.b64 }
      } catch {
        payload = { ct: 'application/octet-stream', b64: '' }
      }
    }
    const method = holder.meta.method || (holder.key.startsWith('SSE ') ? 'SSE' : 'GET')
    byRole[role][holder.key] = {
      key: holder.key,
      text: payload,
      status: holder.meta.status || 200,
      binary: isBinary,
      query: parseQuery(holder.key),
      path: holder.key.split(' ').slice(1).join(' ').split('?')[0],
      method,
    }
  }
  return byRole
})()

/* 外部图片（封面/插图）采证：URL → data URI */
const RAW_IMAGES = import.meta.glob('./fixtures/**/images/*.json', { eager: true, query: '?raw', import: 'default' })

export const IMAGE_MAP = (() => {
  const out = {}
  for (const text of Object.values(RAW_IMAGES)) {
    try {
      const rec = JSON.parse(text)
      if (rec?.url && rec?.b64) out[rec.url] = `data:${rec.ct || 'image/png'};base64,${rec.b64}`
    } catch {
      /* ignore */
    }
  }
  return out
})()

export function listKeys(role) {
  return Object.keys(FIXTURES[role] || {})
}

export function fixtureText(role, key) {
  const hit = FIXTURES[role]?.[key]
  return hit ? hit.text : null
}

/** 按 query 键值比较：候选的每个参数都必须与请求一致（候选参数多于请求参数视为不命中） */
function queryMatches(candidateQuery, wantedQuery) {
  const cw = Object.keys(candidateQuery || {})
  const ww = Object.keys(wantedQuery || {})
  if (cw.length !== ww.length) return false
  for (const k of cw) {
    if (candidateQuery[k] !== wantedQuery[k]) return false
  }
  return true
}

/**
 * 按 (method, path[, query]) 查找。语义：
 *  - 完全一致（key 含相同 query）直接命中；
 *  - 否则在「同 method + 同 path」的候选里做 query 全等比较；
 *  - 请求无 query 时回退到任一同路径项（/auth/me 这类无参数端点）。
 * 不做路径前缀猜测——未知端点返回 null。
 */
export function findFixture(role, method, path) {
  const bucket = FIXTURES[role]
  if (!bucket) return null
  const wanted = parseQuery(path)
  const noQuery = path.split('?')[0]
  const exact = `${method} ${path}`
  if (bucket[exact]) return bucket[exact]

  const candidates = []
  for (const [key, val] of Object.entries(bucket)) {
    const [m, kp] = key.split(' ')
    if (m !== method || !kp) continue
    if (kp.split('?')[0] !== noQuery) continue
    candidates.push(val)
  }
  if (!candidates.length) return null
  if (Object.keys(wanted).length === 0) return candidates[0]
  const hit = candidates.find((c) => queryMatches(c.query, wanted))
  return hit || null
}
