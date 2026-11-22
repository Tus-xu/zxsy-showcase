/**
 * 聊天消息模型 + SSE 事件归约 + 历史信封映射
 * 契约以 .tmp/m2-chat-refactor-spec.md 第 3 节为准：
 *   meta → status* → (thinking|token|card|graph|figure|action)* → citation?/badge? → title? → done
 *   新增：title（标题即时下发）/ edited（edit 流首个事件）/ done 带 message_id+title?
 *   F13：figure 事件（可视化讲解图形，可多次，frames 渐进帧）
 *   未知事件类型一律静默忽略（向前兼容铁律）。
 */

let seq = 0

/**
 * 防御性过滤：剥掉模型回复文本中的 action JSON 片段（v1.2 管家跳转由 action 事件驱动，
 * 文本里的 {"type":"action","data":{...}} 不应作为正文展示）。
 * 覆盖单行完整 JSON 与夹带在句子中的 JSON 片段两种形态。
 */
export function stripActionJson(text) {
  if (!text) return text
  // 1) 完整行：以 { 开头到 } 结尾的 JSON（含 `event: action` 前缀行）
  let t = text.replace(/^event:\s*action\s*\n?/g, '')
  // 2) 行内夹带：{"type":"action" ... } 片段（贪婪到行尾或下一个换行）
  t = t.replace(/\{"type"\s*:\s*"action"[^}]*\}\s*/g, '')
  // 3) 独立 JSON 块行（含中文逗号后的完整 JSON）
  t = t.replace(/^\s*\{.*?"open_page".*?\}\s*$/gm, '')
  return t
}

export { uuid } from '../../utils/uuid.js'

export function newUserMsg({ text, clientMsgId, attachments = [], skillKeys = [], rawText = '', question = null }) {
  return {
    key: `u_${clientMsgId}`,
    role: 'user',
    text,
    rawText: rawText || text, // 真实发送文本（text 可能被 displayText 覆盖成展示文案；regenerate 必须用 rawText）
    status: 'done',
    clientMsgId,
    attachments: normalizeAttachments(attachments), // 发送时快照，随用户气泡展示（name 归一化 + localUrl 透传）
    skillKeys, // 发送时点亮的技能 key 数组（[] 表示自由对话），气泡上显示技能徽标
    createdAt: new Date().toISOString(),
    versions: null,
    question, // {text, options?} 题目白卡（讲解/变式消息把题干单独成白卡展示）
  }
}

export function newAssistantMsg(clientMsgId) {
  return {
    key: `a_${clientMsgId}_${++seq}`,
    role: 'assistant',
    text: '',
    status: 'streaming', // streaming | done | error | aborted
    clientMsgId, // 对应的用户消息 client_msg_id（重新生成复用）
    msgId: '', // 服务端 envelope msg_id（feedback target）
    skill: '',
    confidence: 0,
    cards: [],
    citations: [],
    badge: '',
    graph: null,
    figures: [], // F13：figure 事件累积（可视化讲解图形，可多次）
    clarify: null, // {question, options[]}
    statuses: [], // [{stage, text}] 过程提示
    notices: [],
    unknownBlocks: [],
    usage: null,
    latencyMs: 0,
    doneMeta: null,
    interrupted: false,
    answerConfirm: false, // 防泄题「直接看答案」二次确认条
    confirmDismissed: false,
    // V2（DESIGN §8.2）：socratic_step_choice 选项已用态（按 cards 下标置位，
    // 点击后置灰 + 「已选」标记；历史回显由 markHistoryUsedChoices 还原）
    usedChoices: [],
    // sgv3（CHAIN-DESIGN §6.2）：socratic_interaction 交互卡已用态（提交后置灰；
    // 历史回显由 markHistoryUsedChoices 还原，与 usedChoices 同纪律）
    usedInteractions: [],
    thinking: '', // M2 重构：模型思考过程（socratic_solver 单路流式下发的 <think> 内容）
    feedback: '', // 'up' | 'down'
    feedbackReason: '',
    errorText: '',
    createdAt: new Date().toISOString(),
    versions: null, // {index, count, ids[]} 兄弟版本元数据（count>1 时显示版本导航）
    action: null, // v1.4：open_page 功能直达（消息内跳转按钮卡，不再静默跳页）
    degraded: null, // 阶段 6B：搜索降级提示 {error_code, message}
  }
}

