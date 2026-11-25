/**
 * 示例会话的状态与轮次层：把纯函数状态机接到 localStorage + 历史消息接口上。
 *
 * 关键约束（方案 §7）：
 *   - 用同一会话 ID 保存进度：主阶段、解法路径、已证事实、作答记录、待返回节点；
 *   - 提交一次只处理一次；开始小课 / 检验反馈 / 返回都可重复恢复；
 *   - 历史由「预置轮次 + 实际发生的轮次」生成，刷新或切会话后不重新生成、不重复追加。
 */
import { patch, store } from '../state'
import { showbookAdder } from './errorbook'
import { SHOWCASE_BY_KEY } from './catalog'
import { META, SEEDS } from './transcripts'
import { getNode, newNodeState, opening, step } from './engine'
import { FIG_LESSON_LINE, FIG_LIMIT_SECANT } from './assets'
import { QUESTIONS, qidOf } from './bank'

const FIGURE_BY_KEY = {
  lesson_line: FIG_LESSON_LINE,
  limit_secant: FIG_LIMIT_SECANT,
}

/** 卡片里的 figureKey → 真实图（只在本层解析，组件拿到的直接是 dataUri） */
function resolveCards(cards) {
  // 示例会话不再输出「第 N 步 / 共 M 步」进度卡：内部教学阶段不是学生需要的信息
  // （采证回放的 socratic_progress 不受影响，仍按现役原样呈现）
  return (cards || []).filter((c) => c && (c.card_type || c.type) !== 'socratic_progress').map((c) => {
    if (!c || !c.figureKey) return c
    const fig = FIGURE_BY_KEY[c.figureKey]
    if (!fig) return c
    const { figureKey, ...rest } = c
    return { ...rest, figure: { caption: fig.caption, dataUri: fig.dataUri } }
  })
}

function seedTurns(convKey) {
  return (SEEDS[convKey] || []).map((t, i) => ({
    id: `${convKey}-seed-${i}`,
    role: t.role,
    text: t.text || '',
    cards: resolveCards(t.cards || []),
    figures: t.figures || [],
    citations: t.citations || [],
    attachments: t.attachments || [],
    at: 0,
  }))
}

function createSession(convId) {
  const conv = Object.values(SHOWCASE_BY_KEY).find((c) => c.id === convId)
  const key = conv?.key || 's5'
  const meta = META[key] || {}
  const s = newNodeState(key, {
    convId,
    node: meta.start || 'r_read',
    firstAnswer: meta.firstAnswer || null,
    fixLabel: meta.fixLabel || '',
    s5Reason: meta.s5Reason || null,
  })
  s.turns = seedTurns(key)
  return s
}

/** 取（必要时创建）会话状态；任何写操作都经过 patch 落到 localStorage */
export function ensureSession(convId) {
  const all = store.showcase || {}
  let s = all[convId]
  if (!s) {
    s = createSession(convId)
    patch((st) => {
      st.showcase = { ...(st.showcase || {}), [convId]: s }
    })
  } else if (!Array.isArray(s.turns)) {
    s = { ...s, turns: seedTurns(s.convKey || 's5') }
    patch((st) => {
      st.showcase = { ...(st.showcase || {}), [convId]: s }
    })
  }
  return s
}

export function sessionTurns(convId) {
  return ensureSession(convId).turns || []
}

function persist(convId, s) {
  patch((st) => {
    st.showcase = { ...(st.showcase || {}), [convId]: s }
  })
}

/* ───────────── 作答记录（来自 POST /api/student/learning-events） ───────────── */

/** 离线记一条题目作答（与现役上报同一入口，便于统计首答与订正） */
export function logQuizAnswer(payload) {
  const text = payload?.question_text || ''
  const q = QUESTIONS.find((x) => qidOf(x.question_text) === qidOf(text))
  if (!q) return false
  const entry = {
    key: q.key,
    chosen: payload?.chosen || '',
    correct: !!payload?.correct,
    at: Date.now(),
  }
  patch((st) => {
    st.quizLog = [...(st.quizLog || []), entry]
  })
  return true
}

/** 每题的首答与最新作答（首答一旦确定不再改写） */
export function quizLogByKey() {
  const out = {}
  for (const e of store.quizLog || []) {
    if (!e || !e.key) continue
    if (!out[e.key]) out[e.key] = []
    out[e.key].push(e)
  }
  return out
}

