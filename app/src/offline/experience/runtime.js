/**
 * 体验播放器运行时（内存态）。
 *
 * 约束：
 * - 12 条 exp-* 每次进入都 reset，刷新/切走/重进都从封面 + 第一条预填开始；
 * - 只走既有 /api/agent/chat SSE 管线：返回 token/card/figure/prefill/complete/done 事件；
 * - 卡片仍是真实 Socratic* 卡，交互提交仍走 tutor_interaction 上行，运行时不另造一套 UI；
 * - 状态只在本模块内存里，不写 localStorage（避免污染示例会话/刷新恢复语义）。
 */
import { splitStreamPieces, piecePause } from '../showcase/session'
import { getExperience } from './scripts'
import { EXPERIENCE_BY_ID, EXPERIENCE_PROBLEM_BY_ID } from './catalog'
import { addExperienceError } from '../showcase/errorbook'
import { defaultCite, defaultRefs } from './citations'

const states = new Map()

function problemOf(expId) {
  const meta = EXPERIENCE_BY_ID[expId]
  return meta ? EXPERIENCE_PROBLEM_BY_ID[meta.problemId] : null
}

function attachmentOf(expId, user) {
  const p = problemOf(expId)
  const key = user?.attachment
  if (!p || !key) return null
  const img = key === 't1' || key === 't2' || key === 't3' ? EXPERIENCE_PROBLEM_BY_ID[key] : p
  return {
    file_id: `exp-${img.id}-img`,
    kind: 'image',
    name: img.name,
    mime: img.mime,
    size: 0,
    localUrl: img.image,
  }
}

export function resetExperience(expId) {
  if (!expId) return null
  const st = {
    expId,
    exchange: 0,
    turns: [],
    pending: null,
    attempts: 0,
    hints: 0,
    done: false,
    completed: false,
    startedAt: Date.now(),
  }
  states.set(expId, st)
  return st
}

function ensure(expId) {
  return states.get(expId) || resetExperience(expId)
}

export function experienceState(expId) {
  return states.get(expId) || null
}

export function experiencePrefill(expId) {
  const script = getExperience(expId)
  const st = ensure(expId)
  if (!script || st.done) return null
  const ex = script.exchanges[st.exchange]
  if (!ex || !ex.user) return null
  return { text: ex.user.text, attachment: attachmentOf(expId, ex.user) }
}

function pushUser(st, expId, text, body) {
  const atts = Array.isArray(body?.attachments) ? body.attachments : []
  const local = atts
    .filter((a) => a && (a.kind === 'image' || String(a.mime || '').startsWith('image/')))
    .map((a) => ({
      file_id: a.file_id || a.id || '',
      kind: 'image',
      name: a.name || a.filename || '题图',
      mime: a.mime || 'image/png',
      size: a.size || 0,
      localUrl: a.localUrl || '',
    }))
  st.turns.push({
    id: `${expId}-u-${st.turns.length}`,
    role: 'user',
    text: String(text || ''),
    attachments: local,
    cards: [],
    figures: [],
    at: st.turns.length,
  })
}

function pushAi(st, expId, ai) {
  st.turns.push({
    id: `${expId}-a-${st.turns.length}`,
    role: 'ai',
    text: ai?.text || '',
    cards: Array.isArray(ai?.cards) ? ai.cards : [],
    figures: Array.isArray(ai?.figures) ? ai.figures : [],
    citations: Array.isArray(ai?.citations) ? ai.citations : [],
    at: st.turns.length,
  })
}

function norm(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[“”"'`]/g, '')
    .replace(/^\$+|\$+$/g, '')
    .toLowerCase()
}

function normExpr(s) {
  return norm(s)
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;!]/g, '')
    .replace(/\\dfrac|\\frac/g, '/')
    .replace(/\\sqrt/g, 'sqrt')
    .replace(/√/g, 'sqrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[{}]/g, '')
    .replace(/\*/g, '')
}

/** 本地判分：只支持体验脚本用到的 choice / binary / cloze / expr 四种 */
export function gradeCheck(check, body) {
  if (!check) return false
  const message = String(body?.message || body?.content || '').trim()
  const ix = body?.context?.tutor_interaction || {}
  const payload = ix.payload && typeof ix.payload === 'object' ? ix.payload : {}
  if (check.form === 'choice') {
    const accept = Array.isArray(check.accept) ? check.accept : []
    return accept.some((a) => norm(a) === norm(message))
  }
  if (check.form === 'binary') {
    const v = payload.choice ?? payload.value ?? payload.answer ?? message
    const accept = Array.isArray(check.accept) ? check.accept : []
    return accept.some((a) => norm(a) === norm(v))
  }
  if (check.form === 'cloze') {
    const blanks = payload.blanks && typeof payload.blanks === 'object' ? payload.blanks : {}
    const accept = check.accept && typeof check.accept === 'object' ? check.accept : {}
    const ids = Object.keys(accept)
    if (!ids.length) return false
    return ids.every((id) => {
      const vals = Array.isArray(accept[id]) ? accept[id] : [accept[id]]
      return vals.some((v) => norm(v) === norm(blanks[id]))
    })
  }
  if (check.form === 'expr') {
    const v = payload.latex ?? payload.expr ?? payload.expression ?? payload.value ?? message
    const accept = Array.isArray(check.accept) ? check.accept : []
    return accept.some((a) => normExpr(a) === normExpr(v))
  }
  return false
}