/**
 * 把一条 SSE 事件应用到 assistant 消息对象上。
 * fx 为副作用回调：{ onMeta(data), onLatex(data), onFileParsed(data) }
 */
export function applySseEvent(msg, event, data, fx = {}) {
  const d = data && typeof data === 'object' ? data : {}
  switch (event) {
    case 'meta':
      msg.msgId = d.msg_id || msg.msgId
      msg.skill = d.skill || ''
      msg.confidence = d.confidence ?? 0
      fx.onMeta?.(d)
      break
    case 'status':
      msg.statuses.push({ stage: d.stage || '', text: d.text || '' })
      break
    case 'token':
      // 防御性过滤：剥掉模型可能输出的 action JSON 片段（v1.2 管家跳转由 action 事件驱动，
      // 文本里的 {"type":"action"...} 不应作为正文展示）
      msg.text += stripActionJson(d.text || '')
      break
    case 'thinking':
      // M2 重构：模型思考过程流式累积（与正文 token 分离，前端折叠面板展示）
      msg.thinking = (msg.thinking || '') + (d.text || '')
      break
    case 'clarify':
      msg.clarify = {
        question: d.question || '',
        options: Array.isArray(d.options) ? d.options : [],
      }
      break
    case 'card': {
      mergeCardInto(msg, d)
      const t = d.type || d.card_type || ''
      if (t === 'socratic_confirm_answer') msg.answerConfirm = true
      break
    }
    case 'graph':
      msg.graph = d
      break
    case 'figure':
      // F13：可视化讲解图形（可多次，一个讲解步骤一张图；后端保证同流内不重复）
      if (!Array.isArray(msg.figures)) msg.figures = []
      msg.figures.push(d)
      break
    case 'action':
      // v1.4：open_page 功能直达挂到消息上（渲染跳转按钮卡，用户主动点击才跳）
      msg.action = d
      break
    case 'citation':
      msg.citations = Array.isArray(d.items) ? d.items : []
      break
    case 'badge':
      msg.badge = d.level || ''
      break
    case 'degraded':
      // 阶段 6B：搜索降级提示（web_search 工具降级结果透传）
      msg.degraded = {
        error_code: d.error_code || '',
        message: d.message || d.refuse_reason || '',
      }
      break
    case 'file_parsed':
      msg.statuses.push({ stage: 'file', text: `文件《${d.filename || ''}》解析完成` })
      fx.onFileParsed?.(d)
      break
    case 'latex_rendered':
      fx.onLatex?.(d)
      break
    case 'answer_request':
      // 预留事件名：与 socratic_confirm_answer 卡同效（以后端实际下发为准，两种都接）
      msg.answerConfirm = true
      break
    case 'done':
      msg.status = 'done'
      msg.usage = d.usage || null
      msg.latencyMs = d.latency_ms || 0
      msg.doneMeta = d.meta || null
      // M2：done 携带 assistant 消息 id（feedback/版本导航锚点）与即时标题
      if (d.message_id) msg.msgId = d.message_id
      if (d.title) fx.onTitle?.(d.title)
      break
    case 'title':
      // M2：标题生成完成即时下发（不等 done 后盲刷）
      if (d.title) fx.onTitle?.(d.title)
      break
    case 'edited':
      // M2 edit 流首个事件：新 user 消息 id（用于本地气泡换锚）
      fx.onEdited?.(d)
      break
    case 'error':
      // 49901 = 用户主动停止：按中断态处理（recoverable，不弹错误）
      if (d.code === 49901) {
        msg.status = 'aborted'
        msg.interrupted = true
      } else {
        msg.status = 'error'
        msg.errorText = d.message || '服务繁忙，请稍后重试'
      }
      break
    default:
      break // 未知事件：忽略，不 throw、不阻断流
  }
}