/**
 * 三题的作答统计（首答 vs 订正后）。
 * V1 的「订正」发生在本示例的导学卡里（不走原题卡），所以以会话状态 s.corrected 为准，
 * 否则会出现「订正后 0/3」这种与自己刚做完的事矛盾的数字。
 */
export function quizTally(s) {
  const byKey = quizLogByKey()
  let answered = 0
  let firstCorrect = 0
  let finalCorrect = 0
  for (const q of QUESTIONS) {
    const list = byKey[q.key] || []
    const fixedByGuide = q.key === 'v1' && !!s.corrected
    if (!list.length && !fixedByGuide) continue
    answered++
    if (list.length && list[0].correct) firstCorrect++
    const lastRight = list.length ? list[list.length - 1].correct : false
    if (lastRight || fixedByGuide) finalCorrect++
  }
  const v1 = byKey.v1 || []
  const correctedByLog = v1.length > 1 && !v1[0].correct && v1[v1.length - 1].correct
  return {
    total: QUESTIONS.length,
    answered,
    firstCorrect,
    finalCorrect,
    corrected: correctedByLog || s.corrected ? 1 : 0,
  }
}

/** 若学生已经在原题卡上答过 V1，进入引导时沿用真实首答，不凭推测写「你选了 A」 */
function realFirstAnswer(s) {
  if (s.firstAnswer) return s.firstAnswer
  const v1 = quizLogByKey().v1 || []
  if (!v1.length) return null
  return v1[0].chosen || null
}

/* ───────────── 推进一轮 ───────────── */

export function runTurn(convId, body) {
  const prev = ensureSession(convId)
  const text = String(body?.message ?? body?.content ?? '').trim()
  const before = { ...prev }

  const withTally = {
    ...prev,
    quizTally: quizTally(prev),
    firstAnswer: prev.node === 'r_read' ? realFirstAnswer(prev) : prev.firstAnswer,
  }
  const canContinue = META[prev.convKey]?.start || (prev.node !== 'r_read' && getNode(prev.node))
  const out = canContinue
    ? step(withTally, { text, tutorAction: body?.context?.tutor_action || '' })
    : {
        state: prev,
        reply: { text: '这次提问没有预设讲解。上面的内容可以随时回看，也可以打开「引导式解题 · 双曲线离心率」继续练习。' },
      }
  const reply = out.reply || { text: '', cards: [] }

  const n = prev.turns.length
  const UI_ACTION = /^(返回题卡订正|回到这题|返回原题|回到原题|回到题卡|订正)$/
  const userTurn = {
    id: `${convId}-u-${n}`,
    role: 'user',
    system: UI_ACTION.test(text),
    text,
    cards: [],
    figures: [],
    citations: [],
    attachments: [],
    at: n,
  }
  const aiTurn = {
    id: `${convId}-a-${n}`,
    role: 'ai',
    text: reply.text || '',
    cards: resolveCards(reply.cards || []),
    figures: reply.figures || [],
    citations: reply.citations || [],
    attachments: [],
    at: n + 1,
  }

  const next = { ...out.state, turns: [...prev.turns, userTurn, aiTurn] }
  delete next.quizTally
  persist(convId, next)

  // S6：第一次真正加入错题本时写本地记录（重复点只更新，不新增）
  if (next.errorSaved && !before.errorSaved) {
    showbookAdder({ convId })
  }

  return { state: next, aiTurn, events: toEvents(aiTurn, convId) }
}

/** 进入会话时若还没有任何轮次，补一条开场（正常情况都有预置轮次，这里是兜底） */
export function openingTurn(convId) {
  const s = ensureSession(convId)
  if (s.turns.length) return null
  const r = opening(s)
  if (!r) return null
  const aiTurn = {
    id: `${convId}-a-0`,
    role: 'ai',
    text: r.text || '',
    cards: resolveCards(r.cards || []),
    figures: [],
    citations: [],
    attachments: [],
    at: 0,
  }
  persist(convId, { ...s, turns: [aiTurn] })
  return aiTurn
}

/* ───────────── 事件与历史 ───────────── */

/**
 * 把一段回答切成逐段呈现的文本片段。
 * - 不在行内公式 $...$、块公式 $$...$$、加粗 **...** 与行内代码 `...` 内部断开；
 * - 优先在标点/换行处断句，其次按长度（max）强制断；
 * - 拼接结果与原文逐字一致（历史与刷新不依赖片段）。
 */
