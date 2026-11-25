/**
 * 新对话里的自由问答：意图识别、回答事件、历史恢复与会话列表。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { patch } from '../state'
import { freeChatTurn, freeHistoryItems, intentOf, isFreeConvId, listFreeConversations } from './free'
import { markAborted } from './abort'
import { conversationMessages, listConversations } from '../handlers/agent'

function reset() {
  patch((s) => {
    s.free = {}
    s.chat = {}
    s.showcase = {}
  })
}

describe('自由问答题意图', () => {
  it('常见问法落到对应意图', () => {
    expect(intentOf('导数等于零为什么不一定有极值？')).toBe('stationary')
    expect(intentOf('怎么判断极大还是极小')).toBe('extremum')
    expect(intentOf('单调区间怎么求')).toBe('monotone')
    expect(intentOf('切线和割线有什么区别')).toBe('tangent')
    expect(intentOf('带我做一道题')).toBe('practice')
    expect(intentOf('看看 x³ 的反例')).toBe('cube')
  })

  it('省略式追问与闲聊/代写分别落到对应分支', () => {
    expect(intentOf('那 x³ 呢？')).toBe('cube')
    expect(intentOf('今天天气不错')).toBe('chitchat')
    expect(intentOf('帮我写一篇作文')).toBe('homework')
    expect(intentOf('量子力学是什么')).toBe('boundary')
    expect(intentOf('')).toBe('boundary')
  })

  it('只接管离线新建的会话 id', () => {
    expect(isFreeConvId('offline-123')).toBe(true)
    expect(isFreeConvId('free-1')).toBe(true)
    expect(isFreeConvId('sc-s1')).toBe(false)
    expect(isFreeConvId('real-conv')).toBe(false)
  })
})

describe('新对话回答与历史', () => {
  beforeEach(reset)
  const ID = 'offline-test-1'

  it('回答带 meta/多个 token/card/done，且正文引用学生的问题', () => {
    const evs = freeChatTurn({ conversation_id: ID, message: '导数等于零为什么不一定有极值？' })
    expect(evs[0].event).toBe('meta')
    expect(evs[0].data.conversation_id).toBe(ID)
    const tokens = evs.filter((e) => e.event === 'token')
    expect(tokens.length).toBeGreaterThan(1)
    const text = tokens.map((e) => e.data.text).join('')
    expect(text).toContain('切线是水平的')
    expect(evs.some((e) => e.event === 'card')).toBe(true)
    expect(evs[evs.length - 1].event).toBe('done')
  })

  it('超范围输入给具体边界与可继续的动作，不重复读题卡', () => {
    const evs = freeChatTurn({ conversation_id: ID, message: '量子力学是什么' })
    const text = evs.filter((e) => e.event === 'token').map((e) => e.data.text).join('')
    expect(text).toContain('离线体验目前覆盖')
    expect(text).toContain('上传题1/题2/题3')
  })

  it('带附件或正式会话 id 时不接管', () => {
    expect(freeChatTurn({ conversation_id: ID, message: '看图', attachments: [{ file_id: 'f1' }] })).toBeNull()
    expect(freeChatTurn({ conversation_id: 'sc-s1', message: '导数是什么' })).toBeNull()
  })

  it('刷新后历史仍在，且出现在会话列表里（标题取学生原话）', () => {
    freeChatTurn({ conversation_id: ID, message: '导数等于零为什么不一定有极值？' })
    const items = conversationMessages(ID).data.items
    expect(items.length).toBe(2)
    expect(items[0].role).toBe('assistant')
    expect(items[1].role).toBe('user')
    const list = listConversations(JSON.stringify({ code: 0, data: { items: [] } })).data.items
    const item = list.find((x) => x.id === ID)
    expect(item).toBeTruthy()
    expect(item.title).toContain('导数等于零')
    expect(freeHistoryItems(ID).length).toBe(2)
    expect(listFreeConversations().some((x) => x.id === ID)).toBe(true)
  })
})

describe('停止生成后的历史', () => {
  beforeEach(reset)
  const ID = 'offline-test-stop'

  it('按学生实际看到的文本与卡片截断，并保留「已停止回复」', () => {
    freeChatTurn({ conversation_id: ID, message: '导数等于零为什么不一定有极值？' })
    const ok = markAborted({ conversation_id: ID, partial_text: '导数为零只说明这一点', cards_seen: 0 })
    expect(ok).toBe(true)
    const items = conversationMessages(ID).data.items
    const ai = items.find((x) => x.role === 'assistant')
    const md = ai.envelope.blocks.find((b) => b.type === 'markdown').content
    expect(md).toBe('导数为零只说明这一点')
    expect(ai.envelope.blocks.some((b) => b.type === 'card')).toBe(false)
    expect(ai.envelope.blocks.some((b) => b.type === 'notice' && b.content === '已停止回复')).toBe(true)
  })
})
