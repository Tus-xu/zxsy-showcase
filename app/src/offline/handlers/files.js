/**
 * 上传链路回放：POST /api/files/upload → parse → detail/content。
 *
 * 数据来源：run-02 主控经现役学生入口真实上传三张原图后采集的请求/响应原文
 * （app/src/offline/fixtures/student/uploads.json）。
 *
 * 匹配依据：
 *   1) 现役前端上传请求体里的 sha256（useFileUpload.js 对压缩后文件算的哈希）——若采证时记录了就精确匹配；
 *   2) 文件名（发行包素材固定为 题1.png/题2.png/题3.png）——兜底，保证演示现场改名也不会错配到别的题；
 *   3) 都不命中 → 明确告知「未采证」，不返回假数据。
 */
import { patch, store } from '../state'

const RAW = import.meta.glob('../fixtures/student/uploads.json', { eager: true, query: '?raw', import: 'default' })

const BY_SHA = {}
const BY_NAME = {}
const BY_FILEID = {}

for (const text of Object.values(RAW)) {
  let data = {}
  try { data = JSON.parse(text) } catch { continue }
  for (const [caseName, entry] of Object.entries(data)) {
    if (!entry) continue
    const rec = { case: caseName, ...entry }
    let sha = ''
    try {
      sha = (JSON.parse(entry.upload_req || '{}').sha256 || '').toLowerCase()
    } catch { /* ignore */ }
    if (sha) BY_SHA[sha] = rec
    if (entry.image) BY_NAME[String(entry.image).toLowerCase()] = rec
    if (entry.file_id) BY_FILEID[entry.file_id] = rec
  }
}

export const UPLOAD_CASES = Object.keys(BY_NAME).length
export const UPLOAD_FILES = BY_FILEID

function pick(body) {
  const sha = String(body?.sha256 || '').toLowerCase()
  if (sha && BY_SHA[sha]) return BY_SHA[sha]
  const name = String(body?.filename || '').toLowerCase()
  if (name && BY_NAME[name]) return BY_NAME[name]
  // 允许「我的资料」等其它用途：按扩展名找不到时就返回未收录
  return null
}

export function handleUpload(body) {
  const rec = pick(body)
  if (!rec) {
    return {
      ok: false,
      payload: {
        code: 40402,
        message: `离线演示：该文件未在现役系统中采证（${body?.filename || '未命名'}），无法识别`,
        data: null,
      },
    }
  }
  patch((s) => {
    s.files = { ...(s.files || {}), [rec.file_id]: rec.case }
  })
  return { ok: true, payload: JSON.parse(rec.upload_resp) }
}

export function handleFileRoute(method, path) {
  const m = path.match(/^\/api\/files\/([^/]+)(\/parse|\/content|\/complete)?$/)
  if (!m) return null
  const fileId = m[1]
  const sub = m[2] || ''
  const rec = BY_FILEID[fileId]
  if (!rec) return null
  if (method === 'POST' && sub === '/parse') return JSON.parse(rec.parse_resp || '{"code":0,"message":"ok","data":{"ok":true}}')
  if (method === 'POST' && sub === '/complete') return { code: 0, message: 'ok', data: { ok: true } }
  if (method === 'GET' && sub === '/content') {
    return rec.content_resp ? JSON.parse(rec.content_resp) : { code: 0, message: 'ok', data: { text: '' } }
  }
  if (method === 'GET' && !sub) {
    if (rec.detail_resp) {
      try { return JSON.parse(rec.detail_resp) } catch { /* fallthrough */ }
    }
    let parsed = {}
    try { parsed = JSON.parse(rec.upload_resp || '{}') } catch { /* ignore */ }
    return {
      code: 0,
      message: 'ok',
      data: { file_id: fileId, status: 'parsed', parse_engine: parsed?.data?.parse_engine || 'mimo_vision' },
    }
  }
  return null
}

/** 当前会话正在复演的案例（按 file_id 反查） */
export function caseOfFile(fileId) {
  const rec = BY_FILEID[fileId]
  return rec ? rec.case : (store.files || {})[fileId] || null
}