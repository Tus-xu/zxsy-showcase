/**
 * 学生「上传题图 → 对话引导」回放（样板一）。
 *
 * 数据来源：run-02 在现役学生入口真实上传三张原图后采集的
 *   - 每一轮 POST /api/agent/chat 的 SSE 原文（含 meta/file_parsed/status/token/card/graph/action/done）
 *   - 文件链路响应见 handlers/files.js
 * 结构见 evidence/live/run-02/student/api/flow-{A,B,C}.json（合并后打包进 fixtures/student/）。
 *
 * 纪律：
 *   - 只回放采证过的轮次；游标超出即明确告知「未采证」，不生成新回答；
 *   - 会话与轮次游标写在本地状态里，刷新后可继续（与现役会话恢复一致）。
 */
import { caseOfFile } from './files'
import { patch, store } from '../state'

const RAW_FLOWS = import.meta.glob('../fixtures/student/flow-*.json', { eager: true, query: '?raw', import: 'default' })

export const OFFLINE_NOTICE = '离线演示：本步骤只回放现役系统已采证的对话分支，未采证的输入不会生成新回答。'

export const FLOWS = (() => {
  const out = {}
  for (const text of Object.values(RAW_FLOWS)) {
    try {
      const flow = JSON.parse(text)
      if (flow?.case) out[flow.case] = flow
    } catch {
      /* 坏文件忽略 */
    }
  }
  return out
})()

export function parseSse(raw) {
  const events = []
  for (const block of String(raw || '').split(/\n\n+/)) {
    const lines = block.split(/\n/)
    let event = null
    let data = null
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data = (data ? data + '\n' : '') + line.slice(5).trim()
    }
    if (!event) continue
    let parsed = null
    try { parsed = data ? JSON.parse(data) : null } catch { parsed = { raw: data } }
    events.push({ event, data: parsed })
  }
  return events
}

/** 找出本轮要回放的 SSE：首轮按附件 file_id 定位案例，其后按 conversation_id 游标推进。 */
export function pickChatTurn(body) {
  const attachments = body?.attachments || body?.files || []
  const first = attachments?.[0] || {}
  const fileId = first.file_id || first.id || body?.file_id || null
  const convId = body?.conversation_id || body?.conversationId || null
  const text = String(body?.message ?? body?.content ?? '').trim()

  let caseName = null
  let turnIdx = 0
  if (fileId && caseOfFile(fileId)) {
    caseName = caseOfFile(fileId)
  } else if (convId && (store.chat || {})[convId]) {
    const cur = store.chat[convId]
    caseName = cur.case
    turnIdx = cur.turn
  }
  if (!caseName) return { case: null, events: null, notice: true, text }

  const flow = FLOWS[caseName]
  const turns = flow?.turns || []
  if (turnIdx >= turns.length) {
    return { case: caseName, events: null, exhausted: true, text }
  }
  const turn = turns[turnIdx]
  const events = parseSse(turn.sse)
  const meta = events.find((e) => e.event === 'meta')?.data || {}
  const nextConv = meta.conversation_id || convId
  if (nextConv) {
    patch((s) => {
      s.chat = { ...(s.chat || {}), [nextConv]: { case: caseName, turn: turnIdx + 1, lastInput: text } }
    })
  }
  return { case: caseName, events, expectedInput: turn.input, actualInput: text, turnIdx }
}

export function noticeEvents(message) {
  return [
    { event: 'status', data: { stage: 'offline', text: '离线演示' } },
    { event: 'token', data: { text: message } },
    { event: 'done', data: {} },
  ]
}

/* ─────────── 会话列表与消息（刷新后恢复用） ─────────── */

function sseText(raw) {
  let out = ''
  for (const e of parseSse(raw)) {
    if (e.event === 'token') out += e.data?.text || ''
    else if (e.event === 'message') out += e.data?.text || ''
  }
  return out
}

function convMeta(flow) {
  const first = flow?.turns?.[0]?.sse
  const meta = first ? parseSse(first).find((e) => e.event === 'meta')?.data : null
  return meta || {}
}

/** GET /api/agent/conversations —— 采证列表 + 离线演示新建的会话 */
export function listConversations(basePayload) {
  let payload = null
  try { payload = JSON.parse(basePayload) } catch { payload = null }
  const items = Array.isArray(payload?.data?.items) ? payload.data.items.slice() : []
  const chats = store.chat || {}
  for (const [convId, cur] of Object.entries(chats)) {
    if (items.some((x) => (x.id || x.conversation_id) === convId)) continue
    const flow = FLOWS[cur.case]
    const meta = convMeta(flow)
    items.unshift({
      id: convId,
      title: '请分析我上传的文件',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: cur.turn * 2,
      skill: meta.skill || 'chat',
    })
  }
  return { code: 0, message: 'ok', data: { items, hasMore: false } }
}

/** GET /api/agent/conversations/{id}/messages —— 用采证 SSE 还原该会话的消息 */
export function conversationMessages(convId) {
  const cur = (store.chat || {})[convId]
  if (!cur) return null
  const flow = FLOWS[cur.case]
  if (!flow) return null
  const meta0 = convMeta(flow)
  const items = []
  const t0 = Date.now() - 3600_000
  flow.turns.forEach((turn, i) => {
    const text = sseText(turn.sse)
    const evs = parseSse(turn.sse)
    const meta = evs.find((e) => e.event === 'meta')?.data || {}
    const fig = evs.filter((e) => e.event === 'figure').map((e) => e.data)
    items.push({
      id: `u-${i}`,
      role: 'user',
      clientMsgId: `c-${i}`,
      createdAt: new Date(t0 + i * 60_000).toISOString(),
      envelope: {
        role: 'user',
        blocks: [{ type: 'markdown', content: turn.input || '请分析我上传的文件' }],
        msg_id: `m-${i}`,
      },
      attachments: turn.attachment ? [{ file_id: flow.upload_file_id || '', kind: 'image', filename: flow.image?.name || '题图.png' }] : [],
      thinking: null,
    })
    items.push({
      id: `a-${i}`,
      role: 'assistant',
      clientMsgId: `ai-${i}`,
      createdAt: new Date(t0 + i * 60_000 + 5000).toISOString(),
      envelope: {
        meta: { skill: meta.skill || 'chat', conversation_id: convId, msg_id: `am-${i}` },
        blocks: [{ type: 'markdown', content: text }],
        figures: fig,
      },
      attachments: [],
      thinking: null,
    })
  })
  return { code: 0, message: 'ok', data: { items, hasMore: false } }
}