/** 历史消息（GET /conversations/{id}/messages 返回项）→ 展示模型 */
export function fromHistory(item) {
  const env = (item && item.envelope) || {}
  const meta = env.meta || {}
  const blocks = Array.isArray(env.blocks) ? env.blocks : []
  const msg = {
    key: `h_${item.id}`,
    id: item.id,
    role: item.role,
    clientMsgId: item.clientMsgId || '',
    msgId: env.msg_id || item.id,
    text: '',
    status: 'done',
    skill: meta.skill || '',
    confidence: meta.confidence ?? 0,
    cards: [],
    citations: [],
    badge: meta.badge || '',
    graph: null,
    figures: [], // F13：envelope.blocks 的 figure 块还原（见下方循环）
    clarify: null,
    statuses: [],
    notices: [],
    unknownBlocks: [],
    usage: meta.usage || null,
    latencyMs: meta.latency_ms || 0,
    doneMeta: null,
    interrupted: !!(item.interrupted ?? meta.interrupted),
    answerConfirm: false,
    confirmDismissed: true, // 历史里的确认卡不再弹出
    usedChoices: [], // V2：选项已用态（历史回显由 markHistoryUsedChoices 推断还原）
    usedInteractions: [], // sgv3：交互卡已用态（历史回显由 markHistoryUsedChoices 推断还原）
    // M2：反馈/版本/附件/思考持久化字段（旧后端缺失时给默认，优雅降级）
    feedback: item.feedback || '',
    feedbackReason: item.feedbackReason || '',
    versions: normalizeVersions(item.versions),
    attachments: normalizeAttachments(item.attachments),
    thinking: typeof item.thinking === 'string' ? item.thinking : '',
    createdAt: item.createdAt || '',
    errorText: '',
    skillKeys: [],
    action: null, // v1.4：envelope.blocks 的 action 块还原（见下方循环）
    degraded: null, // 阶段 6B：搜索降级提示（envelope.blocks 的 degraded 块还原）
  }
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    if (b.type === 'markdown') {
      msg.text += (msg.text ? '\n\n' : '') + (b.content || '')
    } else if (b.type === 'card') {
      // socratic_hint 卡只进 msg.cards（渲染读卡内 level/scaffold_label），无消息级副作用
      mergeCardInto(msg, b.data || {})
    } else if (b.type === 'graph') {
      msg.graph = b
    } else if (b.type === 'figure') {
      // F13：历史回显还原图形卡（{step_no?, caption?, frames[], figure_params?}）
      msg.figures.push(b)
    } else if (b.type === 'action') {
      // v1.4：envelope.blocks 的 action 块（练题中心拦截/AI 管家）还原为按钮卡
      msg.action = b.data || null
    } else if (b.type === 'notice') {
      msg.notices.push(b.content || '')
    } else if (b.type === 'citation') {
      msg.citations = Array.isArray(b.items) ? b.items : []
    } else if (b.type === 'degraded') {
      // 阶段 6B：搜索降级提示块还原
      msg.degraded = {
        error_code: (b.data && b.data.error_code) || '',
        message: (b.data && (b.data.message || b.data.refuse_reason)) || '',
      }
    } else if (b.type === 'thinking') {
      // M2：envelope.blocks 末尾追加的 thinking 块（老契约通道，与新 item.thinking 并存去重）
      if (!msg.thinking) msg.thinking = b.content || ''
    } else if (item.role === 'assistant') {
      msg.unknownBlocks.push(b) // 未注册 block 渲染占位块，绝不白屏
    }
  }
  return msg
}

/**
 * v1.6 变式链逐题发卡合并：后端一道题过好闸就发一张 chain='variant' 卡（同 chain_id），
 * 这里合并成一张链卡（items 渐进增长），QuizSetCard 变式链模式据此渲染进度链与生成中占位。
 * 普通卡不受影响，直接入列。
 */
function mergeCardInto(msg, card) {
  // 兼容历史数据：card 块里装了 action（seed/旧消息）→ 一律还原为按钮卡，不再进 GenericCard
  if (card && (card.type === 'action' || card.card_type === 'action')) {
    msg.action = card
    return
  }
  if (card && card.chain === 'variant' && card.chain_id) {
    const exist = msg.cards.find((c) => c.chain === 'variant' && c.chain_id === card.chain_id)
    if (exist) {
      exist.items = [...(exist.items || []), ...(card.items || [])]
      exist.chain_total = card.chain_total || exist.chain_total
      return
    }
  }
  msg.cards.push(card)
}