function progressCard(check, step, total, verdict, extra = {}) {
  return {
    card_type: 'socratic_progress',
    session_id: check.sessionId || '',
    current_step: step,
    steps_count: total,
    verdict,
    phase: verdict === 'correct' && step >= total ? 'converging' : 'guiding',
    kp_name: check.kpName || '',
    hint_level: verdict === 'wrong' ? 1 : 0,
    attempts_on_step: extra.attempts || 0,
    scaffold_level: verdict === 'wrong' ? 1 : 0,
    scaffold_label: verdict === 'wrong' ? 'focused_scaffold' : 'probe',
    rounds_used: extra.attempts || 0,
    rounds_limit: 8,
    mastery_state: verdict === 'correct' ? 'mastered' : 'improving',
  }
}

function retryCard(card, attempt) {
  if (!card) return null
  const base = JSON.parse(JSON.stringify(card))
  base.interaction_id = `${base.interaction_id || 'ix_exp'}_r${attempt}`
  base.prompt_lead = base.prompt_lead || '先别急着提交。用自己的话说一遍：这一步要用的关系是什么？想好再点。'
  base.allow_text_fallback = true
  base.allow_skip = true
  return base
}

function buildWrong(st, check, ai) {
  const total = check.total || 3
  const step = check.step || 1
  const review = check.review && typeof check.review === 'object' ? check.review : null
  const cards = [
    {
      card_type: 'socratic_hint',
      level: 1,
      level_name: '窄追问',
      scaffold_label: 'focused_scaffold',
      text: check.hintText || '先回到定义：这一步要用的关系是什么？',
    },
    {
      card_type: 'socratic_error_analysis',
      session_id: check.sessionId || '',
      step_no: step,
      verdict: 'wrong',
      misconception: check.misconception || 'concept',
      misconception_zh: check.misconceptionZh || '概念混淆',
      error_move: check.errorMove || '',
      evidence_quote: '',
      kp_name: check.kpName || '',
      probe_question: null,
      ...(review ? { review } : {}),
    },
  ]
  const card = ai?.cards?.[check.cardIndex || 0]
  if (card) cards.push(retryCard(card, st.attempts))
  cards.push(progressCard(check, step, total, 'wrong', { attempts: st.attempts }))
  return {
    text: check.wrongText || '这一步还差一点。先看提示，再试一次。',
    cards,
  }
}

function buildCorrect(check) {
  const total = check.total || 3
  const step = check.progress || check.step || total
  const cards = [progressCard(check, step, total, 'correct', { attempts: 0 })]
  if (Array.isArray(check.correctCards)) cards.push(...check.correctCards)
  const bridge = String(check.bridgeText || '').trim()
  return {
    text: [check.correctText || '对，这一步成立。', bridge].filter(Boolean).join('\n\n'),
    cards,
  }
}

function eventsFor(ai, expId, { prefill = null, complete = false } = {}) {
  const evs = [{ event: 'meta', data: { conversation_id: expId, skill: 'socratic' }, delay: 260 }]
  const text = ai?.text || ''
  for (const piece of splitStreamPieces(text)) {
    evs.push({ event: 'token', data: { text: piece }, delay: piecePause(piece) })
  }
  for (const c of ai?.cards || []) {
    evs.push({ event: 'card', data: { ...c, session_id: c.session_id || expId }, delay: 160 })
  }
  for (const f of ai?.figures || []) evs.push({ event: 'figure', data: f, delay: 160 })
  if (Array.isArray(ai?.citations) && ai.citations.length) {
    evs.push({ event: 'citation', data: { items: ai.citations }, delay: 120 })
  }
  if (prefill) {
    evs.push({
      event: 'prefill',
      data: {
        text: prefill.text || '',
        attachment: prefill.attachment || null,
        turnId: prefill.turnId || '',
      },
      delay: 220,
    })
  }
  if (complete) evs.push({ event: 'complete', data: { done: true }, delay: 120 })
  evs.push({ event: 'done', data: {}, delay: 40 })
  return evs
}