export function splitStreamPieces(text, { min = 6, max = 48 } = {}) {
  const src = String(text || '')
  if (!src) return []
  const out = []
  let buf = ''
  let math = 0 // 0 none / 1 inline $...$ / 2 display $$...$$
  let bold = false
  let code = false
  const isPunct = (ch) => ch === '\n' || '，。！？；：、,.!?;:'.includes(ch)
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '$') {
      if (src[i + 1] === '$') {
        buf += '$$'
        i++
        math = math === 2 ? 0 : 2
        continue
      }
      buf += '$'
      math = math === 1 ? 0 : 1
      continue
    }
    if (ch === '*' && src[i + 1] === '*') {
      buf += '**'
      i++
      bold = !bold
      continue
    }
    if (ch === '`') {
      buf += ch
      code = !code
      continue
    }
    buf += ch
    const safe = math === 0 && !bold && !code
    if ((safe && isPunct(ch) && buf.length >= min) || buf.length >= max) {
      out.push(buf)
      buf = ''
    }
  }
  if (buf) out.push(buf)
  return out.length ? out : [src]
}

/** 片段的自然停顿（毫秒）：句末 > 换行/分号 > 逗号 > 普通 */
function piecePause(piece) {
  const tail = piece.slice(-1)
  if ('。！？!?'.includes(tail)) return 120
  if (tail === '\n') return 90
  if ('；;'.includes(tail)) return 70
  if ('，、：,:'.includes(tail)) return 48
  return 26
}

export function toEvents(aiTurn, convId) {
  // meta 先到（会话 id 立即生效），留一段等待态再开始吐字
  const evs = [{ event: 'meta', data: { conversation_id: convId, skill: 'socratic' }, delay: 420 }]
  if (aiTurn.text) {
    for (const piece of splitStreamPieces(aiTurn.text)) {
      evs.push({ event: 'token', data: { text: piece }, delay: piecePause(piece) })
    }
  }
  for (const c of aiTurn.cards || []) evs.push({ event: 'card', data: c, delay: 160 })
  for (const f of aiTurn.figures || []) evs.push({ event: 'figure', data: f, delay: 160 })
  if (aiTurn.citations?.length) evs.push({ event: 'citation', data: { items: aiTurn.citations }, delay: 120 })
  evs.push({ event: 'done', data: {}, delay: 40 })
  return evs
}

/** 轮次 → GET /conversations/{id}/messages 的 item（与采证回放同形状） */
export function toHistoryItems(convId) {
  const session = ensureSession(convId)
  const turns = session.turns
  const t0 = Date.now() - turns.length * 60_000
  const items = turns.map((t, i) => {
    // 只更新原始讲解、题图和卡片的呈现，访客发送的轮次始终使用已保存的内容。
    const seed = t.id === `${session.convKey}-seed-${i}` ? SEEDS[session.convKey]?.[i] : null
    const text = seed?.text ?? t.text
    const blocks = []
    if (text) blocks.push({ type: 'markdown', content: text })
    if (t.aborted) blocks.push({ type: 'notice', content: '已停止回复' })
    const cards = seed ? resolveCards(seed.cards || []) : t.cards || []
    for (const c of cards) blocks.push({ type: 'card', data: c })
    for (const f of t.figures || []) blocks.push({ type: 'figure', ...f })
    if (t.citations?.length) blocks.push({ type: 'citation', items: t.citations })
    const isAi = t.role === 'ai'
    return {
      id: t.id || `${convId}-${i}`,
      role: isAi ? 'assistant' : 'user',
      clientMsgId: `${convId}-c-${i}`,
      createdAt: new Date(t0 + i * 60_000).toISOString(),
      envelope: {
        role: isAi ? 'assistant' : 'user',
        msg_id: `${convId}-m-${i}`,
        blocks,
        ...(isAi ? { meta: { skill: 'socratic', conversation_id: convId, msg_id: `${convId}-m-${i}` } } : {}),
      },
      attachments: seed?.attachments || t.attachments || [],
      thinking: null,
      system: !!t.system,
      sample: /-seed-\d+$/.test(String(t.id || '')),
    }
  })
  // 现役 /messages 返回「最新在前」，界面渲染时再反转
  return items.reverse()
}

/** 该会话已有的用户消息数（用于侧栏 message_count） */
export function turnCount(convId) {
  return sessionTurns(convId).length
}