/** versions 字段归一化：{index, count, ids[]}；缺字段/旧后端 → null（不显示版本导航） */
function normalizeVersions(v) {
  if (!v || typeof v !== 'object') return null
  const count = Number(v.count) || 0
  const index = Number(v.index) || 1
  const ids = Array.isArray(v.ids) ? v.ids : []
  if (count < 1) return null
  return { index, count, ids }
}

/** attachments 归一化：name/filename 双写兼容（发送快照用 filename，持久化用 name）；localUrl 透传（刚发送图片的本地 objectURL） */
export function normalizeAttachments(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      file_id: a.file_id || a.fileId || '',
      kind: a.kind || (String(a.mime || '').startsWith('image/') ? 'image' : 'doc'),
      name: a.name || a.filename || '附件',
      mime: a.mime || '',
      size: a.size || a.size_bytes || 0,
      localUrl: a.localUrl || '',
    }))
}

/** 时间显示：今天 HH:MM，否则 M/D */
export function fmtTime(iso) {
  if (!iso) return ''
  // 后端 ISO 字符串可能不带时区后缀，按 UTC 处理
  const fixed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(fixed)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.toDateString() === now.toDateString()) return hm
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 消息时间戳：始终 HH:MM（操作条 hover 显示） */
export function fmtHm(iso) {
  if (!iso) return ''
  const fixed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(fixed)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 侧栏分组键：today / week / month / earlier */
export function convGroupKey(iso) {
  if (!iso) return 'earlier'
  const fixed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(fixed)
  if (Number.isNaN(d.getTime())) return 'earlier'
  const now = new Date()
  const sod = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.floor((sod(now) - sod(d)) / 86400000)
  if (days <= 0) return 'today'
  if (days < 7) return 'week'
  if (days < 30) return 'month'
  return 'earlier'
}

export const CONV_GROUPS = [
  { key: 'today', label: '今天' },
  { key: 'week', label: '7 天内' },
  { key: 'month', label: '30 天内' },
  { key: 'earlier', label: '更早' },
]

/** socratic 提示等级中文名（与后端 LEVEL_NAMES_ZH 对齐；旧 1-3 级卡兼容显示） */
export const HINT_LEVEL_ZH = { 1: '知识点回顾', 2: '思路方向', 3: '兜底操作' }

/**
 * sgv2（DESIGN §6.2/§8.2）：五档脚手架中文名。
 * 与后端 policy.SCAFFOLD_LABELS（英文 key）/SCAFFOLD_LABELS_ZH（policy.py:35-48）对齐：
 * 后端下发 scaffold_label 为英文 key、scaffold_level 为 0-4 档位，两种都映射。
 */
export const SCAFFOLD_LEVEL_ZH = {
  0: '开放追问',
  1: '窄追问',
  2: '补全',
  3: '工作示例',
  4: '揭示该步',
}
export const SCAFFOLD_LABEL_ZH = {
  probe: '开放追问',
  focused_scaffold: '窄追问',
  completion: '补全',
  worked_example: '工作示例',
  give_step: '揭示该步',
}

/** sgv2：教学阶段中文名（与后端 policy phase 常量对齐；S1 为隐式诊断无独立值） */
export const PHASE_ZH = {
  opening: '诊断中',
  guiding: '引导中',
  detour: '补课中',
  converging: '收尾',
  wrapped: '已完成',
}

/**
 * sgv3（CHAIN-DESIGN §2.1/§6.1）：plan.stage 子阶段中文名（phase 值不动，stage 缺省 ""
 * = 现状主循环）。reading/planning 是 opening 的教学子过程，reflecting 是
 * guiding→converging 的插入段，transfer 是完成卡 opt-in 出口。
 */
export const STAGE_ZH = {
  reading: '读题理解',
  planning: '拆解思路',
  // guiding 主循环 stage 缺省 ""（无子阶段）；信封样例 §6.1 亦直引 "guiding" 作语境值
  guiding: '引导推导',
  reflecting: '复盘反思',
  transfer: '迁移出题',
}

/** sgv3（CHAIN-DESIGN §5 形式总表）：九种免打字交互形式中文名（信封壳徽标/摘要前缀）
 *  sgv4（DESIGN §4.1 形式目录 16 种）：扩 5 新形式（判断/标注/构造低输入成本认知动作） */
export const FORM_ZH = {
  annotate: '圈点标注',
  triage: '条件分拣',
  restate_check: '复述挑错',
  sequence: '思路排序',
  route_commit: '押注路线',
  assemble: '表达式拼装',
  cloze: '填空补全',
  errorhunt: '找错批注',
  selfex: '自我解释',
  choice: '思路选择',
  free_text: '自由作答',
  // sgv4 新形式（R-二元必二元 / R-区间不打字 / R-图象对象优先 / T18 last_resort）
  binary: '二元判断',
  numline: '数轴标注',
  figure_probe: '图上探点',
  figure_slider: '滑块试探',
  expr_input: '式子输入',
}

/**
 * sgv3（CHAIN-DESIGN §6.2）：交互作答文本化摘要纯函数——同一份产物两个用途：
 * ① 用户气泡展示文本（message 字段，历史回显友好）；
 * ② 后端 LLM 判答兜底输入（sympy 解析失败/未知形式时按 message 走 _judge）。
 * 各形式摘要保持「前缀 + 关键作答内容」短句，绝不包含答案判分信息。
 */
export function summarizeInteraction(form, spec, payload) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const s = spec && typeof spec === 'object' ? spec : {}
  switch (form) {
    case 'annotate': {
      if (Array.isArray(p.picked_regions)) return `[圈点] 标了 ${p.picked_regions.length} 个关键对象`
      if (Array.isArray(p.lasso)) return `[圈点] 在图上圈了 ${p.lasso.length} 处条件`
      const n = Array.isArray(p.selected_tokens) ? p.selected_tokens.length : 0
      return `[圈点] 划了 ${n} 处条件`
    }
    case 'triage': {
      const a = p.assignment || {}
      const bins = Array.isArray(s.bins) && s.bins.length ? s.bins : ['已知', '要求', '无关']
      const parts = bins.map((b) => `${b}${Object.values(a).filter((v) => v === b).length}`).join(' · ')
      return `[分拣] ${parts}`
    }
    case 'restate_check':
      return p.all_correct ? '[挑错] AI 复述全部正确' : `[挑错] 第 ${(Number(p.bad_sentence) || 0) + 1} 句读错了`
    case 'sequence': {
      const cards = Array.isArray(s.cards) ? s.cards : []
      const texts = (Array.isArray(p.order) ? p.order : [])
        .map((id) => cards.find((c) => String(c?.id) === String(id))?.text || '')
        .filter(Boolean)
      return texts.length ? `[排序] ${texts.join(' → ')}` : '[排序] 已提交排序'
    }
    case 'route_commit': {
      const routes = Array.isArray(s.routes) ? s.routes : []
      const rt = routes.find((r) => String(r?.id) === String(p.wager))
      const reasons = Array.isArray(s.reason_options) ? s.reason_options : []
      const why = p.reason != null && reasons[Number(p.reason)] ? `（理由：${reasons[Number(p.reason)].text}）` : ''
      return `[押注] 押「${rt?.text || p.wager}」${why}`
    }
    case 'assemble': {
      const slot = p.s1 || p[Object.keys(p)[0]] || {}
      const toks = Array.isArray(slot.tokens) ? slot.tokens.join(' ') : String(slot.latex || '')
      return toks ? `[拼装] ${toks}` : '[拼装] 已提交'
    }
    case 'cloze': {
      const entries = Object.entries(p.blanks || {})
      return entries.length ? `[填空] ${entries.map(([, v]) => v).join(' · ')}` : '[填空] 已提交'
    }
    case 'errorhunt': {
      const lines = Array.isArray(s.lines) ? s.lines : []
      const ln = lines.findIndex((l) => String(l?.id) === String(p.bad_line)) + 1
      const causes = Array.isArray(s.cause_options) ? s.cause_options : []
      const cause = p.cause_choice != null && causes[Number(p.cause_choice)] ? `（${causes[Number(p.cause_choice)].text}）` : ''
      return ln > 0 ? `[找错] 第 ${ln} 行开始错${cause}` : '[找错] 已提交'
    }
    case 'selfex': {
      const opts = Array.isArray(s.options) ? s.options : []
      const o = p.chosen != null ? opts[Number(p.chosen)] : null
      const evi = Array.isArray(s.evidence_options) ? s.evidence_options : []
      const e = p.evidence != null && evi[Number(p.evidence)] ? `（依据：${evi[Number(p.evidence)].text}）` : ''
      return o ? `[自我解释] 「${o.text}」${e}` : '[自我解释] 已提交'
    }
    /* ===== sgv4 五新形式（DESIGN §4.1）===== */
    case 'binary': {
      const opts = Array.isArray(s.options) ? s.options : []
      const o = opts.find((op) => String(op?.id) === String(p.choice))
      return o ? `[判断] 「${o.label || o.id}」` : '[判断] 已提交'
    }
    case 'numline': {
      if (Array.isArray(p.segments)) {
        const zh = { pos: '正', neg: '负', zero: '零' }
        const parts = p.segments.map((seg) => `(${seg?.from ?? '?'}，${seg?.to ?? '?'})${zh[seg?.sign] || seg?.sign || '?'}`)
        return parts.length ? `[数轴] ${parts.join(' · ')}` : '[数轴] 已提交'
      }
      if (Array.isArray(p.drops)) {
        const parts = p.drops.map((d) => `${d?.id ?? '点'}=${d?.x ?? '?'}`)
        return parts.length ? `[数轴] ${parts.join(' · ')}` : '[数轴] 已提交'
      }
      return '[数轴] 已提交'
    }
    case 'figure_probe': {
      const n = Array.isArray(p.picked) ? p.picked.length : 0
      const pts = (Array.isArray(p.picked) ? p.picked : [])
        .slice(0, 3)
        .map((pt) => `(${pt?.x ?? '?'}, ${pt?.y ?? '?'})`)
        .join(' ')
      return n ? `[探点] ${pts}${n > 3 ? ` 等 ${n} 处` : ''}` : '[探点] 已提交'
    }
    case 'figure_slider': {
      const trials = Number(p.trials) || 0
      const vals = p.values && typeof p.values === 'object'
        ? Object.entries(p.values).map(([k, v]) => `${k}=${v}`).join(' · ')
        : ''
      return `[滑块] ${vals || '已提交'}${trials ? `（试探 ${trials} 次）` : ''}`
    }
    case 'expr_input': {
      const latex = String(p.latex || '').trim()
      return latex ? `[式子] ${latex}` : '[式子] 已提交'
    }
    default:
      return `[${FORM_ZH[form] || form || '作答'}] 已提交`
  }
}

