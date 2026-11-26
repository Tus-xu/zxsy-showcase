/**
 * 自由对话（离线）：新对话里的第一句提问，按「意图」给出短答、追问出口与能力边界。
 *
 * 为什么需要它：演示项目此前只有 7 条预置会话；学生点「＋ 新对话」后自由输入会落到
 * 采证回放的兜底句（「没有对应的录制讲解」），产品核心环路（新对话 → 提问 → 回答）是断的。
 *
 * 边界：
 *   - 只覆盖「导数与极值」这条主线；超出范围时如实说明，并给出可继续的局部动作。
 *   - 带附件的消息不在这里处理，交回采证回放（题1/题2/题3 有真实录制流程）。
 *   - 回答是对学生的真实提问作出的教学短答，不冒充在线模型、不伪造工具与引用。
 */
import { patch, store } from '../state'
import { toEvents } from './session'

const CARD_OPTIONS = {
  explore: [
    { id: 'cube', label: '看 x³ 的反例' },
    { id: 'practice', label: '带我做一道题' },
  ],
  practice: [{ id: 'practice', label: '带我做一道题' }],
  again: [{ id: 'stationary', label: '再讲讲判断方法' }],
}

const REPLY = {
  stationary: {
    text: [
      '导数为零只说明**这一点的切线是水平的**，它不保证是极值。',
      '看 $f(x)=x^3$：$f\'(0)=0$，但 $x<0$ 和 $x>0$ 时导数都为正，曲线一直在上升，原点只是一个“停顿点”。',
      '判断极值要看驻点两侧的导数符号：左正右负是极大，左负右正是极小，两侧同号就不是极值。',
    ].join('\n\n'),
    card: 'explore',
  },
  extremum: {
    text: [
      '对可导函数，先解 $f\'(x)=0$ 找驻点，再看每个驻点两侧的导数符号：',
      '- 左正右负：局部极大\n- 左负右正：局部极小\n- 两侧同号：不是极值',
      '比如 $f(x)=x^3-3x$，$f\'(x)=3(x+1)(x-1)$：在 $x=-1$ 左正右负，是极大；在 $x=1$ 左负右正，是极小。',
    ].join('\n\n'),
    card: 'explore',
  },
  monotone: {
    text: [
      '在区间内 $f\'(x)>0$ 时函数严格递增，$f\'(x)<0$ 时严格递减。',
      '步骤是：求导 → 解 $f\'(x)=0$ → 用零点把定义域分段 → 每段判断导数符号。',
      '以 $f(x)=x^3-3x$ 为例，$f\'(x)=3(x+1)(x-1)$，三段符号依次是 $+$、$-$、$+$，对应递增、递减、递增。',
    ].join('\n\n'),
    card: 'explore',
  },
  tangent: {
    text: [
      '割线是曲线上两点的连线，斜率是差商 $\\frac{f(a+h)-f(a)}{h}$；让第二点沿曲线靠近第一点（$h\\to0$），割线趋于切线，这个极限就是 $f\'(a)$。',
      '所以“导数是切线斜率”说的是极限意义上的切线；$f\'(a)=0$ 只说明这条切线水平，不说明是极值。',
    ].join('\n\n'),
    card: 'explore',
  },
  cube: {
    text: [
      '$f(x)=x^3$ 在原点：$f\'(0)=0$，切线水平；但 $x<0$ 和 $x>0$ 时 $f\'(x)=3x^2>0$，两侧都在上升，所以原点不是极值点。',
      '和 $f(x)=x^3-3x$ 在 $x=-1$ 对比：那里左侧导数为正、右侧为负，先升后降，才是局部极大。关键在**变号**，不在“等于零”。',
    ].join('\n\n'),
    card: 'again',
  },
  practice: {
    text: '想动手练的话，打开左侧的「引导式解题 · 为什么不是极小值」，我们从你选的那个选项开始，一步一步看两侧符号。也可以直接上传题1/题2/题3的题图，我给你完整讲一道。',
    card: '',
  },
  chitchat: {
    text: '这个和数学学习无关，我就不展开了。离线体验覆盖题1 双曲线、题2 正三棱柱、题3 有放回取球三道真实题图；左侧「体验分类」有知识问答、错题本、举一反三、引导式解题 12 个入口。',
    card: '',
  },
  homework: {
    text: '我不代写作文或作业。数学这边，我可以陪你从卡住的那一步开始想——你可以上传题图，或从左侧「体验分类」选一道题走引导式解题。',
    card: '',
  },
  boundary: {
    text: [
      '离线体验目前覆盖「导数与极值」这条主线。你可以：',
      '- 问「导数为零为什么不一定有极值」或「怎么判断极大还是极小」\n- 上传题1/题2/题3的题图，让我完整讲一道题\n- 打开左侧的「引导式解题 · 为什么不是极小值」走一遍',
      '超出这条主线的提问，我会如实告诉你没覆盖到。',
    ].join('\n\n'),
    card: '',
  },
}

