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
import { freeHistoryItems, listFreeConversations } from '../showcase/free'

const RAW_FLOWS = import.meta.glob('../fixtures/student/flow-*.json', { eager: true, query: '?raw', import: 'default' })

/**
 * 历史会话标题重建：现役采证里 30 条会话有 24 条是占位标题
 * （12×「分析用户上传的文件」、9×「新对话」、3×「分析用户上传的文件内容」），
 * 侧栏因此无法区分。这里用**每条会话真实的首次用户消息**重建展示标题，
 * 原始 fixture 一个字都不改；0 条消息的会话不进列表（它没有任何可点进去的内容）。
 */
const RAW_CONVS = import.meta.glob('../fixtures/student/run03/conv-*.json', { eager: true, query: '?raw', import: 'default' })

const CONV_META = (() => {
  const out = {}
  for (const [p, text] of Object.entries(RAW_CONVS)) {
    const m = /conv-([0-9a-f]+)\.json$/.exec(p)
    if (!m) continue
    let items = []
    try { items = JSON.parse(text)?.data?.items || [] } catch { continue }
    if (!items.length) { out[m[1]] = { empty: true, title: '' }; continue }
    // 采证 /messages 是「最新在前」，倒着找第一条用户消息
    let firstUser = null
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]?.role === 'user') { firstUser = items[i]; break }
    }
    const blocks = firstUser?.envelope?.blocks || []
    const txt = blocks
      .filter((b) => b?.type === 'markdown')
      .map((b) => String(b.content || ''))
      .join('')
      .trim()
    const atts = firstUser?.attachments || []
    let title = ''
    if (txt && !txt.includes('请分析我上传的文件')) title = txt.replace(/\s+/g, ' ').slice(0, 18)
    else if (atts.length) title = `题目图片 · ${atts[0]?.name || ''}`.trim()
    out[m[1]] = { empty: false, title }
  }
  return out
})()

const PLACEHOLDER_TITLES = new Set(['分析用户上传的文件', '分析用户上传的文件内容', '新对话'])

export const OFFLINE_NOTICE = '这次提问没有预设讲解。可以从左侧打开「导数学习 · 从提问到改错」，或上传随包提供的题图。'

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

function normalizeInput(text) {
  return String(text ?? '').normalize('NFC').replace(/\s+/g, ' ').trim()
}

function recordedMessage(turn) {
  try {
    const request = typeof turn.req === 'string' ? JSON.parse(turn.req) : turn.req
    return normalizeInput(request?.message)
  } catch {
    return ''
  }
}

function matchesRecordedTurn(turn, text, startsWithImage) {
  const actual = normalizeInput(text)
  const input = normalizeInput(turn.input)
  const recorded = recordedMessage(turn)
  if (startsWithImage && !input && (!actual || actual === '请分析我上传的文件')) return true
  if (!actual) return false
  if (recorded && actual === recorded) return true
  if (input && !input.startsWith('（点击 ') && actual === input) return true
  // 采录的公式输入可通过原卡片提交，也可在对话框键入同一表达式。
  const expression = /^\[式子\]\s*(.+)$/.exec(recorded || input)?.[1]
  return !!expression && actual === expression
}

/** 题图定位首轮，后续在当前轮次匹配采录时的输入。 */
export function pickChatTurn(body) {
  const attachments = body?.attachments || body?.files || []
  const first = attachments?.[0] || {}
  const fileId = first.file_id || first.id || body?.file_id || null
  const convId = body?.conversation_id || body?.conversationId || null
  const text = String(body?.message ?? body?.content ?? '').trim()

  let caseName = null
  let turnIdx = 0
  const startsWithImage = !!(fileId && caseOfFile(fileId))
  if (startsWithImage) {
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
  if (!matchesRecordedTurn(turn, text, startsWithImage && turnIdx === 0)) {
    return { case: caseName, events: null, notice: true, turnIdx, text }
  }
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
    { event: 'status', data: { stage: 'offline', text: '体验提示' } },
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

/** 采证会话里的附件只有文件名；按题1/2/3 补本地快照，避免「原图已丢失」 */
export function withLocalImages(items) {
  const byName = (name) => {
    const t = String(name || '')
    if (/题1|ti1/i.test(t)) return FLOW_IMAGE.A
    if (/题2|ti2/i.test(t)) return FLOW_IMAGE.B
    if (/题3|ti3/i.test(t)) return FLOW_IMAGE.C
    return null
  }
  return items.map((it) => {
    if (!Array.isArray(it.attachments) || !it.attachments.length) return it
    return {
      ...it,
      attachments: it.attachments.map((a) => {
        if (a?.localUrl) return a
        const img = byName(a?.name || a?.filename || '')
        return img ? { ...a, mime: a.mime || img.mime, localUrl: img.url } : a
      }),
    }
  })
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
  const raw = Array.isArray(payload?.data?.items) ? payload.data.items : []
  // 标题重建 + 空会话过滤（只影响展示，不动采证数据）
  const items = []
  for (const it of raw) {
    const key = String(it?.id || '').slice(0, 8)
    const meta = CONV_META[key]
    if (meta?.empty) continue
    if (meta) {
      const t = String(it?.title || '').trim()
      if (!t || PLACEHOLDER_TITLES.has(t)) it.title = meta.title || '上传的题目图片'
    }
    items.push(it)
  }

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
  // 新对话里学生真实问过的会话（自由问答）排在最前：它们是最新的学习记录
  const free = listFreeConversations()
  return { code: 0, message: 'ok', data: { items: [...free, ...showcase, ...items], hasMore: false } }
}

/** GET /api/agent/conversations/{id}/messages —— 教学示例优先，其次采证 SSE 还原 */
export function conversationMessages(convId) {
  if (isShowcaseId(convId)) {
    ensureSession(convId)
    return { code: 0, message: 'ok', data: { items: toHistoryItems(convId), hasMore: false } }
  }
  // 自由问答轮次（最新在前）；若之后又上传题图进入采证流程，两段按时间拼接
  const freeItems = freeHistoryItems(convId)
  const cur = (store.chat || {})[convId]
  if (!cur) {
    if (freeItems.length) return { code: 0, message: 'ok', data: { items: freeItems, hasMore: false } }
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
  // 采证附件只有文件名：补真实题图的本地快照（不伪造内容，只是把随包原图接上）
  const withImgs = withLocalImages(items)
  items.length = 0
  items.push(...withImgs)
  // 现役 /messages 返回「最新在前」；界面渲染时再按时间排。顺序必须与现役一致。
  items.reverse()
  if (freeItems.length) {
    // freeItems 最新在前；翻成最早在前后接在采证轮次之前（自由问答发生在上传之前）
    const merged = [...freeItems].reverse().concat([...items].reverse())
    return { code: 0, message: 'ok', data: { items: merged.reverse(), hasMore: false } }
  }
  return { code: 0, message: 'ok', data: { items, hasMore: false } }
}
