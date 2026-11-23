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
import { flowAttachment, FLOW_IMAGE } from '../showcase/flowAssets'
import { SHOWCASE_CONVS, SHOWCASE_BY_ID, convItem, isShowcaseId } from '../showcase/catalog'
import { ensureSession, runTurn, toHistoryItems, turnCount } from '../showcase/session'

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
    { event: 'status', data: { stage: 'offline', text: '离线示例' } },
    { event: 'token', data: { text: message } },
    { event: 'done', data: {} },
  ]
}

/**
 * POST /api/agent/chat：教学示例会话走本地状态机（事件驱动分支，非采证回放）。
 * 返回 null 表示「不是示例会话」，交回采证回放链路。
 */
export function showcaseChatTurn(body) {
  const convId = body?.conversation_id || body?.conversationId || null
  if (!isShowcaseId(convId)) return null
  const out = runTurn(convId, body)
  return out.events
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

/** GET /api/agent/conversations —— 采证列表 + 教学示例 + 离线演示新建的会话 */
export function listConversations(basePayload) {
  let payload = null
  try { payload = JSON.parse(basePayload) } catch { payload = null }
  const items = Array.isArray(payload?.data?.items) ? payload.data.items.slice() : []

  // 教学示例排在最前（置顶），原有采证项一条不改，只 append
  const showcase = SHOWCASE_CONVS
    .filter((c) => !items.some((x) => (x.id || x.conversation_id) === c.id))
    .map((c) => {
      const count = (() => {
        try { return turnCount(c.id) } catch { return c.seeded }
      })()
      return { ...convItem(c), message_count: count }
    })

  const chats = store.chat || {}
  for (const [convId, cur] of Object.entries(chats)) {
    if (items.some((x) => (x.id || x.conversation_id) === convId)) continue
    const flow = FLOWS[cur.case]
    const meta = convMeta(flow)
    const img = FLOW_IMAGE[cur.case]
    // 采证里图片上传的首轮没有文字输入（真实发送文案是「请分析我上传的文件」），
    // 直接用题图名做标题，才能在侧栏区分三个不同案例。
    const title = img ? `${img.name} · 拍照解题` : '上传题目 · 待命名'
    items.unshift({
      id: convId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: cur.turn * 2,
      skill: meta.skill || 'chat',
    })
  }
  return { code: 0, message: 'ok', data: { items: [...showcase, ...items], hasMore: false } }
}

/** GET /api/agent/conversations/{id}/messages —— 教学示例优先，其次采证 SSE 还原 */
export function conversationMessages(convId) {
  if (isShowcaseId(convId)) {
    ensureSession(convId)
    return { code: 0, message: 'ok', data: { items: toHistoryItems(convId), hasMore: false } }
  }
  const cur = (store.chat || {})[convId]
  if (!cur) {
    // 离线新建的空会话：现役此时返回空列表，UI 显示空态
    if (String(convId).startsWith('offline-')) return { code: 0, message: 'ok', data: { items: [], hasMore: false } }
    return null
  }
  const flow = FLOWS[cur.case]
  if (!flow) return null
  const items = []
  const t0 = Date.now() - 3600_000
  let fileId = flow.file_id || flow.upload_file_id || ''
  // 只还原「已经实际发生过的轮次」：游标 cur.turn 就是已完成轮数
  const done = Math.max(0, Math.min(cur.turn, flow.turns.length))
  flow.turns.slice(0, done).forEach((turn, i) => {
    const text = sseText(turn.sse)
    const evs = parseSse(turn.sse)
    const meta = evs.find((e) => e.event === 'meta')?.data || {}
    const cards = evs.filter((e) => e.event === 'card').map((e) => e.data)
    const figures = evs.filter((e) => e.event === 'figure').map((e) => e.data)
    const parsed = evs.find((e) => e.event === 'file_parsed')?.data || null
    if (parsed?.file_id) fileId = parsed.file_id
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
      // 原题图在本地有逐字节一致的副本，附件快照带 data URI，
      // AttachmentThumb 优先读 localUrl → 刷新后仍显示题图，且不会误报「存储缺失」。
      attachments: flowAttachment(cur.case, fileId),
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
        ...(cards.length ? { cards } : {}),
        ...(figures.length ? { figures } : {}),
      },
      attachments: [],
      thinking: null,
    })
  })
  // 现役 /messages 返回「最新在前」；界面渲染时再按时间排。顺序必须与现役一致。
  items.reverse()
  return { code: 0, message: 'ok', data: { items, hasMore: false } }
}