/**
 * sgv3（CHAIN-DESIGN §10-W6）：回放卡误因素中文名——与后端单一映射源
 * prompts.MISCONCEPTION_NAMES_ZH（prompts.py:649-655）逐键对齐（前端不自建新词）；
 * build_replay_data 下发的 misconceptions 是英文 key 集合，未命中键回退原文。
 */
export const REPLAY_MISCONCEPTION_ZH = {
  concept: '概念不清',
  formula: '公式用错',
  calculation: '计算错误',
  logic: '推理逻辑错误',
  reading: '审题错误',
}

/**
 * sgv3（CHAIN-DESIGN §7.3）：四档支持强度人设化名（T0 最强支持 → T3 自主）。
 * 与 MessageBubble 换挡卡 tierZh 同口径，抽出共享受回放卡 tier_path 复用
 * （「学生看见自己赢得的自主权」在回放轨迹里同样成立）。
 */
export const TIER_NAME_ZH = { 0: '陪拆', 1: '搭手架', 2: '递工具', 3: '当裁判' }

/** sgv2：掌握度四态中文名（后端 _progress_card.mastery_state 口径，§5.2 掌握档） */
export const MASTERY_STATE_ZH = {
  unlearned: '未学',
  weak: '薄弱',
  improving: '巩固',
  mastered: '已掌握',
}

