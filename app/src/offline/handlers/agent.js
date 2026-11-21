/**
 * 学生「上传题图 → 对话引导」回放（样板一）。
 *
 * 数据来源：run-02 在现役学生入口真实上传三张原图后采集的
 *   - POST /api/files/upload 响应（含 file_id / upload_url）
 *   - POST /api/files/{id}/parse 响应
 *   - GET  /api/files/{id} 与 /content
 *   - 每一轮 POST /api/agent/chat 的 SSE 原文
 * 结构见 evidence/live/run-02/student/api/flow-{A,B,C}.json。
 *
 * 匹配方式：现役前端自己会算文件 SHA-256 并在 uploadInit 里带上（useFileUpload.js:158-163），
 * 因此离线层按 sha256 精确匹配到「哪一道题」，不做任何猜测。
 */
import { patch, store } from '../state'

const RAW_FLOWS = import.meta.glob('../fixtures/student/flow-*.json', { eager: true, query: '?raw', import: 'default' })

export const OFFLINE_NOTICE = '离线演示：本步骤只回放已采证的对话分支，未收录的输入不会生成新回答。'

/** 解析 flow-*.json → { [sha256]: flow } */
export const FLOWS = (() => {
  const out = {}
  for (const [, text] of Object.entries(RAW_FLOWS)) {
    try {
      const flow = JSON.parse(text)
      const sha = flow?.image?.sha256
      if (sha) out[String(sha).toLowerCase()] = flow
    } catch {
      /* 坏文件忽略 */
    }
  }
  return out
})()

export function flowBySha(sha) {
  if (!sha) return null
  return FLOWS[String(sha).toLowerCase()] || null
}

function fileIdOf(flow) {
  try {
    return JSON.parse(flow.upload.resp)?.data?.file_id || null
  } catch {
    return null
  }
}

/* 记录 file_id → 案例，供 parse/content/detail 命中 */
function rememberFile(fileId, caseName) {
  if (!fileId) return
  patch((s) => {
    s.files = { ...(s.files || {}), [fileId]: caseName }
  })
}

export function handleFileUpload(body) {
  const sha = (body?.sha256 || '').toLowerCase()
  const flow = flowBySha(sha)
  if (!flow) {
    return {
      code: 40402,
      message: `离线演示：该图片未在现役系统中采证（sha256=${sha.slice(0, 12)}…），无法识别`,
      data: null,
    }
  }
  rememberFile(fileIdOf(flow), flow.case)
  return JSON.parse(flow.upload.resp)
}

export function handleFileById(method, path) {
  const m = path.match(/^\/api\/files\/([^/]+)(\/parse|\/content)?/)
  if (!m) return null
  const fileId = m[1]
  const sub = m[2] || ''
  const caseName = (store.files || {})[fileId]
  const flow = caseName ? Object.values(FLOWS).find((f) => f.case === caseName) : null
  if (!flow) return null
  if (method === 'POST' && sub === '/parse') return JSON.parse(flow.parse.resp)
  if (method === 'POST' && sub === '/complete') return { code: 0, message: 'ok', data: { ok: true } }
  if (method === 'GET' && sub === '/content') {
    return flow.file_content?.resp ? JSON.parse(flow.file_content.resp) : { code: 0, message: 'ok', data: { text: '' } }
  }
  if (method === 'GET' && !sub) return JSON.parse(flow.upload.resp)?.data ? { code: 0, message: 'ok', data: { file_id: fileId, status: 'parsed' } } : null
  return null
}

/* ─────────── 对话 SSE ─────────── */

function parseSse(raw) {
  const events = []
  for (const block of String(raw).split(/\n\n+/)) {
    const lines = block.split(/\n/)
    let event = null
    let data = null
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data = (data ? data + '\n' : '') + line.slice(5).trim()
      else if (line.startsWith(':')) { /* 注释/心跳 */ }
    }
    if (event) {
      let parsed = null
      try { parsed = data ? JSON.parse(data) : null } catch { parsed = { raw: data } }
      events.push({ event, data: parsed })
    }
  }
  return events
}

/** 首轮：请求体里带附件 file_id；后续轮：带 conversation_id */
export function pickChatTurn(body) {
  const attachments = body?.attachments || body?.files || []
  const fileId = attachments?.[0]?.file_id || attachments?.[0]?.id || body?.file_id || null
  const convId = body?.conversation_id || null
  const text = String(body?.message || body?.content || '').trim()

  let caseName = null
  let turnIdx = 0
  let conv = null

  if (fileId && (store.files || {})[fileId]) {
    caseName = store.files[fileId]
  } else if (convId && (store.chat || {})[convId]) {
    conv = store.chat[convId]
    caseName = conv.case
    turnIdx = conv.turn
  }
  if (!caseName) {
    // 没带附件的首轮（例如直接文字提问）：交给通用兜底
    return null
  }
  const flow = Object.values(FLOWS).find((f) => f.case === caseName)
  if (!flow || !Array.isArray(flow.turns) || turnIdx >= flow.turns.length) {
    return { case: caseName, events: [{ event: 'token', data: { text: OFFLINE_NOTICE } }, { event: 'done', data: {} }], done: true }
  }
  const turn = flow.turns[turnIdx]
  const events = parseSse(turn.sse || '')

  // 记录会话 → 案例与下一轮
  const meta = events.find((e) => e.event === 'meta')?.data || {}
  const newConvId = meta.conversation_id || convId
  if (newConvId) {
    patch((s) => {
      s.chat = { ...(s.chat || {}), [newConvId]: { case: caseName, turn: turnIdx + 1, lastInput: text } }
    })
  }
  return { case: caseName, events, expectedInput: turn.input, actualInput: text }
}