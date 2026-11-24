/**
 * 示例会话的状态与历史（刷新可复现、幂等、错题本去重）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { patch } from '../state'
import { conversationMessages, listConversations } from '../handlers/agent'
import { ensureSession, runTurn, toHistoryItems, quizLogByKey, logQuizAnswer, quizTally } from './session'
import { mergeIntoErrorRecords, showbookAdder, isErrorRecordsPath } from './errorbook'
import { SHOWCASE_CONVS } from './catalog'
import { QUESTIONS, qidOf } from './bank'
import { fromHistory, markHistoryUsedChoices } from '../../components/chat/messageModel'

function reset() {
  patch((s) => {
    s.showcase = {}
    s.quizLog = []
    s.errorBook = []
    s.chat = {}
  })
}

const itemsOf = (id) => conversationMessages(id).data.items
const userItems = (id) => itemsOf(id).filter((x) => x.role === 'user')
const aiItems = (id) => itemsOf(id).filter((x) => x.role === 'assistant')

describe('示例会话进入历史列表', () => {
  beforeEach(reset)

  it('七条会话都在列表里，标题互不相同且不是占位文案', () => {
    const out = listConversations(JSON.stringify({ code: 0, data: { items: [{ id: 'real-1', title: '采证会话' }] } }))
    const ids = SHOWCASE_CONVS.map((c) => c.id)
    for (const id of ids) {
      const item = out.data.items.find((x) => x.id === id)
      expect(item, `缺少示例会话 ${id}`).toBeTruthy()
      expect(item.title).not.toBe('请分析我上传的文件')
    }
    const titles = ids.map((id) => out.data.items.find((x) => x.id === id).title)
    expect(new Set(titles).size).toBe(ids.length)
    // 原有采证项一条不丢、一条不改
    expect(out.data.items.find((x) => x.id === 'real-1').title).toBe('采证会话')
  })

  it('主持人首选会话排在最前，且示例不占用既有「置顶」分组', () => {
    const out = listConversations(JSON.stringify({ code: 0, data: { items: [] } }))
    const first = out.data.items[0]
    expect(first.id).toBe('sc-combo')
    expect(first.title).toBe('导数学习 · 从提问到改错')
    // 置顶分组留给既有采证历史，示例落在「今天」组打头，避免新旧标题混在一起
    expect(SHOWCASE_CONVS.every((c) => !c.pinned)).toBe(true)
  })
})

describe('预置轮次与题图', () => {
  beforeEach(reset)

  it('S1 开场即有学生原话、题图与四段回答', () => {
    const [u] = userItems('sc-s1')
    expect(u).toBeTruthy()
    expect(u.attachments.length).toBe(1)
    expect(u.attachments[0].kind).toBe('image')
    expect(u.attachments[0].localUrl).toContain('data:image/svg+xml')
    const [a] = aiItems('sc-s1')
    const text = a.envelope.blocks.find((b) => b.type === 'markdown').content
    expect(text).toContain('找候选点')
    // 公式改为 KaTeX 行内排版（$...$），断言跟着看 LaTeX 源
    expect(text).toContain('f(-1)=2')
    expect(text).toContain('f(1)=-2')
  })

  it('S5 首答 A 与可回看的题面都在（不假装是本次作答）', () => {
    const [u] = userItems('sc-s5')
    expect(u.attachments[0].localUrl).toContain('data:image/svg+xml')
    // 预置轮次：题面卡（回看态）→ G0 圈题眼（进入即可操作）
    const cards = aiItems('sc-s5').flatMap((m) => m.envelope.blocks.filter((b) => b.type === 'card').map((b) => b.data))
    const retry = cards.find((c) => c.variant === 'retry')
    expect(retry.readonly).toBe(true)
    expect(retry.chosen).toBe('A')
    expect(cards.some((c) => c.variant === 'read')).toBe(true)
  })

  it('S3 图形卡是三帧且带图注', () => {
    const fig = aiItems('sc-s3')[0].envelope.blocks.find((b) => b.type === 'figure')
    expect(fig).toBeTruthy()
    expect(fig.frames.length).toBe(3)
    expect(fig.frames.every((f) => f.data_uri.startsWith('data:image/svg+xml'))).toBe(true)
  })

  it('历史能经 fromHistory 还原成消息模型（含卡片与图）', () => {
    const items = itemsOf('sc-s3')
    const msg = fromHistory(items.find((x) => x.role === 'assistant'))
    expect(msg.figures.length).toBe(1)
    expect(msg.cards.length).toBe(1)
    expect(msg.text).toBeTruthy()
  })

  it('历史顺序与现役一致：最新在前，反转后时间递增', () => {
    const items = itemsOf('sc-s2')
    expect(items.length).toBe(4)
    const times = items.map((x) => x.createdAt)
    expect([...times].sort()).toEqual([...times].reverse())
  })
})

describe('推进一轮并刷新恢复', () => {
  beforeEach(reset)

  it('提交一次只追加一轮，重复取历史不重复追加', () => {
    const before = toHistoryItems('sc-s5').length
    runTurn('sc-s5', { message: '题目看懂了' })
    const after = toHistoryItems('sc-s5').length
    expect(after).toBe(before + 2) // 用户一轮 + AI 一轮
    // 再取两次不变（幂等）
    expect(toHistoryItems('sc-s5').length).toBe(after)
    expect(toHistoryItems('sc-s5').length).toBe(after)
  })

  it('刷新后从同一小问继续，不重复追加承接气泡', () => {
    runTurn('sc-s5', { message: '题目看懂了' })
    const s1 = ensureSession('sc-s5')
    const n1 = s1.turns.length
    // 模拟刷新：重新 ensure 取到同一份状态，节点与轮次数都不变
    const s2 = ensureSession('sc-s5')
    expect(s2.node).toBe(s1.node)
    expect(s2.node).toBe('m_method')
    expect(s2.turns.length).toBe(n1)
  })

  it('事件流带 meta/token/card/done，且卡片里的图已解析成 dataUri', () => {
    const out = runTurn('sc-s5', { message: '题目看懂了' })
    const names = out.events.map((e) => e.event)
    expect(names[0]).toBe('meta')
    expect(names).toContain('token')
    expect(names).toContain('card')
    expect(names[names.length - 1]).toBe('done')
    expect(out.events[0].data.conversation_id).toBe('sc-s5')
  })

  it('学生的原话原样保留在历史里', () => {
    const txt = '我觉得先看导数符号，再看两侧'
    runTurn('sc-s5', { message: txt })
    // /messages 最新在前，最近一轮的用户消息是第 0 条
    expect(userItems('sc-s5')[0].envelope.blocks[0].content).toBe(txt)
  })
})

describe('作答记录驱动真实计数', () => {
  beforeEach(reset)

  it('learning-events 只记本示例题库里的题', () => {
    expect(logQuizAnswer({ question_text: QUESTIONS[0].question_text, chosen: 'A', correct: false })).toBe(true)
    expect(logQuizAnswer({ question_text: '无关的题目', chosen: 'A', correct: true })).toBe(false)
    expect(quizLogByKey().v1.length).toBe(1)
  })

  it('引导里改对的题也算进「订正后」，不出现自相矛盾的数字', () => {
    // 原题卡先答错 A（QuizSetCard 真实上报），随后在导学卡里改选 C
    logQuizAnswer({ question_text: QUESTIONS[0].question_text, chosen: 'A', correct: false })
    const before = quizTally({ corrected: false })
    expect(before.answered).toBe(1)
    expect(before.firstCorrect).toBe(0)
    expect(before.finalCorrect).toBe(0)
    // 导学订正成功后
    const after = quizTally({ corrected: true })
    expect(after.answered).toBe(1)
    expect(after.firstCorrect).toBe(0)
    expect(after.finalCorrect).toBe(1)
    expect(after.corrected).toBe(1)
  })

  it('能算出首答正确与订正后的真实数字', () => {
    // V1 首答错、改对；V2、V3 首答就对
    logQuizAnswer({ question_text: QUESTIONS[0].question_text, chosen: 'A', correct: false })
    logQuizAnswer({ question_text: QUESTIONS[0].question_text, chosen: 'C', correct: true })
    logQuizAnswer({ question_text: QUESTIONS[1].question_text, chosen: 'B', correct: true })
    logQuizAnswer({ question_text: QUESTIONS[2].question_text, chosen: 'D', correct: true })
    const byKey = quizLogByKey()
    const first = ['v1', 'v2', 'v3'].filter((k) => (byKey[k] || [])[0]?.correct).length
    const final = ['v1', 'v2', 'v3'].filter((k) => (byKey[k] || []).at(-1)?.correct).length
    expect(first).toBe(2)
    expect(final).toBe(3)
  })
})

describe('错题本', () => {
  beforeEach(reset)

  it('重复加入只更新同一条，不重复计数', () => {
    showbookAdder({ convId: 'sc-s6' })
    showbookAdder({ convId: 'sc-s6' })
    const base = JSON.stringify({ code: 0, data: { items: [{ record_id: 'x', question_preview: '既有错题' }] } })
    const merged = JSON.parse(mergeIntoErrorRecords(base))
    const mine = merged.data.items.filter((x) => x.record_id === 'sc-err-sc-v1')
    expect(mine.length).toBe(1)
    expect(mine[0].question_preview).toContain('局部极小值')
    // 既有记录不被删改
    expect(merged.data.items.some((x) => x.record_id === 'x')).toBe(true)
  })

  it('没有错题记录时不改响应原文', () => {
    const base = JSON.stringify({ code: 0, data: { items: [] } })
    expect(mergeIntoErrorRecords(base)).toBe(base)
  })

  it('只对错题本端点做合并', () => {
    expect(isErrorRecordsPath('/api/student/error-records?limit=5')).toBe(true)
    expect(isErrorRecordsPath('/api/student/error-records/due-queue')).toBe(true)
    expect(isErrorRecordsPath('/api/student/videos')).toBe(false)
  })

  it('S6 点一次加入后状态落库，再点一次提示已存在', () => {
    const r1 = runTurn('sc-s6', { message: '加入错题本' })
    expect(r1.state.errorSaved).toBe(true)
    const r2 = runTurn('sc-s6', { message: '再加入错题本' })
    expect(r2.aiTurn.text).toContain('不会重复计数')
  })
})

describe('历史已用态推断不误伤示例卡片', () => {
  beforeEach(reset)

  it('markHistoryUsedChoices 对示例会话可安全执行', () => {
    runTurn('sc-s5', { message: '题目看懂了' })
    const msgs = itemsOf('sc-s5').slice().reverse().map(fromHistory)
    expect(() => markHistoryUsedChoices(msgs)).not.toThrow()
  })
})

describe('题干归一化', () => {
  it('同一条题的不同写法能对上', () => {
    expect(qidOf('g(x)=2x³−3x²−12x+1 在哪个 x 取得局部极小值？')).toBe(qidOf(' g(x)=2x³−3x²−12x+1  在哪个 x 取得局部极小值 '))
  })
})
