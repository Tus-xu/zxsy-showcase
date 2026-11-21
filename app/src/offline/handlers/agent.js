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