function norm(s) {
  return String(s || '')
    .replace(/[\s，。！？、,.!?;:；：'"“”‘’（）()【】\[\]]/g, '')
    .toLowerCase()
}

/** 意图识别：只认这条主线里的问法；否定/超范围落到边界说明 */
export function intentOf(text) {
  const t = norm(text)
  if (!t) return 'boundary'
  // 省略式追问：「那 x³ 呢？」「x³ 呢」也应接住上一轮的反例，而不是掉回边界
  if (/(x3|x³)/.test(t)) return 'cube'
  if (/(天气|吃饭|电影|游戏|闲聊|聊天|心情|唱歌)/.test(t)) return 'chitchat'
  if (/(作文|代写|写一篇|写个作文|作业答案|翻译一下)/.test(t)) return 'homework'
  if (/(带我做|做一道|做题|练一|引导|走一遍|开始做|带我学)/.test(t)) return 'practice'
  // 「导数为零/等于零」比「为什么」更具体，必须先判：这正是学生最常问的切入点
  if (/(导数为零|导数等于零|导数是0|驻点|水平切线|切线水平|等于零)/.test(t)) return 'stationary'
  if (/(极值|极大|极小)/.test(t) && /(判断|怎么|为什么|区分|哪个|如何)/.test(t)) return 'extremum'
  if (/(单调|递增|递减|增区间|减区间)/.test(t)) return 'monotone'
  if (/(切线|割线|差商|斜率)/.test(t)) return 'tangent'
  if (/(极值|极大|极小)/.test(t)) return 'extremum'
  return 'boundary'
}

export function isFreeConvId(id) {
  return typeof id === 'string' && (id.startsWith('offline-') || id.startsWith('free-'))
}

function stateOf(convId) {
  const all = store.free || {}
  return all[convId] || { turns: [] }
}

function persist(convId, s) {
  patch((st) => {
    st.free = { ...(st.free || {}), [convId]: s }
  })
}

function replyFor(intent) {
  const r = REPLY[intent] || REPLY.boundary
  const cards = r.card
    ? [{ type: 'showcase_stage', variant: 'derive', stage: '', title: '', options: CARD_OPTIONS[r.card] }]
    : []
  return { text: r.text, cards }
}

/**
 * 处理新对话里的自由文本。返回 SSE 事件数组；返回 null 表示「不归这里管」：
 * - 不是自由会话（有正式 id 的教学示例/采证会话）
 * - 带附件（交给采证回放，题图有真实录制流程）
 */
export function freeChatTurn(body) {
  const rawId = body?.conversation_id || body?.conversationId || ''
  if (rawId && !isFreeConvId(rawId)) return null
  if (Array.isArray(body?.attachments) && body.attachments.length) return null
  const text = String(body?.message ?? body?.content ?? '').trim()
  if (!text) return null
  const convId = rawId || `offline-${Date.now()}`
  const s = stateOf(convId)
  const reply = replyFor(intentOf(text))
  const userTurn = { role: 'user', text, cards: [], figures: [], citations: [], attachments: [] }
  const aiTurn = { role: 'ai', text: reply.text, cards: reply.cards, figures: [], citations: [], attachments: [] }
  persist(convId, { ...s, turns: [...(s.turns || []), userTurn, aiTurn] })
  const evs = toEvents(aiTurn, convId)
  // 首次提问即给会话一个真实标题（取学生原话），与现役 title 事件同形状
  const prevUser = (s.turns || []).some((t) => t.role === 'user')
  if (!prevUser) {
    const title = text.replace(/[#*$`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18) || '新对话'
    const doneAt = evs.findIndex((e) => e.event === 'done')
    evs.splice(doneAt >= 0 ? doneAt : evs.length, 0, { event: 'title', data: { title }, delay: 60 })
  }
  return evs
}

/** 历史恢复：与教学示例同形状（最新在前，由 useChat 反转） */
export function freeHistoryItems(convId) {
  const s = stateOf(convId)
  const turns = s.turns || []
  const t0 = Date.now() - turns.length * 60_000
  const items = turns.map((t, i) => {
    const blocks = []
    if (t.text) blocks.push({ type: 'markdown', content: t.text })
    if (t.aborted) blocks.push({ type: 'notice', content: '已停止回复' })
    for (const c of t.cards || []) blocks.push({ type: 'card', data: c })
    const isAi = t.role === 'ai'
    return {
      id: `${convId}-f-${i}`,
      role: isAi ? 'assistant' : 'user',
      clientMsgId: `${convId}-fc-${i}`,
      createdAt: new Date(t0 + i * 60_000).toISOString(),
      envelope: {
        role: isAi ? 'assistant' : 'user',
        msg_id: `${convId}-fm-${i}`,
        blocks,
        ...(isAi ? { meta: { skill: 'chat', conversation_id: convId, msg_id: `${convId}-fm-${i}` } } : {}),
      },
      attachments: t.attachments || [],
      thinking: null,
    }
  })
  return items.reverse()
}

/** 侧栏条目：标题取第一条学生原话（截断）；没有内容则不出现 */
export function listFreeConversations() {
  const all = store.free || {}
  const out = []
  for (const [id, s] of Object.entries(all)) {
    const turns = s?.turns || []
    if (!turns.length) continue
    const firstUser = turns.find((t) => t.role === 'user' && t.text)
    const raw = firstUser ? String(firstUser.text).replace(/[#*$`]/g, '').replace(/\s+/g, ' ').trim() : ''
    const title = raw ? raw.slice(0, 18) : '新对话'
    const at = new Date().toISOString()
    out.push({
      id,
      title,
      created_at: at,
      updated_at: at,
      message_count: turns.length,
      skill: 'chat',
    })
  }
  return out
}