/**
 * sgv2（DESIGN §8.2）：历史回显还原选项卡「已用」态。
 * 点击选项即以选项原文作为 attempt 发送（onSocraticChoice 契约不变），
 * 因此「该 AI 消息之后的第一条用户消息 rawText 与某选项一致」可确定性判定
 * 该消息里的选项卡已被使用 → usedChoices[cardIndex]=true。幂等，可重复执行。
 * 检验题作答/普通输入与选项原文不一致时不误标。
 *
 * sgv3（CHAIN-DESIGN §6.2）扩展：socratic_interaction 交互卡已用态同函数还原——
 * 交互作答（提交/打字回退/跳过）都会产生紧随的用户消息，故「该 AI 消息之后存在
 * 用户消息」即判定该消息内全部交互卡已回应 → usedInteractions[cardIndex]=true
 * （与选项卡「点选即发送后置灰」同语义；历史交互卡不可再作答）。
 */
export function markHistoryUsedChoices(messages) {
  if (!Array.isArray(messages)) return
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (!m || m.role !== 'assistant') continue
    const cards = Array.isArray(m.cards) ? m.cards : []
    let hasChoice = false
    let hasInteraction = false
    for (const c of cards) {
      const t = c?.type || c?.card_type || ''
      if (t === 'socratic_step_choice') hasChoice = true
      if (t === 'socratic_interaction') hasInteraction = true
    }
    if (!hasChoice && !hasInteraction) continue
    // 该消息之后第一条用户消息（点击选项/交互提交 = 紧随其后的作答）
    let nextUser = null
    for (let j = i + 1; j < messages.length; j++) {
      if (messages[j]?.role === 'user') {
        nextUser = messages[j]
        break
      }
    }
    if (!nextUser) continue
    const used = new Array(cards.length).fill(false)
    const usedIx = new Array(cards.length).fill(false)
    let marked = false
    cards.forEach((c, ci) => {
      const t = c?.type || c?.card_type || ''
      if (t === 'socratic_step_choice') {
        const opts = Array.isArray(c.options) ? c.options : []
        const sent = String(nextUser.rawText || nextUser.text || '').trim()
        if (sent && opts.some((o) => String(o || '').trim() === sent)) { used[ci] = true; marked = true }
      }
      if (t === 'socratic_interaction') { usedIx[ci] = true; marked = true }
    })
    if (hasChoice) m.usedChoices = used
    if (hasInteraction) m.usedInteractions = usedIx
  }
}

