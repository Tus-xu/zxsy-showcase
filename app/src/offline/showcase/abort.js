/**
 * 停止生成后的本地落账：把最后一条 AI 轮次截断到学生实际看到的文本与卡片。
 *
 * 为什么需要：离线演示的示例回答在发出前就把整轮写进了 localStorage；
 * 学生中途点「停止」后，如果刷新仍看到完整回答，就等于悄悄补全了没看过的内容。
 * 这里按 stop 请求携带的 partial_text / cards_seen 覆盖最后一轮，历史恢复时保持一致。
 */
import { patch, store } from '../state'

function lastAiIndex(turns) {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i]?.role === 'ai') return i
  }
  return -1
}

function truncate(turns, partial, cardsSeen) {
  const i = lastAiIndex(turns)
  if (i < 0) return null
  const t = turns[i]
  const next = [...turns]
  next[i] = {
    ...t,
    ...(typeof partial === 'string' ? { text: partial } : {}),
    cards: Array.isArray(t.cards) ? t.cards.slice(0, cardsSeen) : [],
    aborted: true,
  }
  return next
}

/** 返回 true 表示找到并截断了对应会话的最后一轮 */
export function markAborted(body) {
  const convId = body?.conversation_id || body?.conversationId
  if (!convId) return false
  const partial = typeof body?.partial_text === 'string' ? body.partial_text : null
  const cardsSeen = Number.isFinite(Number(body?.cards_seen)) ? Math.max(0, Number(body.cards_seen)) : 0

  const all = store.showcase || {}
  if (all[convId]?.turns?.length) {
    const turns = truncate(all[convId].turns, partial, cardsSeen)
    if (!turns) return false
    patch((st) => {
      st.showcase = { ...(st.showcase || {}), [convId]: { ...all[convId], turns } }
    })
    return true
  }
  const free = store.free || {}
  if (free[convId]?.turns?.length) {
    const turns = truncate(free[convId].turns, partial, cardsSeen)
    if (!turns) return false
    patch((st) => {
      st.free = { ...(st.free || {}), [convId]: { ...free[convId], turns } }
    })
    return true
  }
  return false
}