function finishExperience(st, script) {
  if (st.completed) return
  st.completed = true
  const tag = String(script?.onComplete || '')
  if (tag.startsWith('error:')) addExperienceError(tag.slice(6), st.expId)
}

function notice(text) {
  return [
    { event: 'status', data: { stage: 'offline', text: '体验提示' }, delay: 80 },
    { event: 'token', data: { text }, delay: 120 },
    { event: 'done', data: {}, delay: 40 },
  ]
}

/** POST /api/agent/chat 的体验分支：返回 SSE 事件数组；非 exp-* 返回 null */
export function experienceChatTurn(body) {
  const expId = body?.conversation_id || body?.conversationId || ''
  const script = getExperience(expId)
  if (!script) return null
  const st = ensure(expId)
  const problemId = problemOf(expId)?.id || ''
  const text = String(body?.message ?? body?.content ?? '').trim()

  if (st.done) {
    return notice('这一轮体验已经走完了。点右上角「重新体验」，或从左侧换一个体验。')
  }

  if (st.pending) {
    st.attempts += 1
    const ok = gradeCheck(st.pending.check, body)
    pushUser(st, expId, text, body)
    if (!ok && st.attempts < 3) {
      st.hints += 1
      const fb = buildWrong(st, st.pending.check, st.pending.ai)
      fb.citations = defaultRefs(problemId)
      fb.cards = fb.cards.map((c) => (c && c.card_type === 'socratic_error_analysis'
        ? { ...c, citations: defaultCite(problemId) }
        : c))
      pushAi(st, expId, fb)
      return eventsFor(fb, expId, {})
    }
    const fb = buildCorrect({ ...st.pending.check, correctText: ok ? st.pending.check.correctText : (st.pending.check.revealText || st.pending.check.correctText) })
    fb.citations = defaultRefs(problemId)
    pushAi(st, expId, fb)
    st.pending = null
    st.exchange += 1
    const next = script.exchanges[st.exchange]
    if (!next) { st.done = true; finishExperience(st, script) }
    return eventsFor(fb, expId, {
      prefill: next ? { text: next.user?.text || '', attachment: attachmentOf(expId, next.user) } : null,
      complete: !next,
    })
  }

  const ex = script.exchanges[st.exchange]
  if (!ex) {
    st.done = true
    return notice('这一轮体验已经走完了。点「重新体验」可以再来一遍。')
  }
  pushUser(st, expId, text, body)
  const ai = { ...(ex.ai || { text: '' }) }
  if (!Array.isArray(ai.citations) || !ai.citations.length) ai.citations = defaultRefs(problemId)
  if (ai.check && Array.isArray(ai.cards)) {
    ai.cards = ai.cards.map((c) => (c && c.card_type === 'socratic_interaction'
      ? { ...c, steps_count: c.steps_count || ai.check.total || 3, citations: c.citations || defaultCite(problemId) }
      : c))
  }
  pushAi(st, expId, ai)
  if (ai.check) {
    st.pending = { check: ai.check, ai, attempts: 0 }
    return eventsFor(ai, expId, {})
  }
  st.exchange += 1
  const next = script.exchanges[st.exchange]
  if (!next) { st.done = true; finishExperience(st, script) }
  return eventsFor(ai, expId, {
    prefill: next ? { text: next.user?.text || '', attachment: attachmentOf(expId, next.user) } : null,
    complete: !next,
  })
}

/** GET /api/agent/conversations/{expId}/messages：当前内存轮次（最新在前） */
export function experienceMessages(expId) {
  const st = states.get(expId)
  if (!st || !st.turns.length) return []
  const t0 = st.startedAt || Date.now()
  const items = st.turns.map((t, i) => {
    const blocks = []
    if (t.text) blocks.push({ type: 'markdown', content: t.text })
    for (const c of t.cards || []) blocks.push({ type: 'card', data: c })
    for (const f of t.figures || []) blocks.push({ type: 'figure', ...f })
    if (Array.isArray(t.citations) && t.citations.length) blocks.push({ type: 'citation', items: t.citations })
    const isAi = t.role === 'ai'
    return {
      id: t.id,
      role: isAi ? 'assistant' : 'user',
      clientMsgId: `${expId}-c-${i}`,
      createdAt: new Date(t0 + i * 60_000).toISOString(),
      envelope: {
        role: isAi ? 'assistant' : 'user',
        msg_id: `${expId}-m-${i}`,
        blocks,
        ...(isAi ? { meta: { skill: 'socratic', conversation_id: expId, msg_id: `${expId}-m-${i}` } } : {}),
      },
      attachments: t.attachments || [],
      thinking: null,
      sample: false,
    }
  })
  return items.reverse()
}

export function resetAllExperiences() {
  states.clear()
}