/**
 * sgv3（CHAIN-DESIGN §6.2）：置位交互卡「已用」态——DialogView.onInteractionSubmit
 * 与 DualView.onAskInteractionSubmit 共用的模型层契约（与 markChoiceUsed 同纪律：
 * 单一事实源，防双视图实现漂移）。提交后在「真实发送」（流式守卫通过）时调用。
 * 幂等；消息不存在/参数非法时静默。
 */
export function markInteractionUsed(messages, msgKey, cardIndex) {
  if (!Array.isArray(messages) || !Number.isInteger(cardIndex) || cardIndex < 0) return
  const target = messages.find((m) => m && m.key === msgKey)
  if (!target) return
  if (!Array.isArray(target.usedInteractions)) target.usedInteractions = []
  target.usedInteractions[cardIndex] = true
}

/**
 * sgv2（DESIGN §8.2）：置位选项卡「已用」态——DialogView.onSocraticChoice 与
 * DualView.onAskSocraticChoice 共用的模型层契约（单一事实源，防两视图实现漂移）。
 * 点击选项后由视图在「真实发送」（流式守卫通过）时调用：流式中点击被拒不置灰，
 * 不留「已选未发送」假状态。幂等；消息不存在/参数非法时静默（分支截断等场景）。
 */
export function markChoiceUsed(messages, msgKey, cardIndex) {
  if (!Array.isArray(messages) || !Number.isInteger(cardIndex) || cardIndex < 0) return
  const target = messages.find((m) => m && m.key === msgKey)
  if (!target) return
  if (!Array.isArray(target.usedChoices)) target.usedChoices = []
  target.usedChoices[cardIndex] = true
}
